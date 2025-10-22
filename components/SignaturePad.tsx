'use client';

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { FiX, FiRotateCcw, FiCheck, FiPenTool } from 'react-icons/fi';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Header */}
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

        {/* Canvas Area */}
        <div className="p-8">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-300">
            {/* Instruções */}
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

            {/* Canvas */}
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

            {/* Info de vazio */}
            {isEmpty && (
              <div className="mt-3 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  Aguardando assinatura...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
