'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import UserForm from './UserForm';
import { FiEdit2, FiTrash2, FiSearch, FiUserPlus, FiRefreshCw, FiShield, FiMail, FiUser } from 'react-icons/fi';
import { Badge } from './ui/Badge';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para visualizar usuários.');
        setLoading(false);
        return;
      }

      // Chamar API protegida
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else if (response.status === 403) {
          setError('Você não tem permissão para visualizar usuários. Apenas administradores.');
        } else {
          setError('Erro ao carregar usuários');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para excluir usuários.');
        return;
      }

      // Chamar API protegida
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else if (response.status === 403) {
          setError('Você não tem permissão para excluir usuários. Apenas super administradores.');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Erro ao excluir usuário');
        }
        return;
      }

      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Erro ao excluir usuário');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      case 'atendente':
        return 'Atendente';
      case 'user':
        return 'Usuário';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'atendente':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Carregando usuários...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 p-6 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-red-900">Erro ao carregar</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={() => fetchUsers()}
              className="mt-3 text-sm font-semibold text-red-600 hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (editingUser !== undefined || showForm) {
    return (
      <UserForm
        user={editingUser}
        onSuccess={() => {
          setEditingUser(undefined);
          setShowForm(false);
          fetchUsers();
        }}
        onCancel={() => {
          setEditingUser(undefined);
          setShowForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Modern Header with Gradient */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-emerald-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl leading-5 bg-white/80 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 shadow-sm hover:shadow-md"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="group inline-flex items-center px-5 py-3.5 border-2 border-gray-200 shadow-sm text-sm font-semibold rounded-2xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-300"
            disabled={isRefreshing}
          >
            <FiRefreshCw className={`h-5 w-5 mr-2 transition-transform duration-500 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="group inline-flex items-center px-6 py-3.5 border-2 border-transparent text-sm font-bold rounded-2xl shadow-lg text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 transition-all duration-300 hover:scale-105"
          >
            <FiUserPlus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Modern Stats Bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <FiUser className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
            </div>
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{filteredUsers.length}</span> resultado{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border-2 border-gray-100">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
              <svg
                className="h-10 w-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Tente uma busca diferente ou limpe os filtros' : 'Comece criando um novo usuário no sistema'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 border-2 border-emerald-200 hover:border-emerald-300 rounded-xl transition-all duration-300"
              >
                <FiUserPlus className="mr-2" />
                Criar Primeiro Usuário
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredUsers.map((user, index) => (
              <li
                key={user.id}
                className="group px-6 py-5 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/50 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      {/* Modern Avatar with Gradient */}
                      <div className="relative">
                        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${
                          user.role === 'superadmin' ? 'from-red-400 to-rose-600' :
                          user.role === 'admin' ? 'from-purple-400 to-indigo-600' :
                          user.role === 'atendente' ? 'from-blue-400 to-cyan-600' :
                          'from-gray-400 to-slate-600'
                        } flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <span className="text-white font-bold text-lg">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        {/* Status Indicator */}
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                          user.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-base font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {user.name}
                          </h4>
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getRoleBadgeStyle(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 space-x-2">
                          <FiMail className="h-3.5 w-3.5 text-gray-400" />
                          <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        </div>
                        {user.auth_id && (
                          <div className="flex items-center mt-1 space-x-2">
                            <FiShield className="h-3.5 w-3.5 text-gray-400" />
                            <p className="text-xs text-gray-400 font-mono truncate">Auth ID: {user.auth_id.substring(0, 8)}...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3 ml-4">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="group/edit inline-flex items-center px-4 py-2.5 border-2 border-indigo-200 text-sm font-semibold rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all duration-300 hover:scale-105"
                    >
                      <FiEdit2 className="h-4 w-4 mr-2 group-hover/edit:rotate-12 transition-transform duration-300" />
                      Editar
                    </button>
                    {user.id && (
                      <button
                        onClick={() => handleDelete(user.id!)}
                        className="group/delete inline-flex items-center px-4 py-2.5 border-2 border-red-200 text-sm font-semibold rounded-xl text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-300 hover:scale-105"
                      >
                        <FiTrash2 className="h-4 w-4 mr-2 group-hover/delete:scale-110 transition-transform duration-300" />
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 
