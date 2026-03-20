'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import UserForm from './UserForm';
import {
  FiEdit2, FiTrash2, FiSearch, FiUserPlus, FiRefreshCw,
  FiShield, FiMail, FiUser, FiCheckCircle, FiXCircle,
  FiUsers, FiUserCheck, FiChevronUp, FiChevronDown,
  FiAlertTriangle, FiX
} from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type SortField = 'name' | 'role' | 'status';
type SortDir = 'asc' | 'desc';

const ROLE_ORDER: Record<string, number> = {
  superadmin: 0, admin: 1, atendente: 2, recepcao: 3, user: 4,
};

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Você precisa estar logado.'); setLoading(false); return; }

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        if (response.status === 401) setError('Sessão expirada. Faça login novamente.');
        else if (response.status === 403) setError('Acesso negado. Permissão insuficiente.');
        else setError('Erro ao carregar usuários');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsers(data || []);
      setError(null);
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao excluir usuário');
        return;
      }

      setUsers(users.filter(u => u.id !== userId));
      setDeleteTarget(null);
    } catch {
      alert('Erro ao excluir usuário');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'atendente': return 'Atendente';
      case 'recepcao': return 'Recepção';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'admin': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'atendente': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'recepcao': return 'bg-sky-100 text-sky-800 border-sky-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getAvatarGradient = (role: string) => {
    switch (role) {
      case 'superadmin': return 'from-emerald-500 to-emerald-700';
      case 'admin': return 'from-teal-500 to-teal-700';
      case 'atendente': return 'from-cyan-500 to-cyan-700';
      case 'recepcao': return 'from-sky-500 to-sky-700';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  const openCreate = () => { setEditingUser(undefined); setShowFormModal(true); };
  const openEdit = (user: User) => { setEditingUser(user); setShowFormModal(true); };
  const closeForm = () => { setEditingUser(undefined); setShowFormModal(false); };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = total - active;
    const roles: Record<string, number> = {};
    users.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1; });
    return { total, active, inactive, roles };
  }, [users]);

  // Filter + sort
  const filteredUsers = useMemo(() => {
    let list = users.filter(u =>
      (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (roleFilter === 'all' || u.role === roleFilter) &&
      (statusFilter === 'all' || u.status === statusFilter)
    );

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortField === 'role') cmp = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
      else if (sortField === 'status') cmp = (a.status || '').localeCompare(b.status || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [users, searchTerm, roleFilter, statusFilter, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <FiChevronDown className="h-3.5 w-3.5 text-gray-300" />;
    return sortDir === 'asc'
      ? <FiChevronUp className="h-3.5 w-3.5 text-emerald-600" />
      : <FiChevronDown className="h-3.5 w-3.5 text-emerald-600" />;
  };

  const roleFilters = [
    { key: 'all', label: 'Todos' },
    { key: 'superadmin', label: 'Super Admin' },
    { key: 'admin', label: 'Admin' },
    { key: 'atendente', label: 'Atendente' },
    { key: 'recepcao', label: 'Recepção' },
    { key: 'user', label: 'Usuário' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* === Page Header === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
              <FiUsers className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Administração</p>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestão de Usuários</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Gerencie acessos, permissões e perfis do sistema.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/50 hover:-translate-y-0.5 transition-all duration-300 font-semibold"
        >
          <FiUserPlus className="h-5 w-5 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* === Stats Cards === */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FiUsers className="h-5 w-5" />} label="Total" value={stats.total} color="emerald" />
          <StatCard icon={<FiCheckCircle className="h-5 w-5" />} label="Ativos" value={stats.active} color="green" />
          <StatCard icon={<FiXCircle className="h-5 w-5" />} label="Inativos" value={stats.inactive} color="gray" />
          <StatCard icon={<FiShield className="h-5 w-5" />} label="Admins" value={(stats.roles['superadmin'] || 0) + (stats.roles['admin'] || 0)} color="teal" />
        </div>
      )}

      {/* === Controls === */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 space-y-4">
        {/* Search + Refresh */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <Input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-emerald-400 focus:ring-emerald-100 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:border-emerald-400 focus:ring-emerald-100"
            >
              <option value="all">Status: Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 p-0 rounded-lg border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
              title="Atualizar"
            >
              <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex flex-wrap gap-2">
          {roleFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${roleFilter === f.key
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                }`}
            >
              {f.label}
              {f.key !== 'all' && stats.roles[f.key] !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-70">({stats.roles[f.key] || 0})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* === Table === */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Erro ao carregar</h3>
            <p className="text-gray-500 mb-6 text-sm">{error}</p>
            <Button onClick={fetchUsers} variant="outline" className="border-gray-200 hover:bg-emerald-50 hover:text-emerald-700">
              Tentar Novamente
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">
              {searchTerm || roleFilter !== 'all' ? 'Tente alterar os filtros ou a busca.' : 'Comece adicionando o primeiro usuário.'}
            </p>
            {!searchTerm && roleFilter === 'all' && (
              <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                <FiUserPlus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="text-left px-5 py-3.5">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-emerald-600 transition-colors">
                      Usuário <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3.5 hidden md:table-cell">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Email</span>
                  </th>
                  <th className="text-left px-5 py-3.5">
                    <button onClick={() => toggleSort('role')} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-emerald-600 transition-colors">
                      Função <SortIcon field="role" />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3.5">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-emerald-600 transition-colors">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                  <th className="text-right px-5 py-3.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map((user, idx) => (
                  <tr
                    key={user.id}
                    className={`group hover:bg-emerald-50/40 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                  >
                    {/* Avatar + Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${getAvatarGradient(user.role)}`}>
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <FiMail className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(user.role)}`}>
                        {user.role === 'superadmin' && <FiShield className="h-3 w-3" />}
                        {user.role === 'admin' && <FiUserCheck className="h-3 w-3" />}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`relative flex h-2.5 w-2.5 ${user.status === 'active' ? '' : ''}`}>
                          {user.status === 'active' && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                        </span>
                        <span className={`text-xs font-medium ${user.status === 'active' ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Editar"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" />
                        </Button>
                        {user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(user)}
                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
              <p className="text-xs text-gray-400">
                Mostrando <span className="font-semibold text-gray-600">{filteredUsers.length}</span> de <span className="font-semibold text-gray-600">{users.length}</span> usuários
              </p>
            </div>
          </div>
        )}
      </div>

      {/* === Modal: Create/Edit === */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <UserForm
              user={editingUser}
              onSuccess={() => { closeForm(); fetchUsers(); }}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      {/* === Modal: Delete Confirmation === */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Excluir Usuário</h3>
                <p className="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${getAvatarGradient(deleteTarget.role)}`}>
                  {deleteTarget.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{deleteTarget.name}</p>
                  <p className="text-xs text-gray-500">{deleteTarget.email}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} className="h-10 px-5 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={() => deleteTarget.id && handleDelete(deleteTarget.id)}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200/50"
              >
                <FiTrash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* === Stat Card Component === */
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'emerald' | 'green' | 'gray' | 'teal';
}) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    gray: 'bg-gray-50 text-gray-500 border-gray-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
  };

  const iconBg = {
    emerald: 'bg-emerald-100 text-emerald-600',
    green: 'bg-green-100 text-green-600',
    gray: 'bg-gray-100 text-gray-500',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <div className={`rounded-xl border p-4 ${styles[color]} transition-all hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-lg ${iconBg[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
