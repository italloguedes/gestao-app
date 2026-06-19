'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-client';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FiActivity, FiSearch, FiFilter, FiCalendar, FiUser, FiRefreshCw, FiChevronLeft, FiChevronRight, FiClock, FiEdit, FiTrash2, FiPlus, FiLogIn, FiLogOut, FiUpload, FiMail, FiFileText, FiPhone, FiLock, FiUnlock, FiToggleLeft, FiCheckCircle, FiXCircle, FiArrowRight, FiDatabase, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

// ========================================
// PÁGINA DE LOGS DE ATIVIDADES
// Visualização e filtros para conferência
// ========================================

interface ActivityLog {
  id: number;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  details: any;
  ip_address: string | null;
  module: string | null;
}

interface Stats {
  total: number;
  by_action: Record<string, number>;
  by_user: Array<{ name: string; count: number }>;
}

interface LogsResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: Stats | null;
}

// Configuração de ícones e cores por tipo de ação
const actionConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  create: { icon: FiPlus, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Criação' },
  update: { icon: FiEdit, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Edição' },
  delete: { icon: FiTrash2, color: 'text-red-600', bg: 'bg-red-100', label: 'Exclusão' },
  login: { icon: FiLogIn, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Login' },
  logout: { icon: FiLogOut, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Logout' },
  upload: { icon: FiUpload, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Upload' },
  email: { icon: FiMail, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Email' },
  generate_report: { icon: FiFileText, color: 'text-teal-600', bg: 'bg-teal-100', label: 'Relatório' },
  status_change: { icon: FiArrowRight, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Status' },
  call_next: { icon: FiPhone, color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'Chamada' },
  lock: { icon: FiLock, color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'Bloqueio' },
  unlock: { icon: FiUnlock, color: 'text-lime-600', bg: 'bg-lime-100', label: 'Desbloqueio' },
  toggle: { icon: FiToggleLeft, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Toggle' },
};

const entityLabels: Record<string, string> = {
  atendimento: 'Atendimento',
  agendamento: 'Agendamento',
  user: 'Usuário',
  file: 'Arquivo',
  email: 'Email',
  report: 'Relatório',
  session: 'Sessão',
  settings: 'Configurações',
  observacao: 'Observação',
  cin: 'CIN',
  biometria: 'Biometria',
};

const roleLabels: Record<string, { label: string; color: string }> = {
  superadmin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  atendente: { label: 'Atendente', color: 'bg-emerald-100 text-emerald-800' },
  user: { label: 'Usuário', color: 'bg-gray-100 text-gray-800' },
};

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);

  // Filtros
  const [dateFilter, setDateFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      if (searchFilter) params.set('search', searchFilter);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 500) {
          // Confirmar se é tabela inexistente consultando diretamente via supabase client
          const { error: testError } = await supabase.from('activity_logs').select('id').limit(1);
          if (testError && (testError.code === 'PGRST310' || testError.message?.includes('does not exist'))) {
            setIsTableMissing(true);
            return;
          }
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${res.status} ao buscar logs`);
      }

      const data: LogsResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setStats(data.stats);
      setIsTableMissing(false);
    } catch (err: any) {
      console.error('Erro ao buscar logs:', err);
      setError(err.message || 'Falha ao buscar logs da API');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, actionFilter, entityFilter, searchFilter, page]);

  const handleCreateLogsTable = async () => {
    setRunningMigration(true);
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS public.activity_logs (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id TEXT,
          user_name TEXT,
          user_email TEXT,
          user_role TEXT,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT,
          description TEXT NOT NULL,
          details JSONB,
          ip_address TEXT,
          module TEXT
        );
        
        -- Garantir colunas em tabelas já existentes
        ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
        ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
        ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS details JSONB;
        ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
        ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS module TEXT;
        
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs (entity_type);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs ((created_at::date));
        
        ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs" ON activity_logs;
        CREATE POLICY "Usuários autenticados podem inserir logs"
          ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
          
        DROP POLICY IF EXISTS "Admins podem ler logs" ON activity_logs;
        CREATE POLICY "Admins podem ler logs"
          ON activity_logs FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.auth_id = auth.uid()::text
              AND users.role IN ('superadmin', 'admin')
            )
          );
      `;

      const { error: rpcError } = await supabase.rpc('exec_sql', { sql });
      if (rpcError) throw rpcError;

      setIsTableMissing(false);
      fetchLogs();
    } catch (err: any) {
      alert('Erro ao criar tabela de logs. Certifique-se de que você é um superadmin ou execute o arquivo SQL de migração no painel do Supabase. Erro: ' + err.message);
    } finally {
      setRunningMigration(false);
    }
  };

  const { isAdmin, loading: permissionsLoading } = usePermissions();

  useEffect(() => {
    if (!permissionsLoading && isAdmin) {
      fetchLogs();
    }
  }, [permissionsLoading, isAdmin, fetchLogs]);

  const handleSearch = () => {
    setSearchFilter(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setDateFilter('');
    setActionFilter('');
    setEntityFilter('');
    setSearchFilter('');
    setSearchInput('');
    setPage(1);
  };

  const getActionConfig = (action: string) => {
    return actionConfig[action] || { icon: FiActivity, color: 'text-gray-600', bg: 'bg-gray-100', label: action };
  };

  if (permissionsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Validando credenciais...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm animate-bounce">
          <FiLock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          Esta página é restrita a administradores do sistema.
        </p>
        <Link href="/dashboard">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl">
            <FiArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl shadow-lg">
              <FiActivity className="w-6 h-6 text-white" />
            </div>
            Log de Atividades
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Registro de todas as ações realizadas no sistema</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              showFilters
                ? 'bg-emerald-100 text-emerald-700 shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md border border-gray-200'
            }`}
          >
            <FiFilter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total de Ações</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Criações</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{stats.by_action['create'] || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Edições</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{stats.by_action['update'] || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuários Ativos</p>
            <p className="text-3xl font-black text-indigo-600 mt-1">{stats.by_user.length}</p>
          </div>
        </div>
      )}

      {/* Top Users */}
      {stats && stats.by_user.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Ações por Usuário</h3>
          <div className="flex flex-wrap gap-2">
            {stats.by_user.slice(0, 10).map((u, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-sm">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                  {u.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <span className="font-medium text-gray-700">{u.name}</span>
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Data */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <FiCalendar className="inline w-3.5 h-3.5 mr-1" />
                Data
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Ação */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <FiActivity className="inline w-3.5 h-3.5 mr-1" />
                Tipo de Ação
              </label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              >
                <option value="">Todas</option>
                <option value="create">Criação</option>
                <option value="update">Edição</option>
                <option value="delete">Exclusão</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="status_change">Mudança de Status</option>
                <option value="upload">Upload</option>
                <option value="email">Email</option>
                <option value="call_next">Chamada</option>
                <option value="lock">Bloqueio</option>
                <option value="unlock">Desbloqueio</option>
                <option value="toggle">Toggle</option>
              </select>
            </div>

            {/* Entidade */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <FiFileText className="inline w-3.5 h-3.5 mr-1" />
                Módulo
              </label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              >
                <option value="">Todos</option>
                <option value="atendimento">Atendimento</option>
                <option value="agendamento">Agendamento</option>
                <option value="user">Usuário</option>
                <option value="cin">CIN</option>
                <option value="observacao">Observação</option>
                <option value="session">Sessão</option>
                <option value="file">Arquivo</option>
                <option value="biometria">Biometria</option>
              </select>
            </div>

            {/* Busca */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                <FiSearch className="inline w-3.5 h-3.5 mr-1" />
                Buscar
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar na descrição..."
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors"
                >
                  <FiSearch className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2 max-w-7xl mx-auto shadow-sm">
          <FiAlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isTableMissing ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-2xl mx-auto shadow-sm">
          <div className="h-12 w-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <FiDatabase className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Tabela de Logs não Instalada</h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            A tabela <code>activity_logs</code> necessária para rastrear as atividades do sistema não foi encontrada no banco de dados. 
            Você pode tentar criá-la automaticamente clicando no botão abaixo ou executando o script de migração correspondente.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              onClick={handleCreateLogsTable}
              disabled={runningMigration}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            >
              {runningMigration ? (
                <>
                  <FiRefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Instalando...
                </>
              ) : (
                <>
                  <FiDatabase className="mr-2 h-4 w-4" />
                  Criar Tabela de Logs
                </>
              )}
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="border-gray-200 hover:bg-gray-50 rounded-xl">
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          {/* Header da tabela */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">
              {total} {total === 1 ? 'registro' : 'registros'} encontrados
            </span>
            {dateFilter && (
              <span className="text-xs text-gray-500 font-medium">
                📅 {new Date(dateFilter + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-200 border-t-emerald-600" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FiActivity className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-semibold">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros ou selecione outra data</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const config = getActionConfig(log.action);
                const IconComponent = config.icon;
                const isExpanded = expandedLog === log.id;

                return (
                  <div
                    key={log.id}
                    className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone da ação */}
                      <div className={`p-2 rounded-xl ${config.bg} ${config.color} flex-shrink-0 mt-0.5`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-snug">
                              {log.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {/* Badge da ação */}
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${config.bg} ${config.color}`}>
                                {config.label}
                              </span>
                              {/* Badge do módulo */}
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                {entityLabels[log.entity_type] || log.entity_type}
                              </span>
                              {/* Usuário */}
                              {log.user_name && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <FiUser className="w-3 h-3" />
                                  {log.user_name}
                                </span>
                              )}
                              {/* Role */}
                              {log.user_role && roleLabels[log.user_role] && (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${roleLabels[log.user_role].color}`}>
                                  {roleLabels[log.user_role].label}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Horário */}
                          <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                            <FiClock className="w-3 h-3" />
                            {formatTime(log.created_at)}
                          </div>
                        </div>

                        {/* Detalhes expandidos */}
                        {isExpanded && log.details && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs">
                            <p className="font-bold text-gray-600 mb-1.5">Detalhes:</p>
                            <pre className="text-gray-600 whitespace-pre-wrap break-all font-mono leading-relaxed">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                            {log.entity_id && (
                              <p className="mt-2 text-gray-500">
                                <span className="font-semibold">ID:</span> {log.entity_id}
                              </p>
                            )}
                            {log.ip_address && (
                              <p className="text-gray-500">
                                <span className="font-semibold">IP:</span> {log.ip_address}
                              </p>
                            )}
                            <p className="text-gray-400 mt-1">
                              {formatDateTime(log.created_at)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
