'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import { AtendimentoObservacao } from '@/types/supabase';
import Loading from '@/components/Loading';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiClock,
  FiFileText,
  FiEdit,
  FiSave,
  FiX,
  FiTrash2,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiSlash,
  FiMessageSquare,
  FiPlus,
  FiArrowLeft,
  FiCreditCard,
  FiPrinter,
} from 'react-icons/fi';
import jsPDF from 'jspdf';

interface Atendimento {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  solicitante: string;
  protocolo: string;
  dia_atual: string;
  horario: string;
  status: string;
  observacoes: string;
  atendente_nome?: string;
  usuario_id?: string;
  data_entrega?: string;
  data_hora_entrega?: string;
  nome_recebedor?: string;
  cpf_recebedor?: string;
  vinculo?: string;
  assinatura_base64?: string;
}

interface Props {
  id: string;
}

export default function AtendimentoDetalhes({ id }: Props) {
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAtendimento, setEditedAtendimento] = useState<Partial<Atendimento>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [novaObservacao, setNovaObservacao] = useState('');
  const [addingObservacao, setAddingObservacao] = useState(false);
  const [historicoObservacoes, setHistoricoObservacoes] = useState<AtendimentoObservacao[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchCurrentUserName();
    fetchAtendimento();
    fetchObservacoes();
  }, [user, router, id]);

  const fetchCurrentUserName = async () => {
    if (!user) return;

    setCurrentUserName(user.user_metadata?.name || user.user_metadata?.full_name || 'Usuário');
    setCurrentUserEmail(user.email || '');
  };

  const fetchObservacoes = async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;

      if (!token) return;

      const response = await fetch(`/api/atendimentos-observacoes?atendimento_id=${id}`, {
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

  const fetchAtendimento = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Atendimento não encontrado');

      setAtendimento(data);
      setEditedAtendimento(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          atendimento_id: parseInt(id),
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
      setError(err.message);
    } finally {
      setAddingObservacao(false);
    }
  };

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

  const handleInputChange = (field: keyof Atendimento, value: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }));

    if (field === 'cpf') {
      const error = validateCPF(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }

    if (field === 'email') {
      const error = validateEmail(value);
      if (error) {
        setValidationErrors(prev => ({ ...prev, [field]: error }));
      }
    }

    setEditedAtendimento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!editedAtendimento) return;

    const requiredFields: (keyof Atendimento)[] = ['nome', 'cpf', 'email', 'solicitante', 'protocolo', 'dia_atual', 'horario', 'status'];
    const newValidationErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!editedAtendimento[field]) {
        newValidationErrors[field] = 'Este campo é obrigatório';
      }
    });

    if (Object.keys(newValidationErrors).length > 0) {
      setValidationErrors(newValidationErrors);
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .update(editedAtendimento)
        .eq('id', id);

      if (error) throw error;

      setAtendimento(editedAtendimento as Atendimento);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedAtendimento(atendimento || {});
    setValidationErrors({});
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.push('/dashboard/atendimentos');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarComprovante = async () => {
    if (!atendimento || atendimento.status !== 'entregue') {
      alert('Este atendimento não está marcado como entregue.');
      return;
    }

    if (!atendimento.nome_recebedor || !atendimento.cpf_recebedor) {
      alert('Este atendimento não possui dados do recebedor.');
      return;
    }

    try {
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

      const doc = new jsPDF();
      const dataEntrega = atendimento.data_entrega || new Date().toISOString().split('T')[0];
      const horaEntrega = atendimento.data_hora_entrega
        ? new Date(atendimento.data_hora_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // ===== CABEÇALHO =====
      doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', 105, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Sala Sensorial - Atendimento Especializado', 105, 21, { align: 'center' });
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, 40, 195, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('COMPROVANTE DE ENTREGA', 105, 50, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('Carteira de Identidade Nacional - CIN', 105, 57, { align: 'center' });

      // Protocolo e data
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(15, 65, 85, 18);
      doc.rect(110, 65, 85, 18);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('PROTOCOLO Nº', 18, 70);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(atendimento.protocolo || 'N/A', 18, 78);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('DATA E HORA DA ENTREGA', 113, 70);
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatDate(dataEntrega)} - ${horaEntrega}`, 113, 78);

      // Titular
      const secaoY = 93;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('I. DADOS DO TITULAR DO DOCUMENTO', 15, secaoY);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(15, secaoY + 2, 195, secaoY + 2);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, secaoY + 5, 180, 38, 'FD');

      const labelStyle = () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
      };
      const valueStyle = () => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
      };

      let yData = secaoY + 12;
      labelStyle();
      doc.text('Nome Completo:', 18, yData);
      valueStyle();
      doc.text(atendimento.nome, 18, yData + 5);
      yData += 13;
      labelStyle();
      doc.text('CPF:', 18, yData);
      valueStyle();
      doc.text(atendimento.cpf, 18, yData + 5);
      labelStyle();
      doc.text('Data do Atendimento:', 110, yData);
      valueStyle();
      doc.text(formatDate(atendimento.dia_atual), 110, yData + 5);

      // Recebedor
      const recebedorY = secaoY + 50;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('II. IDENTIFICAÇÃO DO RECEBEDOR', 15, recebedorY);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(15, recebedorY + 2, 195, recebedorY + 2);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(15, recebedorY + 5, 180, 38, 'FD');
      yData = recebedorY + 12;
      labelStyle();
      doc.text('Nome Completo:', 18, yData);
      valueStyle();
      doc.text(atendimento.nome_recebedor, 18, yData + 5);
      yData += 13;
      labelStyle();
      doc.text('CPF:', 18, yData);
      valueStyle();
      doc.text(atendimento.cpf_recebedor, 18, yData + 5);
      labelStyle();
      doc.text('Vínculo com o Titular:', 110, yData);
      valueStyle();
      doc.text(atendimento.vinculo || 'N/A', 110, yData + 5);

      // Declaração
      const infoY = recebedorY + 50;
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const declaracao = [
        'Declaro que recebi nesta data a Carteira de Identidade Nacional (CIN) acima identificada,',
        'estando o documento em perfeitas condições. Confirmo a veracidade das informações prestadas',
        'e assumo total responsabilidade pela guarda e uso do documento.'
      ];
      declaracao.forEach((linha, index) => {
        doc.text(linha, 105, infoY + (index * 5), { align: 'center' });
      });

      // Assinatura
      const assinaturaY = 210;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text('III. ASSINATURA E CONFIRMAÇÃO DE RECEBIMENTO', 15, assinaturaY);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(15, assinaturaY + 2, 195, assinaturaY + 2);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.rect(15, assinaturaY + 8, 180, 45, 'FD');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fortaleza/CE, ${formatDate(dataEntrega)}`, 105, assinaturaY + 16, { align: 'center' });

      // VERIFICAR SE TEM ASSINATURA SALVA
      if (atendimento.assinatura_base64) {
        // Tem assinatura digital salva - incluir no PDF
        doc.addImage(atendimento.assinatura_base64, 'PNG', 60, assinaturaY + 20, 90, 22);
      } else {
        // Não tem assinatura - deixar espaço para assinatura manual
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.4);
        doc.line(45, assinaturaY + 35, 165, assinaturaY + 35);
      }

      doc.setFontSize(9);
      doc.text(atendimento.nome_recebedor, 105, assinaturaY + 47, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`CPF: ${atendimento.cpf_recebedor}`, 105, assinaturaY + 51, { align: 'center' });

      // Rodapé
      const rodapeY = 270;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, rodapeY, 195, rodapeY);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Documento emitido por:', 15, rodapeY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(atendimento.atendente_nome || 'Sistema', 15, rodapeY + 9);
      doc.setFont('helvetica', 'normal');
      doc.text('Data e hora de emissão:', 105, rodapeY + 5, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`${formatDate(dataEntrega)} às ${horaEntrega}`, 105, rodapeY + 9, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Página:', 195, rodapeY + 5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text('1 de 1', 195, rodapeY + 9, { align: 'right' });
      doc.setLineWidth(0.3);
      doc.line(15, rodapeY + 12, 195, rodapeY + 12);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('Este documento possui validade legal como comprovante de entrega.', 105, rodapeY + 17, { align: 'center' });
      doc.text('Assembleia Legislativa do Estado do Ceará - Sala Sensorial', 105, rodapeY + 21, { align: 'center' });

      // Abrir PDF
      doc.save(`comprovante-${atendimento.protocolo}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar comprovante:', err);
      alert('Erro ao gerar comprovante. Tente novamente.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Fortaleza'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Fortaleza'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return {
          color: 'from-emerald-500 to-green-500',
          icon: <FiCheckCircle className="w-5 h-5" />,
          label: 'Concluído'
        };
      case 'em_andamento':
        return {
          color: 'from-amber-500 to-orange-500',
          icon: <FiClock className="w-5 h-5" />,
          label: 'Em andamento'
        };
      case 'correcao':
        return {
          color: 'from-rose-500 to-red-500',
          icon: <FiAlertCircle className="w-5 h-5" />,
          label: 'Correção'
        };
      case 'cancelado':
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiXCircle className="w-5 h-5" />,
          label: 'Cancelado'
        };
      case 'bloqueado':
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiLock className="w-5 h-5" />,
          label: 'Bloqueado'
        };
      case 'entregue':
        return {
          color: 'from-blue-500 to-indigo-500',
          icon: <FiCheckCircle className="w-5 h-5" />,
          label: 'Entregue'
        };
      default:
        return {
          color: 'from-slate-500 to-gray-600',
          icon: <FiSlash className="w-5 h-5" />,
          label: status
        };
    }
  };

  if (loading) return <Loading />;
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200 max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Erro</h2>
        <p className="text-center text-slate-600">{error}</p>
      </div>
    </div>
  );
  if (!atendimento) return <div>Atendimento não encontrado</div>;

  const statusConfig = getStatusConfig(atendimento.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <FiFileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">Detalhes do Atendimento</h1>
                    <p className="text-white/80 text-sm">Protocolo: {atendimento.protocolo}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Botão Gerar Comprovante - só aparece se entregue */}
                {atendimento.status === 'entregue' && atendimento.nome_recebedor && (
                  <button
                    onClick={handleGerarComprovante}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold shadow-lg hover:shadow-xl"
                    title={atendimento.assinatura_base64 ? 'Gerar comprovante com assinatura digital' : 'Gerar comprovante para impressão'}
                  >
                    <FiPrinter className="w-5 h-5" />
                    Gerar Comprovante
                  </button>
                )}

                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold shadow-lg hover:shadow-xl"
                  >
                    <FiEdit className="w-5 h-5" />
                    Editar
                  </button>
                ) : (
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold"
                  >
                    <FiX className="w-5 h-5" />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl border-2 border-white/30 transition-all duration-300 font-bold"
                >
                  <FiArrowLeft className="w-5 h-5" />
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status e Atendente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <div className={`w-10 h-10 bg-gradient-to-br ${statusConfig.color} rounded-xl flex items-center justify-center text-white`}>
                {statusConfig.icon}
              </div>
              Status do Atendimento
            </h3>
            {isEditing ? (
              <select
                value={editedAtendimento.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
              >
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="correcao">Correção</option>
                <option value="cancelado">Cancelado</option>
                <option value="bloqueado">Bloqueado</option>
                <option value="entregue">Entregue</option>
              </select>
            ) : (
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${statusConfig.color} text-white rounded-xl font-bold shadow-md`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            )}
          </div>

          {atendimento.atendente_nome && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                  <FiUser className="w-5 h-5" />
                </div>
                Atendente Responsável
              </h3>
              <p className="text-2xl font-bold text-slate-800">{atendimento.atendente_nome}</p>
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Informações Pessoais */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <FiUser className="w-5 h-5 text-white" />
              </div>
              Informações Pessoais
            </h2>
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Nome Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.nome || ''}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${validationErrors.nome ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.nome}</p>
                )}
                {validationErrors.nome && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.nome}</p>}
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiCreditCard className="w-4 h-4" />
                  CPF
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.cpf || ''}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${validationErrors.cpf ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.cpf}</p>
                )}
                {validationErrors.cpf && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.cpf}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiMail className="w-4 h-4" />
                  E-mail
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedAtendimento.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 font-semibold ${validationErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-emerald-500 focus:border-emerald-500'
                      }`}
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl break-all">{atendimento.email}</p>
                )}
                {validationErrors.email && <p className="text-red-500 text-sm mt-1 font-medium">{validationErrors.email}</p>}
              </div>

              {/* Solicitante */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Solicitante
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.solicitante || ''}
                    onChange={(e) => handleInputChange('solicitante', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.solicitante}</p>
                )}
              </div>
            </div>
          </div>

          {/* Informações do Atendimento */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <FiCalendar className="w-5 h-5 text-white" />
              </div>
              Informações do Atendimento
            </h2>
            <div className="space-y-4">
              {/* Data */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiCalendar className="w-4 h-4" />
                  Data
                </label>
                <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">
                  {formatDate(atendimento.dia_atual)}
                </p>
              </div>

              {/* Horário */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  Horário
                </label>
                <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">
                  {formatTime(atendimento.horario)}
                </p>
              </div>

              {/* Protocolo */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Protocolo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedAtendimento.protocolo || ''}
                    onChange={(e) => handleInputChange('protocolo', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-semibold"
                  />
                ) : (
                  <p className="text-lg font-semibold text-slate-800 bg-slate-50 px-4 py-3 rounded-xl">{atendimento.protocolo}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Histórico de Observações */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <FiMessageSquare className="w-5 h-5 text-white" />
            </div>
            Histórico de Observações
          </h2>

          {/* Timeline de Observações */}
          {historicoObservacoes.length > 0 ? (
            <div className="space-y-4 mb-6">
              {historicoObservacoes.map((obs) => (
                <div key={obs.id} className="relative pl-8 pb-4 border-l-2 border-slate-200 last:border-0">
                  <div className="absolute -left-2 top-0 w-4 h-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full border-2 border-white"></div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white">
                          <FiUser className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-800">{obs.usuario_nome || 'Usuário'}</span>
                      </div>
                      <span className="text-sm text-slate-500 font-medium">{formatDateTime(obs.created_at)}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{obs.observacao}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-xl mb-6">
              <FiMessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma observação registrada ainda</p>
            </div>
          )}

          {/* Adicionar Nova Observação */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FiPlus className="w-4 h-4" />
              Adicionar Nova Observação
            </label>
            <textarea
              value={novaObservacao}
              onChange={(e) => setNovaObservacao(e.target.value)}
              placeholder="Digite sua observação aqui..."
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none font-medium"
              rows={4}
            />
            <button
              onClick={handleAddObservacao}
              disabled={!novaObservacao.trim() || addingObservacao}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {addingObservacao ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adicionando...
                </>
              ) : (
                <>
                  <FiPlus className="w-5 h-5" />
                  Adicionar Observação
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <FiTrash2 className="w-5 h-5" />
            Excluir Atendimento
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <FiSave className="w-5 h-5" />
              Salvar Alterações
            </button>
          )}
        </div>

        {/* Modal de Confirmação de Exclusão */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-center text-slate-800 mb-4">Confirmar Exclusão</h3>
              <p className="text-slate-600 text-center mb-8 leading-relaxed">
                Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita e todos os dados serão perdidos permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
