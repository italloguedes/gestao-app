"use client";

import React, { useState } from "react";
import { FiX, FiUser, FiCalendar, FiClock, FiPhone, FiCheck, FiStar } from "react-icons/fi";

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
  }) => void;
  selectedDate: string;
  selectedTime?: string;
  occupiedSlots: string[];
  existingAppointments?: Array<{ cpf: string, nome: string }>;
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  selectedTime = "",
  occupiedSlots,
  existingAppointments = [],
}: CreateAppointmentModalProps) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  // hidden default values
  const defaultBirthday = "1900-01-01";
  const defaultEmail = "default@example.com";
  const [preferential, setPreferential] = useState(false);
  const [horario, setHorario] = useState(selectedTime);
  const [errors, setErrors] = useState<{
    nome?: string;
    cpf?: string;
    telefone?: string;
    horario?: string;
  }>({});

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

  const validate = () => {
    const errs: typeof errors = {};
    if (!nome.trim()) errs.nome = "Nome é obrigatório";
    if (!cpf.trim()) errs.cpf = "CPF é obrigatório";
    else if (!/^\d{11}$/.test(cpf))
      errs.cpf = "CPF deve ter 11 dígitos sem pontuação";
    else {
      // Verificar se já existe um agendamento com o mesmo CPF na mesma data
      const existingAppointment = existingAppointments.find(app => app.cpf === cpf);
      if (existingAppointment) {
        errs.cpf = `Já existe um agendamento para este CPF na data selecionada. Nome: ${existingAppointment.nome}`;
      }
    }
    if (!telefone.trim()) errs.telefone = "Telefone é obrigatório";
    else if (!/^\d{10,11}$/.test(telefone))
      errs.telefone = "Telefone deve ter 10 ou 11 dígitos";
    if (!horario) errs.horario = "Horário é obrigatório";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const unformattedCpf = cpf.replace(/\D/g, "");
    const unformattedPhone = telefone.replace(/\D/g, "");
    onSave({
      nome,
      cpf: unformattedCpf,
      telefone: unformattedPhone,
      email: defaultEmail,
      data: selectedDate,
      horario,
      data_nascimento: defaultBirthday,
      atendimento_preferencial: preferential,
    });
    setNome("");
    setCpf("");
    setTelefone("");
    setHorario(selectedTime);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-white/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 rounded-t-3xl">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Novo Agendamento</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-red-500 transition-colors shadow-sm hover:shadow"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <FiUser className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 ${errors.nome ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 hover:border-emerald-300"
                  }`}
                placeholder="Digite o nome completo"
              />
            </div>
            {errors.nome && (
              <p className="text-red-500 text-xs mt-1.5 font-medium ml-1 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500"></span> {errors.nome}
              </p>
            )}
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
              CPF <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors font-mono text-xs border border-slate-300 rounded px-1">123</div>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className={`w-full pl-12 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 ${errors.cpf ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 hover:border-emerald-300"
                  }`}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            {errors.cpf && (
              <p className="text-red-500 text-xs mt-1.5 font-medium ml-1 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500"></span> {errors.cpf}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
              Telefone <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <FiPhone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 ${errors.telefone ? "border-red-300 focus:border-red-500 focus:ring-red-200" : "border-slate-200 hover:border-emerald-300"
                  }`}
                placeholder="(85) 90000-0000"
                maxLength={15}
              />
            </div>
            {errors.telefone && (
              <p className="text-red-500 text-xs mt-1.5 font-medium ml-1 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500"></span> {errors.telefone}
              </p>
            )}
          </div>

          {/* Data e Horário Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                Data
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  disabled
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                Horário <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <FiClock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <select
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 appearance-none ${errors.horario ? "border-red-300" : "border-slate-200 hover:border-emerald-300"
                    }`}
                >
                  <option value="">Selecione...</option>
                  {HORARIOS.filter((slot) => !occupiedSlots.includes(slot)).map(
                    (slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    )
                  )}
                </select>
              </div>
              {errors.horario && (
                <p className="text-red-500 text-xs mt-1.5 font-medium ml-1">{errors.horario}</p>
              )}
            </div>
          </div>

          {/* Checkbox Preferencial */}
          <div className="flex items-center space-x-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 hover:border-amber-200 transition-colors cursor-pointer" onClick={() => setPreferential(!preferential)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${preferential ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-300'}`}>
              {preferential && <FiCheck className="text-white w-3.5 h-3.5" />}
            </div>
            <label className="text-sm font-bold text-slate-700 cursor-pointer select-none flex-1">
              Atendimento Preferencial
              <span className="text-xs font-normal text-slate-500 block">Idosos, gestantes, PCDs</span>
            </label>
            <FiStar className={`w-5 h-5 ${preferential ? 'fill-current text-amber-500' : 'text-slate-300'}`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl font-bold transition-all active:scale-95 transform"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
