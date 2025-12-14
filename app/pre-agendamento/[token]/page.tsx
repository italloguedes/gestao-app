import { validateToken } from '../actions';
import PreSchedulingForm from './PreSchedulingForm';
import { notFound } from 'next/navigation';

interface PageProps {
    params: { token: string };
}
// Note: In Next.js 15+, params is async. Assuming standard Next.js 13/14 behavior or awaiting if needed. 
// Given package.json says "next": "^16.0.8" (Wait, 16? Next.js 15/16 is experimental/newest. Params are async in 15+).
// I will simulate async params access for safety.

export default async function PublicSchedulingPage(props: PageProps) {
    const params = await props.params; // Await params just in case (Next.js 15+)
    const token = params.token;

    if (!token) return notFound();

    const validation = await validateToken(token);

    if (!validation.valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Link Inválido ou Expirado</h1>
                    <p className="text-gray-500">
                        O link que você acessou não está mais disponível. Entre em contato com a administração.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">Pré-Agendamento</h1>
                    <p className="text-emerald-100 text-sm">
                        Preencha seus dados e anexe a documentação para solicitar um horário na Sala Sensorial.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <PreSchedulingForm token={token} />
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">Sala Sensorial ALECE &bull; Sistema de Agendamento</p>
                </div>
            </div>
        </div>
    );
}
