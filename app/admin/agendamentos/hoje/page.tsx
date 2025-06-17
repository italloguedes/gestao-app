'use client';

import React, { ReactElement } from 'react';
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
  FiArrowLeft,
  FiEdit
} from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';
import EditAppointmentModal from '../../../components/EditAppointmentModal';

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
  "08:00","08:30", "09:00", "10:00", "11:00", // manhã
  "13:00","13:30", "14:00","14:30", "15:00", // tarde
];

export default function AgendamentosHojePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Agendamento | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'iniciar' | 'concluir' | 'cancelar'>('iniciar');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    checkUser();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAgendamentos();
      const interval = setInterval(loadAgendamentos, 300000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, selectedDate]);

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
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('data', selectedDate)
        .in('status', ['confirmado', 'cancelado', 'bloqueado', 'concluido', 'ausente'])
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
      alert('Erro ao atualizar status. Por favor, tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditAppointment = async (updatedAppointment: Agendamento) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update(updatedAppointment)
        .eq('id', updatedAppointment.id);

      if (error) throw error;
      await loadAgendamentos();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err);
      alert('Erro ao atualizar agendamento. Por favor, tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, {
      icon: ReactElement;
      text: string;
      className: string;
    }> = {
      concluido: {
        icon: <FiCheckCircle className="w-4 h-4 mr-1.5" />,
        text: "Concluído",
        className: "bg-green-100 text-green-800 border border-green-300"
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

    const config = statusConfig[status];
    if (!config) return null;

    return (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${config.className}`}>
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
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pt-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Agendamentos de Hoje
              </h1>
              <div className="flex items-center text-base text-slate-600">
                <FiCalendar className="w-4 h-4 mr-2" />
                {formatDate(selectedDate)}
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
              <button
                onClick={() => loadAgendamentos()}
                className="flex items-center px-3 py-1.5 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-all duration-200"
              >
                <FiClock className="w-4 h-4 mr-1.5" />
                Atualizar
              </button>
              <button
                onClick={() => router.push('/admin/gestao')}
                className="flex items-center px-3 py-1.5 text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all duration-200"
              >
                <FiArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {HORARIOS.map(horario => {
                const agendamento = agendamentos.find(a => a.horario.startsWith(horario));
                const isPassedTime = new Date(`${selectedDate}T${horario}`) < currentTime;

                return (
                  <div
                    key={horario}
                    className={`rounded-lg shadow-sm border transition-all duration-200 ${
                      agendamento 
                        ? 'bg-white border-slate-200 hover:shadow-md' 
                        : 'bg-slate-50 border-slate-200 border-dashed'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`flex items-center rounded-lg px-2 py-1 ${
                            isPassedTime 
                              ? 'bg-slate-100 text-slate-600' 
                              : 'bg-sky-50 text-sky-700'
                          }`}>
                            <FiClock className="w-4 h-4 mr-1" />
                            <span className="font-medium">{horario}</span>
                          </div>
                          {agendamento && getStatusBadge(agendamento.status)}
                        </div>
                      </div>
                      
                      {agendamento ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-slate-700">
                            <FiUser className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="font-medium text-sm truncate">{agendamento.nome}</span>
                          </div>
                          <div className="flex items-center text-slate-600">
                            <FiPhone className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="text-sm">{agendamento.telefone}</span>
                          </div>
                          
                          {agendamento.status === 'confirmado' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => {
                                  setSelectedAppointment(agendamento);
                                  setModalAction('iniciar');
                                  setIsModalOpen(true);
                                }}
                                className="flex-1 px-2 py-1.5 text-xs rounded bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors flex items-center justify-center"
                                title="Concluir Atendimento"
                              >
                                <FiEdit className="w-3 h-3 mr-1" />
                                Iniciar
                              </button>
                              <button
                                onClick={() => handleStatusChange(agendamento.id, 'ausente')}
                                className="flex-1 px-2 py-1.5 text-xs rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors flex items-center justify-center"
                                title="Marcar ausente"
                              >
                                <FiXCircle className="w-3 h-3 mr-1" />
                                Ausente
                              </button>
                              <button
                                onClick={() => handleStatusChange(agendamento.id, 'concluido')}
                                className="flex-1 px-2 py-1.5 text-xs rounded bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex items-center justify-center"
                                title="Marcar concluido"
                              >
                                <FiCheckCircle className="w-3 h-3 mr-1" />
                                Concluído
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAppointment(agendamento);
                                  setModalAction('cancelar');
                                  setIsModalOpen(true);
                                }}
                                className="flex-1 px-2 py-1.5 text-xs rounded bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors flex items-center justify-center"
                                title="Cancelar"
                              >
                                <FiSlash className="w-3 h-3 mr-1" />
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-4">
                          <p className="text-slate-500 text-sm">Horário livre</p>
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

      {selectedAppointment && (
        <EditAppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSave={handleEditAppointment}
          action={modalAction}
        />
      )}
    </>
  );
}