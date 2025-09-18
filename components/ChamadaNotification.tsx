"use client";

import React, { useEffect, useState } from 'react';
import NotificationSound from './NotificationSound';

interface ChamadaNotificationProps {
  isVisible: boolean;
  nome: string;
  horario: string;
  preferencial?: boolean;
  onClose: () => void;
}

export default function ChamadaNotification({ 
  isVisible, 
  nome, 
  horario, 
  preferencial = false,
  onClose 
}: ChamadaNotificationProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [playSound, setPlaySound] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowNotification(true);
      setPlaySound(true);
      
      // Tocar som adicional após 2 segundos
      setTimeout(() => {
        setPlaySound(true);
        setTimeout(() => setPlaySound(false), 100);
      }, 2000);
      
      // Tocar som final após 4 segundos
      setTimeout(() => {
        setPlaySound(true);
        setTimeout(() => setPlaySound(false), 100);
      }, 4000);
      
      // Auto-close após 15 segundos
      const timer = setTimeout(() => {
        setShowNotification(false);
        setTimeout(() => onClose(), 300); // Aguarda animação
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const handleClose = () => {
    setShowNotification(false);
    setTimeout(() => onClose(), 300);
  };

  if (!isVisible) return null;

  return (
    <>
      <NotificationSound play={playSound} type="chamada" />
      
      {/* Overlay */}
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
        showNotification ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Modal de Notificação */}
        <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-300 ${
          showNotification ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}>
          <div className="bg-white rounded-2xl shadow-2xl border-4 border-orange-400 max-w-lg w-full mx-4 overflow-hidden animate-pulse">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
              <div className="text-6xl mb-3 animate-bounce">📢</div>
              <h2 className="text-3xl font-bold text-white mb-2">
                CHAMADA DE ATENDIMENTO
              </h2>
              <div className="text-orange-100 text-lg">
                ATENÇÃO! Sua senha foi chamada
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 text-center">
              {preferencial && (
                <div className="mb-4 inline-block bg-yellow-500 text-yellow-900 px-4 py-2 rounded-full font-bold text-lg animate-pulse">
                  ⭐ ATENDIMENTO PREFERENCIAL ⭐
                </div>
              )}
              
              <div className="mb-6">
                <div className="text-4xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {nome.toUpperCase()}
                </div>
                <div className="text-xl text-gray-600 font-semibold">
                  Horário: {horario}
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl p-6 mb-6">
                <div className="text-orange-800 font-bold text-2xl mb-2">
                  🚨 DIRIJA-SE AO ATENDIMENTO 🚨
                </div>
                <div className="text-orange-700 text-lg">
                  Sua senha foi chamada - Procure o atendente
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-4">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  ✅ ENTENDI
                </button>
                <button
                  onClick={() => {
                    setPlaySound(true);
                    setTimeout(() => setPlaySound(false), 100);
                  }}
                  className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-bold text-lg"
                  title="Tocar som novamente"
                >
                  🔊 SOM
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
