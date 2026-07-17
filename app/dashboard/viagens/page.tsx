'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardGuard from '@/components/DashboardGuard';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import {
  Viagem,
  ViagemFormData,
  ViagemServidor,
  ViagemChecklist,
  ViagemStatus,
  EquipeSet
} from '@/types/viagem';
import {
  fetchViagens,
  createViagem,
  updateViagem,
  updateViagemStatus,
  deleteViagem,
  calculateViagemStats
} from '@/lib/viagens-service';
import {
  FiTruck,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiUsers,
  FiPlus,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiEye,
  FiChevronRight,
  FiCheckSquare,
  FiRefreshCw,
  FiX,
  FiUserPlus,
  FiTarget,
  FiDollarSign,
  FiBriefcase
} from 'react-icons/fi';

const DEFAULT_CHECKLIST_SUGGESTIONS = [
  'Inspeção e revisão dos veículos de viagem',
  'Verificação dos kits de Coleta Biométrica e impressoras',
  'Envio de Ofício de alinhamento à prefeitura local',
  'Equipe de atendimento e recepção escalada',
  'Reserva de hospedagem e logística de diárias',
  'Testes dos formulários e rede offline nos notebooks'
];

const SETORES_PADRAO = [
  'DIRETORIA GERAL',
  'CIADI',
  'DAF - DIRETORIA ADMINISTRAÇÃO FINANCEIRA',
  'DEPARTAMENTO DE SAÚDE',
  'CONSELHO DE ALTOS ESTUDOS'
];

export default function GestaoViagensPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Estados principais
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todas');

  // Estados dos Modais
  const [showModal, setShowModal] = useState(false);
  const [editingViagem, setEditingViagem] = useState<Viagem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Usuários do sistema para convocação/escala
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Estado do formulário
  const [formData, setFormData] = useState<ViagemFormData>({
    titulo: '',
    municipio: '',
    local_evento: '',
    data_ida: '',
    data_retorno: '',
    dias_acao: 1,
    status: 'planejada',
    setor: 'DIRETORIA GERAL',
    responsavel_nome: '',
    objetivo: '',
    meta_atendimentos: 100,
    orcamento_estimado: 0,
    transporte_info: ''
  });

  // Lista de servidores selecionados no form
  const [selectedServidores, setSelectedServidores] = useState<ViagemServidor[]>([]);

  // Lista de checklist no form
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newCheckitem, setNewCheckitem] = useState('');

  // Carregar dados
  const loadViagens = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchViagens({
        status: statusFilter,
        search: searchTerm
      });
      setViagens(data);
    } catch (err: any) {
      console.error('Erro ao carregar viagens:', err);
      setError('Não foi possível carregar a lista de viagens. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchTerm]);

  // Carregar lista de usuários para escalação de equipe (apenas admin, superadmin e atendente)
  useEffect(() => {
    const loadSystemUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const users: User[] = await res.json();
          const allowedRoles = ['admin', 'superadmin', 'atendente'];
          setAvailableUsers(users.filter(u => u.status === 'active' && allowedRoles.includes(u.role)));
        }
      } catch (e) {
        console.error('Erro ao carregar usuários do sistema:', e);
      }
    };
    loadSystemUsers();
  }, []);

  useEffect(() => {
    loadViagens();
  }, [loadViagens]);

  // Cálculo de estatísticas
  const stats = useMemo(() => calculateViagemStats(viagens), [viagens]);

  // Função auxiliar para auto-calcular dias da ação a partir do intervalo de datas (opcional)
  const handleAutoCalcDiasAcao = () => {
    if (formData.data_ida && formData.data_retorno) {
      const start = new Date(formData.data_ida);
      const end = new Date(formData.data_retorno);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const days = diffDays > 0 ? diffDays : 1;
        setFormData(prev => ({ ...prev, dias_acao: days }));
      }
    }
  };

  // Handler para abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingViagem(null);
    setFormData({
      titulo: '',
      municipio: '',
      local_evento: '',
      data_ida: new Date().toISOString().slice(0, 16),
      data_retorno: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
      dias_acao: 2,
      status: 'planejada',
      setor: 'DIRETORIA GERAL',
      responsavel_nome: user?.user_metadata?.full_name || '',
      objetivo: '',
      meta_atendimentos: 100,
      orcamento_estimado: 0,
      transporte_info: ''
    });
    setSelectedServidores([]);
    setChecklistItems([...DEFAULT_CHECKLIST_SUGGESTIONS]);
    setShowModal(true);
  };

  // Handler para abrir modal de edição
  const handleOpenEditModal = (v: Viagem) => {
    setEditingViagem(v);
    setFormData({
      titulo: v.titulo,
      municipio: v.municipio,
      local_evento: v.local_evento || '',
      data_ida: v.data_ida ? new Date(v.data_ida).toISOString().slice(0, 16) : '',
      data_retorno: v.data_retorno ? new Date(v.data_retorno).toISOString().slice(0, 16) : '',
      dias_acao: v.dias_acao || 1,
      status: v.status,
      setor: v.setor || 'DIRETORIA GERAL',
      responsavel_nome: v.responsavel_nome || '',
      objetivo: v.objetivo || '',
      meta_atendimentos: v.meta_atendimentos || 0,
      orcamento_estimado: v.orcamento_estimado || 0,
      transporte_info: v.transporte_info || ''
    });
    setSelectedServidores(v.servidores || []);
    setChecklistItems(v.checklist ? v.checklist.map(c => c.item) : []);
    setShowModal(true);
  };

  // Adicionar usuário à equipe (Equipe 1, Equipe 2 ou Apoio)
  const handleAddServidor = (user: User, equipeSet: EquipeSet = 'Equipe 1') => {
    if (selectedServidores.some(s => s.user_id === user.id || s.nome === user.name)) return;

    setSelectedServidores(prev => [
      ...prev,
      {
        user_id: user.id,
        nome: user.name,
        cpf: user.cpf || '',
        matricula: user.matricula || '',
        funcao_na_viagem: user.funcao || 'Atendente',
        equipe_set: equipeSet
      }
    ]);
  };

  // Remover servidor do form
  const handleRemoveServidor = (index: number) => {
    setSelectedServidores(prev => prev.filter((_, i) => i !== index));
  };

  // Alterar grupo do servidor
  const handleUpdateServidorEquipe = (index: number, newEquipe: EquipeSet) => {
    setSelectedServidores(prev => prev.map((s, i) => i === index ? { ...s, equipe_set: newEquipe } : s));
  };

  // Adicionar item de checklist
  const handleAddCheckitem = () => {
    if (!newCheckitem.trim()) return;
    setChecklistItems(prev => [...prev, newCheckitem.trim()]);
    setNewCheckitem('');
  };

  // Remover item de checklist
  const handleRemoveCheckitem = (index: number) => {
    setChecklistItems(prev => prev.filter((_, i) => i !== index));
  };

  // Salvar formulário (Criar ou Atualizar)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.municipio || !formData.data_ida || !formData.data_retorno) {
      alert('Por favor, preencha os campos obrigatórios: Título, Município, Data de Ida e Data de Retorno.');
      return;
    }

    setSaving(true);
    try {
      if (editingViagem) {
        // Atualizar
        const updatedChecklistFormat: ViagemChecklist[] = checklistItems.map((item, idx) => ({
          item,
          concluido: editingViagem.checklist?.find(c => c.item === item)?.concluido || false,
          ordem: idx + 1
        }));

        await updateViagem(editingViagem.id, formData, selectedServidores, updatedChecklistFormat);
      } else {
        // Criar novo
        await createViagem(formData, selectedServidores, checklistItems);
      }

      setShowModal(false);
      await loadViagens();
    } catch (err: any) {
      console.error('Erro ao salvar viagem:', err);
      alert('Erro ao salvar os dados da viagem: ' + (err.message || 'Ocorreu um erro inesperado.'));
    } finally {
      setSaving(false);
    }
  };

  // Alteração rápida de status
  const handleQuickStatusChange = async (id: string, newStatus: ViagemStatus) => {
    try {
      await updateViagemStatus(id, newStatus);
      setViagens(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    } catch (err) {
      alert('Erro ao alterar status da viagem.');
    }
  };

  // Confirmar exclusão
  const handleDeleteViagem = async (id: string) => {
    try {
      await deleteViagem(id);
      setViagens(prev => prev.filter(v => v.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      alert('Erro ao excluir a viagem.');
    }
  };

  // Redirecionar para o gerador de PDF de Diárias com dados preenchidos
  const handleGenerateDiariasPDF = (v: Viagem) => {
    const params = new URLSearchParams({
      cidade: v.municipio,
      setor: v.setor || 'DIRETORIA GERAL',
      justificativa: v.objetivo || `Ação Itinerante no município de ${v.municipio}`,
      deputadoChefe: v.responsavel_nome || ''
    });
    router.push(`/dashboard/relatorios/diarias?${params.toString()}`);
  };

  // Renderização do Badge de Status
  const renderStatusBadge = (status: ViagemStatus) => {
    switch (status) {
      case 'planejada':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"><FiClock className="w-3.5 h-3.5" /> Planejada</span>;
      case 'em_andamento':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 animate-pulse"><FiTruck className="w-3.5 h-3.5" /> Em Andamento</span>;
      case 'concluida':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1"><FiCheckCircle className="w-3.5 h-3.5" /> Concluída</span>;
      case 'cancelada':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><FiXCircle className="w-3.5 h-3.5" /> Cancelada</span>;
    }
  };

  const formatDateShort = (isoString: string) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md shadow-emerald-500/20">
                  <FiTruck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                    Gestão de Viagens & Ações Itinerantes
                  </h1>
                  <p className="text-sm text-gray-500">
                    Programação oficial, escala de equipes por grupos e logística para ações nos municípios.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => { setRefreshing(true); loadViagens(); }}
                className="p-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
                title="Atualizar lista"
              >
                <FiRefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 active:scale-95"
              >
                <FiPlus className="w-5 h-5" />
                <span>Nova Viagem / Ação</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas (KPIs) - Compactos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                <FiTruck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Total</p>
                <p className="text-xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <FiClock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-blue-500">Planejadas</p>
                <p className="text-xl font-bold text-gray-800">{stats.planejadas}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <FiTruck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-600">Em Andamento</p>
                <p className="text-xl font-bold text-gray-800">{stats.emAndamento}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center space-x-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-teal-600">Concluídas</p>
                <p className="text-xl font-bold text-gray-800">{stats.concluidas}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex items-center space-x-3 col-span-2 sm:col-span-1">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <FiUsers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-purple-600">Servidores</p>
                <p className="text-xl font-bold text-gray-800">{stats.totalServidores}</p>
              </div>
            </div>
          </div>

          {/* Barra de Busca e Filtros */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por título, município..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-[11px] font-semibold text-gray-400 uppercase flex items-center gap-1">
                <FiFilter className="w-3.5 h-3.5" /> Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todas">Todos os Status</option>
                <option value="planejada">Planejada</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Lista de Cards de Viagens (Design Mais Compacto) */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
              <p className="text-gray-500 text-xs font-medium">Carregando viagens programadas...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg text-red-700 text-xs flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : viagens.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <FiTruck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Nenhuma viagem cadastrada ou encontrada</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Clique no botão &quot;Nova Viagem / Ação&quot; para agendar uma nova ação itinerante com a equipe.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 text-white font-medium text-xs rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                <FiPlus className="w-3.5 h-3.5" />
                <span>Programar Nova Viagem</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {viagens.map((v) => {
                const totalChecklist = v.checklist?.length || 0;
                const doneChecklist = v.checklist?.filter(c => c.concluido).length || 0;
                const progressPercent = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;

                // Agrupar equipe por Sets
                const eq1Count = v.servidores?.filter(s => s.equipe_set === 'Equipe 1').length || 0;
                const eq2Count = v.servidores?.filter(s => s.equipe_set === 'Equipe 2').length || 0;
                const apoioCount = v.servidores?.filter(s => !['Equipe 1', 'Equipe 2'].includes(s.equipe_set)).length || 0;

                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group border-t-3 border-t-emerald-500"
                  >
                    <div className="p-4 space-y-3">
                      {/* Topo do Card */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-lg bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
                          <FiMapPin className="w-3 h-3 text-emerald-600" /> {v.municipio}
                        </span>
                        {renderStatusBadge(v.status)}
                      </div>

                      {/* Título da Viagem */}
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {v.titulo}
                        </h2>
                        {v.local_evento && (
                          <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 line-clamp-1">
                            <span className="font-medium text-gray-400">Local:</span> {v.local_evento}
                          </p>
                        )}
                      </div>

                      {/* Período: Data/Hora de Ida, Retorno e Dias */}
                      <div className="bg-slate-50 p-2.5 rounded-xl space-y-1.5 border border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between text-gray-700">
                          <span className="flex items-center gap-1 font-semibold text-gray-600">
                            <FiCalendar className="w-3.5 h-3.5 text-emerald-600" /> Período
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {v.dias_acao} {v.dias_acao === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-gray-600 pt-1 border-t border-slate-200/60">
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase">Ida</span>
                            <span className="font-medium text-gray-800 text-[11px]">{formatDateShort(v.data_ida)}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-gray-400 font-bold uppercase">Retorno</span>
                            <span className="font-medium text-gray-800 text-[11px]">{formatDateShort(v.data_retorno)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Divisão de Equipes Escaladas (Sets) */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-gray-400 uppercase flex items-center gap-1 text-[10px]">
                          <FiUsers className="w-3 h-3" /> Equipe ({v.servidores?.length || 0})
                        </span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200 font-medium">
                            Eq.1: <strong>{eq1Count}</strong>
                          </span>
                          <span className="px-2 py-0.5 bg-sky-50 text-sky-800 rounded border border-sky-200 font-medium">
                            Eq.2: <strong>{eq2Count}</strong>
                          </span>
                          {apoioCount > 0 && (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded border border-gray-200 font-medium">
                              Ap: <strong>{apoioCount}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progresso de Checklist */}
                      {totalChecklist > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1"><FiCheckSquare className="w-3 h-3 text-emerald-600" /> Logística</span>
                            <span>{doneChecklist}/{totalChecklist} ({progressPercent}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações do Card */}
                    <div className="bg-gray-50/80 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => router.push(`/dashboard/viagens/${v.id}`)}
                          className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Ver detalhes da viagem"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(v)}
                          className="p-1.5 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar viagem"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleGenerateDiariasPDF(v)}
                          className="p-1.5 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Gerar PDF de Diárias para esta viagem"
                        >
                          <FiFileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(v.id)}
                          className="p-1.5 text-gray-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Excluir viagem"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => router.push(`/dashboard/viagens/${v.id}`)}
                        className="inline-flex items-center space-x-0.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-all"
                      >
                        <span>Detalhes</span>
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal de Confirmação de Exclusão */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center space-x-3 text-rose-600">
                  <FiAlertCircle className="w-7 h-7" />
                  <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja excluir esta viagem programada? Os dados dos servidores escalados e checklist também serão removidos.
                </p>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteViagem(deleteConfirmId)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-md shadow-rose-600/20"
                  >
                    Excluir Viagem
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Cadastro / Edição de Viagem */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-full my-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 border border-gray-100">
                
                {/* Header Modal */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <FiTruck className="w-6 h-6" />
                    <h3 className="text-xl font-bold">
                      {editingViagem ? 'Editar Viagem / Ação Itinerante' : 'Programar Nova Viagem / Ação'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveForm} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                  
                  {/* Dados Básicos */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                      1. Informações Básicas da Ação
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Título da Ação *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ação Itinerante - Sobral 2026"
                          value={formData.titulo}
                          onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Município de Destino *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Sobral, Juazeiro do Norte, Quixadá"
                          value={formData.municipio}
                          onChange={e => setFormData({ ...formData, municipio: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Local do Evento / Endereço</label>
                        <input
                          type="text"
                          placeholder="Ex: Câmara Municipal de Sobral"
                          value={formData.local_evento}
                          onChange={e => setFormData({ ...formData, local_evento: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Setor Responsável</label>
                        <select
                          value={formData.setor}
                          onChange={e => setFormData({ ...formData, setor: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          {SETORES_PADRAO.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Programação de Datas e Período */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                      2. Datas, Horários de Ida/Retorno e Dias da Ação
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Data e Hora de Ida *</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.data_ida}
                          onChange={e => setFormData({ ...formData, data_ida: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Data e Hora de Retorno *</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.data_retorno}
                          onChange={e => setFormData({ ...formData, data_retorno: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-semibold text-gray-700">Dias da Ação (Atendimento)</label>
                          <button
                            type="button"
                            onClick={handleAutoCalcDiasAcao}
                            className="text-[10px] text-emerald-700 hover:underline font-semibold"
                            title="Calcular número de dias com base nas datas de Ida e Retorno"
                          >
                            Auto-calcular pelas datas
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={formData.dias_acao}
                            onChange={e => setFormData({ ...formData, dias_acao: parseInt(e.target.value) || 1 })}
                            className="w-full text-sm px-3.5 py-2.5 bg-emerald-50/50 border border-emerald-200 text-emerald-800 font-bold rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                          <div className="flex flex-wrap gap-1 text-[11px]">
                            {[1, 2, 3, 4, 5, 7, 10].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setFormData({ ...formData, dias_acao: d })}
                                className={`px-2 py-0.5 rounded-md font-semibold border transition-colors ${
                                  formData.dias_acao === d
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50'
                                }`}
                              >
                                {d} {d === 1 ? 'dia' : 'dias'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipes Escaladas em Sets */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                        3. Escala da Equipe (Equipe 1 e Equipe 2)
                      </h4>
                    </div>

                    {/* Seleção rápida de usuários */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-gray-700">Convocar Servidor do Sistema</label>
                        <span className="text-[10px] text-gray-400 font-medium">Apenas perfis: Admin, SuperAdmin e Atendente</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                        {availableUsers.map(u => {
                          const isAdded = selectedServidores.some(s => s.user_id === u.id || s.nome === u.name);
                          return (
                            <div
                              key={u.id}
                              className={`p-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                                isAdded ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-white hover:bg-emerald-50 border border-gray-100'
                              }`}
                            >
                              <span className="truncate">{u.name}</span>
                              {!isAdded ? (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleAddServidor(u, 'Equipe 1')}
                                    className="px-1.5 py-0.5 bg-teal-600 text-white rounded text-[10px] hover:bg-teal-700"
                                    title="Adicionar à Equipe 1"
                                  >
                                    Eq 1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddServidor(u, 'Equipe 2')}
                                    className="px-1.5 py-0.5 bg-sky-600 text-white rounded text-[10px] hover:bg-sky-700"
                                    title="Adicionar à Equipe 2"
                                  >
                                    Eq 2
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-700">Adicionado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tabela dos Servidores Escolhidos no Form */}
                    {selectedServidores.length > 0 && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                          <thead className="bg-gray-50 text-gray-500 font-semibold">
                            <tr>
                              <th className="px-3 py-2 text-left">Servidor / Nome</th>
                              <th className="px-3 py-2 text-left">Função</th>
                              <th className="px-3 py-2 text-left">Conjunto de Equipe</th>
                              <th className="px-3 py-2 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {selectedServidores.map((serv, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 font-medium text-gray-800">{serv.nome}</td>
                                <td className="px-3 py-2 text-gray-500">{serv.funcao_na_viagem || 'Atendente'}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={serv.equipe_set}
                                    onChange={e => handleUpdateServidorEquipe(index, e.target.value as EquipeSet)}
                                    className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 font-semibold"
                                  >
                                    <option value="Equipe 1">Equipe 1</option>
                                    <option value="Equipe 2">Equipe 2</option>
                                    <option value="Equipe de Apoio">Equipe de Apoio</option>
                                    <option value="Outros">Outros</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveServidor(index)}
                                    className="text-red-500 hover:text-red-700 font-medium"
                                  >
                                    Remover
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Checklist Logístico */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                      4. Checklist Logístico Pré-Viagem
                    </h4>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Adicionar novo item de verificação..."
                        value={newCheckitem}
                        onChange={e => setNewCheckitem(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckitem(); } }}
                        className="flex-1 text-sm px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCheckitem}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                      >
                        Adicionar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {checklistItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-xs text-gray-700 border border-slate-100">
                          <span className="flex items-center gap-2">
                            <FiCheckSquare className="text-emerald-600" /> {item}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCheckitem(idx)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Informações Complementares */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">
                      5. Detalhes Complementares e Metas
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Coordenador / Deputado</label>
                        <input
                          type="text"
                          placeholder="Nome do gestor/responsável"
                          value={formData.responsavel_nome}
                          onChange={e => setFormData({ ...formData, responsavel_nome: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Meta de Atendimentos</label>
                        <input
                          type="number"
                          value={formData.meta_atendimentos}
                          onChange={e => setFormData({ ...formData, meta_atendimentos: parseInt(e.target.value) || 0 })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Transporte / Veículos</label>
                        <input
                          type="text"
                          placeholder="Ex: Van Oficial Placa XXX-0000"
                          value={formData.transporte_info}
                          onChange={e => setFormData({ ...formData, transporte_info: e.target.value })}
                          className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Justificativa e Objetivos da Viagem</label>
                      <textarea
                        rows={3}
                        placeholder="Descreva as atividades e metas a serem cumpridas no município..."
                        value={formData.objetivo}
                        onChange={e => setFormData({ ...formData, objetivo: e.target.value })}
                        className="w-full text-sm px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Botoes de Acao Modal */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center space-x-2"
                    >
                      {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      <span>{editingViagem ? 'Salvar Alterações' : 'Cadastrar Viagem'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardGuard>
  );
}
