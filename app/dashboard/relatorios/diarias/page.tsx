'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { User } from '@/lib/models/User';
import { generateDiariasPDF, ServidorDiaria, AnexoDiaria } from '@/lib/pdf-diarias';
import { FiArrowLeft, FiPlus, FiTrash2, FiFileText, FiUpload, FiImage, FiFile, FiMove, FiDownload, FiUsers, FiMapPin, FiCalendar, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function DiariasPage() {
  const router = useRouter();

  // Mapeamento setor → deputado padrão
  const deputadoPorSetor: Record<string, string> = {
    'DIRETORIA GERAL': 'PAULO FERREIRA ROLIM',
    'CIADI': 'CAROLINA OLIVEIRA DAS CHAGAS',
  };

  // Form state
  const [setor, setSetorState] = useState('DIRETORIA GERAL');
  const [temaAtividade, setTemaAtividade] = useState('');
  const [deputadoChefe, setDeputadoChefe] = useState('PAULO FERREIRA ROLIM');
  const [cidade, setCidade] = useState('');
  const [dataAtividade, setDataAtividade] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [nexoFotos, setNexoFotos] = useState(true);
  const [nexoRecibos, setNexoRecibos] = useState(true);
  const [nexoAta, setNexoAta] = useState(false);

  // Ao mudar setor, atualiza o deputado automaticamente
  const setSetor = (novoSetor: string) => {
    setSetorState(novoSetor);
    setDeputadoChefe(deputadoPorSetor[novoSetor] || '');
  };

  // Servidores
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Anexos
  const [anexos, setAnexos] = useState<AnexoDiaria[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF
  const [generating, setGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('relatorio-diarias');

  // Load logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // Tenta carregar logo-alece-daf.png, fallback para alece.png
        let res = await fetch('/logo-alece-daf.png');
        if (!res.ok) {
          res = await fetch('/alece.png');
        }
        if (!res.ok) return;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) return;

        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) { console.error('Erro ao carregar logo:', e); }
    };
    loadLogo();
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const users: User[] = await res.json();
          const servidores = users.filter(u => u.status === 'active' && ['admin', 'atendente', 'superadmin'].includes(u.role));
          setAllUsers(servidores);
        }
      } catch (e) { console.error('Erro ao carregar usuários:', e); }
      finally { setLoadingUsers(false); }
    };
    loadUsers();
  }, []);

  // Load signature base64 for a user
  const loadSignatureBase64 = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
      const fetchUrl = url.startsWith('/') ? url : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  // Toggle user selection
  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const tipo: 'image' | 'pdf' = file.type.startsWith('image/') ? 'image' : 'pdf';
        setAnexos(prev => [...prev, {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nome: file.name,
          tipo,
          dataUrl,
          ordem: prev.length,
        }]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAnexo = (id: string) => {
    setAnexos(prev => prev.filter(a => a.id !== id).map((a, i) => ({ ...a, ordem: i })));
  };

  // Drag and drop for reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setAnexos(prev => {
      const items = [...prev];
      const [removed] = items.splice(dragIdx, 1);
      items.splice(idx, 0, removed);
      return items.map((a, i) => ({ ...a, ordem: i }));
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // Generate PDF
  const handleGeneratePDF = useCallback(async () => {
    setError(null);
    if (!temaAtividade.trim()) { setError('Preencha o tema da atividade'); return; }
    if (!cidade.trim()) { setError('Preencha a cidade'); return; }
    if (!dataAtividade.trim()) { setError('Preencha a data da atividade'); return; }
    if (selectedUserIds.length === 0) { setError('Selecione ao menos um servidor'); return; }

    setGenerating(true);
    try {
      const servidores: ServidorDiaria[] = await Promise.all(
        selectedUserIds.map(async (userId) => {
          const user = allUsers.find(u => u.id === userId)!;
          let assinaturaBase64: string | null = null;
          if (user.assinatura_url) {
            assinaturaBase64 = await loadSignatureBase64(user.assinatura_url);
          }
          return {
            nome: user.name,
            cpf: user.cpf || '',
            matricula: user.matricula || '',
            assinaturaUrl: user.assinatura_url,
            assinaturaBase64,
          };
        })
      );

      const url = await generateDiariasPDF({
        setor, temaAtividade, deputadoChefe, cidade, dataAtividade,
        servidores, justificativa, nexoFotos, nexoRecibos, nexoAta,
        logoBase64,
        anexos,
      });

      setPdfUrl(url);
    } catch (e: any) {
      console.error('Erro ao gerar PDF:', e);
      setError(e.message || 'Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  }, [setor, temaAtividade, deputadoChefe, cidade, dataAtividade, selectedUserIds, allUsers, justificativa, nexoFotos, nexoRecibos, nexoAta, logoBase64, anexos]);

  const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/relatorios')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Diárias (DAF)</h1>
            <p className="text-sm text-gray-500">ANEXO II - Prestação de Contas</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm animate-in slide-in-from-top-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><FiX className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Dados Gerais */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiMapPin className="text-emerald-600" /> Dados Gerais</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Setor</label>
                    <select value={setor} onChange={e => setSetor(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 bg-white text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100">
                      <option value="DIRETORIA GERAL">DIRETORIA GERAL</option>
                      <option value="CIADI">CIADI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Deputado/Chefe Solicitante</label>
                    <input value={deputadoChefe} onChange={e => setDeputadoChefe(e.target.value)} className="w-full h-10 rounded-lg border border-gray-200 text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tema da Atividade</label>
                  <input value={temaAtividade} onChange={e => setTemaAtividade(e.target.value)} placeholder="Ex: AÇÃO ITINERANTE EMISSÃO DE CIN" className="w-full h-10 rounded-lg border border-gray-200 text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Cidade</label>
                    <div className="flex items-center gap-2">
                      <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: LAVRAS DA MANGABEIRA" className="flex-1 h-10 rounded-lg border border-gray-200 text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                      <span className="text-sm text-gray-400 font-medium">- CE</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Data da Atividade</label>
                    <input value={dataAtividade} onChange={e => setDataAtividade(e.target.value)} placeholder="Ex: 27, 28, 29 E 30/04/2026" className="w-full h-10 rounded-lg border border-gray-200 text-sm px-3 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Servidores */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiUsers className="text-blue-600" /> Servidores ({selectedUserIds.length})</h2>
              </div>
              <div className="p-5">
                {loadingUsers ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Carregando servidores...</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allUsers.map(user => {
                      const selected = selectedUserIds.includes(user.id);
                      return (
                        <button key={user.id} type="button" onClick={() => toggleUser(user.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${selected ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                            {selected && <FiCheckCircle className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500">
                              CPF: {user.cpf || 'Não cadastrado'} | Mat: {user.matricula || 'N/A'}
                              {user.assinatura_url && <span className="text-emerald-600 ml-1">✓ Assinatura</span>}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {allUsers.length === 0 && (
                      <p className="text-center py-4 text-gray-400 text-sm">Nenhum servidor encontrado</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Justificativa */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiFileText className="text-amber-600" /> Justificativa</h2>
              </div>
              <div className="p-5">
                <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} placeholder="Descreva a justificativa da viagem..." className="w-full rounded-lg border border-gray-200 text-sm px-3 py-2 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none" />
              </div>
            </div>

            {/* NEXOS */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiFile className="text-purple-600" /> Anexos (NEXOS)</h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Checkboxes */}
                <div className="flex flex-wrap gap-4">
                  {[{ label: 'FOTOS', value: nexoFotos, set: setNexoFotos },
                    { label: 'RECIBOS', value: nexoRecibos, set: setNexoRecibos },
                    { label: 'ATA', value: nexoAta, set: setNexoAta }].map(item => (
                    <label key={item.label} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={item.value} onChange={() => item.set(!item.value)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Clique para adicionar fotos ou arquivos</p>
                  <p className="text-xs text-gray-400 mt-1">Imagens (JPG, PNG) e PDFs</p>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                </div>

                {/* Grid de anexos para organizar */}
                {anexos.length > 0 && (
                  <div className="bg-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-purple-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
                        <h3 className="font-bold text-white text-sm">Organizar Arquivos</h3>
                        <span className="bg-slate-600 text-slate-300 text-xs font-medium px-2 py-0.5 rounded-full">{anexos.length} arquivos</span>
                      </div>
                      <button onClick={() => setAnexos([])} className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1 transition-colors">
                        <FiTrash2 className="w-3.5 h-3.5" /> Limpar todos
                      </button>
                    </div>
                    <p className="text-slate-400 text-xs">Arraste os itens para reordenar a sequência do PDF final.</p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {anexos.map((anexo, idx) => (
                        <div
                          key={anexo.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={e => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`relative group rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 ${
                            dragIdx === idx
                              ? 'ring-2 ring-purple-500 scale-105 shadow-xl shadow-purple-500/20 z-10'
                              : 'ring-1 ring-slate-600 hover:ring-slate-400'
                          }`}
                          style={{ aspectRatio: '3/4' }}
                        >
                          {/* Badge de ID */}
                          <span className={`absolute top-1.5 left-1.5 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            anexo.tipo === 'pdf' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                          }`}>
                            {anexo.id.slice(-2)}
                          </span>

                          {/* Botão remover */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeAnexo(anexo.id); }}
                            className="absolute top-1.5 right-1.5 z-10 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <FiX className="w-3 h-3" />
                          </button>

                          {/* Conteúdo do card */}
                          {anexo.tipo === 'image' ? (
                            <img
                              src={anexo.dataUrl}
                              alt={anexo.nome}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-700 flex flex-col items-center justify-center p-2">
                              <FiFile className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="text-[10px] text-slate-300 text-center leading-tight line-clamp-3 px-1">
                                {anexo.nome}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Summary + Actions */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm sticky top-24">
              <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
                <h2 className="font-bold text-white flex items-center gap-2"><FiFileText className="w-4 h-4" /> Resumo</h2>
              </div>
              <div className="p-5 space-y-3">
                <SummaryItem label="Setor" value={setor} />
                <SummaryItem label="Tema" value={temaAtividade || '—'} />
                <SummaryItem label="Deputado" value={deputadoChefe} />
                <SummaryItem label="Cidade" value={cidade ? `${cidade} - CE` : '—'} />
                <SummaryItem label="Data" value={dataAtividade || '—'} />
                <SummaryItem label="Servidores" value={`${selectedUserIds.length} selecionado(s)`} />
                <SummaryItem label="Anexos" value={`${anexos.length} arquivo(s)`} />

                <div className="pt-3 border-t border-gray-100 space-y-2">
                  {selectedUsers.map(u => (
                    <div key={u.id} className="text-xs bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                      <p className="font-semibold text-blue-900">{u.name}</p>
                      <p className="text-blue-600">CPF: {u.cpf || 'N/A'} | Mat: {u.matricula || 'N/A'}</p>
                    </div>
                  ))}
                </div>

                {/* Nome do arquivo */}
                <div className="pt-3 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Nome do arquivo</label>
                  <div className="flex items-center gap-1">
                    <input value={nomeArquivo} onChange={e => setNomeArquivo(e.target.value)} className="flex-1 h-9 rounded-lg border border-gray-200 text-sm px-2 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" placeholder="relatorio-diarias" />
                    <span className="text-xs text-gray-400">.pdf</span>
                  </div>
                </div>

                <button onClick={handleGeneratePDF} disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4">
                  {generating ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
                  ) : (
                    <><FiDownload className="w-4 h-4" /> Gerar PDF</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Preview Modal */}
        {pdfUrl && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPdfUrl(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
                <h3 className="text-white font-bold">PDF Gerado</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const w = window.open(pdfUrl, '_blank'); if (!w) alert('Permita popups para visualizar'); }} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                    <FiFileText className="w-4 h-4" /> Visualizar
                  </button>
                  <a href={pdfUrl} download={`${nomeArquivo || 'relatorio-diarias'}.pdf`} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                    <FiDownload className="w-4 h-4" /> Baixar
                  </a>
                  <button onClick={() => setPdfUrl(null)} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <iframe src={pdfUrl} className="flex-1 w-full border-0" title="PDF Preview" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-800 text-right font-medium truncate max-w-[180px]">{value}</span>
    </div>
  );
}
