'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardGuard from '@/components/DashboardGuard';
import { Viagem, ViagemStatus, ViagemServidor, ViagemChecklist } from '@/types/viagem';
import { fetchViagemById, updateViagemStatus, toggleChecklistItem } from '@/lib/viagens-service';
import {
  FiArrowLeft,
  FiTruck,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUsers,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiCheckSquare,
  FiSquare,
  FiAlertCircle,
  FiBriefcase,
  FiTarget,
  FiDollarSign,
  FiExternalLink
} from 'react-icons/fi';

export default function ViagemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadViagem = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await fetchViagemById(id);
      if (!data) {
        setError('Viagem não encontrada.');
      } else {
        setViagem(data);
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes da viagem:', err);
      setError('Ocorreu um erro ao carregar os dados da viagem.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadViagem();
  }, [loadViagem]);

  // Alteração de status
  const handleStatusChange = async (newStatus: ViagemStatus) => {
    if (!viagem) return;
    setUpdatingStatus(true);
    try {
      await updateViagemStatus(viagem.id, newStatus);
      setViagem(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      alert('Erro ao atualizar status da viagem.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Alternar checkbox do checklist
  const handleToggleChecklist = async (checkId: string, currentVal: boolean) => {
    if (!viagem) return;
    const newVal = !currentVal;

    // Atualização otimista
    setViagem(prev => {
      if (!prev || !prev.checklist) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map(c => c.id === checkId ? { ...c, concluido: newVal } : c)
      };
    });

    try {
      await toggleChecklistItem(checkId, newVal);
    } catch (err) {
      console.error('Erro ao salvar alteração do checklist:', err);
      // Reverter se der erro
      setViagem(prev => {
        if (!prev || !prev.checklist) return prev;
        return {
          ...prev,
          checklist: prev.checklist.map(c => c.id === checkId ? { ...c, concluido: currentVal } : c)
        };
      });
    }
  };

  // Redirecionar para gerador de PDF de diárias
  const handleGenerateDiariasPDF = () => {
    if (!viagem) return;
    const query = new URLSearchParams({
      cidade: viagem.municipio,
      setor: viagem.setor || 'DIRETORIA GERAL',
      justificativa: viagem.objetivo || `Ação Itinerante no município de ${viagem.municipio}`,
      deputadoChefe: viagem.responsavel_nome || ''
    });
    router.push(`/dashboard/relatorios/diarias?${query.toString()}`);
  };

  const formatDateFull = (isoString?: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtros de Equipes por Set
  const eq1Servidores = viagem?.servidores?.filter(s => s.equipe_set === 'Equipe 1') || [];
  const eq2Servidores = viagem?.servidores?.filter(s => s.equipe_set === 'Equipe 2') || [];
  const apoioServidores = viagem?.servidores?.filter(s => !['Equipe 1', 'Equipe 2'].includes(s.equipe_set)) || [];

  const totalChecklist = viagem?.checklist?.length || 0;
  const doneChecklist = viagem?.checklist?.filter(c => c.concluido).length || 0;
  const progressPercent = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Botão de Voltar */}
          <div>
            <button
              onClick={() => router.push('/dashboard/viagens')}
              className="inline-flex items-center space-x-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm transition-all"
            >
              <FiArrowLeft className="w-4 h-4" />
              <span>Voltar para Gestão de Viagens</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 text-sm font-medium">Carregando detalhes da viagem...</p>
            </div>
          ) : error || !viagem ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl text-red-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-lg">
                <FiAlertCircle className="w-6 h-6 text-red-500" />
                <span>Erro ao carregar</span>
              </div>
              <p className="text-sm">{error || 'Viagem não encontrada.'}</p>
            </div>
          ) : (
            <>
              {/* Header do Detalhamento */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <FiMapPin className="w-3.5 h-3.5" /> {viagem.municipio}
                      </span>
                      <span className="px-3.5 py-1 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                        {viagem.setor || 'DIRETORIA GERAL'}
                      </span>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                      {viagem.titulo}
                    </h1>

                    {viagem.local_evento && (
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 font-medium">
                        <span className="text-gray-400">Local do Evento:</span> {viagem.local_evento}
                      </p>
                    )}
                  </div>

                  {/* Alterar Status & Gerar PDF */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Status da Viagem</span>
                      <select
                        disabled={updatingStatus}
                        value={viagem.status}
                        onChange={(e) => handleStatusChange(e.target.value as ViagemStatus)}
                        className="bg-gray-50 border border-gray-200 text-gray-800 font-bold text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
                      >
                        <option value="planejada">🔵 Planejada</option>
                        <option value="em_andamento">🟢 Em Andamento</option>
                        <option value="concluida">✅ Concluída</option>
                        <option value="cancelada">🔴 Cancelada</option>
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateDiariasPDF}
                      className="self-end px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center space-x-2"
                    >
                      <FiFileText className="w-4 h-4" />
                      <span>Gerar PDF de Diárias</span>
                    </button>
                  </div>
                </div>

                {/* Grid de Resumo de Datas e Logística */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-1">
                    <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <FiCalendar className="w-4 h-4 text-emerald-600" /> Data e Hora de Ida
                    </span>
                    <p className="text-sm font-extrabold text-emerald-950 capitalize">{formatDateFull(viagem.data_ida)}</p>
                  </div>

                  <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-1">
                    <span className="text-xs font-bold text-teal-800 uppercase flex items-center gap-1">
                      <FiCalendar className="w-4 h-4 text-teal-600" /> Data e Hora de Retorno
                    </span>
                    <p className="text-sm font-extrabold text-teal-950 capitalize">{formatDateFull(viagem.data_retorno)}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                      <FiClock className="w-4 h-4 text-slate-500" /> Período de Atendimento
                    </span>
                    <p className="text-sm font-extrabold text-slate-800">
                      {viagem.dias_acao} {viagem.dias_acao === 1 ? 'dia de ação' : 'dias de ação itinerante'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                      <FiTarget className="w-4 h-4 text-slate-500" /> Meta Prevista
                    </span>
                    <p className="text-sm font-extrabold text-slate-800">{viagem.meta_atendimentos || 0} Atendimentos</p>
                  </div>
                </div>

                {/* Justificativa e Transporte */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {viagem.objetivo && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Objetivos e Justificativa</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        {viagem.objetivo}
                      </p>
                    </div>
                  )}

                  {viagem.transporte_info && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-gray-400 uppercase">Veículo / Transporte</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center gap-2">
                        <FiTruck className="w-4 h-4 text-emerald-600" /> {viagem.transporte_info}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção das Equipes de Servidores Organizadas por Sets */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <FiUsers className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Equipes Escaladas para a Ação</h2>
                      <p className="text-xs text-gray-500">Servidores agrupados por conjuntos de trabalho (Equipe 1 e Equipe 2)</p>
                    </div>
                  </div>

                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl">
                    Total: {viagem.servidores?.length || 0} Servidores
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bloco Equipe 1 */}
                  <div className="bg-teal-50/40 rounded-2xl p-5 border border-teal-100 space-y-3">
                    <div className="flex justify-between items-center border-b border-teal-200/60 pb-2">
                      <h3 className="text-sm font-extrabold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                        Equipe 1
                      </h3>
                      <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-lg">
                        {eq1Servidores.length} Integrantes
                      </span>
                    </div>

                    {eq1Servidores.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum servidor alocado na Equipe 1.</p>
                    ) : (
                      <div className="space-y-2">
                        {eq1Servidores.map((serv, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-teal-100 flex justify-between items-center text-xs shadow-2xs">
                            <div>
                              <p className="font-bold text-gray-800">{serv.nome}</p>
                              <p className="text-gray-500 text-[11px]">{serv.funcao_na_viagem || 'Atendente'}</p>
                            </div>
                            {serv.matricula && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                                Mat: {serv.matricula}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bloco Equipe 2 */}
                  <div className="bg-sky-50/40 rounded-2xl p-5 border border-sky-100 space-y-3">
                    <div className="flex justify-between items-center border-b border-sky-200/60 pb-2">
                      <h3 className="text-sm font-extrabold text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                        Equipe 2
                      </h3>
                      <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-lg">
                        {eq2Servidores.length} Integrantes
                      </span>
                    </div>

                    {eq2Servidores.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum servidor alocado na Equipe 2.</p>
                    ) : (
                      <div className="space-y-2">
                        {eq2Servidores.map((serv, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-sky-100 flex justify-between items-center text-xs shadow-2xs">
                            <div>
                              <p className="font-bold text-gray-800">{serv.nome}</p>
                              <p className="text-gray-500 text-[11px]">{serv.funcao_na_viagem || 'Atendente'}</p>
                            </div>
                            {serv.matricula && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                                Mat: {serv.matricula}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Apoio ou Outros */}
                {apoioServidores.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">Equipe de Apoio e Logística</h3>
                      <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2.5 py-0.5 rounded-lg">{apoioServidores.length} Integrantes</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {apoioServidores.map((serv, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-xl border border-gray-200 text-xs">
                          <p className="font-bold text-gray-800">{serv.nome}</p>
                          <p className="text-gray-500 text-[10px]">{serv.funcao_na_viagem || 'Apoio'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Seção de Checklist Interativo Logístico */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <FiCheckSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Checklist Logístico Pré-Viagem</h2>
                      <p className="text-xs text-gray-500">Marque as etapas concluídas para a liberação da ação</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl">
                    {doneChecklist} de {totalChecklist} concluídos ({progressPercent}%)
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Itens do Checklist */}
                {!viagem.checklist || viagem.checklist.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum item de checklist cadastrado para esta viagem.</p>
                ) : (
                  <div className="space-y-2">
                    {viagem.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => item.id && handleToggleChecklist(item.id, item.concluido)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          item.concluido
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-white border-gray-200 hover:border-emerald-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.concluido ? (
                            <FiCheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <FiSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.concluido ? 'line-through text-emerald-800' : ''}`}>
                            {item.item}
                          </span>
                        </div>

                        <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                          item.concluido ? 'bg-emerald-200/60 text-emerald-900' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.concluido ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </DashboardGuard>
  );
}
