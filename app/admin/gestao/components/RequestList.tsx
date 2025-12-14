'use client';

import { useState } from 'react';
import { FiEye, FiClock, FiInbox } from 'react-icons/fi';
import ReviewModal from './ReviewModal';
import { useRouter } from 'next/navigation';

export default function RequestList({ initialRequests }: { initialRequests: any[] }) {
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const router = useRouter();

    const handleUpdate = () => {
        router.refresh();
    };

    if (!initialRequests || initialRequests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-lg border-dashed border-2 border-gray-200">
                <FiInbox size={48} className="mb-2 opacity-50" />
                <p>Nenhuma solicitação pendente.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {initialRequests.map((request) => (
                <div key={request.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow flex items-center justify-between group">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{request.nome}</h3>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium capitalize">
                                {request.status}
                            </span>
                        </div>
                        <div className="text-sm text-gray-500 flex gap-4">
                            <span>CPF: {request.cpf}</span>
                            <span>Tel: {request.telefone}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <FiClock size={12} />
                            Solicitado em {new Date(request.created_at).toLocaleString('pt-BR')}
                        </div>
                    </div>

                    <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Revisar Solicitação"
                    >
                        <FiEye size={20} />
                    </button>
                </div>
            ))}

            {selectedRequest && (
                <ReviewModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
}
