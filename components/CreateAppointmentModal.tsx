"use client";

import React, { useState } from "react";
import { FiX, FiUser, FiCalendar, FiClock, FiPhone, FiMapPin } from "react-icons/fi";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
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
      setNome("");
      setCpf("");
      setTelefone("");
      setHorario(selectedTime);
      setErrors({});
    } catch (error) {
      // Erro já tratado no componente pai
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Criar Agendamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.nome ? "border-red-300" : "border-gray-300"
                  }`}
                placeholder="Digite o nome completo"
              />
            </div>
            {errors.nome && (
              <p className="text-red-500 text-xs mt-1">{errors.nome}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF *
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.cpf ? "border-red-300" : "border-gray-300"
                  }`}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            {errors.cpf && (
              <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone *
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.telefone ? "border-red-300" : "border-gray-300"
                  }`}
                placeholder="00000000000"
                maxLength={11}
              />
            </div>
            {errors.telefone && (
              <p className="text-red-500 text-xs mt-1">{errors.telefone}</p>
            )}
          </div>

          {/* hidden default birthday, no input field */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data *
            </label>
            <div className="relative">
              <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                disabled
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horário *
            </label>
            <div className="relative">
              <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.horario ? "border-red-300" : "border-gray-300"
                  }`}
              >
                <option value="">Selecione um horário</option>
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
              <p className="text-red-500 text-xs mt-1">{errors.horario}</p>
            )}
          </div>

          {/* Campo: Posto de Atendimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Posto de Atendimento *
            </label>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={posto}
                disabled
                title="Para agendar em outro posto, altere a aba na tela principal."
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-gray-100 border-gray-300 cursor-not-allowed text-gray-500"
              >
                {POSTOS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* novo campo: atendimento preferencial */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              id="preferencial"
              type="checkbox"
              checked={preferential}
              onChange={(e) => setPreferential(e.target.checked)}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <label htmlFor="preferencial" className="text-sm text-gray-700 select-none">
              Atendimento preferencial
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Criar Agendamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
