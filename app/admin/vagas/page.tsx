'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FiCheck, FiX, FiLock, FiUnlock, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
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
  const [slotStatuses, setSlotStatuses] = useState<{ [key: string]: 'livre' | 'ocupado' | 'bloqueado' }>({});
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

  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const loadVagasStatus = async () => {
    setLoading(true);
    try {
      const dataFormatada = formatDateForDB(selectedDate);

      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('horario, status')
        .eq('data', dataFormatada);

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const dataVerificar = new Date(selectedDate);
      dataVerificar.setHours(0, 0, 0, 0);

      const maxDate = new Date(hoje);
      maxDate.setDate(hoje.getDate() + 14);
      maxDate.setHours(23, 59, 59, 999);

      const isDiaValido =
        dataVerificar >= hoje &&
        dataVerificar <= maxDate &&
        selectedDate.getDay() !== 0 &&
        selectedDate.getDay() !== 6;

      const vagasStatus: { [key: string]: 'livre' | 'ocupado' | 'bloqueado' } = {};
      let availableCount = 0;
      let blockedCount = 0;
      let bookedCount = 0;

      const allSlots = [...HORARIOS_MANHA, ...HORARIOS_TARDE];

      allSlots.forEach(horario => {
        const horarioCompleto = horario + ':00';
        const agendamento = agendamentos?.find((a: any) => a.horario === horarioCompleto);

        const isBooked = agendamento && agendamento.status === 'confirmado';
        const isBlocked = agendamento && agendamento.status === 'bloqueado';

        let status: 'livre' | 'ocupado' | 'bloqueado' = 'livre';

        if (isBooked) {
          status = 'ocupado';
          bookedCount++;
        } else if (isBlocked) {
          status = 'bloqueado';
          blockedCount++;
        } else if (!isDiaValido) {
          status = 'bloqueado';
        } else {
          availableCount++;
        }

        vagasStatus[horario] = status;
      });

      setSlotStatuses(vagasStatus);
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
          const { error } = await supabase
            .from('agendamentos')
            .delete()
            .eq('id', existingSlot.id);

          if (error) throw error;
          setSuccess('Vaga liberada com sucesso!');
        } else {
          setError('Não é possível bloquear uma vaga já agendada por um usuário.');
          setTimeout(() => setError(''), 3000);
          return;
        }
      } else {
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

  const blockAllSlots = async () => {
    if (!confirm('Tem certeza que deseja bloquear todas as vagas disponíveis para este dia?')) return;

    setLoading(true);
    try {
      const dataFormatada = formatDateForDB(selectedDate);
      const allSlots = [...HORARIOS_MANHA, ...HORARIOS_TARDE];

      const { data: existingAppointments, error: fetchError } = await supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', dataFormatada);

      if (fetchError) throw fetchError;

      const existingTimes = new Set(existingAppointments?.map((a: any) => a.horario.slice(0, 5)));
      const slotsToBlock = allSlots.filter(horario => !existingTimes.has(horario));

      if (slotsToBlock.length === 0) {
        setError('Não há vagas disponíveis para bloquear neste dia.');
        setLoading(false);
        return;
      }

      const recordsToInsert = slotsToBlock.map(horario => ({
        data: dataFormatada,
        horario: horario + ':00',
        user_id: user?.auth_id,
        nome: 'BLOQUEIO ADMINISTRATIVO',
        email: 'admin@sistema.com',
        cpf: '00000000000',
        telefone: '00000000000',
        data_nascimento: '2000-01-01',
        status: 'bloqueado'
      }));

      const { error: insertError } = await supabase
        .from('agendamentos')
        .insert(recordsToInsert);

      if (insertError) throw insertError;

      await loadVagasStatus();
      setSuccess(`${slotsToBlock.length} vagas bloqueadas com sucesso!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao bloquear todas as vagas:', err);
      setError('Erro ao bloquear vagas.');
    } finally {
      setLoading(false);
    }
  };

  const unblockAllSlots = async () => {
    if (!confirm('Tem certeza que deseja desbloquear todas as vagas bloqueadas administrativamente para este dia?')) return;

    setLoading(true);
    try {
      const dataFormatada = formatDateForDB(selectedDate);

      const { error: deleteError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('data', dataFormatada)
        .eq('status', 'bloqueado');

      if (deleteError) throw deleteError;

      await loadVagasStatus();
      setSuccess('Todas as vagas bloqueadas foram liberadas!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao desbloquear todas as vagas:', err);
      setError('Erro ao desbloquear vagas.');
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatusColor = (horario: string) => {
    const status = slotStatuses[horario];
    if (status === 'ocupado') return 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed';
    if (status === 'bloqueado') return 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
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
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Informações</h4>
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-600">
                      <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded mr-2"></div>
                      Livre (Clique para bloquear)
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <div className="w-3 h-3 bg-red-100 border border-red-200 rounded mr-2"></div>
                      Bloqueado (Clique para liberar)
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded mr-2"></div>
                      Agendado (Não editável)
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={blockAllSlots}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <FiLock className="mr-2" /> Bloqueiar Dia Inteiro
                  </button>
                  <button
                    onClick={unblockAllSlots}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <FiUnlock className="mr-2" /> Desbloquear Dia Inteiro
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content - Slots */}
            <div className="lg:col-span-3 space-y-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
              ) : (
                <>
                  {/* Manhã */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800 flex items-center">
                        <FiClock className="mr-2 text-emerald-500" /> Manhã
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
                            disabled={slotStatuses[horario] === 'ocupado'}
                            className={`
                                                relative p-3 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2
                                                ${getSlotStatusColor(horario)}
                                            `}
                          >
                            <span className="font-bold text-lg">{horario}</span>
                            {slotStatuses[horario] === 'livre' && (
                              <div className="flex items-center text-xs font-medium text-emerald-700">
                                <FiUnlock className="mr-1" /> Livre
                              </div>
                            )}
                            {slotStatuses[horario] === 'ocupado' && (
                              <div className="flex items-center text-xs font-medium text-blue-700">
                                <FiUser className="mr-1" /> Agendado
                              </div>
                            )}
                            {slotStatuses[horario] === 'bloqueado' && (
                              <div className="flex items-center text-xs font-medium text-red-700">
                                <FiLock className="mr-1" /> Bloqueado
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
                            disabled={slotStatuses[horario] === 'ocupado'}
                            className={`
                                                relative p-3 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-2
                                                ${getSlotStatusColor(horario)}
                                            `}
                          >
                            <span className="font-bold text-lg">{horario}</span>
                            {slotStatuses[horario] === 'livre' && (
                              <div className="flex items-center text-xs font-medium text-emerald-700">
                                <FiUnlock className="mr-1" /> Livre
                              </div>
                            )}
                            {slotStatuses[horario] === 'ocupado' && (
                              <div className="flex items-center text-xs font-medium text-blue-700">
                                <FiUser className="mr-1" /> Agendado
                              </div>
                            )}
                            {slotStatuses[horario] === 'bloqueado' && (
                              <div className="flex items-center text-xs font-medium text-red-700">
                                <FiLock className="mr-1" /> Bloqueado
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
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