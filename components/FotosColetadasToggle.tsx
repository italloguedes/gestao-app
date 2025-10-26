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
      className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-2 shadow-sm disabled:cursor-not-allowed ${
        fotosColetadas
          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100'
          : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
      } ${isUpdating ? 'opacity-75' : 'hover:shadow-md'}`}
      title={fotosColetadas ? 'Fotos coletadas - clique para desmarcar' : 'Fotos não coletadas - clique para marcar'}
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

      {/* Checkbox Visual */}
      <div className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
        fotosColetadas
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-white border-slate-400'
      }`}>
        {fotosColetadas && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Camera Icon and Label */}
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-semibold">
          {fotosColetadas ? 'Coletadas' : 'Pendente'}
        </span>
      </div>
    </button>
  );
}
