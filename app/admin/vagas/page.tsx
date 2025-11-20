'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FiCheck, FiX, FiLock, FiUnlock, FiCalendar, FiClock } from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';
import { HORARIOS_MANHA, HORARIOS_TARDE } from '@/lib/constants';

interface User {
  id: string;
  dbId?: number;
  email?: string;
  auth_id?: string;
}

export default function GestaoVagas() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [vagasLiberadas, setVagasLiberadas] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState({ total: 0, available: 0, blocked: 0, booked: 0 });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (selectedDate && user) {
      loadVagasStatus();
    }
  }, [selectedDate, user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, id')
          .eq('auth_id', user.id)
          .single();

        if (userError) {
          console.error('Erro ao verificar permissões:', userError);
          setIsAdmin(false);
          return;
        }

        const isUserAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';
        setIsAdmin(isUserAdmin);

        setUser({
          ...user,
          dbId: userData.id,
          auth_id: user.id
        });
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      setIsAdmin(false);
    }
  };

  const loadVagasStatus = async () => {
    setLoading(true);
    try {
      const dataFormatada = formatDateForDB(selectedDate);

      // Busca todos os agendamentos para a data
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('horario, status')
        .eq('data', dataFormatada);

      if (error) throw error;

      // Verifica se é um dia permitido (lógica de negócio)
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataVerificar = new Date(selectedDate);
      dataVerificar.setHours(0, 0, 0, 0);

      // Permitir agendamentos até 14 dias à frente (exemplo)
      const maxDate = new Date(hoje);
      maxDate.setDate(hoje.getDate() + 14);
      maxDate.setHours(23, 59, 59, 999);

      const isDiaValido =
        dataVerificar >= hoje &&
        dataVerificar <= maxDate &&
        selectedDate.getDay() !== 0 &&
        selectedDate.getDay() !== 6;

      const vagasStatus: { [key: string]: boolean } = {};
      let availableCount = 0;
      let blockedCount = 0;
      let bookedCount = 0;

      const allSlots = [...HORARIOS_MANHA, ...HORARIOS_TARDE];

      allSlots.forEach(horario => {
        const horarioCompleto = horario + ':00';
        const agendamento = agendamentos?.find((a: any) => a.horario === horarioCompleto);

        // Status:
        // true = Disponível (sem agendamento e dia válido)
        // false = Indisponível (agendado, bloqueado ou dia inválido)

        const isBooked = agendamento && agendamento.status === 'confirmado';
        const isBlocked = agendamento && agendamento.status === 'bloqueado';

        if (isBooked) bookedCount++;
        if (isBlocked) blockedCount++;

        const isAvailable = isDiaValido && !agendamento;
        if (isAvailable) availableCount++;

        vagasStatus[horario] = isAvailable;
      });

      setVagasLiberadas(vagasStatus);
      setStats({
        total: allSlots.length,
        available: availableCount,
        blocked: blockedCount,
        booked: bookedCount
      });

    } catch (err) {
      console.error('Erro ao carregar status das vagas:', err);
      setError('Erro ao carregar status das vagas');
    } finally {
      setLoading(false);
    }
  };

  const toggleVaga = async (horario: string) => {
    try {
      // Verifica o estado atual no banco para decidir a ação
      const dataFormatada = formatDateForDB(selectedDate);
      const horarioCompleto = horario + ':00';

      const { data: existingSlot } = await supabase
        .from('agendamentos')
        .select('status, id')
        .eq('data', dataFormatada)
        .eq('horario', horarioCompleto)
        .single();

      if (existingSlot) {
        if (existingSlot.status === 'bloqueado') {
          // Se está bloqueado, desbloquear (deletar o registro de bloqueio)
          const { error } = await supabase
            .from('agendamentos')
            .delete()
            .eq('id', existingSlot.id);

          if (error) throw error;
          setSuccess('Vaga liberada com sucesso!');
        } else {
          // Se está confirmado (agendado por usuário), perguntar antes de cancelar?
          // Por enquanto, vamos apenas alertar que não pode bloquear vaga ocupada
          setError('Não é possível bloquear uma vaga já agendada por um usuário.');
          setTimeout(() => setError(''), 3000);
          return;
        }
      } else {
        // Se não existe registro, criar um bloqueio
        const { error } = await supabase
          .from('agendamentos')
          .insert({
            data: dataFormatada,
            horario: horarioCompleto,
            user_id: user?.auth_id,
            nome: 'BLOQUEIO ADMINISTRATIVO',
            email: 'admin@sistema.com',
            cpf: '00000000000',
            telefone: '00000000000',
            data_nascimento: '2000-01-01',
            status: 'bloqueado'
          });

        if (error) throw error;
        setSuccess('Vaga bloqueada com sucesso!');
      }

      await loadVagasStatus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao alterar status da vaga:', err);
      setError('Erro ao alterar status da vaga');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getSlotStatusColor = (horario: string) => {
    // Precisamos saber se está bloqueado ou agendado para dar a cor correta
    // Mas o estado vagasLiberadas só diz se está livre ou não.
    // Vamos inferir pelo loadVagasStatus ou melhorar o estado local?
    // Pela simplicidade, vamos re-verificar no render ou melhorar o estado.
    // Melhoria: O estado vagasLiberadas poderia ser um objeto com o status exato.
    // Mas para manter compatibilidade rápida, vamos assumir:
    // Se !vagasLiberadas[horario], pode ser bloqueado ou agendado.
    // O ideal seria ter o status exato.

    // Vamos simplificar: Se está livre -> Verde. Se não -> Vermelho/Cinza.
    // Mas queremos distinguir bloqueio de agendamento.
    // Vamos fazer uma pequena mudança no loadVagasStatus para guardar o status real se possível?
    // Ou apenas usar a cor de "Ocupado" genérica.

    return vagasLiberadas[horario]
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
      : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200';
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <FiLock className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso Negado</h1>
          <p className="mt-2 text-gray-600">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader />
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestão de Vagas</h1>
              <p className="text-gray-600 mt-1">Gerencie a disponibilidade de horários para agendamento.</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm border">
              <div className="text-center px-4 border-r">
                <div className="text-2xl font-bold text-emerald-600">{stats.available}</div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Livres</div>
              </div>
              <div className="text-center px-4 border-r">
                <div className="text-2xl font-bold text-blue-600">{stats.booked}</div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Agendados</div>
              </div>
              <div className="text-center px-4">
                <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
                <div className="text-xs text-gray-500 uppercase font-semibold">Bloqueados</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar de Filtros */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <FiCalendar className="mr-2" /> Selecione a Data
                </label>
                <input
                  type="date"
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 p-2.5 border"
                  value={formatDateForDB(selectedDate)}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value + 'T00:00:00');
                    setSelectedDate(newDate);
                  }}
                />
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Informações</h4>
                  <p className="text-xs text-blue-600">
                    Clique em um horário para bloquear ou desbloquear. Horários agendados por usuários não podem ser bloqueados aqui.
                  </p>
                </div>
              </div>
            </div>

            {/* Área Principal */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                  <p className="text-gray-500">Carregando disponibilidade...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Manhã */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        <FiClock className="mr-2 text-emerald-600" /> Manhã
                      </h3>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        08:00 - 12:00
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {HORARIOS_MANHA.map(horario => (
                          <button
                            key={horario}
                            onClick={() => toggleVaga(horario)}
                            className={`
                              relative p-3 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2
                              ${getSlotStatusColor(horario)}
                            `}
                          >
                            <span className="font-bold text-lg">{horario}</span>
                            {vagasLiberadas[horario] ? (
                              <div className="flex items-center text-xs font-medium text-emerald-700">
                                <FiUnlock className="mr-1" /> Livre
                              </div>
                            ) : (
                              <div className="flex items-center text-xs font-medium text-gray-500">
                                <FiLock className="mr-1" /> Ocupado
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tarde */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        <FiClock className="mr-2 text-orange-500" /> Tarde
                      </h3>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        13:00 - 16:00
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {HORARIOS_TARDE.map(horario => (
                          <button
                            key={horario}
                            onClick={() => toggleVaga(horario)}
                            className={`
                              relative p-3 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2
                              ${getSlotStatusColor(horario)}
                            `}
                          >
                            <span className="font-bold text-lg">{horario}</span>
                            {vagasLiberadas[horario] ? (
                              <div className="flex items-center text-xs font-medium text-emerald-700">
                                <FiUnlock className="mr-1" /> Livre
                              </div>
                            ) : (
                              <div className="flex items-center text-xs font-medium text-gray-500">
                                <FiLock className="mr-1" /> Ocupado
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-slide-up z-50">
                  <FiX className="mr-2" /> {error}
                </div>
              )}

              {success && (
                <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-slide-up z-50">
                  <FiCheck className="mr-2" /> {success}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}