"use client";

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RelatoriosPage() {
  const router = useRouter();
  const {} = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-gray-600 mt-2">Gere relatórios de atendimentos por período</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          className="card p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/dashboard/relatorios/gerar')}
        >
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
            <svg 
              className="w-6 h-6 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Relatório de Atendimentos</h3>
          <p className="text-gray-600">
            Gere relatórios detalhados dos atendimentos realizados em um período específico.
          </p>
        </div>

        {/* Você pode adicionar mais cards aqui para outros tipos de relatórios no futuro */}
      </div>
    </div>
  );
}