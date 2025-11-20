import React from 'react';
import { FiX, FiDownload, FiPrinter } from 'react-icons/fi';

interface PdfModalProps {
    url: string;
    onClose: () => void;
}

export default function PdfModal({ url, onClose }: PdfModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl h-[85vh] relative border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Visualizar Comprovante</h3>
                    <div className="flex items-center gap-2">
                        <a
                            href={url}
                            download="comprovante-entrega.pdf"
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                            title="Baixar PDF"
                        >
                            <FiDownload className="h-5 w-5" />
                        </a>
                        <button
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                            onClick={onClose}
                            aria-label="Fechar"
                        >
                            <FiX className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <iframe src={url} className="w-full h-full" title="PDF Viewer" />
                </div>
            </div>
        </div>
    );
}
