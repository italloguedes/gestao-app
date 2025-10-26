'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiX, FiRotateCcw, FiCheck, FiEdit3 } from 'react-icons/fi';

interface SignaturePadCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title?: string;
  recipientName?: string;
}

export default function SignaturePadCanvas({
  isOpen,
  onClose,
  onSave,
  title = 'Assinatura Digital',
  recipientName
}: SignaturePadCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  // Inicializar canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Configurar canvas
        ctx.strokeStyle = '#1e293b'; // Slate-800
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        setContext(ctx);
      }
    }
  }, [isOpen]);

  // Obter posição do mouse/toque no canvas
  const getPosition = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY
        };
      }
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
    return null;
  }, []);

  // Iniciar desenho
  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const pos = getPosition(e);
    if (!pos || !context) return;

    setIsDrawing(true);
    context.beginPath();
    context.moveTo(pos.x, pos.y);
  }, [context, getPosition]);

  // Desenhar
  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !context) return;

    const pos = getPosition(e);
    if (!pos) return;

    context.lineTo(pos.x, pos.y);
    context.stroke();
    setHasDrawn(true);
  }, [isDrawing, context, getPosition]);

  // Parar desenho
  const stopDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
  }, []);

  // Event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing as any);
    canvas.addEventListener('mousemove', draw as any);
    canvas.addEventListener('mouseup', stopDrawing as any);
    canvas.addEventListener('mouseleave', stopDrawing as any);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing as any);
    canvas.addEventListener('touchmove', draw as any);
    canvas.addEventListener('touchend', stopDrawing as any);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing as any);
      canvas.removeEventListener('mousemove', draw as any);
      canvas.removeEventListener('mouseup', stopDrawing as any);
      canvas.removeEventListener('mouseleave', stopDrawing as any);
      canvas.removeEventListener('touchstart', startDrawing as any);
      canvas.removeEventListener('touchmove', draw as any);
      canvas.removeEventListener('touchend', stopDrawing as any);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Limpar canvas
  const handleClear = useCallback(() => {
    if (!context || !canvasRef.current) return;

    const canvas = canvasRef.current;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [context]);

  // Salvar assinatura
  const handleSave = useCallback(() => {
    if (!canvasRef.current || !hasDrawn) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    handleClose();
  }, [hasDrawn, onSave]);

  const handleClose = useCallback(() => {
    handleClear();
    onClose();
  }, [handleClear, onClose]);

  // ESC para fechar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <FiEdit3 className="w-5 h-5" />
                </div>
                {title}
              </h2>
              {recipientName && (
                <p className="text-white/80 text-sm mt-1">Recebedor: {recipientName}</p>
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

        {/* Canvas Area */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200">
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className="w-full h-auto cursor-crosshair touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Instrução */}
            <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <p className="text-sm text-blue-800">
                <strong>Instruções:</strong> Use o mouse ou toque na tela para assinar no espaço acima.
                A assinatura será incluída no comprovante de entrega.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleClear}
            disabled={!hasDrawn}
            className="px-6 py-3 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FiRotateCcw className="w-5 h-5" />
            Limpar
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasDrawn}
              className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-slate-700 disabled:hover:to-slate-900"
            >
              <FiCheck className="w-5 h-5" />
              Confirmar Assinatura
            </button>
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
