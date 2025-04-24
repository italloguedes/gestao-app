"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RelatoriosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabeçalho */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Gerar Relatório</h1>
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Selecione o período para gerar o relatório de atendimentos.
            </p>
            <Link
              href="/dashboard/relatorios/gerar"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Gerar Relatório
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 