'use client';

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem');
          setLoading(false);
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setMessage('Verifique seu email para confirmar o cadastro');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.session) {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col-reverse lg:flex-row items-center justify-center gap-8 lg:gap-16">
        {/* Left side - Form */}
        <div className="w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center justify-center lg:hidden mb-8">
              <Image
                src="/logoautismo.png"
                alt="Logo Sala Sensorial / ALECE"
                width={150}
                height={150}
                className="object-contain"
                priority
              />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent mb-2 text-center lg:text-left">
              {isRegistering ? 'Criar nova conta' : 'Bem-vindo de volta!'}
            </h3>
            <p className="text-gray-600 mb-8 text-center lg:text-left">
              {isRegistering 
                ? 'Preencha seus dados para começar sua jornada'
                : 'Entre com suas credenciais para continuar sua jornada'}
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                <p className="text-green-700 text-sm">{message}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>{isRegistering ? 'Criar Conta' : 'Entrar'}</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                  setMessage(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
              >
                {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Crie uma agora'}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Logo and Text */}
        <div className="hidden lg:flex flex-col items-center lg:items-start space-y-12">
          <div className="flex flex-col items-center space-y-6">
            <Image
              src="/logoautismo.png"
              alt="Logo Sala Sensorial / ALECE"
              width={250}
              height={250}
              className="object-contain"
              priority
            />
            <div className="text-center">
              <h2 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-amber-500 bg-clip-text text-transparent">
                Sala Sensorial
              </h2>
              <p className="text-2xl text-blue-600 font-semibold mt-2">ALECE</p>
            </div>
          </div>
          <div className="max-w-md bg-white/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-semibold text-blue-700 mb-4">
              Sistema de Gestão Integrado
            </h3>
            <p className="text-gray-700 leading-relaxed text-lg">
              Bem-vindo à plataforma dedicada ao gerenciamento da Sala Sensorial. 
              Nossa missão é proporcionar um ambiente acolhedor e organizado para 
              o desenvolvimento e acompanhamento das atividades.
            </p>
            <div className="mt-6 flex items-center space-x-2 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Compromisso com a inclusão e o cuidado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}