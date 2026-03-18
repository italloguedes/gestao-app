"use client";

import React, { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase-client";
import {
  FiSearch,
  FiUser,
  FiPhone,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSlash,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
  FiHash,
  FiMapPin,
} from "react-icons/fi";

interface Agendamento {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  data: string;
  horario: string;
  status: string;
  posto?: string;
  atendimento_preferencial?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactElement; bg: string; text: string; border: string }> = {
  confirmado: {
    label: "Confirmado",
    icon: <FiCheckCircle className="w-4 h-4" />,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  concluido: {
    label: "Concluído",
    icon: <FiCheckCircle className="w-4 h-4" />,
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  ausente: {
    label: "Ausente",
    icon: <FiXCircle className="w-4 h-4" />,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  cancelado: {
    label: "Cancelado",
    icon: <FiSlash className="w-4 h-4" />,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  chamando: {
    label: "Chamando",
    icon: <FiRefreshCw className="w-4 h-4 animate-spin" />,
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
};

function formatDate(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatCPF(cpf: string) {
  if (!cpf || cpf.length !== 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function SearchAgendamentos() {
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [results, setResults] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed && !selectedDate) return;

    setLoading(true);
    setSearched(true);

    try {
      let queryBuilder = supabase
        .from("agendamentos")
        .select("id, nome, cpf, telefone, data, horario, status, posto, atendimento_preferencial")
        .neq("status", "bloqueado")
        .order("data", { ascending: false })
        .order("horario", { ascending: true });

      // Filtro por data
      if (selectedDate) {
        queryBuilder = queryBuilder.eq("data", selectedDate);
      }

      // Filtro por nome ou CPF
      if (trimmed) {
        const isNumeric = /^\d+$/.test(trimmed);
        if (isNumeric) {
          queryBuilder = queryBuilder.ilike("cpf", `%${trimmed}%`);
        } else {
          queryBuilder = queryBuilder.ilike("nome", `%${trimmed}%`);
        }
      }

      const { data, error } = await queryBuilder.limit(50);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error("Erro na busca:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, selectedDate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedDate("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
        <FiSearch className="text-gray-400" /> Buscar Agendamento
      </h2>

      {/* Search Bar */}
      <div className="relative mb-6 space-y-4">
        {/* Linha 1: Nome/CPF + Data */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Campo de busca por texto */}
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <FiSearch className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nome ou CPF do cliente..."
                className="w-full pl-12 pr-12 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 shadow-sm hover:shadow-md text-sm"
              />
              {(query || selectedDate) && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all duration-200"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Campo de data */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <FiCalendar className="absolute left-4 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full sm:w-52 pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-300 shadow-sm hover:shadow-md text-sm"
              />
            </div>
          </div>

          {/* Botão Buscar */}
          <button
            onClick={handleSearch}
            disabled={loading || (!query.trim() && !selectedDate)}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <FiRefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <FiSearch className="w-5 h-5" />
            )}
            Buscar
          </button>
        </div>

        {/* Dica */}
        <p className="text-xs text-slate-400 px-1">
          Busque por nome, CPF ou selecione uma data. Bloqueios administrativos não são exibidos.
        </p>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500">
            <FiRefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-lg font-medium">Buscando agendamentos...</span>
          </div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-600 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-slate-400 text-sm">Tente buscar com outro nome, CPF ou data.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500">
              {results.length} {results.length === 1 ? "resultado encontrado" : "resultados encontrados"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((ag) => {
              const statusConf = STATUS_CONFIG[ag.status] || {
                label: ag.status,
                icon: <FiAlertCircle className="w-4 h-4" />,
                bg: "bg-gray-50",
                text: "text-gray-700",
                border: "border-gray-200",
              };

              return (
                <div
                  key={ag.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                    >
                      {statusConf.icon}
                      {statusConf.label}
                    </span>
                    {ag.atendimento_preferencial && (
                      <span className="text-amber-500 text-xs font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                        ⭐ Preferencial
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="px-5 pb-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <FiUser className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="font-bold text-slate-800 text-sm leading-tight">{ag.nome}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <FiHash className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600 text-sm font-mono">{formatCPF(ag.cpf)}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <FiPhone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600 text-sm">{ag.telefone}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600 text-sm font-semibold">{formatDate(ag.data)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-600 text-sm font-semibold">{ag.horario?.substring(0, 5)}</span>
                      </div>
                    </div>

                    {ag.posto && (
                      <div className="flex items-center gap-2.5">
                        <FiMapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-500 text-xs font-medium">{ag.posto}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
