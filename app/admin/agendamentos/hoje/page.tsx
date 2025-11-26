"use client";

import React, { ReactElement, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";
import {
  FiCheck,
  FiX,
  FiPrinter,
  FiClock,
  FiUser,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiLock,
  FiSlash,
  FiArrowLeft,
  FiEdit,
  FiStar,
  FiFileText,
  FiRefreshCw,
  FiFilter,
  FiEye,
  FiEyeOff,
  FiPlus,
} from "react-icons/fi";
import DashboardHeader from "@/components/DashboardHeader";
import EditAppointmentModal from "../../../components/EditAppointmentModal";
import CreateAppointmentModal from "@/components/CreateAppointmentModal";

type AppointmentStatus = 'concluido' | 'ausente' | 'confirmado' | 'bloqueado' | 'cancelado';

interface StatusConfig {
  icon: ReactElement;
  text: string;
  className: string;
}

type StatusConfigMap = Record<AppointmentStatus, StatusConfig>;

interface Agendamento {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data: string;
  horario: string;
  status: AppointmentStatus;
  data_nascimento: string;
  tipo_cancelamento?: string;
  atendimento_preferencial?: boolean;
  atendente_atual_id?: string;
  atendente_atual_nome?: string;
  horario_inicio_atendimento?: string;
}

// Gerar horários de 07:00 até 20:20 (intervalo de 5 minutos)
const HORARIOS = (() => {
  const horarios: string[] = [];
  let hora = 7;
  let minuto = 0;
  const endHour = 20;
  const endMinute = 20;

  while (true) {
    const horaStr = hora.toString().padStart(2, '0');
    const minutoStr = minuto.toString().padStart(2, '0');
    horarios.push(`${horaStr}:${minutoStr}`);

    if (hora === endHour && minuto === endMinute) break;

    minuto += 5;
    if (minuto >= 60) {
      minuto = 0;
      hora += 1;
    }

    if (hora >= 24) break;
  }

  return horarios;
})();

export default function AgendamentosHojePage() {
  const router = useRouter();
  const { user, loading: authLoading, ensureValidSession } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"iniciar" | "cancelar" | "ausente" | "edit" | "delete" | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [showOnlyPreferential, setShowOnlyPreferential] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');

  useEffect(() => {
    checkUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      loadAgendamentos();
      const interval = setInterval(loadAgendamentos, 300000);
      return () => clearInterval(interval);
    }
  }, [hasAccess, selectedDate]);

  const checkUser = async () => {
    try {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        setHasAccess(false);
        setLoading(false);
        router.push('/?session_expired=true');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (userError) {
        setHasAccess(false);
        return;
      }

      setHasAccess(
        userData?.role === "atendente" ||
        userData?.role === "admin" ||
        userData?.role === "superadmin"
      );
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      setHasAccess(false);
    }
  };

  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString + "T12:00:00Z");
      return date.toLocaleDateString("pt-BR", {
        timeZone: "America/Fortaleza",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  }, []);

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial, observacoes, atendente_atual_id, atendente_atual_nome, horario_inicio_atendimento")
        .eq("data", selectedDate)
        .in("status", ["confirmado", "cancelado", "bloqueado", "concluido", "ausente"])
        .order("horario", { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoading(true);

    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        router.push('/?session_expired=true');
        return;
      }

      const { data, error } = await apiClient.put('/api/agendamentos', { id, status: newStatus });

      if (error) {
        // Verificar se é erro de bloqueio (409 Conflict)
        if (error.includes('já está sendo realizado')) {
          alert(error);
          // Recarregar agendamentos para atualizar a interface
          await loadAgendamentos();
          setIsModalOpen(false);
          setSelectedAppointment(null);
          return;
        }
        throw new Error(error);
      }

      setAgendamentos((prevAgendamentos: Agendamento[]) =>
        prevAgendamentos.map((agendamento: Agendamento) =>
          agendamento.id === id
            ? { ...agendamento, status: newStatus as AppointmentStatus }
            : agendamento
        )
      );

      setIsModalOpen(false);
      setSelectedAppointment(null);

      alert(`Status atualizado para "${newStatus}" com sucesso!`);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert(`Erro ao atualizar status: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAppointment = async (updatedAppointment: Agendamento) => {
    setActionLoading(true);

    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        router.push('/?session_expired=true');
        return;
      }

      const { error } = await supabase
        .from("agendamentos")
        .update(updatedAppointment)
        .eq("id", updatedAppointment.id);

      if (error) {
        console.error('Erro ao atualizar agendamento:', error);
        throw error;
      }

      setAgendamentos((prevAgendamentos: Agendamento[]) =>
        prevAgendamentos.map((agendamento: Agendamento) =>
          agendamento.id === updatedAppointment.id
            ? { ...agendamento, ...updatedAppointment }
            : agendamento
        )
      );

      setIsModalOpen(false);
      alert('Agendamento atualizado com sucesso!');
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
      alert("Erro ao atualizar agendamento. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    setActionLoading(true);
    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        router.push('/?session_expired=true');
        return;
      }

      const { data, error } = await apiClient.post('/api/agendamentos', appointmentData);

      if (error) {
        throw new Error(error);
      }

      setAgendamentos((prevAgendamentos: Agendamento[]) =>
        [...prevAgendamentos, data].sort((a, b) => a.horario.localeCompare(b.horario))
      );

      alert('Agendamento criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      alert(`Erro ao criar agendamento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    setActionLoading(true);

    try {
      const sessionValid = await ensureValidSession();
      if (!sessionValid) {
        alert('Sua sessão expirou. Por favor, faça login novamente.');
        router.push('/?session_expired=true');
        return;
      }

      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", id);

      if (error) {
        console.error('Erro ao excluir agendamento:', error);
        throw error;
      }

      setAgendamentos((prevAgendamentos: Agendamento[]) =>
        prevAgendamentos.filter((agendamento: Agendamento) => agendamento.id !== id)
      );

      setIsModalOpen(false);
      setSelectedAppointment(null);
      alert('Agendamento excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err);
      alert("Erro ao excluir agendamento. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };


  const generateReport = async () => {
    if (agendamentos.length === 0) {
      alert('Não há agendamentos para gerar relatório.');
      return;
    }

    setActionLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // helper to load image as base64
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

      const doc = new jsPDF();

      // try to include logo like dashboard reports
      try {
        const logoBase64 = await getBase64FromUrl('/logoautismo.png');
        doc.addImage(logoBase64, 'PNG', 15, 12, 22, 22);
      } catch (e) {
        // ignore image errors
      }

      // Header texts (institutional)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('ASSEMBLEIA LEGISLATIVA DO ESTADO DO CEARÁ', doc.internal.pageSize.width / 2, 20, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('Sala Sensorial - Agendamentos', doc.internal.pageSize.width / 2, 26, { align: 'center' });

      // divider
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, 42, doc.internal.pageSize.width - 15, 42);

      // Title and period
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('RELATÓRIO DE AGENDAMENTOS', doc.internal.pageSize.width / 2, 54, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const periodo = `Data: ${formatDate(selectedDate)} | Total: ${agendamentos.length} agendamentos`;
      doc.text(periodo, doc.internal.pageSize.width / 2, 60, { align: 'center' });

      // helper to extract observacoes text
      const extractObservacoes = (obs: any) => {
        if (!obs) return '';
        if (typeof obs === 'string') {
          try {
            const parsed = JSON.parse(obs);
            if (Array.isArray(parsed)) {
              return parsed.map((p: any) => p.texto || p.observacao || p).join(' | ');
            }
            if (typeof parsed === 'object') return parsed.texto || parsed.observacao || JSON.stringify(parsed);
            return String(parsed);
          } catch (e) {
            return obs;
          }
        }
        if (Array.isArray(obs)) return obs.map(o => o.texto || o.observacao || o).join(' | ');
        if (typeof obs === 'object') return obs.texto || obs.observacao || JSON.stringify(obs);
        return String(obs);
      };

      const tableColumn = ['Horário', 'Nome', 'Telefone', 'CPF', 'Status', 'Observações'];
      const tableRows = agendamentos.map((a: any) => {
        const nome = a.nome || '';
        const nomeShort = nome.length > 25 ? nome.substring(0, 22) + '...' : nome;
        const cpf = (a.cpf || '').toString().replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        const statusLabel = (a.status || '').charAt(0).toUpperCase() + (a.status || '').slice(1).toLowerCase();
        const observacoesText = extractObservacoes(a.observacoes || '');

        return [
          (a.horario || '').substring(0, 5),
          nomeShort,
          a.telefone || '',
          cpf,
          statusLabel,
          observacoesText,
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 66,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
          textColor: [50, 50, 50],
          halign: 'center',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [16, 185, 129], // Green color
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 40, halign: 'left' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 'auto', halign: 'left' }
        },
        alternateRowStyles: { fillColor: [248, 249, 250] },
      });

      // footer with generation date, generated by and pages
      let generatedBy = '';
      try {
        if (user && user.id) {
          const { data: userData } = await supabase.from('users').select('name').eq('auth_id', user.id).single();
          generatedBy = userData?.name || user?.user_metadata?.name || user?.user_metadata?.full_name || '';
        } else {
          generatedBy = user?.user_metadata?.name || user?.user_metadata?.full_name || '';
        }
      } catch (e) {
        generatedBy = user?.user_metadata?.name || user?.user_metadata?.full_name || '';
      }

      const pageCount = (doc as any).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(15, doc.internal.pageSize.height - 20, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 20);
        const now = new Date();
        const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
        doc.text(dataHoraGeracao, 15, doc.internal.pageSize.height - 12);

        if (generatedBy) {
          doc.text(`Gerado por: ${generatedBy}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 12, { align: 'center' });
        }

        const pageText = `Página ${i} de ${pageCount}`;
        const pageTextWidth = doc.getStringUnitWidth(pageText) * 8 / doc.internal.scaleFactor;
        doc.text(pageText, doc.internal.pageSize.width - 15 - pageTextWidth, doc.internal.pageSize.height - 12);
      }

      const fileName = `Agendamentos_${selectedDate.replace(/-/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = useCallback((status: AppointmentStatus): ReactElement | null => {
    const statusConfig: StatusConfigMap = {
      concluido: {
        icon: <FiCheckCircle className="w-3.5 h-3.5" />,
        text: "Concluído",
        className: "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md",
      },
      ausente: {
        icon: <FiXCircle className="w-3.5 h-3.5" />,
        text: "Ausente",
        className: "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md",
      },
      confirmado: {
        icon: <FiCalendar className="w-3.5 h-3.5" />,
        text: "Confirmado",
        className: "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md",
      },
      bloqueado: {
        icon: <FiLock className="w-3.5 h-3.5" />,
        text: "Bloqueado",
        className: "bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md",
      },
      cancelado: {
        icon: <FiSlash className="w-3.5 h-3.5" />,
        text: "Cancelado",
        className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md",
      },
    };

    const config = statusConfig[status];
    return config ? (
      <span className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 font-semibold ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    ) : null;
  }, []);

  // Memoize statistics
  const stats = useMemo(() => ({
    total: agendamentos.length,
    confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
    concluidos: agendamentos.filter(a => a.status === 'concluido').length,
    ausentes: agendamentos.filter(a => a.status === 'ausente').length,
    cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
    preferenciais: agendamentos.filter(a => a.atendimento_preferencial).length,
  }), [agendamentos]);

  const visibleSlots = useMemo(() => {
    let filteredHorarios = HORARIOS;

    if (!showEmptySlots) {
      filteredHorarios = filteredHorarios.filter(horario =>
        agendamentos.some((a: Agendamento) => a.horario === `${horario}:00`)
      );
    }

    if (showOnlyPreferential) {
      filteredHorarios = filteredHorarios.filter(horario => {
        const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
        return agendamentosHorario.some((a: Agendamento) => a.atendimento_preferencial);
      });
    }

    if (selectedStatusFilter !== 'todos') {
      filteredHorarios = filteredHorarios.filter(horario => {
        const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
        return agendamentosHorario.some((a: Agendamento) => a.status === selectedStatusFilter);
      });
    }

    return filteredHorarios.length;
  }, [agendamentos, showEmptySlots, showOnlyPreferential, selectedStatusFilter]);

  const occupiedSlots = useMemo(() =>
    agendamentos.map((a: any) => a.horario.substring(0, 5)),
    [agendamentos]
  );

  const existingAppointments = useMemo(() =>
    agendamentos.map((a: Agendamento) => ({ cpf: a.cpf, nome: a.nome })),
    [agendamentos]
  );

  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center bg-white p-12 rounded-3xl shadow-2xl border border-slate-200">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiLock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">Acesso Negado</h1>
          <p className="text-slate-600 text-lg">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-[1920px] mx-auto px-4 py-6 sm:px-6 lg:px-8 pt-20">
          {/* Header Principal com Gradiente */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl shadow-xl border border-emerald-500/20 p-8 mb-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">Agenda do Dia</h1>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center text-white/90 text-lg backdrop-blur-sm bg-white/10 px-4 py-2 rounded-xl">
                      <FiCalendar className="w-5 h-5 mr-2" />
                      {formatDate(selectedDate)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-sm font-bold border border-white/30">
                        {stats.total} total
                      </span>
                      <span className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-sm font-bold border border-white/30">
                        {stats.confirmados} confirmados
                      </span>
                      <span className="px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl text-sm font-bold border border-white/30">
                        {stats.concluidos} concluídos
                      </span>
                      {stats.preferenciais > 0 && (
                        <span className="px-4 py-2 bg-amber-500/30 backdrop-blur-md text-white rounded-xl text-sm font-bold border border-amber-400/50 flex items-center gap-1.5">
                          <FiStar className="w-4 h-4" />
                          {stats.preferenciais} preferenciais
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Controles de Data */}
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                    className="border-2 border-white/30 bg-white/10 backdrop-blur-md text-white rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-white/50 focus:border-white/50 placeholder-white/60"
                  />
                  <button
                    onClick={() => loadAgendamentos()}
                    disabled={loading}
                    className="flex items-center px-4 py-3 text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl border-2 border-white/30 transition-all duration-300 font-semibold disabled:opacity-50"
                  >
                    <FiRefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Ações e Filtros */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Ações Principais */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group flex items-center px-6 py-3 text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-bold"
                >
                  <FiPlus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Novo Agendamento
                </button>

                <button
                  onClick={generateReport}
                  disabled={agendamentos.length === 0 || actionLoading}
                  className="flex items-center px-6 py-3 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-bold"
                >
                  <FiFileText className="w-5 h-5 mr-2" />
                  {actionLoading ? "Gerando..." : "Gerar PDF"}
                </button>
              </div>

              {/* Filtros */}
              <div className="flex-1 flex flex-wrap gap-3 lg:justify-end">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
                  <FiFilter className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-bold text-slate-700">Filtros:</span>

                  <button
                    onClick={() => setShowEmptySlots(!showEmptySlots)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 font-bold text-sm ${showEmptySlots
                      ? 'text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md'
                      : 'text-slate-600 bg-white border-2 border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {showEmptySlots ? <FiEye className="w-4 h-4 mr-1.5" /> : <FiEyeOff className="w-4 h-4 mr-1.5" />}
                    {showEmptySlots ? 'Ocultar Livres' : 'Mostrar Livres'}
                  </button>

                  <button
                    onClick={() => setShowOnlyPreferential(!showOnlyPreferential)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 font-bold text-sm ${showOnlyPreferential
                      ? 'text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-md'
                      : 'text-slate-600 bg-white border-2 border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    <FiStar className="w-4 h-4 mr-1.5" />
                    {showOnlyPreferential ? 'Todos' : 'Preferenciais'}
                  </button>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as AppointmentStatus | 'todos')}
                    className="px-3 py-2 text-sm rounded-lg border-2 border-slate-300 bg-white hover:border-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-bold text-slate-700"
                  >
                    <option value="todos">Todos Status</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="cancelado">Cancelados</option>
                    <option value="ausente">Ausentes</option>
                    <option value="concluido">Concluídos</option>
                  </select>
                </div>

                <button
                  onClick={() => router.push("/admin/gestao")}
                  className="flex items-center px-6 py-3 text-slate-700 bg-white hover:bg-slate-50 rounded-xl border-2 border-slate-300 hover:border-slate-400 transition-all duration-300 shadow-md hover:shadow-lg font-bold"
                >
                  <FiArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </button>
              </div>
            </div>

            {/* Contagem de horários visíveis */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-center">
                <span className="text-sm font-semibold text-slate-600">
                  Exibindo <span className="text-emerald-600 font-bold text-lg">{visibleSlots}</span> horários
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 animate-pulse min-h-[240px]"
                >
                  <div className="h-6 bg-slate-200 rounded-xl w-1/3 mb-4"></div>
                  <div className="h-5 bg-slate-200 rounded-lg w-2/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded-lg w-1/2 mb-6"></div>
                  <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {HORARIOS.map((horario) => {
                const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
                const hasPreferential = agendamentosHorario.some((a: Agendamento) => a.atendimento_preferencial);
                const hasConcluded = agendamentosHorario.some((a: Agendamento) => a.status === 'concluido');
                const isPassedTime = new Date(`${selectedDate}T${horario}`) < currentTime;
                const isEmpty = agendamentosHorario.length === 0;

                if (!showEmptySlots && isEmpty) return null;
                if (showOnlyPreferential && !hasPreferential) return null;
                if (selectedStatusFilter !== 'todos') {
                  const hasSelectedStatus = agendamentosHorario.some((a: Agendamento) => a.status === selectedStatusFilter);
                  if (!hasSelectedStatus) return null;
                }

                return (
                  <div
                    key={horario}
                    className={`rounded-2xl shadow-lg border-2 transition-all duration-300 min-h-[240px] hover:shadow-2xl hover:scale-[1.02] ${agendamentosHorario.length > 0
                      ? hasPreferential
                        ? "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-300 shadow-amber-200"
                        : hasConcluded
                          ? "bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 border-emerald-300"
                          : "bg-white border-slate-300 hover:border-emerald-400"
                      : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 border-dashed"
                      }`}
                  >
                    <div className="p-5 h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-md ${isPassedTime
                            ? "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700"
                            : isEmpty
                              ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white"
                              : "bg-gradient-to-r from-rose-500 to-red-500 text-white"
                            }`}
                        >
                          <FiClock className="w-4 h-4 mr-2" />
                          <span>{horario}</span>
                        </div>
                        {!isEmpty && (
                          <span className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold shadow-md">
                            Ocupado
                          </span>
                        )}
                      </div>

                      {agendamentosHorario.length > 0 ? (
                        <div className="flex-1 space-y-3">
                          {agendamentosHorario.map((agendamento: Agendamento, index: number) => (
                            <div key={agendamento.id} className={`${index > 0 ? 'border-t-2 border-slate-200 pt-3' : ''}`}>
                              <div className="flex items-center justify-between mb-3">
                                {getStatusBadge(agendamento.status as AppointmentStatus)}
                                {agendamento.atendimento_preferencial && (
                                  <div className="flex items-center px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-md">
                                    <FiStar className="w-3.5 h-3.5 mr-1" />
                                    <span className="text-xs font-bold">Pref</span>
                                  </div>
                                )}
                              </div>

                              {/* Indicador de bloqueio - atendimento em andamento */}
                              {agendamento.atendente_atual_id && (
                                <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-3 mb-3">
                                  <div className="flex items-center text-orange-800">
                                    <FiLock className="w-4 h-4 mr-2 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-bold">Em Atendimento</p>
                                      <p className="text-xs">por: {agendamento.atendente_atual_nome}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2 mb-3">
                                <div className="flex items-center text-slate-800">
                                  <FiUser className="w-4 h-4 mr-2 text-emerald-600" />
                                  <span className="font-bold text-sm truncate">
                                    {agendamento.nome}
                                  </span>
                                </div>
                                <div className="flex items-center text-slate-700">
                                  <FiPhone className="w-4 h-4 mr-2 text-blue-600" />
                                  <span className="text-sm">{agendamento.telefone}</span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(agendamento);
                                    setModalAction("edit");
                                    setIsModalOpen(true);
                                  }}
                                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md hover:shadow-lg"
                                >
                                  <FiEdit className="w-4 h-4 mr-2" />
                                  Editar
                                </button>

                                {agendamento.status === "confirmado" && (
                                  <div className="space-y-2">
                                    <button
                                      onClick={() => {
                                        if (agendamento.atendente_atual_id) {
                                          alert(`Este atendimento já está sendo realizado por ${agendamento.atendente_atual_nome}`);
                                          return;
                                        }
                                        setSelectedAppointment(agendamento);
                                        setModalAction("iniciar");
                                        setIsModalOpen(true);
                                      }}
                                      disabled={!!agendamento.atendente_atual_id}
                                      className={`w-full px-3 py-2.5 text-sm rounded-lg text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md ${agendamento.atendente_atual_id
                                          ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                          : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600'
                                        }`}
                                    >
                                      <FiCheckCircle className="w-4 h-4 mr-2" />
                                      Iniciar Atendimento
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedAppointment(agendamento);
                                          setModalAction("ausente");
                                          setIsModalOpen(true);
                                        }}
                                        className="px-2 py-2 text-xs rounded-lg bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md"
                                      >
                                        <FiXCircle className="w-3.5 h-3.5 mr-1" />
                                        Ausente
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAppointment(agendamento);
                                          setModalAction("cancelar");
                                          setIsModalOpen(true);
                                        }}
                                        className="px-2 py-2 text-xs rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md"
                                      >
                                        <FiSlash className="w-3.5 h-3.5 mr-1" />
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                              <FiClock className="w-8 h-8 text-slate-500" />
                            </div>
                            <p className="text-slate-600 text-sm font-bold">Horário Livre</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedAppointment && isModalOpen && (
        <EditAppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
            setModalAction(null);
          }}
          appointment={selectedAppointment}
          onSave={handleEditAppointment}
          action={modalAction}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteAppointment}
        />
      )}

      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateAppointment}
        selectedDate={selectedDate}
        occupiedSlots={occupiedSlots}
        existingAppointments={existingAppointments}
      />
    </>
  );
}
