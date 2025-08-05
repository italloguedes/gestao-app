import React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[200px]">
      <div className="relative">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-emerald-200"></div>
        <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
      </div>
      <p className="mt-4 text-emerald-700 font-medium animate-pulse">Carregando...</p>
    </div>
  );
}
