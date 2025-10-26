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
  FiCheckCircle, FiXCircle, FiLock, FiCreditCard, FiDownload, FiEye
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
  const { isAdmin, isSuperAdmin, role } = usePermissions();
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    }).replace(',', ' as');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'bg-emerald-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Concluído' };
      case 'em_andamento':
        return { color: 'bg-amber-500', icon: <FiClock className="w-4 h-4" />, label: 'Em andamento' };
      case 'correcao':
        return { color: 'bg-rose-500', icon: <FiAlertCircle className="w-4 h-4" />, label: 'Correção' };
      case 'cancelado':
        return { color: 'bg-slate-500', icon: <FiXCircle className="w-4 h-4" />, label: 'Cancelado' };
      case 'bloqueado':
        return { color: 'bg-slate-600', icon: <FiLock className="w-4 h-4" />, label: 'Bloqueado' };
      case 'entregue':
        return { color: 'bg-blue-500', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Entregue' };
      case 'pendente':
        return { color: 'bg-yellow-500', icon: <FiClock className="w-4 h-4" />, label: 'Pendente' };
      default:
        return { color: 'bg-slate-500', icon: <FiClock className="w-4 h-4" />, label: status };
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
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

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Editar Atendimento</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-white/90 text-sm">
                  Protocolo: <span className="font-bold">{atendimento.protocolo}</span>
                </span>
                {atendimento.atendente_nome && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-white/90 text-sm">
                      Atendente: <span className="font-bold">{atendimento.atendente_nome}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Formulário */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Status */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-3">Status do Atendimento</label>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${statusConfig.color} rounded-xl flex items-center justify-center text-white`}>
                    {statusConfig.icon}
                  </div>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold bg-white"
                  >
                    <option value="">Selecione</option>
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

              {/* Informações Pessoais */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-blue-600" />
                  Informações Pessoais
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      value={formData.nome || ''}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                        validationErrors.nome ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                      placeholder="Nome completo"
                    />
                    {validationErrors.nome && <p className="text-red-500 text-sm mt-1">{validationErrors.nome}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">CPF *</label>
                      <input
                        type="text"
                        value={formData.cpf || ''}
                        onChange={(e) => handleChange('cpf', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                          validationErrors.cpf ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="000.000.000-00"
                      />
                      {validationErrors.cpf && <p className="text-red-500 text-sm mt-1">{validationErrors.cpf}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail *</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                          validationErrors.email ? 'border-red-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                        placeholder="email@exemplo.com"
                      />
                      {validationErrors.email && <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Solicitante *</label>
                    <input
                      type="text"
                      value={formData.solicitante || ''}
                      onChange={(e) => handleChange('solicitante', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      placeholder="Nome do solicitante"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Atendimento */}
              <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-purple-600" />
                  Dados do Atendimento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Data *</label>
                    <input
                      type="date"
                      value={formData.dia_atual || ''}
                      onChange={(e) => handleChange('dia_atual', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Horário *</label>
                    <input
                      type="time"
                      value={formData.horario || ''}
                      onChange={(e) => handleChange('horario', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Protocolo *</label>
                    <input
                      type="text"
                      value={formData.protocolo || ''}
                      onChange={(e) => handleChange('protocolo', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      placeholder="Número do protocolo"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Histórico de Observações estilo Chat */}
          <div className="w-96 bg-gradient-to-b from-slate-50 to-slate-100 border-l-2 border-slate-200 flex flex-col">
            {/* Header do Chat */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Observações</h3>
                <p className="text-white/80 text-xs">{historicoObservacoes.length} mensagem{historicoObservacoes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historicoObservacoes.length > 0 ? (
                historicoObservacoes.map((obs) => (
                  <div key={obs.id} className="flex flex-col">
                    <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-200">
                      <p className="text-slate-800 text-sm leading-relaxed mb-2">{obs.observacao}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {obs.usuario_nome || 'Usuário'} - {formatChatDate(obs.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <FiMessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">Nenhuma observação ainda</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input de Nova Mensagem */}
            <div className="p-4 bg-white border-t-2 border-slate-200">
              <div className="mb-3">
                <textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Digite uma observação..."
                  className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none text-sm"
                  rows={3}
                />
              </div>
              <button
                onClick={handleAddObservacao}
                disabled={!novaObservacao.trim() || addingObservacao}
                className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingObservacao ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FiSend className="w-5 h-5" />
                    Enviar Observação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 bg-white px-8 py-4 flex justify-between items-center">
          <div className="flex gap-3">
            {/* Botão Visualizar Comprovante - Só aparece se tiver assinatura */}
            {atendimento.status === 'entregue' && atendimento.assinatura_base64 && (
              <button
                onClick={handleVisualizarComprovante}
                disabled={gerandoComprovante}
                className="px-5 py-3 bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 text-emerald-700 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {gerandoComprovante ? (
                  <>
                    <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <FiEye className="w-5 h-5" />
                    Ver Comprovante
                  </>
                )}
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-3 bg-red-50 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 text-red-600 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <FiTrash2 className="w-5 h-5" />
                Excluir
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <FiX className="w-5 h-5" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
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
