'use client';

import React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
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
  FiArrowLeft
} from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';

interface Agendamento {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data: string;
  horario: string;
  status: string;
  data_nascimento: string;
  tipo_cancelamento?: string;
}

type StatusMapType = {
  [key: string]: string;
};

const HORARIOS = [
  "08:00", "09:00", "10:00", "11:00", // manhã
  "13:00", "14:00", "15:00", "16:00", // tarde
];

export default function AgendamentosHojePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    checkUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Atualiza a cada minuto
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAgendamentos();
      const interval = setInterval(loadAgendamentos, 300000); // Recarrega a cada 5 minutos
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('auth_id', user.id)
          .single();

        if (userError) {
          console.error('Erro ao verificar permissões:', userError);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(userData?.role === 'admin');
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      setIsAdmin(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T12:00:00Z');
      return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const loadAgendamentos = async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      console.log('Carregando agendamentos para:', hoje.toISOString().split('T')[0]);
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data', hoje.toISOString().split('T')[0])
        .in('status', ['confirmado', 'cancelado', 'bloqueado', 'concluido', 'ausente'])
        .order('horario', { ascending: true });

      if (error) {
        console.error('Erro ao carregar agendamentos:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Agendamentos carregados:', data?.length || 0);
      setAgendamentos(data || []);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoading(true);
    try {
      console.log('Tentando atualizar agendamento:', { id, newStatus });
      
      const status = newStatus === 'concluido' ? 'concluido' : 'ausente';

      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Atualização bem-sucedida:', data);
      await loadAgendamentos();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = useMemo(() => (horario: string) => {
    const agendamento = agendamentos.find(a => a.horario.startsWith(horario));
    if (!agendamento) return 'bg-gray-100 text-gray-400';

    const [hora, minuto] = horario.split(':');
    const horarioAgendamento = new Date();
    horarioAgendamento.setHours(parseInt(hora), parseInt(minuto), 0, 0);

    if (horarioAgendamento < currentTime) {
      return 'bg-gray-200 text-gray-600'; // Passado
    }
    
    const diff = horarioAgendamento.getTime() - currentTime.getTime();
    const minutesDiff = Math.floor(diff / 1000 / 60);

    if (minutesDiff <= 15) {
      return 'bg-orange-100 text-orange-800 animate-pulse'; // Próximo
    }

    return 'bg-emerald-100 text-emerald-800'; // Futuro
  }, [agendamentos, currentTime]);

  const getStatusBadge = (agendamento: Agendamento) => {
    if (!agendamento) return null;
    
    const statusConfig: Record<string, {
      icon: React.ReactElement;
      text: string;
      className: string;
    }> = {
      concluido: {
        icon: <FiCheckCircle className="w-4 h-4 mr-1.5" />,
        text: "Concluído",
        className: "bg-teal-50 text-teal-700 border border-teal-200"
      },
      ausente: {
        icon: <FiXCircle className="w-4 h-4 mr-1.5" />,
        text: "Ausente",
        className: "bg-rose-50 text-rose-700 border border-rose-200"
      },
      confirmado: {
        icon: <FiCalendar className="w-4 h-4 mr-1.5" />,
        text: "Confirmado",
        className: "bg-sky-50 text-sky-700 border border-sky-200"
      },
      bloqueado: {
        icon: <FiLock className="w-4 h-4 mr-1.5" />,
        text: "Bloqueado",
        className: "bg-slate-50 text-slate-700 border border-slate-200"
      },
      cancelado: {
        icon: <FiSlash className="w-4 h-4 mr-1.5" />,
        text: "Cancelado",
        className: "bg-amber-50 text-amber-700 border border-amber-200"
      }
    };

    const config = statusConfig[agendamento.status];
    if (!config) return null;

    return (
      <span className={`px-3 py-1.5 text-sm rounded-full flex items-center ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    );
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

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 pt-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-4">
                Agendamentos de Hoje
              </h1>
              <div className="flex items-center text-lg text-slate-600">
                <FiCalendar className="w-5 h-5 mr-2" />
                {formatDate(currentTime.toISOString())}
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-4">
              <button
                onClick={() => loadAgendamentos()}
                className="flex items-center px-4 py-2 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition-all duration-200"
              >
                <FiClock className="w-5 h-5 mr-2" />
                Atualizar
              </button>
              <button
                onClick={() => router.push('/admin/gestao')}
                className="flex items-center px-4 py-2 text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all duration-200"
              >
                <FiArrowLeft className="w-5 h-5 mr-2" />
                Voltar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 h-8 bg-slate-200 rounded-lg"></div>
                        <div className="w-32 h-8 bg-slate-200 rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-slate-200 rounded-full mr-3"></div>
                        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-slate-200 rounded-full mr-3"></div>
                        <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {HORARIOS.map(horario => {
                const agendamento = agendamentos.find(a => a.horario.startsWith(horario));
                const isPassedTime = new Date(`${currentTime.toISOString().split('T')[0]}T${horario}`) < currentTime;
                const isPendingTime = !isPassedTime && new Date(`${currentTime.toISOString().split('T')[0]}T${horario}`).getTime() - currentTime.getTime() <= 900000;

                return (
                  <div
                    key={horario}
                    className={`rounded-2xl shadow-sm border transition-all duration-200 ${
                      agendamento 
                        ? 'bg-white border-slate-200 hover:shadow-md' 
                        : 'bg-slate-50 border-slate-200 border-dashed'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center rounded-xl px-4 py-2 ${
                            isPassedTime 
                              ? 'bg-slate-100 text-slate-600' 
                              : isPendingTime
                                ? 'bg-amber-50 text-amber-700 animate-pulse'
                                : 'bg-sky-50 text-sky-700'
                          }`}>
                            <FiClock className="w-5 h-5 mr-2" />
                            <span className="font-medium text-lg">{horario}</span>
                          </div>
                          {agendamento && getStatusBadge(agendamento)}
                        </div>
                        {agendamento && agendamento.status === 'confirmado' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'concluido')}
                              className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 transition-all duration-200 disabled:opacity-50 flex items-center group"
                              title="Confirmar presença"
                              disabled={actionLoading}
                            >
                              <FiCheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'ausente')}
                              className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all duration-200 disabled:opacity-50 flex items-center group"
                              title="Marcar falta"
                              disabled={actionLoading}
                            >
                              <FiXCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => window.open(`/admin/agendamentos/${agendamento.id}/imprimir`, '_blank')}
                              className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-all duration-200 disabled:opacity-50 flex items-center group"
                              title="Imprimir comprovante"
                              disabled={actionLoading}
                            >
                              <FiPrinter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {agendamento ? (
                        <div className="space-y-4">
                          <div className="flex items-center text-slate-700">
                            <div className="p-2 rounded-lg bg-slate-50">
                              <FiUser className="w-5 h-5 text-slate-600" />
                            </div>
                            <span className="ml-3 font-medium text-lg">{agendamento.nome}</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <div className="p-2 rounded-lg bg-slate-50">
                              <FiPhone className="w-5 h-5 text-slate-600" />
                            </div>
                            <span className="ml-3 text-lg">{agendamento.telefone}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <p className="text-slate-500 text-lg">Horário livre</p>
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
    </>
  );
} 