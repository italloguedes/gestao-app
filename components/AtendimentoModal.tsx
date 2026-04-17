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
  FiCheckCircle, FiXCircle, FiLock, FiDownload, FiEye,
  FiEdit3, FiHash, FiPhone, FiList
} from 'react-icons/fi';
import AtendimentoHistorico from '@/components/dashboard/AtendimentoHistorico';

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

type TabKey = 'dados' | 'observacoes' | 'historico';

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
  const [activeTab, setActiveTab] = useState<TabKey>('dados');

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
      setActiveTab('dados');
      fetchCurrentUserName();
      fetchObservacoes();
    }
  }, [isOpen, atendimento]);

  const fetchCurrentUserName = async () => {
    // Sempre buscar dados frescos do auth - nunca da tabela public.users
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser) return;
      setCurrentUserName(
        freshUser.user_metadata?.full_name ||
        freshUser.user_metadata?.name ||
        freshUser.email?.split('@')[0] ||
        'Usuário'
      );
      setCurrentUserEmail(freshUser.email || '');
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
        headers: { 'Authorization': `Bearer ${token}` }
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
      if (!token) throw new Error('Não autenticado');
      const response = await fetch('/api/atendimentos-observacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Fortaleza'
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'concluido':
        return { color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Concluído' };
      case 'em_andamento':
        return { color: 'bg-amber-500', ring: 'ring-amber-200', text: 'text-amber-700', bg: 'bg-amber-50', icon: <FiClock className="w-4 h-4" />, label: 'Em andamento' };
      case 'correcao':
        return { color: 'bg-rose-500', ring: 'ring-rose-200', text: 'text-rose-700', bg: 'bg-rose-50', icon: <FiAlertCircle className="w-4 h-4" />, label: 'Correção' };
      case 'cancelado':
        return { color: 'bg-slate-500', ring: 'ring-slate-200', text: 'text-slate-700', bg: 'bg-slate-50', icon: <FiXCircle className="w-4 h-4" />, label: 'Cancelado' };
      case 'bloqueado':
        return { color: 'bg-slate-600', ring: 'ring-slate-200', text: 'text-slate-700', bg: 'bg-slate-50', icon: <FiLock className="w-4 h-4" />, label: 'Bloqueado' };
      case 'entregue':
        return { color: 'bg-blue-500', ring: 'ring-blue-200', text: 'text-blue-700', bg: 'bg-blue-50', icon: <FiCheckCircle className="w-4 h-4" />, label: 'Entregue' };
      case 'pendente':
        return { color: 'bg-yellow-500', ring: 'ring-yellow-200', text: 'text-yellow-700', bg: 'bg-yellow-50', icon: <FiClock className="w-4 h-4" />, label: 'Pendente' };
      default:
        return { color: 'bg-slate-500', ring: 'ring-slate-200', text: 'text-slate-700', bg: 'bg-slate-50', icon: <FiClock className="w-4 h-4" />, label: status };
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
      if (!formData[field]) errors[field] = 'Campo obrigatório';
    });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('atendimentos').update(formData).eq('id', atendimento.id);
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
    if (!canDelete) { alert('Você não tem permissão para excluir atendimentos.'); return; }
    if (!confirm(`Tem certeza que deseja excluir o atendimento de ${atendimento.nome}?`)) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('atendimentos').delete().eq('id', atendimento.id);
      if (error) throw error;
      if (onDelete) onDelete(atendimento.id);
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
      alert('Este atendimento não possui comprovante de entrega.'); return;
    }
    setGerandoComprovante(true);
    try {
      let atendenteNome = 'Não identificado';
      if (atendimento.atendente_nome) atendenteNome = atendimento.atendente_nome;
      const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
      };
      const dataEntrega = atendimento.data_entrega || new Date().toISOString().split('T')[0];
      const dataHoraEntrega = atendimento.data_hora_entrega || new Date().toISOString();
      const horaEntrega = new Date(dataHoraEntrega).toLocaleTimeString('pt-BR', { timeZone: 'America/Fortaleza' });
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
      doc.setFillColor(16, 185, 129); doc.rect(0, 0, 210, 35, 'F');
      doc.setFillColor(255, 255, 255); doc.circle(30, 18, 12, 'F');
      doc.addImage(logoBase64, 'PNG', 20, 8, 20, 20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
      doc.text('COMPROVANTE DE ENTREGA', 105, 18, { align: 'center' });
      doc.setFontSize(14); doc.setFont('helvetica', 'normal');
      doc.text('Carteira de Identidade Nacional', 105, 28, { align: 'center' });
      doc.setFillColor(240, 253, 244); doc.roundedRect(18, 40, 174, 16, 3, 3, 'F');
      doc.setTextColor(16, 185, 129); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('PROTOCOLO:', 24, 50); doc.setFont('helvetica', 'normal');
      doc.text(atendimento.protocolo || 'N/A', 70, 50);
      doc.text('DATA/HORA:', 120, 50);
      doc.text(`${formatDate(dataEntrega)} às ${horaEntrega}`, 165, 50, { align: 'center' });
      const secaoY = 65;
      doc.setFillColor(16, 185, 129); doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, secaoY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO TITULAR', 105, secaoY + 7, { align: 'center' });
      doc.setFillColor(240, 253, 244); doc.roundedRect(18, secaoY + 10, 174, 40, 3, 3, 'F');
      doc.setFontSize(11); doc.setTextColor(80, 80, 80);
      const labelStyle = () => { doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129); };
      const valueStyle = () => { doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40); };
      let yData = secaoY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(atendimento.nome, 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(atendimento.cpf, 60, yData);
      yData += 10;
      labelStyle(); doc.text('Data do Atendimento:', 24, yData); valueStyle(); doc.text(formatDate(atendimento.dia_atual), 90, yData);
      const recebedorY = secaoY + 60;
      doc.setFillColor(16, 185, 129); doc.setTextColor(255, 255, 255);
      doc.roundedRect(18, recebedorY, 174, 10, 3, 3, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('DADOS DO RECEBEDOR', 105, recebedorY + 7, { align: 'center' });
      doc.setFillColor(240, 253, 244); doc.roundedRect(18, recebedorY + 10, 174, 50, 3, 3, 'F');
      doc.setFontSize(11); doc.setTextColor(80, 80, 80);
      yData = recebedorY + 22;
      labelStyle(); doc.text('Nome:', 24, yData); valueStyle(); doc.text(atendimento.nome_recebedor || 'N/A', 60, yData);
      yData += 10;
      labelStyle(); doc.text('CPF:', 24, yData); valueStyle(); doc.text(atendimento.cpf_recebedor || 'N/A', 60, yData);
      yData += 10;
      labelStyle(); doc.text('Vínculo:', 24, yData); valueStyle(); doc.text(atendimento.vinculo || 'N/A', 60, yData);
      const infoY = recebedorY + 70;
      doc.setFillColor(240, 253, 244); doc.roundedRect(18, infoY, 174, 30, 3, 3, 'F');
      doc.setFontSize(10); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'italic');
      doc.text('Este documento comprova a entrega da Carteira de Identidade Nacional (CIN) ao recebedor', 105, infoY + 10, { align: 'center' });
      doc.text('identificado acima. A entrega foi registrada no sistema com data e hora especificadas.', 105, infoY + 18, { align: 'center' });
      doc.text('Em caso de dúvidas, entre em contato com a Sala Sensorial da ALECE.', 105, infoY + 26, { align: 'center' });
      const assinaturaY = 240;
      doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
      doc.roundedRect(18, assinaturaY, 174, 40, 3, 3, 'S');
      doc.setFontSize(12); doc.setTextColor(16, 185, 129); doc.setFont('helvetica', 'bold');
      doc.text('ASSINATURA DO RECEBEDOR', 105, assinaturaY + 8, { align: 'center' });
      if (atendimento.assinatura_base64) {
        doc.addImage(atendimento.assinatura_base64, 'PNG', 60, assinaturaY + 10, 90, 20);
      }
      doc.setFontSize(9); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'normal');
      doc.text(`${atendimento.nome_recebedor || 'N/A'} - CPF: ${atendimento.cpf_recebedor || 'N/A'}`, 105, assinaturaY + 35, { align: 'center' });
      const rodapeY = 285;
      doc.setFillColor(240, 253, 244); doc.rect(0, rodapeY - 15, 210, 20, 'F');
      doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5); doc.line(0, rodapeY - 15, 210, rodapeY - 15);
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(16, 185, 129);
      doc.text('SALA SENSORIAL / ALECE', 105, rodapeY - 10, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text(`Emitido em: ${formatDate(dataEntrega)} às ${horaEntrega}`, 105, rodapeY - 3, { align: 'center' });
      doc.setTextColor(80, 80, 80);
      doc.text(`Atendente: ${atendenteNome}`, 105, rodapeY + 3, { align: 'center' });
      doc.setFont('helvetica', 'italic'); doc.setTextColor(120, 120, 120);
      doc.text('Página 1/1', 105, rodapeY + 9, { align: 'center' });
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

  const handleGerarDeclaracao = async () => {
    try {
      // ── helpers ──────────────────────────────────────────────
      const getBase64FromUrl = async (url: string, useToken?: string) => {
        // URLs públicas do Storage não precisam (e rejeitam) o header de Auth
        const isPrivate = url.includes('/object/authenticated/');
        const headers: Record<string, string> = (isPrivate && useToken)
          ? { Authorization: `Bearer ${useToken}` }
          : {};
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      const formatDateDecl = (dateString: string) =>
        new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Fortaleza' });

      const formatDateExtenso = (dateString: string) =>
        new Date(dateString + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Fortaleza' });

      // ── user / assinatura ─────────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const token = session?.access_token;

      // Combina metadata do freshUser + do user do contexto
      const meta = { ...(user?.user_metadata ?? {}), ...(freshUser?.user_metadata ?? {}) };
      console.log('[declaração] user_metadata:', meta, '| currentUserName:', currentUserName);

      // currentUserName já foi buscado pelo fetchCurrentUserName ao abrir o modal
      const servidorNome = (
        currentUserName ||
        meta.full_name || meta.name || meta.nome || meta.display_name ||
        freshUser?.email?.split('@')[0] ||
        user?.email?.split('@')[0] ||
        'SERVIDOR'
      ).toUpperCase();
      const funcao = meta.funcao || meta.cargo || 'Atendente';
      const matricula = meta.matricula || '';

      let assinaturaBase64: string | null = null;
      const assinaturaUrl: string | undefined = meta.assinatura_url;
      if (assinaturaUrl) {
        try {
          assinaturaBase64 = await getBase64FromUrl(assinaturaUrl, token);
        } catch (e) {
          console.warn('[declaração] Assinatura não carregada:', e);
        }
      }

      // ── logos ─────────────────────────────────────────────────
      const [aleceBase64, salaBase64] = await Promise.all([
        getBase64FromUrl('/alece.png'),
        getBase64FromUrl('/logoautismo.png'),
      ]);

      // ── dados do atendimento ──────────────────────────────────
      const doc = new jsPDF();
      const now = new Date();
      const horaGeracao = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
      const dataGeracao = now.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' });
      const horarioAtendimento = atendimento.horario ? atendimento.horario.substring(0, 5) : horaGeracao;
      const cpfFormatado = atendimento.cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      const dataExtenso = formatDateExtenso(atendimento.dia_atual);
      const pageW = doc.internal.pageSize.getWidth();

      // ── CABEÇALHO ─────────────────────────────────────────────
      doc.setFillColor(5, 95, 60);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.addImage(aleceBase64, 'PNG', 8, 3, 32, 32);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
      doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', pageW / 2, 13, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(200, 240, 220);
      doc.text('Sala Sensorial — Atendimento Especializado | Identidade Nacional', pageW / 2, 23, { align: 'center' });
      doc.addImage(salaBase64, 'PNG', pageW - 40, 3, 32, 32);

      // faixa endereço
      doc.setFillColor(241, 245, 249); doc.rect(0, 38, pageW, 8, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
      doc.text('CNPJ: 07.954.481/0001-04  |  Av. Desembargador Moreira, 2807 — Dionísio Torres — Fortaleza/CE — CEP 60.170-900', pageW / 2, 43, { align: 'center' });

      // ── TÍTULO ────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(5, 95, 60);
      doc.text('D E C L A R A Ç Ã O', pageW / 2, 62, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text('de Comparecimento para Emissão de CIN', pageW / 2, 69, { align: 'center' });
      doc.setDrawColor(5, 95, 60); doc.setLineWidth(1); doc.line(40, 73, pageW - 40, 73);
      doc.setLineWidth(0.3); doc.line(40, 75, pageW - 40, 75);

      // ── PROTOCOLO / DATA ──────────────────────────────────────
      doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.setLineWidth(0.3);
      doc.rect(15, 80, 80, 14, 'FD'); doc.rect(110, 80, 80, 14, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text('PROTOCOLO', 18, 85); doc.text('DATA DO ATENDIMENTO', 113, 85);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text(atendimento.protocolo || 'N/A', 18, 91);
      doc.text(`${formatDateDecl(atendimento.dia_atual)} — ${horarioAtendimento}h`, 113, 91);

      // ── SEÇÃO I — IDENTIFICAÇÃO ───────────────────────────────
      const s1Y = 103;
      doc.setFillColor(5, 95, 60); doc.rect(15, s1Y, pageW - 30, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      doc.text('I.  IDENTIFICAÇÃO DO(A) CIDADÃO(Ã)', 18, s1Y + 5);
      doc.setDrawColor(203, 213, 225); doc.setFillColor(252, 253, 254);
      doc.rect(15, s1Y + 7, pageW - 30, 26, 'FD');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text('Nome Completo:', 18, s1Y + 14); doc.text('CPF:', 18, s1Y + 24);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text(atendimento.nome, 18, s1Y + 20);
      doc.text(cpfFormatado, 18, s1Y + 30);

      // ── SEÇÃO II — DECLARAÇÃO ─────────────────────────────────
      const s2Y = s1Y + 40;
      doc.setFillColor(5, 95, 60); doc.rect(15, s2Y, pageW - 30, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      doc.text('II.  DECLARAÇÃO', 18, s2Y + 5);

      // Texto simplificado — mencionando CIADI
      const textoDecl =
        `Declaramos que o(a) cidadão(ã) ${atendimento.nome}, portador(a) do CPF nº ${cpfFormatado}, ` +
        `compareceu à Sala Sensorial da Assembleia Legislativa do Estado do Ceará — ALECE, ` +
        `vinculada ao CIADI (Centro Integrado de Atendimento Digital e Inclusão), ` +
        `no dia ${dataExtenso}, às ${horarioAtendimento}h, para fins de atendimento referente ` +
        `à emissão da Carteira de Identidade Nacional — CIN.`;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
      doc.text(textoDecl, 18, s2Y + 18, { maxWidth: pageW - 36, align: 'justify', lineHeightFactor: 1.8 });

      const dataLocalY = s2Y + 68;
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
      doc.text(`Fortaleza/CE, ${dataExtenso}.`, pageW / 2, dataLocalY, { align: 'center' });

      // ── SEÇÃO III — ASSINATURA ────────────────────────────────
      const s3Y = dataLocalY + 14;
      doc.setFillColor(5, 95, 60); doc.rect(15, s3Y, pageW - 30, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      doc.text('III.  IDENTIFICAÇÃO E ASSINATURA DO SERVIDOR RESPONSÁVEL', 18, s3Y + 5);

      // Assinatura (imagem)
      if (assinaturaBase64) {
        doc.addImage(assinaturaBase64, 'PNG', 65, s3Y + 9, 80, 22);
      }

      // Linha de assinatura
      const linhaY = s3Y + 33;
      doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.4);
      doc.line(50, linhaY, pageW - 50, linhaY);

      // Nome e função do servidor
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text(servidorNome, pageW / 2, linhaY + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
      const subText = matricula ? `${funcao} — Matrícula: ${matricula}` : funcao;
      doc.text(subText, pageW / 2, linhaY + 13, { align: 'center' });
      doc.text('Sala Sensorial | ALECE', pageW / 2, linhaY + 19, { align: 'center' });

      // ── RODAPÉ ────────────────────────────────────────────────
      const rodapeY = 272;
      doc.setFillColor(5, 95, 60); doc.rect(0, rodapeY, pageW, 0.8, 'F');
      doc.setFillColor(241, 245, 249); doc.rect(0, rodapeY + 0.8, pageW, 25, 'F');
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text('Declaração emitida pela Sala Sensorial da ALECE para fins de comprovação de comparecimento.', pageW / 2, rodapeY + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(`Emitido em: ${dataGeracao} às ${horaGeracao}  |  Protocolo: ${atendimento.protocolo || 'N/A'}  |  Página 1 de 1`, pageW / 2, rodapeY + 15, { align: 'center' });

      doc.save(`declaracao-${atendimento.nome.replace(/\s+/g, '-').toLowerCase()}-${atendimento.protocolo}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar declaração:', err);
      alert('Erro ao gerar declaração. Tente novamente.');
    }
  };

  const statusConfig = getStatusConfig(formData.status || '');

  const TABS: { key: TabKey; label: string; icon: React.ReactElement; badge?: number }[] = [
    { key: 'dados', label: 'Dados', icon: <FiEdit3 className="w-4 h-4" /> },
    { key: 'observacoes', label: 'Notas', icon: <FiMessageSquare className="w-4 h-4" />, badge: historicoObservacoes.length },
    { key: 'historico', label: 'Histórico', icon: <FiList className="w-4 h-4" /> },
  ];

  const InputField = ({ label, icon, value, onChange, type = 'text', error, mono, placeholder }: {
    label: string; icon: React.ReactElement; value: string; onChange: (v: string) => void;
    type?: string; error?: string; mono?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-3 py-2.5 bg-slate-50/80 border-2 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all text-sm font-medium ${mono ? 'font-mono' : ''} ${error ? 'border-red-300 bg-red-50/50 ring-2 ring-red-100' : 'border-slate-200'}`}
        />
      </div>
      {error && <p className="text-red-500 text-[11px] mt-0.5 font-bold">{error}</p>}
    </div>
  );

  return (
    <>
      {/* Modal PDF */}
      {pdfUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-2xl relative">
            <button onClick={() => setPdfUrl(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-all">
              <FiX className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-3">Comprovante de Entrega</h3>
            <iframe src={pdfUrl} className="w-full h-[65vh] border-2 border-slate-200 rounded-xl" title="Comprovante PDF" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPdfUrl(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-all text-sm">Fechar</button>
              <a href={pdfUrl} download={`comprovante-${atendimento.protocolo}.pdf`} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-sm">
                <FiDownload className="w-4 h-4" /> Baixar
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">

          {/* Header compacto */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                <FiFileText className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">{atendimento.nome}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-white/80 text-[11px] font-mono bg-white/15 px-1.5 py-0.5 rounded">{atendimento.protocolo}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.icon} {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center text-white transition-all flex-shrink-0 ml-2">
              <FiX className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-white flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all relative ${
                  activeTab === tab.key
                    ? 'text-emerald-700'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{tab.badge}</span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-emerald-600 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">

            {/* ─── TAB DADOS ─── */}
            {activeTab === 'dados' && (
              <div className="p-4 space-y-4">

                {/* Status */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border-2 border-slate-200">
                  <div className={`w-10 h-10 rounded-xl ${statusConfig.color} ring-4 ${statusConfig.ring} text-white flex items-center justify-center flex-shrink-0 shadow`}>
                    {statusConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status</label>
                    <select
                      value={formData.status || ''}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-bold text-slate-800 text-sm bg-white"
                    >
                      <option value="">Selecione...</option>
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
                <fieldset className="border-2 border-slate-200 rounded-xl overflow-hidden">
                  <legend className="ml-3 px-2 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <FiUser className="w-3.5 h-3.5" /> Informações Pessoais
                  </legend>
                  <div className="p-3 space-y-3 -mt-1">
                    <InputField label="Nome Completo" icon={<FiUser className="w-4 h-4" />}
                      value={formData.nome || ''} onChange={(v) => handleChange('nome', v)}
                      error={validationErrors.nome} />

                    <div className="grid grid-cols-2 gap-3">
                      <InputField label="CPF" icon={<FiHash className="w-4 h-4" />}
                        value={formData.cpf || ''} onChange={(v) => handleChange('cpf', v)}
                        error={validationErrors.cpf} mono />
                      <InputField label="E-mail" icon={<FiMail className="w-4 h-4" />}
                        value={formData.email || ''} onChange={(v) => handleChange('email', v)}
                        error={validationErrors.email} type="email" />
                    </div>

                    <InputField label="Solicitante" icon={<FiUser className="w-4 h-4" />}
                      value={formData.solicitante || ''} onChange={(v) => handleChange('solicitante', v)} />
                  </div>
                </fieldset>

                {/* Dados do agendamento */}
                <fieldset className="border-2 border-slate-200 rounded-xl overflow-hidden">
                  <legend className="ml-3 px-2 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <FiCalendar className="w-3.5 h-3.5" /> Agendamento
                  </legend>
                  <div className="p-3 space-y-3 -mt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <InputField label="Data" icon={<FiCalendar className="w-4 h-4" />}
                        value={formData.dia_atual || ''} onChange={(v) => handleChange('dia_atual', v)} type="date" />
                      <InputField label="Horário" icon={<FiClock className="w-4 h-4" />}
                        value={formData.horario || ''} onChange={(v) => handleChange('horario', v)} type="time" />
                    </div>
                    <InputField label="Protocolo" icon={<FiFileText className="w-4 h-4" />}
                      value={formData.protocolo || ''} onChange={(v) => handleChange('protocolo', v)} mono />
                  </div>
                </fieldset>

                {/* Gerar Declaração */}
                <button
                  onClick={handleGerarDeclaracao}
                  className="w-full py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm border-2 border-indigo-200"
                >
                  <FiFileText className="w-4 h-4" />
                  Gerar Declaração
                </button>

                {/* Comprovante */}
                {atendimento.status === 'entregue' && atendimento.assinatura_base64 && (
                  <button
                    onClick={handleVisualizarComprovante}
                    disabled={gerandoComprovante}
                    className="w-full py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm border-2 border-blue-200"
                  >
                    {gerandoComprovante ? (
                      <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                    ) : <FiEye className="w-4 h-4" />}
                    Ver Comprovante de Entrega
                  </button>
                )}
              </div>
            )}

            {/* ─── TAB OBSERVAÇÕES ─── */}
            {activeTab === 'observacoes' && (
              <div className="flex flex-col h-full" style={{ minHeight: '350px' }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {historicoObservacoes.length > 0 ? (
                    historicoObservacoes.map((obs) => (
                      <div key={obs.id} className="group">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow transition-shadow">
                          <p className="text-slate-800 text-sm leading-relaxed">{obs.observacao}</p>
                          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                            <span className="font-bold text-emerald-600">{obs.usuario_nome || 'Usuário'}</span>
                            <span>{formatChatDate(obs.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-16">
                      <FiMessageSquare className="w-10 h-10 mb-2" />
                      <p className="font-bold text-sm">Sem observações</p>
                      <p className="text-xs text-slate-400 mt-1">Adicione uma abaixo</p>
                    </div>
                  )}
                </div>

                {/* Input de nova obs */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex-shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      value={novaObservacao}
                      onChange={(e) => setNovaObservacao(e.target.value)}
                      placeholder="Escreva uma observação..."
                      className="flex-1 px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all resize-none text-sm"
                      rows={2}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddObservacao(); } }}
                    />
                    <button
                      onClick={handleAddObservacao}
                      disabled={!novaObservacao.trim() || addingObservacao}
                      className="self-end px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:bg-slate-300 transition-all font-bold text-sm flex items-center gap-1.5 flex-shrink-0"
                    >
                      {addingObservacao ? (
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      ) : (
                        <FiSend className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB HISTÓRICO ─── */}
            {activeTab === 'historico' && (
              <AtendimentoHistorico atendimentoId={atendimento.id} />
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t-2 border-slate-100 px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              {canDelete && (
                <button onClick={handleDelete} disabled={saving}
                  className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg font-bold transition-all flex items-center gap-1.5 text-xs">
                  <FiTrash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold transition-all text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 rounded-lg font-bold shadow-md active:scale-95 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><FiSave className="w-4 h-4" /> Salvar</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
