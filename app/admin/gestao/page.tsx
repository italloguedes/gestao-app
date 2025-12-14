'use client';

import Link from 'next/link';
import { FiUsers, FiCalendar, FiClock, FiSettings, FiCheckCircle } from 'react-icons/fi';
import { PreAgendamentoGestao } from './PreAgendamentoGestao';

export const dynamic = 'force-dynamic';

export default function AdminGestaoPage() {
  const modules = [
    {
      title: 'Gerenciar Vagas',
      description: 'Configure a disponibilidade de horários e bloqueios.',
      href: '/admin/vagas',
      icon: FiClock,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Administre contas de acesso e permissões.',
      href: '/admin/users',
      icon: FiUsers,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Agendamentos de Hoje',
      description: 'Visualize e gerencie os atendimentos do dia.',
      href: '/admin/agendamentos/hoje',
      icon: FiCalendar,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Consulta Pública',
      description: 'Acesse a área pública de consulta.',
      href: '/consulta',
      icon: FiCheckCircle,
      color: 'bg-green-50 text-green-600',
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12">

      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Painel de Gestão</h1>
        <p className="text-gray-500 mt-2">Central de controle administrativo do sistema.</p>
      </div>

      {/* Modules Grid */}
      <section>
        <h2 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-2">
          <FiSettings className="text-gray-400" /> Acesso Rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="block group"
            >
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${module.color} group-hover:scale-110 transition-transform`}>
                  <module.icon size={24} />
                </div>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {module.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Pre-Scheduling Section */}
      <section>
        <PreAgendamentoGestao />
      </section>

    </div>
  );
}
