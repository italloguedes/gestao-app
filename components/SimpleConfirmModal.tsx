"use client";

import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

interface SimpleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
  loading?: boolean;
}

export default function SimpleConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  confirmColor = "bg-green-600 hover:bg-green-700",
  loading = false
}: SimpleConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {title}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-700"
            disabled={loading}
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-slate-600">{message}</p>
        </div>

        <div className="flex space-x-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center ${confirmColor}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processando...
              </>
            ) : (
              <>
                <FiCheck className="w-4 h-4 mr-2" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
