"use client";

import React, { ReactElement, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase-client';
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { motion, AnimatePresence } from "framer-motion";
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
  FiSearch
} from "react-icons/fi";
import DashboardHeader from "@/components/DashboardHeader";
// Usando absolute imports para consistência e evitar problemas de path relativos profundos
import EditAppointmentModal from "@/app/components/EditAppointmentModal";
import CreateAppointmentModal from "@/components/CreateAppointmentModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Removido 'bloqueado' do tipo
type AppointmentStatus = 'concluido' | 'ausente' | 'confirmado' | 'cancelado' | 'chamando';

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
}

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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

export default function AgendamentosHojePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasAccessToDashboard, loading: permissionsLoading } = usePermissions();
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

  // Filter states
  const [showEmptySlots, setShowEmptySlots] = useState(true);
  const [showOnlyPreferential, setShowOnlyPreferential] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

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
        .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial, observacoes, locked_by, locked_at")
        .eq("data", selectedDate)
        // Removido 'bloqueado' da lista
        .in("status", ["confirmado", "cancelado", "concluido", "ausente", "chamando"])
        .order("horario", { ascending: true });

      if (error) throw error;
      setAgendamentos(data as unknown as Agendamento[] || []);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers Restorados ---

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus as AppointmentStatus })
        .eq("id", id);
      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do agendamento.");
    }
  };

  const handleEditAppointment = async (updatedAppointment: Agendamento) => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({
          nome: updatedAppointment.nome,
          telefone: updatedAppointment.telefone,
          data_nascimento: updatedAppointment.data_nascimento,
          observacoes: updatedAppointment.observacoes,
          atendimento_preferencial: updatedAppointment.atendimento_preferencial
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
      if (!session) throw new Error("Sessão expirada.");

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
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      alert("Erro ao excluir agendamento.");
    }
  };

  const generateReport = async () => {
    setActionLoading(true);
    try {
      let atendenteNome = 'Não identificado';
      if (user) {
        const { data: userData } = await supabase.from('users').select('name').eq('auth_id', user.id).single();
        if (userData?.name) atendenteNome = userData.name;
      }

      const doc = new jsPDF();
      const primaryColor = [6, 182, 212] as [number, number, number];
      const secondaryColor = [241, 245, 249] as [number, number, number];

      // Header Futurista
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE AGENDAMENTOS', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data: ${formatDate(selectedDate)} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
      doc.text(`Atendente: ${atendenteNome}`, 14, 35);

      const reportData = agendamentos;

      const tableColumn = ['Horário', 'Paciente', 'Telefone', 'Status', 'Pref.'];
      const tableRows = reportData.map(a => [
        a.horario,
        a.nome,
        a.telefone,
        a.status.toUpperCase(),
        a.atendimento_preferencial ? "SIM" : ""
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        alternateRowStyles: { fillColor: secondaryColor }
      });

      doc.save(`agendamentos-${selectedDate}.pdf`);
    } catch (error) {
      console.error("Erro relatório", error);
      alert("Erro ao gerar relatório");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      if (permissionsLoading) return;
      if (!user || !hasAccessToDashboard) {
        router.push("/admin/login");
      }
    };
    checkUser();
  }, [user, hasAccessToDashboard, permissionsLoading, router]);

  useEffect(() => {
    loadAgendamentos();
  }, [selectedDate]);

  const stats = useMemo(() => ({
    total: agendamentos.length,
    confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
    concluidos: agendamentos.filter(a => a.status === 'concluido').length,
    ausentes: agendamentos.filter(a => a.status === 'ausente').length,
    preferenciais: agendamentos.filter(a => a.atendimento_preferencial).length,
  }), [agendamentos]);

  if (!user || !hasAccessToDashboard) return null;

  return (
    <>
      <DashboardHeader />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white"
      >
        <div className="max-w-[1920px] mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-24">

          {/* Header Futurista */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 mb-8 shadow-2xl">
            {/* ... (Conteúdo do Header identico ao anterior) ... */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <FiCalendar className="w-64 h-64 text-cyan-400" />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-wider uppercase border border-cyan-500/20">
                    Painel de Controle
                  </span>
                  <span className="text-slate-400 text-sm font-medium">{formatDate(selectedDate)}</span>
                </div>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
                  Agendamentos
                </h1>

                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                    <span className="text-slate-300 font-bold">{stats.total}</span>
                    <span className="text-slate-500 text-sm">Total</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-300 font-bold">{stats.confirmados}</span>
                    <span className="text-slate-500 text-sm">Confirmados</span>
                  </div>
                  {stats.preferenciais > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <FiStar className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-500 font-bold">{stats.preferenciais}</span>
                      <span className="text-amber-500/70 text-sm">Pref.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-900/40 p-2 rounded-2xl border border-slate-700/50">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-mono"
                />
                <button
                  onClick={() => loadAgendamentos()}
                  className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                  <FiRefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Controls Bar */}
          <motion.div variants={itemVariants} className="flex flex-col xl:flex-row gap-6 mb-8">
            <div className="flex gap-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <FiPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Novo</span>
              </button>
              <button
                onClick={generateReport}
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-600 transition-all disabled:opacity-50"
              >
                <FiFileText className="w-5 h-5" />
                <span className="hidden sm:inline">Relatório PDF</span>
              </button>
            </div>

            <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/50 p-2 flex flex-wrap gap-2 items-center">
              <div className="flex items-center px-4 text-slate-400 border-r border-slate-700/50 mr-2">
                <FiFilter className="mr-2" />
                <span className="text-sm font-bold uppercase tracking-wider">Filtros</span>
              </div>

              <button
                onClick={() => setShowEmptySlots(!showEmptySlots)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showEmptySlots ? 'bg-slate-700 text-cyan-400' : 'text-slate-500 hover:bg-slate-700/50'}`}
              >
                {showEmptySlots ? <FiEye /> : <FiEyeOff />}
                {showEmptySlots ? 'Ver Livres' : 'Ocultar Livres'}
              </button>

              <button
                onClick={() => setShowOnlyPreferential(!showOnlyPreferential)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${showOnlyPreferential ? 'bg-amber-500/20 text-amber-500' : 'text-slate-500 hover:bg-slate-700/50'}`}
              >
                <FiStar className={showOnlyPreferential ? 'fill-current' : ''} />
                Preferenciais
              </button>

              <div className="h-6 w-[1px] bg-slate-700/50 mx-2"></div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg block p-2.5 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="confirmado">Confirmados</option>
                <option value="concluido">Concluídos</option>
                <option value="ausente">Ausentes</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </motion.div>

          {/* Grid de Horários */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
          >
            {HORARIOS.map((horario) => {
              const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
              const hasPreferential = agendamentosHorario.some(a => a.atendimento_preferencial);
              const isEmpty = agendamentosHorario.length === 0;
              const isPassedTime = new Date(`${selectedDate}T${horario}`) < currentTime;

              // Filtros Visuais
              if (!showEmptySlots && isEmpty) return null;
              if (showOnlyPreferential && !hasPreferential) return null;
              if (selectedStatusFilter !== 'todos' && !isEmpty) {
                if (!agendamentosHorario.some(a => a.status === selectedStatusFilter)) return null;
              }


              return (
                <motion.div
                  key={horario}
                  variants={itemVariants}
                  className={`group relative min-h-[220px] rounded-2xl p-5 border transition-all duration-300 hover:z-10 hover:scale-[1.02] flex flex-col justify-between
                        ${isEmpty
                      ? 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'
                      : hasPreferential
                        ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-800 border-slate-700 hover:border-cyan-500/50 shadow-lg shadow-black/20'
                    }
                     `}
                >
                  {/* Time & Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-lg text-lg font-bold font-mono tracking-tight
                            ${isPassedTime
                        ? 'text-slate-600 bg-slate-900/50'
                        : isEmpty
                          ? 'text-slate-400 bg-slate-900/50 group-hover:text-cyan-400'
                          : 'text-white bg-slate-900 border border-slate-600'
                      }
                        `}>
                      {horario}
                    </div>
                    {isEmpty && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Livre
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {agendamentosHorario.map((agendamento) => (
                      <div key={agendamento.id} className="relative">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Status Indicator */}
                          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px]
                                     ${agendamento.status === 'confirmado' ? 'bg-blue-500 shadow-blue-500/50' :
                              agendamento.status === 'concluido' ? 'bg-emerald-500 shadow-emerald-500/50' :
                                agendamento.status === 'ausente' ? 'bg-rose-500 shadow-rose-500/50' :
                                  agendamento.status === 'chamando' ? 'bg-purple-500 shadow-purple-500/50' :
                                    'bg-slate-500'
                            }
                                  `}></div>
                          <span className={`text-xs font-bold uppercase tracking-wide
                                     ${agendamento.status === 'confirmado' ? 'text-blue-400' :
                              agendamento.status === 'concluido' ? 'text-emerald-400' :
                                agendamento.status === 'ausente' ? 'text-rose-400' :
                                  agendamento.status === 'chamando' ? 'text-purple-400' :
                                    'text-slate-400'
                            }
                                  `}>{agendamento.status}</span>
                        </div>

                        <h3 className="font-bold text-slate-200 leading-tight line-clamp-2" title={agendamento.nome}>
                          {agendamento.nome}
                        </h3>

                        {agendamento.atendimento_preferencial && (
                          <div className="absolute top-0 right-0">
                            <FiStar className="text-amber-500 fill-current animate-pulse" size={14} />
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAppointment(agendamento);
                              setModalAction('edit');
                              setIsModalOpen(true);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-cyan-600 hover:text-white text-xs font-bold text-slate-300 transition-colors flex items-center justify-center gap-1"
                          >
                            <FiEdit /> Detalhes
                          </button>
                          {/* Action Buttons */}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty State Action */}
                  {isEmpty && !isPassedTime && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/40 backdrop-blur-[1px] rounded-2xl">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-cyan-500 text-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform"
                      >
                        <FiPlus size={24} />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </motion.div>

      {/* Modais Restaurados */}
      <AnimatePresence>
        {isModalOpen && selectedAppointment && (
          <EditAppointmentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            agendamento={selectedAppointment}
            onMainAction={() => { }} // Ação handled dentro do modal ou customizável
            onStatusChange={handleStatusChange}
            onEdit={handleEditAppointment}
            onDelete={handleDeleteAppointment}
            user={{ id: user?.id, name: user?.user_metadata?.name }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateAppointmentModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onConfirm={handleCreateAppointment}
          />
        )}
      </AnimatePresence>
    </>
  );
}
