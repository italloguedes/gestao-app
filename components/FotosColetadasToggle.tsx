'use client';

import { useState } from 'react';

interface FotosColetadasToggleProps {
  fotosColetadas: boolean;
  onToggle: () => Promise<void>;
}

export default function FotosColetadasToggle({
  fotosColetadas,
  onToggle
}: FotosColetadasToggleProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleClick = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await onToggle();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isUpdating}
      className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 border-2 disabled:cursor-not-allowed ${
        fotosColetadas
          ? 'bg-green-500 border-green-600 text-white hover:bg-green-600 shadow-lg shadow-green-200'
          : 'bg-yellow-400 border-yellow-500 text-yellow-900 hover:bg-yellow-500 shadow-lg shadow-yellow-200 animate-pulse'
      } ${isUpdating ? 'opacity-75' : 'hover:shadow-xl hover:scale-105'}`}
      title={fotosColetadas ? 'Digitais coletadas - clique para desmarcar' : 'Digitais pendentes - clique para marcar'}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Loading Spinner */}
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
          <svg className="w-5 h-5 text-slate-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* Icon */}
      <div className="flex items-center gap-1.5">
        {fotosColetadas ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="font-bold uppercase tracking-wide">
          {fotosColetadas ? '✓ Coletadas' : '⏳ Pendente'}
        </span>
      </div>
    </button>
  );
}
