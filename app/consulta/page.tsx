'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiLock,
  FiXCircle,
  FiArrowLeft,
  FiUser,
  FiFileText,
  FiHash,
  FiInfo,
  FiLoader,
  FiShield,
  FiChevronRight,
  FiPhone
} from 'react-icons/fi';

// ─── Animations ──────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 180, damping: 22 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 20 },
  },
};

const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

// ─── Types ───────────────────────────────────────────────────────
interface ConsultaResult {
  status: string;
  protocolo: string;
  nome: string;
  created_at?: string;
  dia_atual?: string;
}

// ─── Component ───────────────────────────────────────────────────
export default function ConsultaPage() {
  const [cpf, setCpf] = useState('');
  const [result, setResult] = useState<ConsultaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return numbers.slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const removeCPFFormatting = (cpf: string) => cpf.replace(/\D/g, '');

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'concluído':
      case 'concluido':
        return {
          icon: <FiCheckCircle className="w-12 h-12" />,
          title: 'Documento Pronto!',
          subtitle: 'Disponível para Retirada',
          message: 'Sua Carteira de Identidade Nacional está pronta e pode ser retirada.',
          instructions: [
            'Documento disponível na Sala Sensorial - ALECE',
            'Pode ser retirado por: pais, avós, tios de 1º grau ou irmãos maiores de 18 anos',
            'Necessário apresentar documento que comprove o vínculo familiar',
            'Trazer documento de identificação com foto'
          ],
          gradient: 'from-emerald-500 to-teal-600',
          bgGradient: 'from-emerald-50/80 to-teal-50/80',
          borderColor: 'border-emerald-200/60',
          textColor: 'text-emerald-900',
          iconColor: 'text-emerald-500',
          iconBg: 'bg-emerald-100',
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          glow: 'shadow-emerald-500/20',
        };
      case 'em_andamento':
        return {
          icon: <FiClock className="w-12 h-12" />,
          title: 'Em Processamento',
          subtitle: 'Aguarde o Prazo de Entrega',
          message: 'Seu documento está sendo processado pela Polícia Federal.',
          instructions: [
            'Prazo normal de entrega: até 20 dias úteis',
            'Acompanhe o status regularmente por esta página',
            'Você receberá um email quando o documento estiver pronto',
            'Após 20 dias sem retorno, entre em contato: (85) 2180-6587'
          ],
          gradient: 'from-blue-500 to-indigo-600',
          bgGradient: 'from-blue-50/80 to-indigo-50/80',
          borderColor: 'border-blue-200/60',
          textColor: 'text-blue-900',
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-100',
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          glow: 'shadow-blue-500/20',
        };
      case 'correcao':
      case 'correção':
        return {
          icon: <FiAlertCircle className="w-12 h-12" />,
          title: 'Em Correção',
          subtitle: 'Atenção Necessária',
          message: 'Seu documento precisa de correções antes de ser finalizado.',
          instructions: [
            'Entre em contato com a Sala Sensorial o quanto antes',
            'Telefone para contato: (85) 2180-6587',
            'Verifique se todos os documentos estão corretos',
            'Pode ser necessário comparecer presencialmente'
          ],
          gradient: 'from-amber-500 to-orange-600',
          bgGradient: 'from-amber-50/80 to-orange-50/80',
          borderColor: 'border-amber-200/60',
          textColor: 'text-amber-900',
          iconColor: 'text-amber-500',
          iconBg: 'bg-amber-100',
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          glow: 'shadow-amber-500/20',
        };
      case 'bloqueado':
        return {
          icon: <FiLock className="w-12 h-12" />,
          title: 'Documento Bloqueado',
          subtitle: 'Entre em Contato',
          message: 'Este documento foi bloqueado. É necessário entrar em contato com o setor.',
          instructions: [
            'Entre em contato urgentemente: (85) 2180-6587',
            'Informe seu número de protocolo',
            'Verifique os motivos do bloqueio',
            'Siga as orientações da equipe de atendimento'
          ],
          gradient: 'from-slate-600 to-gray-700',
          bgGradient: 'from-slate-50/80 to-gray-50/80',
          borderColor: 'border-slate-300/60',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-500',
          iconBg: 'bg-slate-100',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          glow: 'shadow-slate-500/20',
        };
      case 'cancelado':
        return {
          icon: <FiXCircle className="w-12 h-12" />,
          title: 'Solicitação Cancelada',
          subtitle: 'Ação Necessária',
          message: 'Sua solicitação foi cancelada. Entre em contato para entender o motivo.',
          instructions: [
            'Ligue imediatamente: (85) 2180-6587',
            'Tenha em mãos seu CPF e protocolo',
            'Entenda o motivo do cancelamento',
            'Verifique a possibilidade de nova solicitação'
          ],
          gradient: 'from-rose-500 to-red-600',
          bgGradient: 'from-rose-50/80 to-red-50/80',
          borderColor: 'border-rose-200/60',
          textColor: 'text-rose-900',
          iconColor: 'text-rose-500',
          iconBg: 'bg-rose-100',
          badge: 'bg-rose-100 text-rose-700 border-rose-200',
          glow: 'shadow-rose-500/20',
        };
      default:
        return {
          icon: <FiInfo className="w-12 h-12" />,
          title: 'Status Desconhecido',
          subtitle: 'Entre em Contato',
          message: 'Status do documento não identificado. Entre em contato com o setor.',
          instructions: [
            'Ligue: (85) 2180-6587',
            'Informe seu CPF e protocolo',
            'Solicite informações sobre o status atual'
          ],
          gradient: 'from-slate-500 to-gray-600',
          bgGradient: 'from-slate-50/80 to-gray-50/80',
          borderColor: 'border-slate-200/60',
          textColor: 'text-slate-900',
          iconColor: 'text-slate-500',
          iconBg: 'bg-slate-100',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          glow: 'shadow-slate-500/20',
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const unformattedCPF = removeCPFFormatting(cpf);

    if (!unformattedCPF || unformattedCPF.length !== 11) {
      setError('Por favor, insira um CPF válido com 11 dígitos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const { data, error: queryError } = await supabase
        .from('atendimentos')
        .select('status, protocolo, nome, created_at, dia_atual')
        .eq('cpf', unformattedCPF)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (queryError) {
        if (queryError.code === 'PGRST116') {
          setError('Nenhum atendimento encontrado para este CPF. Verifique se o CPF está correto.');
        } else {
          throw queryError;
        }
        return;
      }

      setResult(data as ConsultaResult);
    } catch (err) {
      setError('Erro ao realizar consulta. Tente novamente mais tarde.');
      console.error('Erro na consulta:', err);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = result ? getStatusConfig(result.status) : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 relative overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-blue-200/40 to-indigo-200/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 30, -20, 0],
            scale: [1, 0.95, 1.1, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 20, -15, 0],
            y: [0, -15, 20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[40%] left-[20%] w-[350px] h-[350px] bg-gradient-to-br from-teal-200/20 to-cyan-200/20 rounded-full blur-3xl"
        />
      </div>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center justify-center mb-6">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/80 ring-1 ring-slate-100"
            >
              <Image
                src="/logoautismo.png"
                alt="Logo ALECE"
                width={56}
                height={56}
                className="object-contain"
                priority
              />
            </motion.div>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
            Consulta de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              CIN
            </span>
          </motion.h1>
          <motion.p variants={itemVariants} className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            Acompanhe o status da sua Carteira de Identidade Nacional
          </motion.p>
        </motion.div>

        {/* Search Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/40 border border-white/80 overflow-hidden ring-1 ring-slate-900/5"
        >
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit}>
              <label htmlFor="cpf" className="block text-sm font-semibold text-slate-700 mb-2.5 ml-0.5">
                CPF do Solicitante
              </label>

              {/* Input with animated glow */}
              <div className="relative group mb-5">
                <motion.div
                  className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-0 blur-sm"
                  animate={{ opacity: isFocused ? 0.3 : 0 }}
                  transition={{ duration: 0.3 }}
                />
                <div className="relative flex items-center">
                  <div className="absolute left-4 flex items-center pointer-events-none z-10">
                    <motion.div
                      animate={{ color: isFocused ? '#6366f1' : '#94a3b8' }}
                      transition={{ duration: 0.2 }}
                    >
                      <FiHash className="h-5 w-5" />
                    </motion.div>
                  </div>
                  <input
                    type="text"
                    id="cpf"
                    value={cpf}
                    onChange={handleCPFChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    className="relative w-full pl-12 pr-4 py-4 text-lg bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-0 transition-all duration-200 placeholder:text-slate-300 text-slate-900 font-semibold tracking-wider shadow-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading || cpf.replace(/\D/g, '').length !== 11}
                whileHover={!loading ? { scale: 1.01, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-base shadow-xl shadow-indigo-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none gap-2.5"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <FiLoader className="h-5 w-5" />
                    </motion.div>
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <FiSearch className="h-5 w-5" />
                    <span>Consultar Status</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-5"
                >
                  <div className="flex items-start gap-3 bg-rose-50/80 backdrop-blur-sm border border-rose-100 text-rose-700 px-4 py-3.5 rounded-xl">
                    <FiAlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Erro na Consulta</p>
                      <p className="text-sm text-rose-600 mt-0.5">{error}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Section */}
            <AnimatePresence>
              {result && statusConfig && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
                  className="mt-8"
                >
                  <div className={`rounded-2xl border ${statusConfig.borderColor} bg-gradient-to-br ${statusConfig.bgGradient} backdrop-blur-sm overflow-hidden shadow-lg ${statusConfig.glow}`}>

                    {/* Status Header */}
                    <div className={`bg-gradient-to-r ${statusConfig.gradient} p-6 sm:p-8 text-white relative overflow-hidden`}>
                      {/* Decorative elements */}
                      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 bg-black/5 rounded-full blur-xl" />
                      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full blur-lg" />

                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="relative z-10 flex flex-col items-center text-center"
                      >
                        <motion.div
                          variants={pulseVariants}
                          animate="animate"
                          className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner mb-4 ring-1 ring-white/30"
                        >
                          {statusConfig.icon}
                        </motion.div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight">{statusConfig.title}</h2>
                        <p className="text-white/80 font-medium text-base">{statusConfig.subtitle}</p>
                      </motion.div>
                    </div>

                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="p-5 sm:p-7"
                    >
                      {/* User Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.01 }}
                          className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-500">
                              <FiUser className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Solicitante</span>
                          </div>
                          <p className="text-slate-900 font-semibold text-base pl-8">{result.nome}</p>
                        </motion.div>

                        <motion.div
                          variants={itemVariants}
                          whileHover={{ scale: 1.01 }}
                          className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <div className="p-1.5 bg-purple-50 rounded-lg text-purple-500">
                              <FiFileText className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Protocolo</span>
                          </div>
                          <p className="text-slate-900 font-mono font-semibold text-base pl-8">{result.protocolo || 'N/A'}</p>
                        </motion.div>
                      </div>

                      {/* Message Box */}
                      <motion.div
                        variants={itemVariants}
                        className={`p-4 rounded-xl ${statusConfig.iconBg}/60 border ${statusConfig.borderColor} mb-6`}
                      >
                        <div className="flex gap-3">
                          <FiInfo className={`w-5 h-5 ${statusConfig.iconColor} flex-shrink-0 mt-0.5`} />
                          <p className={`${statusConfig.textColor} font-medium text-sm leading-relaxed`}>
                            {statusConfig.message}
                          </p>
                        </div>
                      </motion.div>

                      {/* Instructions */}
                      <motion.div variants={itemVariants}>
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FiShield className="w-3.5 h-3.5" />
                          Próximos Passos
                        </h3>
                        <div className="space-y-2">
                          {statusConfig.instructions.map((instruction, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 + index * 0.08 }}
                              whileHover={{ x: 3 }}
                              className="flex items-start gap-3 p-3 bg-white/70 rounded-lg border border-slate-100/80 hover:border-slate-200 hover:shadow-sm transition-all duration-200 cursor-default group"
                            >
                              <span className={`flex-shrink-0 w-5 h-5 rounded-full ${statusConfig.iconBg} ${statusConfig.iconColor} flex items-center justify-center text-[10px] font-bold mt-0.5`}>
                                {index + 1}
                              </span>
                              <p className="text-slate-600 text-sm leading-relaxed flex-1">{instruction}</p>
                              <FiChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors mt-0.5 flex-shrink-0" />
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Contact CTA */}
                      <motion.div
                        variants={itemVariants}
                        className="mt-5 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <FiPhone className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-400">Dúvidas? Entre em contato</p>
                            <p className="text-sm font-bold text-slate-700">(85) 2180-6587</p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center space-y-4"
        >
          <Link
            href="/"
            className="inline-flex items-center text-slate-400 hover:text-indigo-600 font-medium transition-colors duration-200 group text-sm"
          >
            <FiArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Voltar para a página inicial
          </Link>

          <div className="pt-4 border-t border-slate-200/40">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Sala Sensorial - ALECE. Todos os direitos reservados.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
