'use client';

import React from 'react';
import { FiPrinter, FiEdit3, FiX } from 'react-icons/fi';

type ModoEntrega = 'impressao' | 'digital';

interface ModoEntregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: ModoEntrega) => void;
}

export default function ModoEntregaModal({
  isOpen,
  onClose,
  onSelectMode
}: ModoEntregaModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Selecione o Modo de Entrega</h2>
              <p className="text-white/80 text-sm mt-1">Escolha como deseja processar a entrega da CIN</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
              aria-label="Fechar"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Opções */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opção 1: Impressão */}
            <button
              onClick={() => onSelectMode('impressao')}
              className="group relative overflow-hidden bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
            >
              {/* Gradiente de fundo ao hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                {/* Ícone */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiPrinter className="w-8 h-8 text-white" />
                </div>

                {/* Título */}
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Impressão em Papel
                </h3>

                {/* Descrição */}
                <p className="text-sm text-slate-600 mb-4">
                  Gera um comprovante em PDF pronto para impressão com espaço para assinatura manual do recebedor.
                </p>

                {/* Vantagens */}
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Documento físico com assinatura original</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Ideal para arquivamento físico</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Não requer dispositivos especiais</span>
                  </li>
                </ul>

                {/* Badge */}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  <FiPrinter className="w-3 h-3" />
                  Tradicional
                </div>
              </div>
            </button>

            {/* Opção 2: Digital */}
            <button
              onClick={() => onSelectMode('digital')}
              className="group relative overflow-hidden bg-white border-2 border-slate-200 hover:border-purple-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-left"
            >
              {/* Gradiente de fundo ao hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                {/* Ícone */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <FiEdit3 className="w-8 h-8 text-white" />
                </div>

                {/* Título */}
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Assinatura Digital
                </h3>

                {/* Descrição */}
                <p className="text-sm text-slate-600 mb-4">
                  Captura a assinatura diretamente na tela (mouse ou toque) e gera um comprovante digital completo.
                </p>

                {/* Vantagens */}
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Processo 100% digital</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Assinatura incluída automaticamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">✓</span>
                    <span>Mais rápido e ecológico</span>
                  </li>
                </ul>

                {/* Badge */}
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  <FiEdit3 className="w-3 h-3" />
                  Moderno
                </div>
              </div>
            </button>
          </div>

          {/* Info adicional */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-600 text-center">
              <strong className="text-slate-800">Dica:</strong> Ambos os modos geram comprovantes com validade legal.
              Escolha o que melhor se adequa à sua rotina de trabalho.
            </p>
          </div>
        </div>
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
