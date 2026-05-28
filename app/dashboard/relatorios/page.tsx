"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RelatoriosPage() {
  const router = useRouter();
  const {} = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Relatórios
          </h1>
          <p className="text-sm text-gray-600">
            Selecione o tipo de relatório que deseja gerar
          </p>
        </div>

        {/* Grid de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Relatório de Agendamentos */}
          <button
            onClick={() => router.push('/dashboard/relatorios/agendamentos')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-teal-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                <svg
                  className="w-6 h-6 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">
                  Relatório de Agendamentos
                </h3>
                <p className="text-sm text-gray-600">
                  Gere relatórios dos agendamentos com nome, CPF, telefone e status por período
                </p>
              </div>
            </div>
          </button>

          {/* Relatório de Atendimentos */}
          <button
            onClick={() => router.push('/dashboard/relatorios/gerar')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-emerald-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  Relatório de Atendimentos
                </h3>
                <p className="text-sm text-gray-600">
                  Gere relatórios detalhados ou lista de entrega dos atendimentos realizados em um período específico
                </p>
              </div>
            </div>
          </button>

          {/* Relatório por Atendente */}
          <button
            onClick={() => router.push('/dashboard/relatorios/por-atendente')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-emerald-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <svg
                  className="w-6 h-6 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  Atendimentos por Atendente
                </h3>
                <p className="text-sm text-gray-600">
                  Visualize métricas e desempenho individual dos atendentes com filtro por período
                </p>
              </div>
            </div>
          </button>

          {/* Relatório de Ações Itinerantes */}
          <button
            onClick={() => router.push('/dashboard/relatorios/acoes-itinerantes')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                  Ações Itinerantes ALECE
                </h3>
                <p className="text-sm text-gray-600">
                  Análise visual e gráficos dos atendimentos realizados por ação itinerante
                </p>
              </div>
            </div>
          </button>

          {/* Relatório de Diárias (DAF) */}
          <button
            onClick={() => router.push('/dashboard/relatorios/diarias')}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-amber-500 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-amber-700 transition-colors">
                  Relatório de Diárias (DAF)
                </h3>
                <p className="text-sm text-gray-600">
                  Gere o Anexo II de Prestação de Contas de diárias com servidores, anexos e comprovantes
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
