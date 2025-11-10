'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { FiCheck, FiX, FiLock, FiUnlock } from 'react-icons/fi';
import DashboardHeader from '@/components/DashboardHeader';

const HORARIOS = [
  "08:00", "08:20", "08:40", "09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", // manhã
  "13:00","13:30", "14:00","14:30", "15:00", // tardee
];

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
  const [vagasLiberadas, setVagasLiberadas] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkUser();
    if (selectedDate) {
      loadVagasStatus();
    }
  }, [selectedDate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Busca o usuário na tabela users usando auth_id
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
        
        setIsAdmin(userData?.role === 'admin' || userData?.role === 'superadmin');
        // Guarda o ID da tabela users
        if (user) {
          setUser({
            ...user,
            dbId: userData.id,
            auth_id: user.id
          });
        }
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
      
      // Busca todos os agendamentos para a data (confirmados e bloqueados)
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('horario, status')
        .eq('data', dataFormatada);

      if (error) throw error;

      // Verifica se é um dia permitido
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const dataVerificar = new Date(selectedDate);
      dataVerificar.setHours(0, 0, 0, 0);

      // Permitir agendamentos até 10 dias úteis à frente
      const maxDate = new Date(hoje);
      let daysToAdd = 14; // 2 semanas para garantir 10 dias úteis
      maxDate.setDate(hoje.getDate() + daysToAdd);
      maxDate.setHours(23, 59, 59, 999);

      // Define o status de cada horário
      const vagasStatus: {[key: string]: boolean} = {};
      HORARIOS.forEach(horario => {
        // Verifica se é um dia válido (não é fim de semana e está dentro do período permitido)
        const isDiaValido = 
          dataVerificar >= hoje && 
          dataVerificar <= maxDate &&
          selectedDate.getDay() !== 0 && 
          selectedDate.getDay() !== 6;

        const horarioCompleto = horario + ':00';
        const agendamentoExistente = agendamentos?.find((a: any) => a.horario === horarioCompleto);

        // Uma vaga está liberada se:
        // 1. É um dia válido E
        // 2. Não existe agendamento OU não está bloqueada
        vagasStatus[horario] = isDiaValido && (!agendamentoExistente || agendamentoExistente.status !== 'bloqueado');
      });

      setVagasLiberadas(vagasStatus);
    } catch (err) {
      console.error('Erro ao carregar status das vagas:', err);
      setError('Erro ao carregar status das vagas');
    } finally {
      setLoading(false);
    }
  };

  const toggleVaga = async (horario: string) => {
    try {
      const isLiberada = vagasLiberadas[horario];
      const dataFormatada = formatDateForDB(selectedDate);

      if (isLiberada) {
        // Se está liberada, vamos bloquear
        const { error } = await supabase
          .from('agendamentos')
          .insert({
            data: dataFormatada,
            horario: horario + ':00',
            user_id: user?.auth_id,
            nome: 'BLOQUEIO ADMINISTRATIVO',
            email: 'admin@sistema.com',
            cpf: '00000000000',
            telefone: '00000000000',
            data_nascimento: '2000-01-01',
            status: 'bloqueado'
          });

        if (error) throw error;
      } else {
        // Se está bloqueada, vamos liberar (remover o bloqueio)
        const { error } = await supabase
          .from('agendamentos')
          .delete()
          .eq('data', dataFormatada)
          .eq('horario', horario + ':00')
          .eq('status', 'bloqueado');

        if (error) throw error;
      }

      // Recarrega o status das vagas após a alteração
      await loadVagasStatus();

      setSuccess(`Vaga ${isLiberada ? 'bloqueada' : 'liberada'} com sucesso!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erro ao alterar status da vaga:', err);
      setError('Erro ao alterar status da vaga');
      setTimeout(() => setError(''), 3000);
    }
  };

  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return date.toISOString().split('T')[0];
    }
  };

  const formatDateForDB = (date: Date) => {
    return date.toISOString().split('T')[0];
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
      <div className="min-h-screen bg-gray-50 py-8 px-4 pt-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-emerald-700 mb-6">Gestão de Vagas</h1>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a data
              </label>
              <input
                type="date"
                className="border rounded-lg px-3 py-2"
                value={formatDateForDB(selectedDate)}
                onChange={(e) => {
                  const newDate = new Date(e.target.value + 'T00:00:00');
                  setSelectedDate(newDate);
                }}
              />
              <p className="mt-2 text-sm text-gray-500">
                Data selecionada: {formatDate(selectedDate)}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                As vagas são liberadas automaticamente para a semana atual e a próxima semana.
                Você pode bloquear manualmente vagas específicas.
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {HORARIOS.map(horario => {
                    const isLiberada = vagasLiberadas[horario];
                    return (
                      <button
                        key={horario}
                        onClick={() => toggleVaga(horario)}
                        className={`
                          p-4 rounded-lg border flex items-center justify-between
                          ${isLiberada 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-red-50 border-red-200 text-red-700'}
                          hover:bg-opacity-75 transition-colors
                        `}
                      >
                        <span className="font-medium">{horario}</span>
                        {isLiberada ? (
                          <FiUnlock className="w-5 h-5" title="Vaga disponível" />
                        ) : (
                          <FiLock className="w-5 h-5" title="Vaga bloqueada" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2 items-center text-sm text-gray-600">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-1"></div>
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                    <span>Bloqueada/Ocupada</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
                <FiX className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center">
                <FiCheck className="w-5 h-5 mr-2" />
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 