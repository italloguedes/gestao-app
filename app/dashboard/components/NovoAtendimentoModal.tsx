"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';
import { FiX, FiUser, FiMail, FiCreditCard, FiFileText, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface NovoAtendimentoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoAtendimentoModal({ show, onClose, onSuccess }: NovoAtendimentoModalProps) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [protocolo, setProtocolo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [hasSavedData, setHasSavedData] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Chave para localStorage
  const FORM_DATA_KEY = 'novoAtendimentoModal_formData';

  // Carregar dados salvos quando o modal abre
  useEffect(() => {
    if (show) {
      const savedData = localStorage.getItem(FORM_DATA_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setNome(parsedData.nome || '');
          setCpf(parsedData.cpf || '');
          setEmail(parsedData.email || '');
          setSolicitante(parsedData.solicitante || '');
          setProtocolo(parsedData.protocolo || '');
          setHasSavedData(true);
        } catch (error) {
          console.error('Erro ao carregar dados salvos:', error);
        }
      } else {
        setHasSavedData(false);
      }
    }
  }, [show]);

  // Salvar dados automaticamente conforme o usuário digita
  useEffect(() => {
    if (show) {
      const formData = {
        nome,
        cpf,
        email,
        solicitante,
        protocolo
      };
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(formData));
    }
  }, [nome, cpf, email, solicitante, protocolo, show]);

  // Função para limpar dados salvos
  const clearSavedData = () => {
    localStorage.removeItem(FORM_DATA_KEY);
    setHasSavedData(false);
  };

  // Máscara de CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);

    // Validação em tempo real
    const numbers = formatted.replace(/\D/g, '');
    if (numbers.length > 0 && numbers.length < 11) {
      setValidationErrors(prev => ({ ...prev, cpf: 'CPF incompleto' }));
    } else {
      setValidationErrors(prev => {
        const { cpf, ...rest } = prev;
        return rest;
      });
    }
  };

  // Validação de email em tempo real
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationErrors(prev => ({ ...prev, email: 'Email inválido' }));
    } else {
      setValidationErrors(prev => {
        const { email, ...rest } = prev;
        return rest;
      });
    }
  };

  // Função para lidar com o fechamento do modal
  const handleClose = () => {
    onClose();
  };

  // Função para cancelar e limpar dados
  const handleCancel = () => {
    if (nome || cpf || email || solicitante || protocolo) {
      const shouldClear = window.confirm('Deseja descartar os dados preenchidos? Eles serão perdidos permanentemente.');
      if (shouldClear) {
        setNome('');
        setCpf('');
        setEmail('');
        setSolicitante('');
        setProtocolo('');
        setValidationErrors({});
        clearSavedData();
        onClose();
      }
    } else {
      onClose();
    }
  };

  const isValidCpf = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.length === 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('Usuário não autenticado.');
      setMessageType('error');
      return;
    }
    if (!isValidCpf(cpf)) {
      setMessage('CPF inválido. Verifique o número digitado.');
      setMessageType('error');
      return;
    }
    if (!protocolo) {
      setMessage('Informe o número de protocolo.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Verificar se o CPF já existe no banco de dados
      const cpfNumbers = cpf.replace(/\D/g, '');
      const { data: existingCpf, error: cpfCheckError } = await supabase
        .from('atendimentos')
        .select('cpf')
        .eq('cpf', cpfNumbers)
        .single();

      if (cpfCheckError && cpfCheckError.code !== 'PGRST116') {
        setMessage('Erro ao verificar CPF: ' + cpfCheckError.message);
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (existingCpf) {
        setMessage('CPF já cadastrado no sistema. Verifique se o atendimento já foi realizado.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const now = new Date();
      const diaAtual = now.toISOString().split('T')[0];
      const horario = now.toTimeString().split(' ')[0];

      // Buscar nome do atendente para salvar no registro
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('auth_id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do atendente:', userError);
      }

      // Dados que serão inseridos
      const atendimentoData = {
        nome,
        cpf: cpfNumbers,
        email,
        solicitante,
        horario,
        dia_atual: diaAtual,
        usuario_id: user.id,
        atendente_nome: userData?.name || 'Não identificado',
        protocolo,
        status: 'em_andamento',
      };

      console.log('🔵 NovoAtendimentoModal - Tentando inserir atendimento:', atendimentoData);
      console.log('🔵 Formato da data dia_atual:', typeof diaAtual, diaAtual);

      const { error } = await supabase.from('atendimentos').insert([atendimentoData]);

      if (error) {
        console.error('❌ ERRO DETALHADO ao inserir atendimento:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          data_inserted: atendimentoData
        });
        setMessage('Erro ao cadastrar atendimento: ' + error.message);
        setMessageType('error');
        setLoading(false);
        return;
      }

      console.log('✅ Atendimento inserido com sucesso!');

      try {
        // Obter token de autenticação
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session ? `Bearer ${session.access_token}` : ''
          },
          body: JSON.stringify({
            to: email,
            subject: `Atendimento Realizado, ${nome}! 🎉`,
            html: `
<div style="background: #fafbfc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; margin-bottom: 24px;">
    <img src="https://salasensorial.vercel.app/logoautismo.png" alt="Logo Autismo" style="max-width: 120px; margin-bottom: 8px;" />
  </div>
  <div style="background: #fff; border-radius: 10px; padding: 32px 24px; box-shadow: 0 2px 8px #0001;">
    <h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 18px;">
      Atendimento para emissão da CIN (Carteira de Identidade Nacional)
    </h2>
    <p style="margin-bottom: 18px;">
      Olá, ${nome}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
    </p>
    <p style="margin-bottom: 10px;">
      <b>Nome:</b> ${nome}<br>
      <b>CPF:</b> ${cpf}<br>
      <b>Número de Protocolo:</b> ${protocolo}
    </p>
    <p style="margin-bottom: 0;">
      Para dúvidas, entre em contato pelo telefone (85) 2180-6587.
    </p>
  </div>
  <div style="text-align: center; margin-top: 24px; color: #888; font-size: 13px;">
    © 2025 <span style="color: #bfa13a; font-weight: bold;">Sala</span> Sensorial - ALECE. Todos os direitos reservados.
  </div>
</div>
`,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          setMessage('Atendimento cadastrado com sucesso! E-mail enviado.');
          setMessageType('success');
          setTimeout(() => {
            // Reset form
            setNome('');
            setCpf('');
            setEmail('');
            setSolicitante('');
            setProtocolo('');
            setMessage('');
            setValidationErrors({});
            // Limpar dados salvos após sucesso
            clearSavedData();
            onSuccess();
          }, 2000);
        } else {
          setMessage('Atendimento cadastrado, mas erro ao enviar e-mail: ' + result.error);
          setMessageType('error');
        }
      } catch (err) {
        setMessage('Atendimento cadastrado, mas houve erro ao enviar o e-mail.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Erro inesperado: ' + (error as Error).message);
      setMessageType('error');
    }

    setLoading(false);
  };

  // ESC para fechar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        handleClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <FiUser className="w-5 h-5" />
                </div>
                Novo Atendimento
              </h2>
              <p className="text-white/80 text-sm mt-1">Preencha os dados para cadastrar um novo atendimento</p>
              {hasSavedData && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-300 font-medium">
                  <FiCheck className="w-3 h-3" />
                  Dados recuperados automaticamente
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
              aria-label="Fechar"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`m-6 flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
            messageType === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {messageType === 'success' ? (
              <FiCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Form */}
        <form className="p-6 space-y-5" onSubmit={handleSubmit}>
          {/* Nome */}
          <div>
            <label htmlFor="nome" className="block text-sm font-semibold text-slate-700 mb-2">
              Nome Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                placeholder="Digite o nome completo"
                required
                minLength={3}
                autoFocus
              />
            </div>
          </div>

          {/* CPF */}
          <div>
            <label htmlFor="cpf" className="block text-sm font-semibold text-slate-700 mb-2">
              CPF
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCreditCard className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="cpf"
                value={cpf}
                onChange={handleCPFChange}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all ${
                  validationErrors.cpf
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-slate-500 focus:border-slate-500'
                }`}
                placeholder="000.000.000-00"
                required
                maxLength={14}
              />
            </div>
            {validationErrors.cpf && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3 h-3" />
                {validationErrors.cpf}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              E-mail
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 transition-all ${
                  validationErrors.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-slate-200 focus:ring-slate-500 focus:border-slate-500'
                }`}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            {validationErrors.email && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <FiAlertCircle className="w-3 h-3" />
                {validationErrors.email}
              </p>
            )}
          </div>

          {/* Solicitante */}
          <div>
            <label htmlFor="solicitante" className="block text-sm font-semibold text-slate-700 mb-2">
              Solicitante
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="solicitante"
                value={solicitante}
                onChange={(e) => setSolicitante(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                placeholder="Nome do solicitante"
                required
                minLength={3}
              />
            </div>
          </div>

          {/* Protocolo */}
          <div>
            <label htmlFor="protocolo" className="block text-sm font-semibold text-slate-700 mb-2">
              Número de Protocolo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFileText className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                id="protocolo"
                value={protocolo}
                onChange={e => setProtocolo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all"
                placeholder="Digite o número de protocolo"
                required
                minLength={3}
              />
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:hover:from-slate-700 disabled:hover:to-slate-900"
              disabled={loading || Object.keys(validationErrors).length > 0}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Cadastrando...
                </>
              ) : (
                <>
                  <FiCheck className="h-5 w-5" />
                  Cadastrar Atendimento
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Estilos de animação */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
