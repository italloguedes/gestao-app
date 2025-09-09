import React from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase-client';
import Loading from './Loading';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSave: (updatedAppointment: any) => void;
  action: 'iniciar' | 'ausente' | 'concluido' | 'cancelar' | 'edit' | 'delete' | null;
  onStatusChange: (id: number, newStatus: string) => void;
  onDelete?: (id: number) => void;
}

export default function EditAppointmentModal({ isOpen, onClose, appointment, onSave, action: initialAction, onStatusChange, onDelete }: EditAppointmentModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [action, setAction] = React.useState<'iniciar' | 'ausente' | 'concluido' | 'cancelar' | 'edit' | 'delete' | null>(initialAction);

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
        nome: formData.get('nome') || appointment.nome,
        telefone: formData.get('telefone') || appointment.telefone,
        email: formData.get('email') || appointment.email,
        cpf: formData.get('cpf') || appointment.cpf,
        data: formData.get('data') || appointment.data,
        horario: formData.get('horario') ? `${formData.get('horario')}:00` : appointment.horario,
        data_nascimento: formData.get('data_nascimento') || appointment.data_nascimento,
        atendimento_preferencial: formData.get('atendimento_preferencial') === 'on',
        observacoes: formData.get('observacoes') || appointment.observacoes,
      };

      if (action === 'iniciar') {
        console.log('Iniciando processo de conclusão do atendimento...');
        
        // Update appointment details
        const { error: appointmentError } = await supabase
          .from('agendamentos')
          .update({ ...updatedAppointment, status: 'concluido' })
          .eq('id', appointment.id);

        if (appointmentError) {
          console.error('Erro ao atualizar agendamento:', appointmentError);
          throw appointmentError;
        }
        
        console.log('Agendamento atualizado com sucesso para status: concluido');

        // Create atendimento record
        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];

        const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
        if (protocolError) throw protocolError;

        const protocolo = protocolData;
        console.log('Protocolo gerado:', protocolo);

        const { error: atendimentoError } = await supabase.from('atendimentos').insert([
          {
            nome: updatedAppointment.nome,
            cpf: updatedAppointment.cpf,
            email: updatedAppointment.email,
            solicitante: formData.get('solicitante'),
            observacoes: updatedAppointment.observacoes,
            horario,
            dia_atual: diaAtual,
            usuario_id: (await supabase.auth.getUser()).data.user?.id,
            protocolo,
            status: 'em_andamento',
          },
        ]);

        if (atendimentoError) {
          console.error('Erro ao criar atendimento:', atendimentoError);
          throw atendimentoError;
        }
        
        console.log('Atendimento criado com sucesso');

        // Send email
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: updatedAppointment.email,
              subject: `Atendimento Realizado, ${updatedAppointment.nome}! 🎉`,
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
                      Olá, ${updatedAppointment.nome}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
                    </p>
                    <p style="margin-bottom: 10px;">
                      <b>Nome:</b> ${updatedAppointment.nome}<br>
                      <b>CPF:</b> ${updatedAppointment.cpf}<br>
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
          } else {
            console.log('Email enviado com sucesso');
          }
        } catch (err) {
          console.error('Erro ao enviar email:', err);
        }

        console.log('Processo de conclusão finalizado com sucesso');
        setMessage('Atendimento concluído com sucesso!');
      } else if (action === 'ausente') {
        await onStatusChange(appointment.id, 'ausente');
        setMessage('Atendimento marcado como ausente com sucesso!');
      } else if (action === 'concluido') {
        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];

        const { data: protocolData, error: protocolError } = await supabase.rpc('generate_protocolo');
        if (protocolError) throw protocolError;

        const protocolo = protocolData;

        const { error: atendimentoError } = await supabase.from('atendimentos').insert([
          {
            nome: updatedAppointment.nome,
            cpf: updatedAppointment.cpf,
            email: updatedAppointment.email,
            solicitante: formData.get('solicitante') || appointment.solicitante,
            observacoes: updatedAppointment.observacoes,
            horario,
            dia_atual: diaAtual,
            usuario_id: (await supabase.auth.getUser()).data.user?.id,
            protocolo,
            status: 'em_andamento',
          },
        ]);

        if (atendimentoError) throw atendimentoError;

        // Atualize o agendamento com status 'concluido'
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ ...updatedAppointment, status: 'concluido' })
          .eq('id', appointment.id);

        if (updateError) throw updateError;

        setMessage('Atendimento concluído com sucesso!');
      } else if (action === 'cancelar') {
        await onStatusChange(appointment.id, 'cancelado');
        setMessage('Atendimento cancelado com sucesso!');
      } else if (action === 'edit') {
        // Apenas atualizar os dados do agendamento
        const { error } = await supabase
          .from('agendamentos')
          .update(updatedAppointment)
          .eq('id', appointment.id);

        if (error) throw error;
        
        onSave(updatedAppointment);
        setMessage('Agendamento atualizado com sucesso!');
      } else if (action === 'delete') {
        if (onDelete) {
          await onDelete(appointment.id);
          setMessage('Agendamento excluído com sucesso!');
        }
      }

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
            {action === 'iniciar' ? 'Concluir Atendimento' :
              action === 'ausente' ? 'Marcar Ausente' :
              action === 'concluido' ? 'Concluir Atendimento' :
              action === 'edit' ? 'Editar Agendamento' :
              action === 'delete' ? 'Excluir Agendamento' :
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

        {action === 'delete' ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiXCircle className="w-5 h-5 text-red-600 mr-2" />
                <h3 className="text-red-800 font-medium">Confirmar Exclusão</h3>
              </div>
              <p className="text-red-700 mt-2">
                Tem certeza que deseja excluir o agendamento de <strong>{appointment.nome}</strong> 
                para o dia <strong>{appointment.data}</strong> às <strong>{appointment.horario.substring(0, 5)}</strong>?
              </p>
              <p className="text-red-600 text-sm mt-2">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loading />
                    <span className="ml-2">Excluindo...</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="w-4 h-4 mr-2" />
                    Excluir Agendamento
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-3 text-slate-600">
              <FiClock className="w-5 h-5" />
              <span className="font-medium">{appointment.horario}</span>
            </div>

          {(action === 'iniciar' || action === 'edit') && (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input
                      type="date"
                      name="data"
                      defaultValue={appointment.data}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Horário</label>
                    <input
                      type="time"
                      name="horario"
                      defaultValue={appointment.horario.substring(0, 5)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="atendimento_preferencial"
                    defaultChecked={appointment.atendimento_preferencial || false}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-slate-700">
                    Atendimento Preferencial
                  </label>
                </div>

                {action === 'iniciar' && (
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
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Observações sobre o atendimento"
              defaultValue={appointment.observacoes}
            />
          </div>

            <div className="flex justify-between items-center mt-6">
              {action === 'edit' && onDelete && (
                <button
                  type="button"
                  onClick={() => setAction('delete')}
                  className="px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center"
                  disabled={loading}
                >
                  <FiXCircle className="w-4 h-4 mr-2" />
                  Excluir
                </button>
              )}
              
              <div className="flex space-x-3 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center ${getButtonStyle(action)}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loading />
                      <span className="ml-2">Processando...</span>
                    </>
                  ) : (
                    <>
                      {action === 'ausente' && <FiXCircle className="w-4 h-4 mr-2" />}
                      {action === 'concluido' && <FiCheck className="w-4 h-4 mr-2" />}
                      {getButtonText(action)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const getButtonStyle = (action: string | null) => {
  switch (action) {
    case 'iniciar':
      return 'bg-sky-600 hover:bg-sky-700';
    case 'ausente':
      return 'bg-rose-600 hover:bg-rose-700';
    case 'concluido':
      return 'bg-teal-600 hover:bg-teal-700';
    case 'cancelar':
      return 'bg-amber-600 hover:bg-amber-700';
    case 'edit':
      return 'bg-blue-600 hover:bg-blue-700';
    case 'delete':
      return 'bg-red-600 hover:bg-red-700';
    default:
      return 'bg-gray-600';
  }
};

const getButtonText = (action: string | null) => {
  switch (action) {
    case 'iniciar':
      return 'Concluir Atendimento';
    case 'ausente':
      return 'Marcar Ausente';
    case 'concluido':
      return 'Concluir Atendimento';
    case 'cancelar':
      return 'Cancelar Atendimento';
    case 'edit':
      return 'Salvar Alterações';
    case 'delete':
      return 'Excluir Agendamento';
    default:
      return 'Confirmar';
  }
};