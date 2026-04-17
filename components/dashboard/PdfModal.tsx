import React from 'react';
import { FiX, FiDownload, FiPrinter, FiMaximize } from 'react-icons/fi';

interface PdfModalProps {
    url: string;
    onClose: () => void;
    title?: string;
}

export default function PdfModal({ url, onClose, title = 'Comprovante de Entrega' }: PdfModalProps) {

    const handlePrint = () => {
        const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } else {
            // fallback: abrir em nova aba e imprimir
            const win = window.open(url, '_blank');
            win?.addEventListener('load', () => win.print());
        }
    };

    const handleOpenNewTab = () => {
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] relative border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">{title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Documento gerado com sucesso</p>
                    </div>
                    <button
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                        onClick={onClose}
                        aria-label="Fechar"
                    >
                        <FiX className="h-5 w-5" />
                    </button>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 bg-gray-100 overflow-hidden mx-4 my-3 rounded-xl border border-gray-200">
                    <iframe
                        id="pdf-preview-iframe"
                        src={url}
                        className="w-full h-full"
                        title="Visualização do PDF"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 flex-shrink-0 gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                        Fechar
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenNewTab}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            title="Abrir em nova aba"
                        >
                            <FiMaximize className="h-4 w-4" />
                            Abrir
                        </button>

                        <a
                            href={url}
                            download="comprovante-entrega.pdf"
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                        >
                            <FiDownload className="h-4 w-4" />
                            Baixar PDF
                        </a>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm shadow-emerald-200"
                        >
                            <FiPrinter className="h-4 w-4" />
                            Imprimir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
