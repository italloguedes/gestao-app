'use client';

import UserList from '@/components/UserList';

export default function UsersPage() {
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
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <UserList />
      </div>
    </div>
  );
} 
