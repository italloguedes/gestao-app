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
  const [isAdmin, setIsAdmin] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"iniciar" | "concluido" | "cancelar" | "ausente" | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    checkUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAgendamentos();
      const interval = setInterval(loadAgendamentos, 300000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, selectedDate]);

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
          setIsAdmin(false);
          return;
        }

        setIsAdmin(userData?.role === "admin");
      }
    } catch (err) {
      console.error("Erro ao verificar usuário:", err);
      setIsAdmin(false);
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
        .select("*")
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
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
      setSelectedAppointment(null);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Erro ao atualizar status. Por favor, tente novamente.");
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

      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
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

      await loadAgendamentos();
      alert('Agendamento criado com sucesso!');
    } catch (err) {
      console.warn("Erro ao criar agendamento:", err);
      alert(`Erro ao criar agendamento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
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

      /* ---------- Tabela com autoTable (horário, nome, CPF e status) ---------- */
      const tableColumn = ['Horário', 'Nome', 'CPF', 'Status'];
      const tableRows = agendamentos.map(a => [
          a.horario,
          a.nome.length > 35 ? a.nome.substring(0, 32) + '...' : a.nome,
          a.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
          a.status.charAt(0).toUpperCase() + a.status.slice(1).toLowerCase()
      ]);

      const tableWidth = 140; // Ajustado para 4 colunas
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
              1: { cellWidth: 50, halign: 'center' }, // Nome (centralizado)
              2: { cellWidth: 35, halign: 'center' }, // CPF (centralizado)
              3: { cellWidth: 35, halign: 'center' }  // Status (centralizado)
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

  if (!user || !isAdmin) {
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
  const occupiedSlots = agendamentos.map(a => a.horario.substring(0, 5));

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Agendamentos de Hoje</h1>
              <div className="flex items-center text-base text-slate-600">
                <FiCalendar className="w-4 h-4 mr-2" />
                {formatDate(selectedDate)}
                <span className="ml-4 px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm font-medium">
                  {agendamentos.length} agendamentos
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200"
              >
                <FiUser className="w-4 h-4 mr-1.5" />
                Criar Agendamento
              </button>
              <button
                onClick={() => loadAgendamentos()}
                className="flex items-center px-3 py-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-all duration-200"
              >
                <FiClock className="w-4 h-4 mr-1.5" />
                Atualizar
              </button>
              <button
                onClick={generateReport}
                disabled={agendamentos.length === 0 || actionLoading}
                className="flex items-center px-3 py-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiFileText className="w-4 h-4 mr-1.5" />
                {actionLoading ? "Gerando..." : "Relatório PDF"}
              </button>
              <button
                onClick={() => router.push("/admin/gestao")}
                className="flex items-center px-3 py-1.5 text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all duration-200"
              >
                <FiArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
                >
                  <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
              {HORARIOS.map((horario) => {
                // Corrigir o filtro para comparar com formato HH:MM:SS do banco
                const agendamentosHorario = agendamentos.filter((a) => a.horario === `${horario}:00`);
                const hasPreferential = agendamentosHorario.some(a => a.atendimento_preferencial);
                const isPassedTime = new Date(`${selectedDate}T${horario}`) < currentTime;
                const isFull = agendamentosHorario.length >= 1;

                return (
                  <div
                    key={horario}
                    className={`rounded-lg shadow-sm border transition-all duration-200 ${
                      agendamentosHorario.length > 0
                        ? hasPreferential
                          ? "bg-amber-50 border-amber-300 hover:shadow-md"
                          : "bg-white border-slate-200 hover:shadow-md"
                        : "bg-slate-50 border-slate-200 border-dashed"
                    }`}
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1">
                          <div
                            className={`flex items-center rounded px-1 py-0.5 text-xs ${
                              isPassedTime
                                ? "bg-slate-100 text-slate-600"
                                : isFull
                                ? "bg-red-50 text-red-700"
                                : "bg-sky-50 text-sky-700"
                            }`}
                          >
                            <FiClock className="w-3 h-3 mr-1" />
                            <span className="font-medium">{horario}</span>
                          </div>
                          {isFull && (
                            <span className="px-1 py-0.5 text-xs rounded bg-red-100 text-red-800">
                              Cheio
                            </span>
                          )}
                        </div>
                      </div>

                      {agendamentosHorario.length > 0 ? (
                        <div className="space-y-1">
                          {agendamentosHorario.map((agendamento, index) => (
                            <div key={agendamento.id} className={`${index > 0 ? 'border-t border-slate-200 pt-1' : ''}`}>
                              <div className="flex items-center justify-between mb-1">
                                {getStatusBadge(agendamento.status as AppointmentStatus)}
                                {agendamento.atendimento_preferencial && (
                                  <FiStar className="w-3 h-3 text-amber-500" title="Atendimento Preferencial" />
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center text-slate-700">
                                  <FiUser className="w-3 h-3 mr-1 text-slate-500" />
                                  <span className="font-medium text-xs truncate">
                                    {agendamento.nome}
                                  </span>
                                </div>
                                <div className="flex items-center text-slate-600">
                                  <FiPhone className="w-3 h-3 mr-1 text-slate-500" />
                                  <span className="text-xs">{agendamento.telefone}</span>
                                </div>

                                {agendamento.status === "confirmado" && (
                                  <div className="grid grid-cols-2 gap-1 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedAppointment(agendamento);
                                        setModalAction("iniciar");
                                        setIsModalOpen(true);
                                      }}
                                      className="col-span-1 px-1 py-0.5 text-xs rounded bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors flex items-center justify-center"
                                      title="Iniciar Atendimento"
                                    >
                                      <FiEdit className="w-2 h-2 mr-1" />
                                      Iniciar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedAppointment(agendamento);
                                        setModalAction("ausente");
                                        setIsModalOpen(true);
                                      }}
                                      className="col-span-1 px-1 py-0.5 text-xs rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center justify-center"
                                      title="Marcar ausente"
                                    >
                                      <FiXCircle className="w-2 h-2 mr-1" />
                                      Ausente
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Deseja realmente marcar este atendimento como concluído?")) {
                                          handleStatusChange(agendamento.id, "concluido");
                                        }
                                      }}
                                      className="col-span-1 px-1 py-0.5 text-xs rounded bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex items-center justify-center"
                                      title="Marcar concluido"
                                    >
                                      <FiCheckCircle className="w-2 h-2 mr-1" />
                                      Concluído
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (window.confirm("Deseja realmente cancelar este atendimento?")) {
                                          handleStatusChange(agendamento.id, "cancelado");
                                        }
                                      }}
                                      className="col-span-1 px-1 py-0.5 text-xs rounded bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center justify-center"
                                      title="Cancelar"
                                    >
                                      <FiSlash className="w-2 h-2 mr-1" />
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-2">
                          <p className="text-slate-500 text-xs">Livre</p>
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
        />
      )}

      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateAppointment}
        selectedDate={selectedDate}
        occupiedSlots={occupiedSlots}
      />
    </>
  );
}