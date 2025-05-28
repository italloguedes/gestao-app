'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { FiCheck, FiX, FiPrinter, FiClock, FiUser, FiPhone } from 'react-icons/fi';
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
}

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
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data', hoje.toISOString().split('T')[0])
        .eq('status', 'confirmado')
        .order('horario', { ascending: true });

      if (error) throw error;
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
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      await loadAgendamentos();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
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
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agendamentos de Hoje</h1>
              <p className="mt-2 text-gray-600">
                {formatDate(currentTime.toISOString())}
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/gestao')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              Voltar
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="animate-pulse p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-gray-200 rounded-full mr-2"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {HORARIOS.map(horario => {
                const agendamento = agendamentos.find(a => a.horario.startsWith(horario));
                return (
                  <div
                    key={horario}
                    className={`rounded-lg shadow-lg overflow-hidden ${getStatusClass(horario)}`}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <FiClock className="w-6 h-6 mr-2" />
                          <span className="text-xl font-bold">{horario}</span>
                        </div>
                        {agendamento && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'confirmado')}
                              className="p-2 rounded-full hover:bg-green-200 disabled:opacity-50"
                              title="Confirmar presença"
                              disabled={actionLoading}
                            >
                              <FiCheck className="w-5 h-5 text-green-700" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(agendamento.id, 'cancelado')}
                              className="p-2 rounded-full hover:bg-red-200 disabled:opacity-50"
                              title="Marcar falta"
                              disabled={actionLoading}
                            >
                              <FiX className="w-5 h-5 text-red-700" />
                            </button>
                            <button
                              onClick={() => window.open(`/admin/agendamentos/${agendamento.id}/imprimir`, '_blank')}
                              className="p-2 rounded-full hover:bg-blue-200 disabled:opacity-50"
                              title="Imprimir comprovante"
                              disabled={actionLoading}
                            >
                              <FiPrinter className="w-5 h-5 text-blue-700" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {agendamento ? (
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <FiUser className="w-5 h-5 mr-2" />
                            <div>
                              <div className="font-medium">{agendamento.nome}</div>
                              <div className="text-sm">CPF: {agendamento.cpf}</div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <FiPhone className="w-5 h-5 mr-2" />
                            <div>
                              <div>{agendamento.telefone}</div>
                              <div className="text-sm">{agendamento.email}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">Horário livre</p>
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