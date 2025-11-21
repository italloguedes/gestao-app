'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@/lib/models/User';
import { supabase } from '@/lib/supabase-client';
import UserForm from './UserForm';
import { FiEdit2, FiTrash2, FiSearch, FiUserPlus, FiRefreshCw, FiShield, FiMail, FiUser, FiMoreVertical, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('Você precisa estar logado para visualizar usuários.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Faça login novamente.');
        } else if (response.status === 403) {
          setError('Acesso negado. Permissão insuficiente.');
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao excluir usuário');
        return;
      }

      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'atendente': return 'Atendente';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'atendente': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <Input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-blue-100 transition-all"
          />
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-12 px-5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
          >
            <FiRefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 transition-all duration-300"
          >
            <FiUserPlus className="h-5 w-5 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {loading ? (
          // Skeleton Loading
          [...Array(3)].map((_, i) => (
            <Card key={i} className="border-slate-100 shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Erro ao carregar usuários</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <Button onClick={() => fetchUsers()} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
              Tentar Novamente
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiUser className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              {searchTerm ? 'Não encontramos ninguém com esses termos. Tente buscar por outra coisa.' : 'Comece adicionando o primeiro usuário ao sistema.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 py-6 h-auto text-lg shadow-lg shadow-blue-200">
                <FiUserPlus className="mr-2 h-5 w-5" />
                Adicionar Usuário
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="group border-transparent hover:border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg transition-transform group-hover:scale-105 ${user.role === 'superadmin' ? 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-purple-200' :
                            user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-200' :
                              user.role === 'atendente' ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-200' :
                                'bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-200'
                          }`}>
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} title={user.status === 'active' ? 'Ativo' : 'Inativo'} />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                            {user.name}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeStyle(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <FiMail className="h-3.5 w-3.5" />
                            {user.email}
                          </div>
                          {user.auth_id && (
                            <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-100" title="Usuário vinculado ao Auth">
                              <FiShield className="h-3 w-3 text-slate-400" />
                              <span className="font-mono text-slate-400">Auth Linked</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        className="h-9 w-9 p-0 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Editar"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </Button>
                      {user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user.id!)}
                          className="h-9 w-9 p-0 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
