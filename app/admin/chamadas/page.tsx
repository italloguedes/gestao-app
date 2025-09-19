"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import DashboardHeader from '@/components/DashboardHeader';
import { useTextToSpeech } from '@/components/TextToSpeech';
import {
  FiCheck,
  FiX,
  FiClock,
  FiUser,
  FiPhone,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiTrash2,
  FiEye,
  FiStar,
  FiArrowLeft,
  FiVolume2,
  FiVolumeX,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiBell,
  FiBellOff,
  FiSettings,
  FiMaximize2,
  FiMinimize2,
} from 'react-icons/fi';

interface ChamadaSenha {
  id: number;
  agendamento_id: number;
  nome: string;
  horario: string;
  status: 'chamada' | 'atendido' | 'ausente';
  data_chamada: string;
  atendente_id?: string;
  observacoes?: string;
  created_at: string;
  agendamentos?: {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    atendimento_preferencial?: boolean;
  };
}

export default function GerenciarChamadasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [chamadas, setChamadas] = useState<ChamadaSenha[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // Desabilitado por padrão
  const [refreshInterval, setRefreshInterval] = useState(10); // 10 segundos por padrão
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [lastChamadaId, setLastChamadaId] = useState<number | null>(null);
  const [showChamadaAlert, setShowChamadaAlert] = useState(false);
  const [chamadaAlertData, setChamadaAlertData] = useState<{nome: string, horario: string, preferencial: boolean} | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { speak, stop, isPlaying } = useTextToSpeech();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadChamadas();
      let interval: NodeJS.Timeout;
      
      if (autoRefresh) {
        interval = setInterval(loadChamadas, refreshInterval * 1000); // Atualizar conforme intervalo configurado
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isAdmin, selectedDate, filterStatus, autoRefresh, refreshInterval]);

  // Detectar novas chamadas e mostrar alerta
  useEffect(() => {
    if (chamadas.length > 0 && notificationEnabled) {
      const ultimaChamada = chamadas[0];
      
      if (ultimaChamada && ultimaChamada.id && ultimaChamada.id !== lastChamadaId) {
        console.log('🔔 Nova chamada detectada:', ultimaChamada.nome);
        
        // Falar o nome da pessoa sendo chamada
        if (soundEnabled) {
          const mensagem = ultimaChamada.agendamentos?.atendimento_preferencial 
            ? `Chamada preferencial para ${ultimaChamada.nome}. Dirija-se ao atendimento.`
            : `Chamada para ${ultimaChamada.nome}. Dirija-se ao atendimento.`;
          
          speak(mensagem);
        }
        
        // Mostrar alerta visual
        setChamadaAlertData({
          nome: ultimaChamada.nome,
          horario: ultimaChamada.horario.substring(0, 5),
          preferencial: ultimaChamada.agendamentos?.atendimento_preferencial || false
        });
        setShowChamadaAlert(true);
        
        // Auto-fechar após 8 segundos (tempo para falar)
        setTimeout(() => {
          setShowChamadaAlert(false);
          setChamadaAlertData(null);
        }, 8000);
        
        setLastChamadaId(ultimaChamada.id);
      }
    }
  }, [chamadas, lastChamadaId, notificationEnabled, soundEnabled, speak]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("auth_id", user.id)
          .single();

        if (userError) {
          console.error("Erro ao verificar permissões:", userError);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(userData?.role === "admin" || userData?.role === "superadmin");
      }
    } catch (err) {
      console.error("Erro ao verificar usuário:", err);
      setIsAdmin(false);
    }
  };

  const loadChamadas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('chamada_senhas')
        .select(`
          *,
          agendamentos (
            id,
            nome,
            telefone,
            email,
            atendimento_preferencial
          )
        `)
        .eq('data_chamada', selectedDate)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'todos') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao carregar chamadas:', error);
        throw error;
      }
      
      setChamadas(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erro ao carregar chamadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoading(id);
    try {
      const response = await fetch('/api/chamada-senhas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          observacoes: `Status alterado para ${newStatus}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar status');
      }

      await loadChamadas();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert(`Erro ao atualizar status: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteChamada = async (id: number) => {
    if (!window.confirm('Deseja realmente remover esta chamada?')) {
      return;
    }

    setActionLoading(id);
    try {
      const response = await fetch(`/api/chamada-senhas?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover chamada');
      }

      await loadChamadas();
      alert('Chamada removida com sucesso!');
    } catch (err) {
      console.error('Erro ao remover chamada:', err);
      alert(`Erro ao remover chamada: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChamarSenha = async (agendamento: any) => {
    try {
      const response = await fetch('/api/chamada-senhas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agendamento_id: agendamento.id,
          atendente_id: user?.id,
          observacoes: `Chamada manual - ${agendamento.nome}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao chamar senha');
      }

      await loadChamadas();
      alert(`✅ Chamada realizada com sucesso para ${agendamento.nome}!`);
    } catch (err) {
      console.error('Erro ao chamar senha:', err);
      alert(`Erro ao chamar senha: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Fortaleza',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      chamada: {
        icon: <FiClock className="w-4 h-4 mr-1.5" />,
        text: "Chamada Ativa",
        className: "bg-orange-100 text-orange-800 border border-orange-300",
      },
      atendido: {
        icon: <FiCheckCircle className="w-4 h-4 mr-1.5" />,
        text: "Atendido",
        className: "bg-green-100 text-green-800 border border-green-300",
      },
      ausente: {
        icon: <FiXCircle className="w-4 h-4 mr-1.5" />,
        text: "Ausente",
        className: "bg-red-100 text-red-800 border border-red-300",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return config ? (
      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${config.className}`}>
        {config.icon}
        {config.text}
      </span>
    ) : null;
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
      <div className={`min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
        {/* Header Principal */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 mx-4 mt-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Painel de Chamadas</h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center text-base text-slate-600">
                  <FiCalendar className="w-4 h-4 mr-2" />
                  {selectedDate}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    {chamadas.length} chamadas
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {chamadas.filter(c => c.status === 'chamada').length} ativas
                  </span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {chamadas.filter(c => c.status === 'atendido').length} atendidas
                  </span>
                  {lastUpdate && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                      Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
                    </span>
                  )}
                  {autoRefresh && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium animate-pulse">
                      🔄 Auto-refresh ativo
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Controles */}
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="chamada">Chamadas Ativas</option>
                <option value="atendido">Atendidos</option>
                <option value="ausente">Ausentes</option>
              </select>
              <button
                onClick={() => loadChamadas()}
                className="flex items-center px-3 py-2 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-all duration-200"
              >
                <FiRefreshCw className="w-4 h-4 mr-1.5" />
                Atualizar
              </button>
              <button
                onClick={() => window.open("/chamada-senhas", "_blank")}
                className="flex items-center px-3 py-2 text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Abrir tela de chamadas em nova aba"
              >
                <FiEye className="w-4 h-4 mr-1.5" />
                Tela Pública
              </button>
              <button
                onClick={() => speak("Teste de voz. Sistema funcionando corretamente.")}
                className="flex items-center px-3 py-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all duration-200"
                title="Testar síntese de voz"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {isPlaying ? "Falando..." : "Testar Voz"}
              </button>
              <button
                onClick={() => router.push("/admin/agendamentos/hoje")}
                className="flex items-center px-3 py-2 text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all duration-200"
              >
                <FiArrowLeft className="w-4 h-4 mr-1.5" />
                Voltar
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Controles Avançados */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 mx-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {autoRefresh ? <FiPlay className="w-4 h-4 mr-1.5" /> : <FiPause className="w-4 h-4 mr-1.5" />}
                Auto-refresh
              </button>
              
              {autoRefresh && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">Intervalo:</label>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value={5}>5 segundos</option>
                    <option value={10}>10 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                    <option value={120}>2 minutos</option>
                  </select>
                </div>
              )}
              
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  soundEnabled 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {soundEnabled ? <FiVolume2 className="w-4 h-4 mr-1.5" /> : <FiVolumeX className="w-4 h-4 mr-1.5" />}
                Som
              </button>
              <button
                onClick={() => setNotificationEnabled(!notificationEnabled)}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                  notificationEnabled 
                    ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {notificationEnabled ? <FiBell className="w-4 h-4 mr-1.5" /> : <FiBellOff className="w-4 h-4 mr-1.5" />}
                Notificações
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="flex items-center px-3 py-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200"
              >
                {isFullscreen ? <FiMinimize2 className="w-4 h-4 mr-1.5" /> : <FiMaximize2 className="w-4 h-4 mr-1.5" />}
                {isFullscreen ? 'Sair' : 'Tela Cheia'}
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="mx-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
                >
                  <div className="h-6 bg-slate-200 rounded w-1/3 mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : chamadas.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12">
                <FiAlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Nenhuma chamada encontrada
                </h2>
                <p className="text-slate-600">
                  Não há chamadas para a data selecionada.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chamadas.map((chamada) => (
                <div
                  key={chamada.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 mb-1">
                          {chamada.nome}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <FiClock className="w-4 h-4 mr-1" />
                            {formatTime(chamada.horario)}
                          </div>
                          <div className="flex items-center">
                            <FiCalendar className="w-4 h-4 mr-1" />
                            {formatDateTime(chamada.created_at)}
                          </div>
                          {chamada.agendamentos?.atendimento_preferencial && (
                            <div className="flex items-center text-amber-600">
                              <FiStar className="w-4 h-4 mr-1" />
                              Preferencial
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(chamada.status)}
                      <div className="flex space-x-2">
                        {chamada.status === 'chamada' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(chamada.id, 'atendido')}
                              disabled={actionLoading === chamada.id}
                              className="flex items-center px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-all duration-200 disabled:opacity-50"
                            >
                              <FiCheck className="w-4 h-4 mr-1" />
                              Atendido
                            </button>
                            <button
                              onClick={() => handleStatusChange(chamada.id, 'ausente')}
                              disabled={actionLoading === chamada.id}
                              className="flex items-center px-3 py-1.5 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all duration-200 disabled:opacity-50"
                            >
                              <FiX className="w-4 h-4 mr-1" />
                              Ausente
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => speak(`Chamada para ${chamada.nome}. Dirija-se ao atendimento.`)}
                          className="flex items-center px-3 py-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all duration-200"
                          title="Falar nome da pessoa"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Falar Nome
                        </button>
                        <button
                          onClick={() => handleDeleteChamada(chamada.id)}
                          disabled={actionLoading === chamada.id}
                          className="flex items-center px-3 py-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all duration-200 disabled:opacity-50"
                        >
                          <FiTrash2 className="w-4 h-4 mr-1" />
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {chamada.agendamentos && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Informações do Agendamento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                          <FiUser className="w-4 h-4 mr-2 text-slate-500" />
                          <span className="text-slate-600">{chamada.agendamentos.nome}</span>
                        </div>
                        {chamada.agendamentos.telefone && (
                          <div className="flex items-center">
                            <FiPhone className="w-4 h-4 mr-2 text-slate-500" />
                            <span className="text-slate-600">{chamada.agendamentos.telefone}</span>
                          </div>
                        )}
                        {chamada.agendamentos.email && (
                          <div className="flex items-center">
                            <span className="text-slate-600">{chamada.agendamentos.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {chamada.observacoes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Observações:</strong> {chamada.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerta de Nova Chamada */}
      {showChamadaAlert && chamadaAlertData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-orange-400 max-w-lg w-full mx-4 overflow-hidden animate-pulse">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
              <div className="text-6xl mb-3 animate-bounce">📢</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                NOVA CHAMADA
              </h2>
              <div className="text-orange-100 text-lg">
                {chamadaAlertData.preferencial && (
                  <div className="mb-2 inline-block bg-yellow-500 text-yellow-900 px-4 py-2 rounded-full font-bold text-lg">
                    ⭐ PREFERENCIAL ⭐
                  </div>
                )}
                <div className="text-4xl font-bold text-white mb-2">
                  {chamadaAlertData.nome.toUpperCase()}
                </div>
                <div className="text-xl text-orange-100">
                  Horário: {chamadaAlertData.horario}
                </div>
              </div>
            </div>
            <div className="p-6 text-center">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowChamadaAlert(false);
                    setChamadaAlertData(null);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ✅ ENTENDI
                </button>
                <button
                  onClick={() => {
                    if (chamadaAlertData) {
                      const mensagem = chamadaAlertData.preferencial 
                        ? `Chamada preferencial para ${chamadaAlertData.nome}. Dirija-se ao atendimento.`
                        : `Chamada para ${chamadaAlertData.nome}. Dirija-se ao atendimento.`;
                      speak(mensagem);
                    }
                  }}
                  className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-bold text-lg"
                  title="Repetir chamada por voz"
                >
                  🔊 FALAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
