import React from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase-client';
import Loading from './Loading';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSave: (updatedAppointment: any) => void;
  action: 'iniciar' | 'concluir' | 'cancelar';
}

export default function EditAppointmentModal({ isOpen, onClose, appointment, onSave, action: initialAction }: EditAppointmentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [action, setAction] = React.useState<'iniciar' | 'concluir' | 'cancelar'>(initialAction);

  React.useEffect(() => {
    setAction(initialAction);
  }, [initialAction]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const updatedAppointment = {
        ...appointment,
        nome: formData.get('nome'),
        telefone: formData.get('telefone'),
        email: formData.get('email'),
        cpf: formData.get('cpf'),
        data_nascimento: formData.get('data_nascimento'),
      };

      if (action === 'iniciar') {
        // First update the appointment
        const { error: appointmentError } = await supabase
          .from('agendamentos')
          .update(updatedAppointment)
          .eq('id', appointment.id);

        if (appointmentError) throw appointmentError;

        // Then create the atendimento record
        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];

        // Generate protocolo
        const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
        if (protocolError) throw protocolError;

        const protocolo = protocolData;

        // Create atendimento
        const { error: atendimentoError } = await supabase.from('atendimentos').insert([
          {
            nome: formData.get('nome'),
            cpf: formData.get('cpf'),
            email: formData.get('email'),
            solicitante: formData.get('solicitante'),
            observacoes: formData.get('observacoes'),
            horario,
            dia_atual: diaAtual,
            usuario_id: (await supabase.auth.getUser()).data.user?.id,
            protocolo,
            status: 'em_andamento'
          },
        ]);

        if (atendimentoError) throw atendimentoError;

        // Update appointment status to 'concluido'
        const { error: statusError } = await supabase
          .from('agendamentos')
          .update({ status: 'concluido' })
          .eq('id', appointment.id);

        if (statusError) throw statusError;

        // Send email
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: formData.get('email'),
              subject: `Atendimento Realizado, ${formData.get('nome')}! 🎉`,
              html: `
                <div style="background: #fafbfc; padding: 24px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <img src="https://salasensorial.vercel.app/logoautismo.png" alt="Logo Autismo" style="max-width: 120px; margin-bottom: 8px;" />
                  </div>
                  <div style="background: #fff; border-radius: 10px; padding: 32px 24px; box-shadow: 0 2px 8px #0001;">
                    <h2 style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 18px;">
                      Atendimento para emissão da CIN (Carteira de Identidade Nacional)
                    </h2>
                    <p style="margin-bottom: 18px;">
                      Olá, ${formData.get('nome')}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
                    </p>
                    <p style="margin-bottom: 10px;">
                      <b>Nome:</b> ${formData.get('nome')}<br>
                      <b>CPF:</b> ${formData.get('cpf')}<br>
                      <b>Número de Protocolo:</b> ${protocolo}
                    </p>
                    <p style="margin-bottom: 0;">
                      Para dúvidas, entre em contato pelo telefone (85) 2180-6587.
                    </p>
                  </div>
                  <div style="text-align: center; margin-top: 24px; color: #888; font-size: 13px;">
                    © 2025 <span style="color: #bfa13a; font-weight: bold;">Sala</span> Sensorial - ALECE. Todos os direitos reservados.
                  </div>
                </div>
              `,
            }),
          });

          if (!res.ok) {
            console.error('Erro ao enviar email:', await res.json());
          }
        } catch (err) {
          console.error('Erro ao enviar email:', err);
        }

        setMessage('Atendimento iniciado com sucesso!');
      } else if (action === 'concluir') {
        const formData = new FormData(e.target as HTMLFormElement);

        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];

        // Gera protocolo
        const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
        if (protocolError) throw protocolError;

        const protocolo = protocolData;

        // Insere na tabela atendimentos
        const { error: atendimentoInsertError } = await supabase.from('atendimentos').insert([
          {
            nome: appointment.nome,
            cpf: appointment.cpf,
            email: appointment.email,
            solicitante: appointment.solicitante || formData.get('solicitante'),
            observacoes: formData.get('observacoes'),
            horario,
            dia_atual: diaAtual,
            usuario_id: (await supabase.auth.getUser()).data.user?.id,
            protocolo,
            status: 'concluido'
          },
        ]);

        if (atendimentoInsertError) throw atendimentoInsertError;

        // Atualiza o status da tabela agendamentos
        const { error: agendamentoUpdateError } = await supabase
          .from('agendamentos')
          .update({
            status: 'concluido',
            observacoes: formData.get('observacoes')
          })
          .eq('id', appointment.id);

        if (agendamentoUpdateError) throw agendamentoUpdateError;

        setMessage('Atendimento concluído com sucesso!');
      }

      onSave(updatedAppointment);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erro:', err);
      setMessage(`Erro ao ${action} atendimento. Por favor, tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            {action === 'iniciar' ? 'Iniciar Atendimento' :
              action === 'concluir' ? 'Concluir Atendimento' :
                'Cancelar Atendimento'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.includes('sucesso')
              ? 'bg-green-50 border border-green-200 text-green-600'
              : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-3 text-slate-600">
            <FiClock className="w-5 h-5" />
            <span className="font-medium">{appointment.horario}</span>
          </div>

          {action === 'iniciar' ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    name="nome"
                    defaultValue={appointment.nome}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    name="telefone"
                    defaultValue={appointment.telefone}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={appointment.email}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    defaultValue={appointment.cpf}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    name="data_nascimento"
                    defaultValue={appointment.data_nascimento}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Solicitante</label>
                  <input
                    type="text"
                    name="solicitante"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Nome do solicitante"
                    required
                  />
                </div>
              </div>
            </>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Observações sobre o atendimento"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            {action === 'iniciar' ? (
              <button
                type="submit"
                className="px-4 py-2 text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loading />
                    <span className="ml-2">Processando...</span>
                  </>
                ) : (
                  'Concluir Atendimento'
                )}
              </button>
            ) : action === 'concluir' ? (
              <button
                type="submit"
                className="px-4 py-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loading />
                    <span className="ml-2">Processando...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-2" />
                    Concluir Atendimento
                  </>
                )}
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loading />
                    <span className="ml-2">Processando...</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="w-4 h-4 mr-2" />
                    Cancelar Atendimento
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
} 