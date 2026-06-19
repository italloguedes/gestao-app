'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { usePermissions } from '@/hooks/usePermissions';
import {
  FiActivity, FiSearch, FiRefreshCw, FiAlertTriangle, FiUser, 
  FiClock, FiChevronLeft, FiChevronRight, FiDatabase, FiLock, FiArrowLeft
} from 'react-icons/fi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ActivityLog {
  id: number;
  action: string;
  entity_type: string;
  description: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  login: { label: 'Login', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  logout: { label: 'Logout', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  criacao: { label: 'Criação', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  criacao_usuario: { label: 'Criar Usuário', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  atualizacao_usuario: { label: 'Editar Usuário', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  exclusao_usuario: { label: 'Excluir Usuário', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  entrega_cin: { label: 'Entrega CIN', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  atualizacao_status: { label: 'Atualizar Status', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  coleta_biometrica: { label: 'Coleta Biométrica', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  atualizacao_cin: { label: 'Atualizar CIN', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
};

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Fortaleza',
  });
}

export default function LogsPage() {
  const router = useRouter();
  const { isAdmin, loading: permissionsLoading } = usePermissions();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [runningMigration, setRunningMigration] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 15;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Contar total de registros filtrados
      let countQuery = supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });

      if (search) {
        countQuery = countQuery.or(`description.ilike.%${search}%,user_email.ilike.%${search}%`);
      }
      if (filterAction !== 'all') {
        countQuery = countQuery.eq('action', filterAction);
      }
      if (filterEntity !== 'all') {
        countQuery = countQuery.eq('entity_type', filterEntity);
      }

      const { count, error: countError } = await countQuery;
      
      if (countError) {
        if (countError.code === 'PGRST310' || countError.message?.includes('relation "public.activity_logs" does not exist')) {
          setIsTableMissing(true);
          setLoading(false);
          return;
        }
        throw countError;
      }

      setTotalCount(count || 0);

      // 2. Buscar registros paginados
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%`);
      }
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }
      if (filterEntity !== 'all') {
        query = query.eq('entity_type', filterEntity);
      }

      // Paginação (0-indexed no Supabase range)
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      const { data, error: dataError } = await query.range(from, to);

      if (dataError) throw dataError;
      setLogs(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar logs:', err);
      setError(err.message || 'Falha ao buscar logs do banco de dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoading && isAdmin) {
      fetchLogs();
    }
  }, [permissionsLoading, isAdmin, currentPage, filterAction, filterEntity]);

  // Executa busca quando o usuário digita na barra de pesquisa (debounce ou enter)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLogs();
  };

  // Tenta criar a tabela via exec_sql
  const handleCreateLogsTable = async () => {
    setRunningMigration(true);
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS public.activity_logs (
          id BIGSERIAL PRIMARY KEY,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(255) NOT NULL,
          description TEXT,
          user_id VARCHAR(255),
          user_email VARCHAR(255),
          user_role VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Fortaleza'::text, now()) NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
        
        ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.activity_logs;
        CREATE POLICY "Permitir inserção para usuários autenticados"
          ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);
          
        DROP POLICY IF EXISTS "Permitir leitura apenas para admin e superadmin" ON public.activity_logs;
        CREATE POLICY "Permitir leitura apenas para admin e superadmin"
          ON public.activity_logs FOR SELECT TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.users
              WHERE users.auth_id = auth.uid()::text
                AND users.role IN ('admin', 'superadmin')
                AND users.status = 'active'
            )
          );
      `;

      const { error: rpcError } = await supabase.rpc('exec_sql', { sql });
      if (rpcError) throw rpcError;

      setIsTableMissing(false);
      fetchLogs();
    } catch (err: any) {
      alert('Erro ao criar tabela de logs. Por favor, verifique se você é um superadmin ou execute o arquivo de migração no painel do Supabase. Erro: ' + err.message);
    } finally {
      setRunningMigration(false);
    }
  };

  // Se estiver carregando permissões
  if (permissionsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <p className="mt-4 text-sm text-gray-500 font-medium">Validando credenciais...</p>
      </div>
    );
  }

  // Se não for admin
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

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <FiActivity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Configurações</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Logs do Sistema</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Auditoria completa de acessos, alterações e ações dos colaboradores.
          </p>
        </div>

        <Button 
          onClick={() => { setCurrentPage(1); fetchLogs(); }}
          variant="outline"
          disabled={loading || isTableMissing}
          className="h-10 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition-all self-end sm:self-auto"
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

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
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <Input
                  type="text"
                  placeholder="Pesquisar por descrição, email..."
                  className="pl-9 h-10 bg-white border-gray-200 focus:border-emerald-400 focus:ring-emerald-100 rounded-xl text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">Ação</label>
                <select
                  value={filterAction}
                  onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:border-emerald-400 focus:ring-emerald-100 focus:outline-none transition-all"
                >
                  <option value="all">Todas as Ações</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="criacao_usuario">Criar Usuário</option>
                  <option value="atualizacao_usuario">Editar Usuário</option>
                  <option value="exclusao_usuario">Excluir Usuário</option>
                  <option value="entrega_cin">Entrega CIN</option>
                  <option value="atualizacao_status">Atualizar Status</option>
                  <option value="coleta_biometrica">Coleta Biométrica</option>
                  <option value="atualizacao_cin">Atualizar CIN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider pl-1">Entidade</label>
                <select
                  value={filterEntity}
                  onChange={(e) => { setFilterEntity(e.target.value); setCurrentPage(1); }}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl bg-white text-sm focus:border-emerald-400 focus:ring-emerald-100 focus:outline-none transition-all"
                >
                  <option value="all">Todas as Entidades</option>
                  <option value="session">Sessão</option>
                  <option value="user">Usuário</option>
                  <option value="atendimento">Atendimento</option>
                  <option value="agendamento">Agendamento</option>
                </select>
              </div>
            </form>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-100 flex items-center gap-2">
                <FiAlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">Data / Hora</th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">Usuário</th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">Ação</th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">Entidade</th>
                    <th className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
                          <p className="text-xs">Carregando logs de auditoria...</p>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FiClock className="h-8 w-8 text-gray-300" />
                          <p className="font-semibold text-sm">Nenhum log encontrado</p>
                          <p className="text-xs text-gray-400">Tente ajustar seus filtros ou realizar novas ações.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const actionCfg = ACTION_LABELS[log.action] || {
                        label: log.action,
                        color: 'text-slate-700',
                        bg: 'bg-slate-50 border-slate-200',
                      };

                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                            {formatDatetime(log.created_at)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                                {log.user_email ? log.user_email[0].toUpperCase() : '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate max-w-[200px]" title={log.user_email || 'Sistema'}>
                                  {log.user_email || 'Sistema / Anon'}
                                </p>
                                {log.user_role && (
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {log.user_role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${actionCfg.bg} ${actionCfg.color}`}>
                              {actionCfg.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 uppercase font-mono">
                              {log.entity_type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 max-w-sm truncate" title={log.description}>
                            {log.description}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Mostrando logs de <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  de <span className="font-semibold">{totalCount}</span>
                </span>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                    variant="outline"
                    className="h-8 w-8 p-0 border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center text-xs font-bold text-gray-700 px-2 select-none">
                    Página {currentPage} de {totalPages}
                  </div>

                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                    variant="outline"
                    className="h-8 w-8 p-0 border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
