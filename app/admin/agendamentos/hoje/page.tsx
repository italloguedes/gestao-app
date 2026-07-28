"use client";

import React, { ReactElement, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AppointmentStatus = 'concluido' | 'ausente' | 'confirmado' | 'bloqueado' | 'cancelado' | 'chamando';

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
  observacoes?: string;
  locked_by?: string;
  locked_at?: string;
  posto?: string;
  user_id?: string;
  criado_por_nome?: string;
  locked_by_nome?: string;
}

const POSTOS = [
  { id: 'Alece Itinerante I', nome: 'Alece Itinerante I', color: 'blue' },
  { id: 'Alece Itinerante II', nome: 'Alece Itinerante II', color: 'purple' },
  { id: 'Sala Sensorial', nome: 'Sala Sensorial', color: 'emerald' },
];

const HORARIOS = (() => {
  const slots: string[] = [];
  let hora = 7;
  let minuto = 0;
  const endHour = 22;

  while (hora < endHour) {
    const horaStr = hora.toString().padStart(2, "0");
    const minutoStr = minuto.toString().padStart(2, "0");
    slots.push(`${horaStr}:${minutoStr}`);

    minuto += 5;
    if (minuto >= 60) {
      minuto = 0;
      hora += 1;
    }
  }
  return slots;
})();

export default function AgendamentosHojePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasAgendamentosHojeAccess, isRecepcao, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-CA');
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal states
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"edit" | "iniciar" | "ausente" | "cancelar" | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStatusFilters, setReportStatusFilters] = useState<Record<string, boolean>>({
    confirmado: true,
    ausente: true,
    concluido: true,
    cancelado: true,
  });

  // Filter states
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [showOnlyPreferential, setShowOnlyPreferential] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [selectedPosto, setSelectedPosto] = useState('Alece Itinerante I');
  const [coletasPendentes, setColetasPendentes] = useState(0);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial, observacoes, locked_by, locked_at, posto, user_id")
        .eq("data", selectedDate)
        .eq("posto", selectedPosto)
        .in("status", ["confirmado", "cancelado", "bloqueado", "concluido", "ausente", "chamando"])
        .order("horario", { ascending: true });

      if (error) throw error;

      const agendamentosData = data || [];
      const userIds = Array.from(
        new Set([
          ...agendamentosData.map((a: any) => a.user_id),
          ...agendamentosData.map((a: any) => a.locked_by)
        ].filter(Boolean))
      );

      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("auth_id, name, email")
          .in("auth_id", userIds);

        if (usersData) {
          usersData.forEach((u: any) => {
            if (u.auth_id) {
              userMap[u.auth_id] = u.name || u.email || 'Usuário';
            }
          });
        }
      }

      const agendamentosComCriador = agendamentosData.map((a: any) => {
        let criadoPor = 'Agendamento Online';
        if (a.user_id && userMap[a.user_id]) {
          criadoPor = userMap[a.user_id];
        } else if (a.user_id) {
          criadoPor = 'Usuário Cadastrado';
        } else if (a.observacoes && a.observacoes.toLowerCase().includes('pré-agendamento')) {
          criadoPor = 'Pré-Agendamento';
        }

        let lockedByNome = undefined;
        if (a.locked_by && userMap[a.locked_by]) {
          lockedByNome = userMap[a.locked_by];
        }

        return {
          ...a,
          criado_por_nome: criadoPor,
          locked_by_nome: lockedByNome,
        };
      });

      setAgendamentos(agendamentosComCriador);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    // Atualização otimista imediata (0ms) das cores e status do card
    setAgendamentos(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: newStatus as AppointmentStatus, locked_by: undefined, locked_at: undefined, locked_by_nome: undefined }
        : a
    ));

    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus as AppointmentStatus, locked_by: null, locked_at: null })
        .eq("id", id);

      if (error) throw error;
      setIsModalOpen(false);
      loadAgendamentos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do agendamento.");
      loadAgendamentos();
    }
  };

  const handleEditAppointment = async (updatedAppointment: Agendamento) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({
          nome: updatedAppointment.nome,
          email: updatedAppointment.email,
          cpf: updatedAppointment.cpf,
          telefone: updatedAppointment.telefone,
          data: updatedAppointment.data,
          horario: updatedAppointment.horario,
          data_nascimento: updatedAppointment.data_nascimento,
          observacoes: updatedAppointment.observacoes,
          atendimento_preferencial: updatedAppointment.atendimento_preferencial,
          posto: updatedAppointment.posto,
          status: updatedAppointment.status,
        })
        .eq("id", updatedAppointment.id);

      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao editar agendamento:", error);
      alert("Erro ao editar agendamento.");
    }
  };

  const handleCreateAppointment = async (newAppointment: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const response = await fetch("/api/agendamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newAppointment),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar agendamento");
      }

      await loadAgendamentos();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      alert("Erro ao criar agendamento.");
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    try {
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      alert("Erro ao excluir agendamento.");
    }
  };

  const toggleReportStatusFilter = (status: string) => {
    setReportStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const generateReport = async () => {
    setIsReportModalOpen(false);
    setActionLoading(true);
    try {
      // Filtrar agendamentos pelos status selecionados
      const activeFilters = Object.entries(reportStatusFilters)
        .filter(([_, active]) => active)
        .map(([status]) => status);

      const filteredAgendamentos = agendamentos.filter(a => activeFilters.includes(a.status));

      if (filteredAgendamentos.length === 0) {
        alert('Nenhum agendamento encontrado com os filtros selecionados.');
        setActionLoading(false);
        return;
      }

      // 1. Buscar dados do atendente
      let atendenteNome = 'Não identificado';
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('name')
          .eq('auth_id', user.id)
          .single();

        if (!userError && userData?.name) {
          atendenteNome = userData.name;
        }
      }

      const doc = new jsPDF();

      // Configurações de estilo
      const primaryColor = [0, 135, 81] as [number, number, number]; // Verde ALECE
      const secondaryColor = [248, 249, 250] as [number, number, number]; // Cinza mais claro

      // --- CABEÇALHO ---
      // Fundo verde
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const title = 'RELATÓRIO DE AGENDAMENTOS DO DIA';
      const titleWidth = doc.getStringUnitWidth(title) * 16 / doc.internal.scaleFactor;
      doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 14);

      // Subtítulo (Data)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const subtitle = `Data: ${formatDate(selectedDate)}`;
      const subtitleWidth = doc.getStringUnitWidth(subtitle) * 11 / doc.internal.scaleFactor;
      doc.text(subtitle, (doc.internal.pageSize.width - subtitleWidth) / 2, 22);

      // Filtros aplicados
      doc.setFontSize(9);
      const statusLabels: Record<string, string> = {
        confirmado: 'Confirmados',
        ausente: 'Ausentes',
        concluido: 'Concluídos',
        cancelado: 'Cancelados',
      };
      const filterText = `Filtros: ${activeFilters.map(s => statusLabels[s] || s).join(', ')}`;
      const filterWidth = doc.getStringUnitWidth(filterText) * 9 / doc.internal.scaleFactor;
      doc.text(filterText, (doc.internal.pageSize.width - filterWidth) / 2, 28);

      // Resumo de total
      const totalText = `Total: ${filteredAgendamentos.length} ${filteredAgendamentos.length === 1 ? 'registro' : 'registros'}`;
      const totalWidth = doc.getStringUnitWidth(totalText) * 9 / doc.internal.scaleFactor;
      doc.text(totalText, (doc.internal.pageSize.width - totalWidth) / 2, 34);


      // --- TABELA ---
      const tableColumn = ['Horário', 'Nome', 'CPF', 'Criado Por', 'Telefone', 'Status'];
      const tableRows = filteredAgendamentos.map(a => [
        a.horario?.substring(0, 5) || '',
        a.nome,
        a.cpf,
        a.criado_por_nome || 'Online',
        a.telefone,
        a.status.charAt(0).toUpperCase() + a.status.slice(1),
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: {
          fontSize: 7,
          cellPadding: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
          textColor: [50, 50, 50],
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Horário
          1: { cellWidth: 'auto', halign: 'left' },                  // Nome
          2: { cellWidth: 30, halign: 'center' },                     // CPF
          3: { cellWidth: 30, halign: 'center' },                     // Criado Por
          4: { cellWidth: 28, halign: 'center' },                     // Telefone
          5: { cellWidth: 22, halign: 'center' },                     // Status
        },
        alternateRowStyles: {
          fillColor: secondaryColor
        },
        margin: { left: 15, right: 15 },

        // --- RODAPÉ (PÁGINAS) ---
        didDrawPage: (data) => {
          const pageCount = (doc as any).getNumberOfPages();
          const currentPage = (doc as any).getCurrentPageInfo().pageNumber;
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height;
          const pageWidth = pageSize.width;

          // Linha separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);

          // Data de emissão (Esquerda)
          const now = new Date();
          const dateStr = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          doc.text(dateStr, 15, pageHeight - 10);

          // Atendente (Centro)
          const userStr = `Atendente: ${atendenteNome}`;
          const userWidth = doc.getStringUnitWidth(userStr) * 8 / doc.internal.scaleFactor;
          doc.text(userStr, (pageWidth - userWidth) / 2, pageHeight - 10);

          // Paginação (Direita)
          const pageStr = `Página ${currentPage} de ${pageCount}`;
          const pageStrWidth = doc.getStringUnitWidth(pageStr) * 8 / doc.internal.scaleFactor;
          doc.text(pageStr, pageWidth - 15 - pageStrWidth, pageHeight - 10);
        }
      });

      doc.save(`agendamentos-${selectedDate}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Buscar coletas de digitais pendentes
  const loadColetasPendentes = useCallback(async () => {
    try {
      const hoje = new Date().toLocaleDateString('en-CA');
      const { count, error } = await supabase
        .from('atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('dia_atual', hoje)
        .eq('status', 'em_andamento')
        .eq('fotos_coletadas', false);

      if (!error) {
        setColetasPendentes(count || 0);
      }
    } catch (err) {
      console.error('Erro ao buscar coletas pendentes:', err);
    }
  }, []);

  useEffect(() => {
    loadColetasPendentes();
    const interval = setInterval(loadColetasPendentes, 15000);
    return () => clearInterval(interval);
  }, [loadColetasPendentes]);

  useEffect(() => {
    const checkUser = async () => {
      if (permissionsLoading) return;
      if (!user || !hasAgendamentosHojeAccess) {
        router.push("/admin/login");
      }
    };
    checkUser();
  }, [user, hasAgendamentosHojeAccess, permissionsLoading, router]);

  useEffect(() => {
    loadAgendamentos();

    // Set up real-time subscription for immediate updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
        },
        () => {
          loadAgendamentos();
        }
      )
      .subscribe();

    // Set up a polling interval as a fallback (every 30 seconds)
    const interval = setInterval(() => {
      loadAgendamentos();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedPosto]);

  const getStatusBadge = useCallback((status: AppointmentStatus): ReactElement | null => {
    const statusConfig: StatusConfigMap = {
      chamando: {
        icon: <FiRefreshCw className="w-3.5 h-3.5 animate-spin" />,
        text: "Chamando",
        className: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md",
      },
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
    agendamentos
      .map((a: any) => a.horario.substring(0, 5)),
    [agendamentos]
  );

  const existingAppointments = useMemo(() =>
    agendamentos.map((a: Agendamento) => ({ cpf: a.cpf, nome: a.nome })),
    [agendamentos]
  );

  if (!user || !hasAgendamentosHojeAccess) {
    // Show loading state while checking permissions
    if (permissionsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      );
    }

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

                  {/* Coletas de Digitais Pendentes - Destaque */}
                  <Link
                    href="/dashboard/coleta-digitais"
                    className="group flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-md rounded-xl border-2 border-amber-400/50 hover:border-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 transition-all duration-300 cursor-pointer"
                  >
                    <div className="relative">
                      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                      {coletasPendentes > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                          {coletasPendentes > 9 ? '9+' : coletasPendentes}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm leading-tight">Coleta de Digitais</p>
                      <p className="text-amber-100 text-xs font-semibold">
                        {coletasPendentes > 0
                          ? `${coletasPendentes} pendente${coletasPendentes !== 1 ? 's' : ''}`
                          : 'Nenhuma pendente'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
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
          {/* Tabs de Postos */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              {POSTOS.map((posto) => {
                const isActive = selectedPosto === posto.id;
                const colorClasses = {
                  emerald: isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50'
                    : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200',
                  blue: isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200/50'
                    : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200',
                  purple: isActive
                    ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-200/50'
                    : 'bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border border-slate-200',
                }[posto.color];

                return (
                  <button
                    key={posto.id}
                    onClick={() => setSelectedPosto(posto.id)}
                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 transform hover:-translate-y-0.5 ${colorClasses}`}
                  >
                    {posto.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barra de Ações e Filtros */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Ações Principais */}
              <div className="flex flex-wrap gap-3">
                {!isRecepcao && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="group flex items-center px-6 py-3 text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-bold"
                  >
                    <FiPlus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Novo Agendamento
                  </button>
                )}

                <button
                  onClick={() => setIsReportModalOpen(true)}
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
                const isBeingAttended = (a: Agendamento) => Boolean(a.locked_by && a.status !== 'concluido' && a.status !== 'cancelado' && a.status !== 'ausente');
                const hasBeingAttended = agendamentosHorario.some(isBeingAttended);
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
                    className={`relative rounded-2xl transition-all duration-200 min-h-[250px] flex flex-col ${agendamentosHorario.length > 0
                      ? hasBeingAttended
                        ? "bg-indigo-50/50 border-2 border-indigo-300 shadow-sm"
                        : hasPreferential
                          ? "bg-amber-50/40 border border-amber-300 shadow-xs"
                          : hasConcluded
                            ? "bg-emerald-50/40 border border-emerald-200 shadow-xs"
                            : "bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md"
                      : "bg-slate-50/60 border border-dashed border-slate-200"
                      }`}
                  >
                    <div className="p-5 flex flex-col h-full">
                      {/* Header do Card */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`flex items-center rounded-xl px-3.5 py-1.5 text-sm font-semibold shadow-xs ${hasBeingAttended
                            ? "bg-indigo-600 text-white"
                            : isPassedTime
                              ? "bg-slate-200 text-slate-500 font-mono"
                              : isEmpty
                                ? "bg-white text-slate-600 border border-slate-200 font-mono"
                                : "bg-slate-900 text-white font-mono"
                            }`}
                        >
                          <FiClock className={`w-3.5 h-3.5 mr-2 ${isEmpty ? "text-slate-400" : "text-white/80"}`} />
                          <span className="tracking-wide text-sm">{horario}</span>
                        </div>

                        {!isEmpty ? (
                          <div className="flex items-center gap-1.5">
                            {agendamentosHorario.map((agendamento) => {
                              const inAtt = isBeingAttended(agendamento);
                              const statusColor = inAtt
                                ? "bg-indigo-600 ring-indigo-200"
                                : ({
                                    confirmado: "bg-sky-500",
                                    concluido: "bg-emerald-500",
                                    cancelado: "bg-red-500",
                                    ausente: "bg-amber-500",
                                    bloqueado: "bg-slate-500",
                                    chamando: "bg-purple-500"
                                  }[agendamento.status] || "bg-gray-400");

                              return (
                                <span key={agendamento.id} className={`w-2.5 h-2.5 rounded-full ${statusColor} block ring-2 ring-white`}></span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Livre
                          </span>
                        )}
                      </div>

                      {/* Conteúdo do Card */}
                      {agendamentosHorario.length > 0 ? (
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-3.5">
                            {agendamentosHorario.map((agendamento: Agendamento, index: number) => {
                              const inAttendance = isBeingAttended(agendamento);
                              const isMine = agendamento.locked_by === user?.id;
                              const attendantName = isMine ? "você" : (agendamento.locked_by_nome || "outro atendente");

                              return (
                                <div key={agendamento.id} className={`${index > 0 ? 'border-t border-slate-100 pt-3.5' : ''}`}>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    {/* Status Badge */}
                                    {(() => {
                                      if (inAttendance) {
                                        return (
                                          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 text-white shadow-xs inline-flex items-center gap-1.5" title={`Em atendimento por: ${attendantName}`}>
                                            <FiRefreshCw className="w-3 h-3 animate-spin text-white/90" />
                                            Em atendimento por <strong>{attendantName}</strong>
                                          </span>
                                        );
                                      }

                                      const config = {
                                        chamando: { text: "Chamando", class: "bg-purple-50 text-purple-700 border-purple-200" },
                                        concluido: { text: "Concluído", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                        ausente: { text: "Ausente", class: "bg-rose-50 text-rose-700 border-rose-200" },
                                        confirmado: { text: "Confirmado", class: "bg-sky-50 text-sky-700 border-sky-200" },
                                        bloqueado: { text: "Bloqueado", class: "bg-slate-100 text-slate-700 border-slate-200" },
                                        cancelado: { text: "Cancelado", class: "bg-amber-50 text-amber-700 border-amber-200" },
                                      }[agendamento.status as AppointmentStatus] || { text: agendamento.status, class: "bg-gray-100 text-gray-700" };

                                      return (
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${config.class} inline-flex items-center`}>
                                          {config.text}
                                        </span>
                                      );
                                    })()}

                                    {agendamento.atendimento_preferencial && (
                                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                        <FiStar className="w-3 h-3 fill-amber-500 text-amber-500" />
                                        Preferencial
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1 mb-3">
                                    <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2" title={agendamento.nome}>
                                      {agendamento.nome}
                                    </h3>
                                    <div className="flex items-center text-slate-500 font-medium text-xs">
                                      <FiPhone className="w-3.5 h-3.5 mr-1.5 opacity-70 shrink-0" />
                                      {agendamento.telefone}
                                    </div>
                                    {agendamento.criado_por_nome && (
                                      <div className="flex items-center text-slate-500 text-xs pt-1 border-t border-slate-100/80" title={`Agendamento criado por: ${agendamento.criado_por_nome}`}>
                                        <FiUser className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                        <span className="truncate">Por: <strong className="text-slate-700 font-medium">{agendamento.criado_por_nome}</strong></span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Ações */}
                                  <div className="pt-1 flex flex-col gap-2">
                                    <button
                                      onClick={() => {
                                        if (isRecepcao) {
                                          alert('Você não tem permissão para gerenciar agendamentos.');
                                          return;
                                        }
                                        setSelectedAppointment(agendamento);
                                        setModalAction("edit");
                                        setIsModalOpen(true);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center justify-center"
                                    >
                                      <FiEye className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                                      {isRecepcao ? 'Ver Detalhes' : 'Gerenciar'}
                                    </button>

                                    {agendamento.status === "confirmado" && !isRecepcao && (
                                      <button
                                        onClick={() => {
                                          if (!user) return;
                                          if (agendamento.locked_by && agendamento.locked_by !== user.id) {
                                            const lockedByName = (agendamento as any).locked_by_nome || "outro atendente";
                                            alert(`Este agendamento está sendo atendido por: ${lockedByName}`);
                                            return;
                                          }

                                          const currentUserName = user.user_metadata?.name || user.user_metadata?.full_name || 'você';
                                          const lockTime = new Date().toISOString();

                                          // 1. Atualização OTIMISTA imediata (0ms) da cor do card e do atendente no grid
                                          setAgendamentos(prev => prev.map(a =>
                                            a.id === agendamento.id
                                              ? { ...a, locked_by: user.id, locked_at: lockTime, locked_by_nome: currentUserName }
                                              : a
                                          ));

                                          // 2. Abrir modal INSTANTANEAMENTE (0ms)
                                          const updatedAgendamento = {
                                            ...agendamento,
                                            locked_by: user.id,
                                            locked_at: lockTime,
                                            locked_by_nome: currentUserName
                                          };
                                          setSelectedAppointment(updatedAgendamento);
                                          setModalAction("iniciar");
                                          setIsModalOpen(true);

                                          // 3. Bloqueio no banco em background
                                          if (agendamento.locked_by !== user.id) {
                                            supabase
                                              .from("agendamentos")
                                              .update({
                                                locked_by: user.id,
                                                locked_at: lockTime
                                              })
                                              .eq("id", agendamento.id)
                                              .then(({ error }: { error: any }) => {
                                                if (error) {
                                                  console.error("Error locking appointment:", error);
                                                  loadAgendamentos();
                                                }
                                              });
                                          }
                                        }}
                                        className={`w-full px-3.5 py-2 text-xs rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs ${
                                          inAttendance
                                            ? "bg-indigo-600 hover:bg-indigo-700"
                                            : "bg-emerald-600 hover:bg-emerald-700"
                                        }`}
                                      >
                                        <FiCheckCircle className="w-3.5 h-3.5" />
                                        {inAttendance && isMine ? "Continuar Atendimento" : "Iniciar Atendimento"}
                                      </button>
                                    )}
                                    {!isRecepcao && (
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                          onClick={() => {
                                            setSelectedAppointment(agendamento);
                                            setModalAction("ausente");
                                            setIsModalOpen(true);
                                          }}
                                          className="px-2 py-1.5 text-xs rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200/80 transition-colors flex items-center justify-center gap-1"
                                        >
                                          <FiXCircle className="w-3 h-3" />
                                          Ausente
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedAppointment(agendamento);
                                            setModalAction("cancelar");
                                            setIsModalOpen(true);
                                          }}
                                          className="px-2 py-1.5 text-xs rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold border border-amber-200/80 transition-colors flex items-center justify-center gap-1"
                                        >
                                          <FiSlash className="w-3 h-3" />
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 group-hover:text-emerald-400 transition-colors">
                          <FiPlus className="w-8 h-8 opacity-50 mb-2 group-hover:scale-110 transition-transform duration-300" />
                          <span className="text-sm font-medium">Livre</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div >
      </div >

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
      )
      }

      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateAppointment}
        selectedDate={selectedDate}
        occupiedSlots={occupiedSlots}
        existingAppointments={existingAppointments}
        posto={selectedPosto}
      />

      {/* Modal de Filtros do Relatório */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiFileText className="w-6 h-6" />
                Gerar Relatório PDF
              </h2>
              <p className="text-purple-100 text-sm mt-1">Selecione os status para incluir no relatório</p>
            </div>

            {/* Filtros */}
            <div className="p-6 space-y-3">
              {[
                { key: 'confirmado', label: 'Confirmados', icon: <FiCheckCircle className="w-5 h-5" />, color: 'blue' },
                { key: 'ausente', label: 'Ausentes', icon: <FiXCircle className="w-5 h-5" />, color: 'rose' },
                { key: 'concluido', label: 'Concluídos', icon: <FiCheck className="w-5 h-5" />, color: 'emerald' },
                { key: 'cancelado', label: 'Cancelados', icon: <FiSlash className="w-5 h-5" />, color: 'amber' },
              ].map(({ key, label, icon, color }) => {
                const isActive = reportStatusFilters[key];
                const colorMap: Record<string, { active: string; inactive: string }> = {
                  blue: {
                    active: 'bg-blue-50 border-blue-300 text-blue-700',
                    inactive: 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
                  },
                  rose: {
                    active: 'bg-rose-50 border-rose-300 text-rose-700',
                    inactive: 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
                  },
                  emerald: {
                    active: 'bg-emerald-50 border-emerald-300 text-emerald-700',
                    inactive: 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
                  },
                  amber: {
                    active: 'bg-amber-50 border-amber-300 text-amber-700',
                    inactive: 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100',
                  },
                };
                const colors = colorMap[color];
                return (
                  <button
                    key={key}
                    onClick={() => toggleReportStatusFilter(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 font-semibold ${
                      isActive ? colors.active : colors.inactive
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      isActive ? 'bg-current border-current' : 'border-slate-300'
                    }`}>
                      {isActive && <FiCheck className="w-3.5 h-3.5 text-white" />}
                    </div>
                    {icon}
                    <span className="text-sm">{label}</span>
                    <span className="ml-auto text-xs font-bold opacity-75">
                      {agendamentos.filter(a => a.status === key).length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Info */}
            <div className="px-6 pb-2">
              <p className="text-xs text-slate-500 text-center">
                O relatório incluirá: <strong>Nome</strong>, <strong>CPF</strong>, <strong>Data</strong> e <strong>Telefone</strong>
              </p>
            </div>

            {/* Ações */}
            <div className="px-6 pb-6 pt-3 flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={generateReport}
                disabled={!Object.values(reportStatusFilters).some(v => v)}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FiPrinter className="w-4 h-4" />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
