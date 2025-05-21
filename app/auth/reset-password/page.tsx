"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import Image from 'next/image';

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      const { error: resetError } = await supabase.auth.updateUser({
        password: password
      });

      if (resetError) throw resetError;

      setMessage('Senha atualizada com sucesso! Redirecionando...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao redefinir senha:', err);
      setError('Erro ao redefinir senha. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-white overflow-hidden">
      {/* Bolhas coloridas decorativas */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#23B4E7] opacity-20 rounded-full blur-3xl z-0" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#3AC28D] opacity-20 rounded-full blur-3xl z-0" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-b-8 border-[#23B4E7] flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center mb-2">
          <Image
            src="/logoautismo.png"
            alt="Logo CIADI"
            width={130}
            height={130}
            className="object-contain mb-2"
            priority
          />
        </div>
        <h2 className="text-2xl font-bold text-center" style={{ color: '#23B4E7' }}>
          Redefinir Senha
        </h2>
        <p className="text-center" style={{ color: '#8A9A91' }}>
          Digite sua nova senha abaixo
        </p>

        {error && (
          <div className="mb-2 p-3 bg-[#FFA726]/20 border-l-4 border-[#FFA726] rounded text-[#FFA726] text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-2 p-3 bg-[#3AC28D]/20 border-l-4 border-[#3AC28D] rounded text-[#3AC28D] text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm mb-1 font-semibold" style={{ color: '#23B4E7' }}>
              Nova Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#E3F7FD] border border-[#23B4E7] focus:border-[#3AC28D] focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm mb-1 font-semibold" style={{ color: '#23B4E7' }}>
              Confirmar Nova Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-[#E3F7FD] border border-[#23B4E7] focus:border-[#3AC28D] focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#FFA726] via-[#FFD600] to-[#3AC28D] hover:from-[#FFA726] hover:to-[#23B4E7] text-white font-bold py-2 rounded-lg shadow-md transition disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
} 
