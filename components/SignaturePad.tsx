'use client';

import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiX, FiRotateCcw, FiCheck, FiPenTool, FiSmartphone } from 'react-icons/fi';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  subtitle?: string;
}

export default function SignaturePad({
  isOpen,
  onClose,
  onSave,
  title = 'Assinatura Digital',
  subtitle = 'Por favor, assine no espaço abaixo'
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar se é dispositivo móvel
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Prevenir scroll em dispositivos touch enquanto assina
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen, isMobile]);

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      onSave(dataUrl);
      handleClear();
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  const handleCancel = () => {
    handleClear();
    onClose();
  };

  // Layout mobile: fullscreen
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Header Mobile */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FiPenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <p className="text-white/90 text-xs">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="w-10 h-10 bg-white/10 active:bg-white/20 rounded-xl flex items-center justify-center text-white"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Instruções Mobile - Compactas */}
        <div className="bg-blue-50 border-b-2 border-blue-200 p-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FiSmartphone className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-900 font-semibold">
              Assine com o dedo na área branca abaixo
            </p>
          </div>
        </div>

        {/* Canvas Area - Ocupa máximo de espaço */}
        <div className="flex-1 p-3 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-white rounded-2xl border-4 border-dashed border-blue-400 shadow-lg overflow-hidden relative">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-full touch-none',
                style: {
                  touchAction: 'none',
                  width: '100%',
                  height: '100%'
                }
              }}
              backgroundColor="white"
              penColor="rgb(30, 64, 175)"
              minWidth={2}
              maxWidth={4}
              onBegin={handleBegin}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <FiPenTool className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-400 font-bold">Assine aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Mobile - Botões Grandes */}
        <div className="border-t-2 border-slate-200 bg-white p-4 flex-shrink-0 space-y-3">
          <button
            onClick={handleClear}
            disabled={isEmpty}
            className="w-full py-4 bg-amber-50 border-2 border-amber-300 active:bg-amber-100 text-amber-700 font-bold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            <FiRotateCcw className="w-6 h-6" />
            Limpar
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCancel}
              className="py-4 bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 text-base"
            >
              <FiX className="w-5 h-5" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isEmpty}
              className="py-4 bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              <FiCheck className="w-5 h-5" />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Layout Desktop
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Desktop */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FiPenTool className="w-6 h-6" />
                </div>
                {title}
              </h2>
              <p className="text-white/90 text-sm mt-1">{subtitle}</p>
            </div>
            <button
              onClick={handleCancel}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Canvas Area Desktop */}
        <div className="p-8">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-300">
            {/* Instruções Desktop */}
            <div className="mb-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiPenTool className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900 mb-1">Como assinar:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use o mouse, touch screen ou caneta digital</li>
                    <li>• Assine dentro do espaço branco abaixo</li>
                    <li>• Use o botão "Limpar" para recomeçar se necessário</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Canvas Desktop */}
            <div className="bg-white rounded-xl border-4 border-dashed border-blue-300 shadow-inner overflow-hidden">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-64 cursor-crosshair',
                  style: { touchAction: 'none' }
                }}
                backgroundColor="white"
                penColor="rgb(30, 64, 175)"
                minWidth={1}
                maxWidth={3}
                onBegin={handleBegin}
              />
            </div>

            {/* Info de vazio Desktop */}
            {isEmpty && (
              <div className="mt-3 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  Aguardando assinatura...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Desktop */}
        <div className="border-t-2 border-slate-200 bg-white px-8 py-4 flex justify-between items-center">
          <button
            onClick={handleClear}
            disabled={isEmpty}
            className="px-6 py-3 bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-300 text-amber-700 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRotateCcw className="w-5 h-5" />
            Limpar
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <FiX className="w-5 h-5" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isEmpty}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FiCheck className="w-5 h-5" />
              Confirmar Assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
