'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { AtendimentoObservacao } from '@/types/supabase';
import jsPDF from 'jspdf';
import {
  FiX, FiUser, FiMail, FiCalendar, FiClock, FiFileText,
  FiAlertCircle, FiSave, FiTrash2, FiMessageSquare, FiSend,
  FiCheckCircle, FiXCircle, FiLock, FiDownload, FiEye
} from 'react-icons/fi';

export interface Atendimento {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  solicitante: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
  observacoes?: string;
  fotos_coletadas?: boolean;
  atendente_nome?: string;
  assinatura_base64?: string;
  nome_recebedor?: string;
  cpf_recebedor?: string;
  vinculo?: string;
  data_entrega?: string;
  data_hora_entrega?: string;
}

interface AtendimentoModalProps {
  atendimento: Atendimento;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: Atendimento) => void;
  onDelete?: (id: number) => void;
}

export default function AtendimentoModal({
  atendimento,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}: AtendimentoModalProps) {
  const [formData, setFormData] = useState<Partial<Atendimento>>(atendimento);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { isAdmin, isSuperAdmin } = usePermissions();
  const { user } = useAuth();

  // Estados para histórico de observações
  const [historicoObservacoes, setHistoricoObservacoes] = useState<AtendimentoObservacao[]>([]);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [addingObservacao, setAddingObservacao] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  // Estados para visualização de comprovante
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [gerandoComprovante, setGerandoComprovante] = useState(false);

  const canDelete = isAdmin || isSuperAdmin;

  useEffect(() => {
    if (isOpen) {
      setFormData(atendimento);
      setValidationErrors({});
      fetchCurrentUserName();
      fetchObservacoes();
    }
  }, [isOpen, atendimento]);

  const fetchCurrentUserName = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email')
        .eq('auth_id', user.id)
        .single();

      if (!error && data) {
        setCurrentUserName(data.name);
        setCurrentUserEmail(data.email);
      }
    } catch (err) {
      console.error('Erro ao buscar nome do usuário:', err);
    }
  };

  const fetchObservacoes = async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token || !atendimento.id) return;

      const response = await fetch(`/api/atendimentos-observacoes?atendimento_id=${atendimento.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistoricoObservacoes(data);
      }
    } catch (err) {
      console.error('Erro ao buscar observações:', err);
    }
  };

  const handleAddObservacao = async () => {
    if (!novaObservacao.trim()) return;

    setAddingObservacao(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) {
        throw new Error('Não autenticado');
      }

      const response = await fetch('/api/atendimentos-observacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          atendimento_id: atendimento.id,
          observacao: novaObservacao.trim(),
          usuario_email: currentUserEmail,
          usuario_nome: currentUserName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao adicionar observação');
      }

      // Recarregar observações
      await fetchObservacoes();
      setNovaObservacao('');
    } catch (err: any) {
      console.error('Erro ao adicionar observação:', err);
      alert('Erro ao adicionar observação. Tente novamente.');
    } finally {
      setAddingObservacao(false);
    }
  };

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'bg-emerald-500', icon: <FiCheckCircle className="w-5 h-5" />, label: 'Concluído' };
      case 'em_andamento':
        return { color: 'bg-amber-500', icon: <FiClock className="w-5 h-5" />, label: 'Em andamento' };
      case 'correcao':
        return { color: 'bg-rose-500', icon: <FiAlertCircle className="w-5 h-5" />, label: 'Correção' };
      case 'cancelado':
        return { color: 'bg-slate-500', icon: <FiXCircle className="w-5 h-5" />, label: 'Cancelado' };
      case 'bloqueado':
        return { color: 'bg-slate-600', icon: <FiLock className="w-5 h-5" />, label: 'Bloqueado' };
      case 'entregue':
        return { color: 'bg-blue-500', icon: <FiCheckCircle className="w-5 h-5" />, label: 'Entregue' };
      case 'pendente':
        return { color: 'bg-yellow-500', icon: <FiClock className="w-5 h-5" />, label: 'Pendente' };
      default:
        return { color: 'bg-slate-500', icon: <FiClock className="w-5 h-5" />, label: status };
    }
  };

  if (!isOpen) return null;

  const validateCPF = (cpf: string) => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return 'CPF deve ter 11 dígitos';
    return null;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'E-mail inválido';
    return null;
  };

  const handleChange = (field: keyof Atendimento, value: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }));

    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) setValidationErrors(prev => ({ ...prev, [field]: error }));
    }

    if (field === 'email') {
      const error = validateEmail(value);
      if (error) setValidationErrors(prev => ({ ...prev, [field]: error }));
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const requiredFields: (keyof Atendimento)[] = [
      'nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'
    ];

    const errors: Record<string, string> = {};
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = 'Campo obrigatório';
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('atendimentos')
        .update(formData)
        .eq('id', atendimento.id);

      if (error) throw error;

      onUpdate({ ...atendimento, ...formData } as Atendimento);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar atendimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert('Você não tem permissão para excluir atendimentos.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o atendimento de ${atendimento.nome}?`)) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', atendimento.id);

      if (error) throw error;

      if (onDelete) {
        onDelete(atendimento.id);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir atendimento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleVisualizarComprovante = async () => {
    if (!atendimento.assinatura_base64 || atendimento.status !== 'entregue') {
      alert('Este atendimento não possui comprovante de entrega.');
      return;
    }

    setGerandoComprovante(true);
    try {
      // Buscar nome do atendente
      let atendenteNome = 'Não identificado';
      if (atendimento.atendente_nome) {
        atendenteNome = atendimento.atendente_nome;
      }

      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
      };

      const dataEntrega = atendimento.data_entrega || new Date().toISOString().split('T')[0];
      const dataHoraEntrega = atendimento.data_hora_entrega || new Date().toISOString();
      const horaEntrega = new Date(dataHoraEntrega).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza' });

      // Carregar logo
      const logoUrl = '/logoautismo.png';
      const getBase64FromUrl = async (url: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      const logoBase64 = await getBase64FromUrl(logoUrl);

      // Gerar PDF
      const doc = new jsPDF();

      // Cabeçalho
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 35, 'F');

      // Logo
      doc.setFillColor(255, 255, 255);
      doc.circle(30, 18, 12, 'F');
      doc.addImage(logoBase64, 'PNG', 20, 8, 20, 20);

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text('COMPROVANTE DE ENTREGA', 105, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Carteira de Identidade Nacional', 105, 28, { align: 'center' });

      // Protocolo e Data
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, 40, 174, 16, 3, 3, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('PROTOCOLO:', 24, 50);
      doc.setFont('helvetica', 'normal');
      doc.text(atendimento.protocolo || 'N/A', 70, 50);
      doc.text('DATA/HORA:', 120, 50);
      doc.text(`${formatDate(dataEntrega)} às ${horaEntrega}`, 165, 50, { align: 'center' });

      // Dados do Titular
      const secaoY = 65;
      doc.setFillColor(16, 185, 129);
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, secaoY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO TITULAR', 105, secaoY + 7, { align: 'center' });

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, secaoY + 10, 174, 40, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      const labelStyle = () => { doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129); };
      const valueStyle = () => { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); };

      let yData = secaoY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(atendimento.nome, 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(atendimento.cpf, 60, yData);
      yData += 10;
      labelStyle(); doc.text('Data do Atendimento:', 24, yData); valueStyle(); doc.text(formatDate(atendimento.dia_atual), 90, yData);

      // Dados do Recebedor
      const recebedorY = secaoY + 60;
      doc.setFillColor(16, 185, 129);
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, recebedorY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO RECEBEDOR', 105, recebedorY + 7, { align: 'center' });

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, recebedorY + 10, 174, 50, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);

      yData = recebedorY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(atendimento.nome_recebedor || 'N/A', 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(atendimento.cpf_recebedor || 'N/A', 60, yData);
      yData += 10;
      labelStyle(); doc.text('Vínculo:', 24, yData); valueStyle(); doc.text(atendimento.vinculo || 'N/A', 60, yData);

      // Informações adicionais
      const infoY = recebedorY + 70;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, infoY, 174, 30, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'italic');
      doc.text('Este documento comprova a entrega da Carteira de Identidade Nacional (CIN) ao recebedor', 105, infoY + 10, { align: 'center' });
      doc.text('identificado acima. A entrega foi registrada no sistema com data e hora especificadas.', 105, infoY + 18, { align: 'center' });
      doc.text('Em caso de dúvidas, entre em contato com a Sala Sensorial da ALECE.', 105, infoY + 26, { align: 'center' });

      // Assinatura Digital
      const assinaturaY = 240;
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.roundedRect(18, assinaturaY, 174, 40, 3, 3, 'S');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSINATURA DO RECEBEDOR', 105, assinaturaY + 8, { align: 'center' });

      // Inserir assinatura
      if (atendimento.assinatura_base64) {
        doc.addImage(atendimento.assinatura_base64, 'PNG', 60, assinaturaY + 10, 90, 20);
      }

      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(`${atendimento.nome_recebedor || 'N/A'} - CPF: ${atendimento.cpf_recebedor || 'N/A'}`, 105, assinaturaY + 35, { align: 'center' });

      // Rodapé
      const rodapeY = 285;
      doc.setFillColor(240, 253, 244);
      doc.rect(0, rodapeY - 15, 210, 20, 'F');

      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(0, rodapeY - 15, 210, rodapeY - 15);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('SALA SENSORIAL / ALECE', 105, rodapeY - 10, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(`Emitido em: ${formatDate(dataEntrega)} às ${horaEntrega}`, 105, rodapeY - 3, { align: 'center' });

      doc.setTextColor(80, 80, 80);
      doc.text(`Atendente: ${atendenteNome}`, 105, rodapeY + 3, { align: 'center' });

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('Página 1/1', 105, rodapeY + 9, { align: 'center' });

      // Gerar URL do PDF
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
      alert('Erro ao gerar comprovante. Tente novamente.');
    } finally {
      setGerandoComprovante(false);
    }
  };

  const statusConfig = getStatusConfig(formData.status || '');

  return (
    <>
      {/* Modal de visualização do PDF */}
      {pdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl relative">
            <button
              onClick={() => setPdfUrl(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-all"
            >
              <FiX className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4">Comprovante de Entrega</h3>
            <iframe
              src={pdfUrl}
              className="w-full h-[70vh] border-2 border-slate-200 rounded-xl"
              title="Comprovante PDF"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setPdfUrl(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-all"
              >
                Fechar
              </button>
              <a
                href={pdfUrl}
                download={`comprovante-${atendimento.protocolo}.pdf`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
              >
                <FiDownload className="w-4 h-4" />
                Baixar PDF
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all scale-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex justify-between items-center shadow-lg relative z-20">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FiFileText className="w-6 h-6" />
                Editar Atendimento
              </h2>
              <div className="flex items-center gap-3 mt-1.5 opacity-90">
                <span className="text-white text-sm font-medium bg-white/20 px-2 py-0.5 rounded-md">
                  Protocolo: {atendimento.protocolo}
                </span>
                {atendimento.atendente_nome && (
                  <>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-white text-sm">
                      Atendente: <span className="font-semibold">{atendimento.atendente_nome}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all backdrop-blur-sm"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Formulário */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50 relative">
              <div className="max-w-4xl mx-auto space-y-8">

                {/* Status Section */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Status Atual</label>
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-xl ${statusConfig.color} text-white shadow-md`}>
                      {statusConfig.icon}
                    </div>
                    <div className="flex-1">
                      <select
                        value={formData.status || ''}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-700 bg-white"
                      >
                        <option value="">Selecione um status...</option>
                        <option value="pendente">Pendente</option>
                        <option value="em_andamento">Em Andamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="correcao">Correção</option>
                        <option value="bloqueado">Bloqueado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="entregue">Entregue</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FiUser className="text-emerald-500" /> Informações Pessoais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.nome || ''}
                        onChange={(e) => handleChange('nome', e.target.value)}
                        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium ${validationErrors.nome ? 'border-red-400 ring-4 ring-red-500/10' : ''
                          }`}
                      />
                      {validationErrors.nome && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.nome}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">CPF</label>
                      <input
                        type="text"
                        value={formData.cpf || ''}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium ${validationErrors.cpf ? 'border-red-400 ring-4 ring-red-500/10' : ''
                          }`}
                      />
                      {validationErrors.cpf && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.cpf}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">E-mail</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium ${validationErrors.email ? 'border-red-400 ring-4 ring-red-500/10' : ''
                          }`}
                      />
                      {validationErrors.email && <p className="text-red-500 text-xs mt-1 font-medium">{validationErrors.email}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Solicitante</label>
                      <input
                        type="text"
                        value={formData.solicitante || ''}
                        onChange={(e) => handleChange('solicitante', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendance Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <FiCalendar className="text-emerald-500" /> Dados do Agendamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Data</label>
                      <input
                        type="date"
                        value={formData.dia_atual || ''}
                        onChange={(e) => handleChange('dia_atual', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Horário</label>
                      <input
                        type="time"
                        value={formData.horario || ''}
                        onChange={(e) => handleChange('horario', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Protocolo</label>
                      <input
                        type="text"
                        value={formData.protocolo || ''}
                        onChange={(e) => handleChange('protocolo', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium font-mono text-slate-700"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Sidebar - Chat & Observations */}
            <div className="w-full lg:w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-10">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FiMessageSquare className="text-emerald-600" /> Observações
                </h3>
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  {historicoObservacoes.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {historicoObservacoes.length > 0 ? (
                  historicoObservacoes.map((obs) => (
                    <div key={obs.id} className="flex flex-col animate-fade-in text-sm">
                      <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <p className="text-slate-800 mb-2 leading-relaxed">{obs.observacao}</p>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold text-emerald-600">{obs.usuario_nome || 'Usuário'}</span>
                          <span>{formatChatDate(obs.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <FiMessageSquare className="w-12 h-12 mb-3" />
                    <p className="font-medium">Nenhuma observação.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <div className="relative">
                  <textarea
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    placeholder="Nova observação..."
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleAddObservacao}
                    disabled={!novaObservacao.trim() || addingObservacao}
                    className="absolute right-2 bottom-3 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
                  >
                    {addingObservacao ? (
                      <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <FiSend className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-between gap-4 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)] relative z-30">
            <div className="flex items-center gap-3">
              {atendimento.status === 'entregue' && atendimento.assinatura_base64 && (
                <button
                  onClick={handleVisualizarComprovante}
                  disabled={gerandoComprovante}
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold transition-all flex items-center gap-2 text-sm border border-emerald-200"
                >
                  {gerandoComprovante ? (
                    <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                  ) : <FiEye className="w-4 h-4" />}
                  Ver Comprovante
                </button>
              )}

              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all flex items-center gap-2 text-sm border border-transparent hover:border-red-200"
                >
                  <FiTrash2 className="w-4 h-4" /> Excluir
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform active:scale-95 transition-all text-sm flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
