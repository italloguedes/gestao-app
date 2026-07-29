"use client";

import React, { useState, useEffect } from "react";
import { FiX, FiUser, FiCalendar, FiClock, FiPhone, FiMapPin, FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { supabase } from "@/lib/supabase-client";

const POSTOS = [
  { id: 'Sala Sensorial', nome: 'Sala Sensorial' },
  { id: 'Alece Itinerante I', nome: 'Alece Itinerante I' },
  { id: 'Alece Itinerante II', nome: 'Alece Itinerante II' },
];

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: {
    nome: string;
    cpf: string;
    telefone: string;
    email: string;
    data: string;
    horario: string;
    data_nascimento: string;
    atendimento_preferencial?: boolean;
    posto?: string;
  }) => Promise<void>;
  selectedDate: string;
  selectedTime?: string;
  occupiedSlots: string[];
  existingAppointments?: Array<{ cpf: string, nome: string }>;
  posto?: string;
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTime = "",
  occupiedSlots,
  existingAppointments = [],
  posto = "Sala Sensorial",
}: CreateAppointmentModalProps) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const defaultBirthday = "1900-01-01";
  const defaultEmail = "default@example.com";
  const [preferential, setPreferential] = useState(false);
  const [horario, setHorario] = useState(selectedTime);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [liveOccupiedSlots, setLiveOccupiedSlots] = useState<string[]>(occupiedSlots);

  const [errors, setErrors] = useState<{
    nome?: string;
    cpf?: string;
    telefone?: string;
    horario?: string;
  }>({});

  const draftKey = `draft_agendamento_${posto}_${selectedDate}`;

  // Restaurar rascunho salvo se existir ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    setHorario(selectedTime || "");
    setServerError("");
    setErrors({});

    if (typeof window !== "undefined") {
      const savedDraft = sessionStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.nome) setNome(parsed.nome);
          if (parsed.cpf) setCpf(parsed.cpf);
          if (parsed.telefone) setTelefone(parsed.telefone);
          if (parsed.preferential !== undefined) setPreferential(parsed.preferential);
        } catch (e) {
          console.error("Erro ao carregar rascunho:", e);
        }
      }
    }
  }, [isOpen, selectedTime, draftKey]);

  // Salvar rascunho no sessionStorage sempre que o atendente digitar
  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined") {
      if (nome || cpf || telefone) {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({ nome, cpf, telefone, preferential })
        );
      }
    }
  }, [nome, cpf, telefone, preferential, isOpen, draftKey]);

  // Sincronização em tempo real de horários ocupados via Supabase Realtime
  useEffect(() => {
    if (!isOpen) return;

    setLiveOccupiedSlots(occupiedSlots);

    const fetchLatestSlots = async () => {
      try {
        const { data } = await supabase
          .from("agendamentos")
          .select("horario")
          .eq("data", selectedDate)
          .eq("posto", posto)
          .in("status", ["confirmado", "bloqueado", "concluido", "ausente", "chamando", "cancelado"]);

        if (data) {
          const slots = data
            .map((a: any) => (a.horario ? a.horario.substring(0, 5) : ""))
            .filter(Boolean);
          setLiveOccupiedSlots(Array.from(new Set(slots)));
        }
      } catch (err) {
        console.error("Erro ao sincronizar horários ocupados:", err);
      }
    };

    fetchLatestSlots();

    const channel = supabase
      .channel(`realtime-create-modal-${selectedDate}-${posto}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamentos",
        },
        () => {
          fetchLatestSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, selectedDate, posto, occupiedSlots]);

  const HORARIOS = React.useMemo(() => {
    const slots: string[] = [];
    let hora = 7;
    let minuto = 0;
    const endHour = 22;
    const endMinute = 0;

    while (true) {
      if (hora === endHour && minuto === endMinute) break;

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
  }, []);

  // Encontrar o próximo horário livre após o slot em conflito
  const findNextAvailableSlot = (conflictSlot: string): string | null => {
    const idx = HORARIOS.indexOf(conflictSlot);
    if (idx === -1) return HORARIOS.find(s => !liveOccupiedSlots.includes(s)) || null;

    // Buscar para frente a partir do horário em conflito
    for (let i = idx + 1; i < HORARIOS.length; i++) {
      if (!liveOccupiedSlots.includes(HORARIOS[i])) return HORARIOS[i];
    }
    // Se não encontrar depois, buscar antes
    for (let i = idx - 1; i >= 0; i--) {
      if (!liveOccupiedSlots.includes(HORARIOS[i])) return HORARIOS[i];
    }
    return null;
  };

  const [autoSwitched, setAutoSwitched] = useState<{ from: string; to: string } | null>(null);

  const validate = () => {
    const errs: typeof errors = {};
    const cleanCpf = cpf.replace(/\D/g, "");
    if (!nome.trim()) errs.nome = "Nome é obrigatório";
    if (!cleanCpf) errs.cpf = "CPF é obrigatório";
    else if (!/^\d{11}$/.test(cleanCpf))
      errs.cpf = "CPF deve ter 11 dígitos sem pontuação";
    else {
      const existingAppointment = existingAppointments.find(app => app.cpf === cleanCpf);
      if (existingAppointment) {
        errs.cpf = `Já existe um agendamento para este CPF nesta data (${existingAppointment.nome})`;
      }
    }
    const cleanPhone = telefone.replace(/\D/g, "");
    if (!cleanPhone) errs.telefone = "Telefone é obrigatório";
    else if (!/^\d{10,11}$/.test(cleanPhone))
      errs.telefone = "Telefone deve ter 10 ou 11 dígitos";
    if (!horario) errs.horario = "Horário é obrigatório";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setAutoSwitched(null);
    if (!validate()) return;

    // Verificação pré-submit: se outro atendente pegou o horário enquanto digitava
    if (liveOccupiedSlots.includes(horario)) {
      const nextSlot = findNextAvailableSlot(horario);
      if (nextSlot) {
        const oldHorario = horario;
        setHorario(nextSlot);
        setAutoSwitched({ from: oldHorario, to: nextSlot });
        setServerError("");
        setErrors({});
      } else {
        setServerError("Todos os horários do dia estão preenchidos.");
        setErrors(prev => ({ ...prev, horario: "Sem horários disponíveis" }));
      }
      return;
    }

    setSubmitting(true);
    const unformattedCpf = cpf.replace(/\D/g, "");
    const unformattedPhone = telefone.replace(/\D/g, "");

    try {
      await onSave({
        nome,
        cpf: unformattedCpf,
        telefone: unformattedPhone,
        email: defaultEmail,
        data: selectedDate,
        horario,
        data_nascimento: defaultBirthday,
        atendimento_preferencial: preferential,
        posto: posto,
      });

      // Sucesso: Limpar rascunho do sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(draftKey);
      }
      setNome("");
      setCpf("");
      setTelefone("");
      setHorario(selectedTime);
      setErrors({});
      setServerError("");
      setAutoSwitched(null);
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      const msg = error?.message || "Erro ao criar agendamento. Verifique os dados e tente novamente.";

      // Se conflito de horário: auto-trocar para o próximo livre
      if (msg.toLowerCase().includes("horário") || msg.toLowerCase().includes("completo") || msg.toLowerCase().includes("reservado")) {
        // Marcar o slot atual como ocupado no estado local
        setLiveOccupiedSlots(prev => [...new Set([...prev, horario])]);

        const nextSlot = findNextAvailableSlot(horario);
        if (nextSlot) {
          const oldHorario = horario;
          setHorario(nextSlot);
          setAutoSwitched({ from: oldHorario, to: nextSlot });
          setServerError("");
          setErrors({});
        } else {
          setServerError("Todos os horários do dia estão preenchidos.");
          setErrors(prev => ({ ...prev, horario: "Sem horários disponíveis" }));
        }
      } else if (msg.toLowerCase().includes("cpf")) {
        setServerError(msg);
        setErrors(prev => ({ ...prev, cpf: "CPF já cadastrado nesta data" }));
      } else {
        setServerError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isSelectedSlotOccupied = horario && liveOccupiedSlots.includes(horario);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiCalendar className="text-blue-600" />
            Criar Agendamento
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200/50">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Banner de auto-troca de horário */}
          {autoSwitched && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-xl flex items-start gap-2.5 text-amber-800 text-sm font-medium animate-fadeIn">
              <FiAlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                O horário <strong>{autoSwitched.from}</strong> foi reservado por outro atendente. Trocamos automaticamente para <strong>{autoSwitched.to}</strong>. Clique em <strong>&quot;Criar Agendamento&quot;</strong> para confirmar.
              </div>
            </div>
          )}

          {/* Banner de erro do servidor */}
          {serverError && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-3 rounded-xl flex items-start gap-2.5 text-rose-800 text-sm font-medium animate-fadeIn">
              <FiAlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{serverError}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.nome ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
                placeholder="Digite o nome completo"
              />
            </div>
            {errors.nome && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              CPF *
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.cpf ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            {errors.cpf && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.cpf}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Telefone *
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.telefone ? "border-rose-400 bg-rose-50/20" : "border-slate-200"
                }`}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            {errors.telefone && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.telefone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Data *
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                disabled
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Horário *</span>
              <span className="text-[11px] text-slate-400 font-normal">Sincronizado em tempo real</span>
            </label>
            <div className="relative">
              <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={horario}
                onChange={(e) => {
                  setHorario(e.target.value);
                  setServerError("");
                  setErrors(prev => ({ ...prev, horario: undefined }));
                }}
                className={`w-full pl-10 pr-3 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  errors.horario || isSelectedSlotOccupied ? "border-amber-400 bg-amber-50/30 text-amber-900" : "border-slate-200 text-slate-800"
                }`}
              >
                <option value="">Selecione um horário livre</option>
                {HORARIOS.filter((slot) => !liveOccupiedSlots.includes(slot) || slot === horario).map(
                  (slot) => {
                    const isOccupied = liveOccupiedSlots.includes(slot);
                    return (
                      <option key={slot} value={slot} disabled={isOccupied}>
                        {slot} {isOccupied ? "(INDISPONÍVEL)" : ""}
                      </option>
                    );
                  }
                )}
              </select>
            </div>
            {isSelectedSlotOccupied && (
              <p className="text-amber-700 text-xs font-medium mt-1.5 flex items-center gap-1">
                <FiAlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Este horário acabou de ser agendado por outro atendente! Escolha outro acima.
              </p>
            )}
            {errors.horario && !isSelectedSlotOccupied && (
              <p className="text-rose-600 text-xs mt-1 font-medium">{errors.horario}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Posto de Atendimento *
            </label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <select
                value={posto}
                disabled
                title="Para agendar em outro posto, altere a aba na tela principal."
                className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed text-sm font-medium"
              >
                {POSTOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              id="preferencial"
              type="checkbox"
              checked={preferential}
              onChange={(e) => setPreferential(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="preferencial" className="text-xs font-medium text-slate-700 select-none cursor-pointer">
              Atendimento preferencial
            </label>
          </div>

          <div className="flex space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(isSelectedSlotOccupied)}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Agendamento"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
