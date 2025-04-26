'use client';

import { useState } from 'react';
import UserList from '@/components/UserList';
import UserForm from '@/components/UserForm';

export default function UsersPage() {
  const [isAddingUser, setIsAddingUser] = useState(false);

  return (
    <div className="divide-y divide-gray-200">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Gestão de Usuários
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie os usuários do sistema e suas permissões
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isAddingUser ? 'Cancelar' : 'Adicionar Usuário'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {isAddingUser ? (
          <UserForm onCancel={() => setIsAddingUser(false)} onSuccess={() => setIsAddingUser(false)} />
        ) : (
          <UserList />
        )}
      </div>
    </div>
  );
} 