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
}

// ... (HORARIOS constant remains unchanged)

export default function AgendamentosHojePage() {
  // ... (hooks remain unchanged)

  // ... (checkUser and formatDate remain unchanged)

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, nome, email, cpf, telefone, data, horario, status, data_nascimento, tipo_cancelamento, atendimento_preferencial, observacoes")
        .eq("data", selectedDate)
        .in("status", ["confirmado", "cancelado", "bloqueado", "concluido", "ausente", "chamando"])
        .order("horario", { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  // ... (handleStatusChange, handleEditAppointment, handleCreateAppointment, handleDeleteAppointment, generateReport remain unchanged)

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
                                        setSelectedAppointment(agendamento);
                                        setModalAction("iniciar");
                                        setIsModalOpen(true);
                                      }}
                                      className="w-full px-3 py-2.5 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md"
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
      <FiArrowLeft className="w-5 h-5 mr-2" />
      Voltar
    </button >
              </div >
            </div >

    {/* Contagem de horários visíveis */ }
    < div className = "mt-4 pt-4 border-t border-slate-200" >
      <div className="flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-600">
          Exibindo <span className="text-emerald-600 font-bold text-lg">{visibleSlots}</span> horários
        </span>
      </div>
            </div >
          </div >

  {
    loading?(
            <div className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4" >
        { [...Array(12)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 animate-pulse min-h-[240px]"
          >
            <div className="h-6 bg-slate-200 rounded-xl w-1/3 mb-4"></div>
            <div className="h-5 bg-slate-200 rounded-lg w-2/3 mb-3"></div>
            <div className="h-4 bg-slate-200 rounded-lg w-1/2 mb-6"></div>
            <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
          </div>
        ))
  }
            </div >
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
                                setSelectedAppointment(agendamento);
                                setModalAction("iniciar");
                                setIsModalOpen(true);
                              }}
                              className="w-full px-3 py-2.5 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white transition-all duration-200 flex items-center justify-center font-bold shadow-md"
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
  )
}
        </div >
      </div >

  { selectedAppointment && isModalOpen && (
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

// Assuming selectedDate is declared earlier in the component,
// this is where its initialization would be updated.
// For example, if it was:
// const [selectedDate, setSelectedDate] = useState('2023-01-01');
// It would become:
// const [selectedDate, setSelectedDate] = useState(() => {
//   const now = new Date();
//   return now.toLocaleDateString('en-CA');
// });
