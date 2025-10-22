"use client";

import React, { ReactElement, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
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
} from "react-icons/fi";
import DashboardHeader from "@/components/DashboardHeader";
import EditAppointmentModal from "../../../components/EditAppointmentModal";
import CreateAppointmentModal from "@/components/CreateAppointmentModal";
import SimpleConfirmModal from "@/components/SimpleConfirmModal";

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
}

// Gerar 100 horários por dia (7:00 às 18:00 com intervalos de 6 minutos)
const HORARIOS = (() => {
  const horarios = [];
  for (let hora = 7; hora < 18; hora++) {
    for (let minuto = 0; minuto < 60; minuto += 5) {
      const horaStr = hora.toString().padStart(2, '0');
      const minutoStr = minuto.toString().padStart(2, '0');
      horarios.push(`${horaStr}:${minutoStr}`);
    }
  }
  return horarios;
})();

export default function AgendamentosHojePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"iniciar" | "concluido" | "cancelar" | "ausente" | "edit" | "delete" | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSimpleConfirm, setShowSimpleConfirm] = useState(false);
  const [simpleConfirmData, setSimpleConfirmData] = useState<{id: number, nome: string, action: string} | null>(null);
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [showOnlyPreferential, setShowOnlyPreferential] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');

  useEffect(() => {
    checkUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hasAccess) {
      loadAgendamentos();
      const interval = setInterval(loadAgendamentos, 300000);
      return () => clearInterval(interval);
    }
  }, [hasAccess, selectedDate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", user.id)
          .single();

        if (userError) {
          console.error("Erro ao verificar permissões:", userError);
          setHasAccess(false);
          return;
        }

        // Permitir acesso para atendente, admin e superadmin
        setHasAccess(
          userData?.role === "atendente" ||
          userData?.role === "admin" ||
          userData?.role === "superadmin"
        );
      }
    } catch (err) {
      console.error("Erro ao verificar usuário:", err);
      setHasAccess(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T12:00:00Z");
      return date.toLocaleDateString("pt-BR", {
        timeZone: "America/Fortaleza",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return dateString;
    }
  };

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial")
        .eq("data", selectedDate)
        .in("status", ["confirmado", "cancelado", "bloqueado", "concluido", "ausente"])
        .order("horario", { ascending: true });

      if (error) {
        console.error("Erro na consulta:", error);
        throw error;
      }
      
      setAgendamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    console.log('🔄 handleStatusChange: Iniciando', { id, newStatus });
    setActionLoading(true);
    
    try {
      // Atualizar no banco de dados primeiro
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        console.error('❌ handleStatusChange: Erro do Supabase', error);
        throw error;
      }
      
      console.log('✅ handleStatusChange: Atualização bem-sucedida');
      
      // Atualizar o estado local após sucesso no banco
      setAgendamentos((prevAgendamentos: Agendamento[]) => 
        prevAgendamentos.map((agendamento: Agendamento) => 
          agendamento.id === id 
            ? { ...agendamento, status: newStatus as AppointmentStatus }
            : agendamento
        )
      );
      
      // Fechar modais
      setIsModalOpen(false);
      setSelectedAppointment(null);
      setShowSimpleConfirm(false);
      setSimpleConfirmData(null);
      
      // Mostrar mensagem de sucesso
      alert(`Status atualizado para "${newStatus}" com sucesso!`);
    } catch (err) {
      console.error("❌ handleStatusChange: Erro ao atualizar status:", err);
      alert(`Erro ao atualizar status: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAppointment = async (updatedAppointment: Agendamento) => {
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update(updatedAppointment)
        .eq("id", updatedAppointment.id);

      if (error) {
        throw error;
      }
      
      // Atualizar o estado local após sucesso no banco
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
      console.error("Erro ao atualizar agendamento:", err);
      alert("Erro ao atualizar agendamento. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar agendamento');
      }

      const newAppointment = await response.json();
      
      // Adicionar o novo agendamento ao estado local
      setAgendamentos((prevAgendamentos: Agendamento[]) => 
        [...prevAgendamentos, newAppointment].sort((a, b) => a.horario.localeCompare(b.horario))
      );
      
      alert('Agendamento criado com sucesso!');
    } catch (err) {
      console.warn("Erro ao criar agendamento:", err);
      alert(`Erro ao criar agendamento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: number) => {
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from("agendamentos")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
      
      // Remover do estado local após sucesso no banco
      setAgendamentos((prevAgendamentos: Agendamento[]) => 
        prevAgendamentos.filter((agendamento: Agendamento) => agendamento.id !== id)
      );
      
      setIsModalOpen(false);
      setSelectedAppointment(null);
      alert('Agendamento excluído com sucesso!');
    } catch (err) {
      console.error("Erro ao excluir agendamento:", err);
      alert("Erro ao excluir agendamento. Por favor, tente novamente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimpleConfirm = async () => {
    if (!simpleConfirmData) return;
    
    setActionLoading(true);
    try {
      await handleStatusChange(simpleConfirmData.id, simpleConfirmData.action);
      // Os modais já são fechados no handleStatusChange
    } catch (err) {
      console.error("Erro ao confirmar ação:", err);
      alert(`Erro ao ${simpleConfirmData.action}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
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

      const doc = new jsPDF();

      // Cores padrão ALECE
      const primaryColor: [number, number, number] = [0, 135, 81];
      const secondaryColor: [number, number, number] = [248, 249, 250];

      /* ---------- Cabeçalho verde centralizado ---------- */
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      const title = 'Relatório de Agendamentos - Sala Sensorial / ALECE';
      const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
      doc.text(title, (doc.internal.pageSize.width - titleWidth) / 2, 16);

      /* ---------- Informações do dia ---------- */
      doc.setTextColor(90, 90, 90);
      doc.setFontSize(9);
      const periodo = `Data: ${formatDate(selectedDate)}`;
      const total = `Total de Agendamentos: ${agendamentos.length}`;
      const periodoWidth = doc.getStringUnitWidth(periodo) * doc.getFontSize() / doc.internal.scaleFactor;
      const totalWidth = doc.getStringUnitWidth(total) * doc.getFontSize() / doc.internal.scaleFactor;
      const infosWidth = periodoWidth + 20 + totalWidth;
      const infosStartX = (doc.internal.pageSize.width - infosWidth) / 2;
      doc.text(periodo, infosStartX, 30);
      doc.text(total, infosStartX + periodoWidth + 20, 30);

      /* ---------- Linha decorativa ---------- */
      const lineWidth = 170;
      const lineStartX = (doc.internal.pageSize.width - lineWidth) / 2;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(lineStartX, 33, lineStartX + lineWidth, 33);

      /* ---------- Tabela com autoTable (horário, nome, telefone, CPF e status) ---------- */
      const tableColumn = ['Horário', 'Nome', 'Telefone', 'CPF', 'Status'];
      const tableRows = agendamentos.map((a: any) => [
          a.horario,
          a.nome.length > 30 ? a.nome.substring(0, 27) + '...' : a.nome,
          a.telefone,
          a.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
          a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase()
      ]);

      const tableWidth = 160; // Ajustado para 5 colunas
      const marginLeft = (doc.internal.pageSize.width - tableWidth) / 2;

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 38,
          styles: {
              fontSize: 8,
              cellPadding: { top: 1, right: 2, bottom: 1, left: 2 },
              lineColor: [230, 230, 230],
              lineWidth: 0.05,
              minCellHeight: 6,
              cellWidth: 'wrap',
              overflow: 'hidden',
              textColor: [50, 50, 50],
              halign: 'center' // Centraliza todo o conteúdo da tabela
          },
          headStyles: {
              fillColor: primaryColor,
              textColor: [255, 255, 255],
              fontSize: 7.5,
              fontStyle: 'bold',
              halign: 'center',
              cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
              minCellHeight: 8
          },
          columnStyles: {
              0: { cellWidth: 20, halign: 'center' }, // Horário
              1: { cellWidth: 40, halign: 'center' }, // Nome (centralizado)
              2: { cellWidth: 30, halign: 'center' }, // Telefone (centralizado)
              3: { cellWidth: 35, halign: 'center' }, // CPF (centralizado)
              4: { cellWidth: 35, halign: 'center' }  // Status (centralizado)
          },
          alternateRowStyles: {
              fillColor: secondaryColor
          },
          margin: { left: marginLeft },
          rowPageBreak: 'avoid',
          showFoot: 'lastPage'
      });

      /* ---------- Rodapé com data/hora e paginação ---------- */
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(7);
          doc.setTextColor(128, 128, 128);
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
          doc.line(lineStartX, doc.internal.pageSize.height - 15, lineStartX + lineWidth, doc.internal.pageSize.height - 15);
          const now = new Date();
          const dataHoraGeracao = `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;
          doc.text(dataHoraGeracao, marginLeft, doc.internal.pageSize.height - 8);
          const pageText = `Página ${i} de ${pageCount}`;
          const pageTextWidth = doc.getStringUnitWidth(pageText) * doc.getFontSize() / doc.internal.scaleFactor;
          doc.text(pageText, marginLeft + tableWidth - pageTextWidth, doc.internal.pageSize.height - 8);
      }

      const fileName = `Relatorio_Agendamentos_${selectedDate.replace(/-/g, '_')}.pdf`;
      doc.save(fileName);
  } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      alert('Erro ao gerar relatório. Tente novamente.');
  } finally {
      setActionLoading(false);
  }
  };

  const getStatusBadge = (status: AppointmentStatus): ReactElement | null => {
    const statusConfig: StatusConfigMap = {
      concluido: {
        icon: <FiCheckCircle className="w-4 h-4 mr-1.5" />,
        text: "Concluído",
        className: "bg-green-100 text-green-800 border border-green-300",
      },
      ausente: {
        icon: <FiXCircle className="w-4 h-4 mr-1.5" />,
        text: "Ausente",
        className: "bg-rose-50 text-rose-700 border border-rose-200",
      },
      confirmado: {
        icon: <FiCalendar className="w-4 h-4 mr-1.5" />,
        text: "Confirmado",
        className: "bg-sky-50 text-sky-700 border border-sky-200",
      },
      bloqueado: {
        icon: <FiLock className="w-4 h-4 mr-1.5" />,
        text: "Bloqueado",
        className: "bg-slate-50 text-slate-700 border border-slate-200",
      },
      cancelado: {
        icon: <FiSlash className="w-4 h-4 mr-1.5" />,
        text: "Cancelado",
        className: "bg-amber-50 text-amber-700 border border-amber-200",
      },
    };

    const config = statusConfig[status];
    return config ? (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    ) : null;
  };

  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  // Build list of occupied time slots (HH:MM) to filter available times in create modal
  const occupiedSlots = agendamentos.map((a: any) => a.horario.substring(0, 5));
  
  // Calcular quantos horários estão sendo exibidos
  const visibleSlots = (() => {
    let filteredHorarios = HORARIOS;
    
    // Filtrar por horários ocupados se showEmptySlots for false
    if (!showEmptySlots) {
      filteredHorarios = filteredHorarios.filter(horario => 
        agendamentos.some((a: Agendamento) => a.horario === `${horario}:00`)
      );
    }
    
    // Filtrar por atendimentos preferenciais se showOnlyPreferential for true
    if (showOnlyPreferential) {
      filteredHorarios = filteredHorarios.filter(horario => {
        const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
        return agendamentosHorario.some((a: Agendamento) => a.atendimento_preferencial);
      });
    }
    
    // Filtrar por status se selectedStatusFilter não for 'todos'
    if (selectedStatusFilter !== 'todos') {
      filteredHorarios = filteredHorarios.filter(horario => {
        const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
        return agendamentosHorario.some((a: Agendamento) => a.status === selectedStatusFilter);
      });
    }
    
    return filteredHorarios.length;
  })();

  // Agendamentos existentes para o modal de criação
  const existingAppointments = agendamentos.map((a: Agendamento) => ({ cpf: a.cpf, nome: a.nome }));

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-20">
          {/* Header Principal */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Agendamentos de Hoje</h1>
                <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center text-base text-slate-600">
                <FiCalendar className="w-4 h-4 mr-2" />
                {formatDate(selectedDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm font-medium">
                  {agendamentos.length} agendamentos
                </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {agendamentos.filter((a: Agendamento) => a.status === 'confirmado').length} confirmados
                    </span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                      {agendamentos.filter((a: Agendamento) => a.status === 'concluido').length} concluídos
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedStatusFilter !== 'todos'
                        ? 'bg-purple-100 text-purple-800'
                        : showOnlyPreferential 
                        ? 'bg-amber-100 text-amber-800'
                        : showEmptySlots 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedStatusFilter !== 'todos'
                        ? `Apenas ${selectedStatusFilter}s (${visibleSlots})`
                        : showOnlyPreferential 
                        ? `Apenas preferenciais (${visibleSlots})`
                        : showEmptySlots 
                        ? `Mostrando todos os horários (${visibleSlots})` 
                        : `Apenas horários ocupados (${visibleSlots})`
                      }
                    </span>
                  </div>
              </div>
            </div>
              
              {/* Controles de Data */}
              <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              <button
                onClick={() => loadAgendamentos()}
                  className="flex items-center px-3 py-2 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-all duration-200"
              >
                <FiClock className="w-4 h-4 mr-1.5" />
                Atualizar
              </button>
              </div>
            </div>
          </div>

          {/* Barra de Ações */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Ações Principais */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center px-5 py-3 text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                >
                  <FiUser className="w-5 h-5 mr-2" />
                  Novo Agendamento
                </button>
                
                <button
                  onClick={generateReport}
                  disabled={agendamentos.length === 0 || actionLoading}
                  className="flex items-center px-5 py-3 text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium"
                >
                  <FiFileText className="w-5 h-5 mr-2" />
                  {actionLoading ? "Gerando..." : "Relatório PDF"}
                </button>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Filtros:</span>
                  
                  <button
                    onClick={() => setShowEmptySlots(!showEmptySlots)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                      showEmptySlots 
                        ? 'text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md' 
                        : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                    }`}
                    title={showEmptySlots ? 'Ocultar horários livres' : 'Mostrar horários livres'}
                  >
                    {showEmptySlots ? (
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    )}
                    {showEmptySlots ? 'Ocultar Livres' : 'Mostrar Livres'}
                  </button>
                  
                  <button
                    onClick={() => setShowOnlyPreferential(!showOnlyPreferential)}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 font-medium ${
                      showOnlyPreferential 
                        ? 'text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-md' 
                        : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                    }`}
                    title={showOnlyPreferential ? 'Mostrar todos os horários' : 'Mostrar apenas preferenciais'}
                  >
                    <FiStar className="w-4 h-4 mr-2" />
                    {showOnlyPreferential ? 'Todos' : 'Só Preferenciais'}
                  </button>
                </div>
                
                {/* Filtro de Status */}
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as AppointmentStatus | 'todos')}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 font-medium"
                  >
                    <option value="todos">Todos</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="cancelado">Cancelados</option>
                    <option value="ausente">Ausentes</option>
                    <option value="concluido">Concluídos</option>
                  </select>
                </div>
                
                <button
                  onClick={() => router.push("/admin/gestao")}
                  className="flex items-center px-5 py-3 text-slate-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 hover:border-slate-400 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                >
                  <FiArrowLeft className="w-5 h-5 mr-2" />
                  Voltar
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse min-h-[220px]"
                >
                  <div className="h-5 bg-slate-200 rounded-lg w-1/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 transition-all duration-300">
              {HORARIOS.map((horario) => {
                // Corrigir o filtro para comparar com formato HH:MM:SS do banco
                const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
                const hasPreferential = agendamentosHorario.some((a: Agendamento) => a.atendimento_preferencial);
                const hasConcluded = agendamentosHorario.some((a: Agendamento) => a.status === 'concluido');
                const isPassedTime = new Date(`${selectedDate}T${horario}`) < currentTime;
                const isFull = agendamentosHorario.length >= 1;
                const isEmpty = agendamentosHorario.length === 0;

                // Se showEmptySlots for false e o horário estiver vazio, não renderizar
                if (!showEmptySlots && isEmpty) {
                  return null;
                }

                // Se showOnlyPreferential for true e não houver atendimento preferencial, não renderizar
                if (showOnlyPreferential && !hasPreferential) {
                  return null;
                }

                // Se selectedStatusFilter não for 'todos' e não houver agendamento com o status selecionado, não renderizar
                if (selectedStatusFilter !== 'todos') {
                  const hasSelectedStatus = agendamentosHorario.some((a: Agendamento) => a.status === selectedStatusFilter);
                  if (!hasSelectedStatus) {
                    return null;
                  }
                }

                return (
                  <div
                    key={horario}
                    className={`rounded-xl shadow-sm border transition-all duration-300 min-h-[220px] hover:shadow-lg hover:scale-[1.02] ${
                      agendamentosHorario.length > 0
                        ? hasPreferential
                          ? "bg-gradient-to-br from-amber-100 to-amber-200 border-amber-400 shadow-amber-100"
                          : hasConcluded
                            ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 border-dashed"
                    }`}
                  >
                    <div className="p-4 h-full flex flex-col">
                      {/* Header com horário */}
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-bold shadow-sm ${
                            isPassedTime
                              ? "bg-slate-100 text-slate-600"
                              : isFull
                              ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800"
                              : "bg-gradient-to-r from-sky-100 to-sky-200 text-sky-800"
                          }`}
                        >
                          <FiClock className="w-4 h-4 mr-1.5" />
                          <span>{horario}</span>
                        </div>
                        {isFull && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gradient-to-r from-red-100 to-red-200 text-red-800 font-bold shadow-sm">
                            Cheio
                          </span>
                        )}
                      </div>

                      {agendamentosHorario.length > 0 ? (
                        <div className="flex-1 space-y-2">
                          {agendamentosHorario.map((agendamento: Agendamento, index: number) => (
                            <div key={agendamento.id} className={`${index > 0 ? 'border-t border-slate-200 pt-2' : ''}`}>
                              {/* Status e preferencial */}
                              <div className="flex items-center justify-between mb-3">
                                {getStatusBadge(agendamento.status as AppointmentStatus)}
                                {agendamento.atendimento_preferencial && (
                                  <div className="flex items-center px-2 py-1 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 rounded-lg shadow-sm">
                                    <FiStar className="w-3 h-3 mr-1" />
                                    <span className="text-xs font-bold">Pref.</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Informações do agendamento - simplificadas */}
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center text-slate-700">
                                  <FiUser className="w-4 h-4 mr-2 text-slate-500" />
                                  <span className="font-bold text-sm truncate">
                                    {agendamento.nome}
                                  </span>
                                </div>
                                <div className="flex items-center text-slate-600">
                                  <FiPhone className="w-4 h-4 mr-2 text-slate-500" />
                                  <span className="text-sm">{agendamento.telefone}</span>
                                </div>
                              </div>

                              {/* Botões de ação */}
                              <div className="space-y-2">
                                {/* Botão de editar sempre visível */}
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(agendamento);
                                    setModalAction("edit");
                                    setIsModalOpen(true);
                                  }}
                                  className="w-full px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                  title="Editar Agendamento"
                                >
                                  <FiEdit className="w-4 h-4 mr-2" />
                                  Editar
                                </button>

                                {agendamento.status === "confirmado" && (
                                  <div className="space-y-2">
                                    {/* Botões em grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedAppointment(agendamento);
                                        setModalAction("iniciar");
                                        setIsModalOpen(true);
                                      }}
                                      className="px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-sky-50 to-sky-100 hover:from-sky-100 hover:to-sky-200 text-sky-700 transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                      title="Iniciar Atendimento"
                                    >
                                        <FiEdit className="w-3 h-3 mr-1" />
                                      Iniciar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAppointment(agendamento);
                                        setModalAction("ausente");
                                        setIsModalOpen(true);
                                      }}
                                      className="px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 text-rose-700 transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                      title="Marcar ausente"
                                    >
                                      <FiXCircle className="w-3 h-3 mr-1" />
                                      Ausente
                                    </button>
                                     <button
                                       onClick={() => {
                                         setSimpleConfirmData({
                                           id: agendamento.id,
                                           nome: agendamento.nome,
                                           action: 'concluido'
                                         });
                                         setShowSimpleConfirm(true);
                                       }}
                                       className="px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-800 transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                       title="Marcar concluido"
                                     >
                                       <FiCheckCircle className="w-3 h-3 mr-1" />
                                       Concluído
                                     </button>
                                    <button
                                      onClick={() => {
                                          setSelectedAppointment(agendamento);
                                          setModalAction("cancelar");
                                          setIsModalOpen(true);
                                      }}
                                      className="px-2 py-1.5 text-xs rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-amber-700 transition-all duration-200 flex items-center justify-center font-medium shadow-sm hover:shadow-md"
                                      title="Cancelar"
                                    >
                                      <FiSlash className="w-3 h-3 mr-1" />
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
                            <div className="text-4xl mb-2 opacity-50">⏰</div>
                            <p className="text-slate-500 text-sm font-bold">Horário Livre</p>
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


      {/* Modal de Confirmação Simples */}
      <SimpleConfirmModal
        isOpen={showSimpleConfirm}
        onClose={() => {
          setShowSimpleConfirm(false);
          setSimpleConfirmData(null);
        }}
        onConfirm={handleSimpleConfirm}
        title="Confirmar Conclusão"
        message={`Tem certeza que deseja marcar o atendimento de ${simpleConfirmData?.nome} como concluído?`}
        confirmText="Concluir"
        confirmColor="bg-green-600 hover:bg-green-700"
        loading={actionLoading}
      />
    </>
  );
}