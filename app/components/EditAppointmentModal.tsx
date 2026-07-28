import React from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiClock, FiCheck, FiXCircle, FiCopy, FiMail, FiHash, FiFileText, FiStar, FiAlertTriangle, FiCheckCircle, FiSlash, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { supabase } from '@/lib/supabase-client';
import Loading from './Loading';
import { registrarHistorico } from '@/lib/historico-utils';
import { useAuth } from '@/contexts/AuthContext';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSave: (updatedAppointment: any) => void;
  action: 'iniciar' | 'ausente' | 'concluido' | 'cancelar' | 'edit' | 'delete' | null;
  onStatusChange: (id: number, newStatus: string) => void;
  onDelete?: (id: number) => void;
}

const ACTION_CONFIG: Record<string, { title: string; gradient: string; iconBg: string; icon: React.ReactElement }> = {
  iniciar: { title: 'Iniciar Atendimento', gradient: 'from-emerald-600 to-teal-600', iconBg: 'bg-emerald-100 text-emerald-600', icon: <FiCheckCircle className="w-6 h-6" /> },
  ausente: { title: 'Marcar Ausente', gradient: 'from-rose-600 to-red-600', iconBg: 'bg-rose-100 text-rose-600', icon: <FiXCircle className="w-6 h-6" /> },
  concluido: { title: 'Concluir Atendimento', gradient: 'from-emerald-600 to-green-600', iconBg: 'bg-emerald-100 text-emerald-600', icon: <FiCheck className="w-6 h-6" /> },
  cancelar: { title: 'Cancelar Atendimento', gradient: 'from-amber-600 to-orange-600', iconBg: 'bg-amber-100 text-amber-600', icon: <FiSlash className="w-6 h-6" /> },
  edit: { title: 'Editar Agendamento', gradient: 'from-emerald-600 to-teal-600', iconBg: 'bg-emerald-100 text-emerald-600', icon: <FiEdit3 className="w-6 h-6" /> },
  delete: { title: 'Excluir Agendamento', gradient: 'from-red-600 to-rose-700', iconBg: 'bg-red-100 text-red-600', icon: <FiTrash2 className="w-6 h-6" /> },
};

export default function EditAppointmentModal({ isOpen, onClose, appointment, onSave, action: initialAction, onStatusChange, onDelete }: EditAppointmentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [action, setAction] = React.useState<'iniciar' | 'ausente' | 'concluido' | 'cancelar' | 'edit' | 'delete' | null>(initialAction);
  const [motivo, setMotivo] = React.useState('');
  const [protocolo, setProtocolo] = React.useState('');

  React.useEffect(() => {
    setAction(initialAction);
  }, [initialAction]);

  const handleUnlock = async () => {
    if (action === 'iniciar' && appointment?.id && user?.id) {
      console.log('🔓 Tentando desbloquear agendamento...', { appointmentId: appointment.id, userId: user.id });
      const { error } = await supabase
        .from('agendamentos')
        .update({ locked_by: null, locked_at: null })
        .eq('id', appointment.id)
        .eq('locked_by', user.id);
      if (error) {
        console.error('Erro ao desbloquear:', error);
      } else {
        console.log('🔓 Agendamento desbloqueado com sucesso (se pertencia a este usuário).');
      }
    }
  };

  const handleClose = async () => {
    await handleUnlock();
    onClose();
  };

  const copyPhone = () => {
    if (appointment?.telefone) {
      copyToClipboardWithFallback(appointment.telefone);
    }
  };

  const copyCPF = () => {
    if (appointment?.cpf) {
      copyToClipboardWithFallback(appointment.cpf);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      } else if (action === 'iniciar' && event.key === 'F7') {
        event.preventDefault();
        event.stopPropagation();
        copyPhone();
      } else if (action === 'iniciar' && event.key === 'F8') {
        event.preventDefault();
        event.stopPropagation();
        copyCPF();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, action, appointment]);

  const copyToClipboardWithFallback = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setMessage(`✅ Copiado: ${text}`);
        setTimeout(() => setMessage(''), 3000);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Dados Copiados!', { body: `Telefone/CPF copiado: ${text}`, icon: '/logoautismo.png', tag: 'copy-notification' });
        }
        return;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setMessage(`✅ Copiado: ${text}`);
        setTimeout(() => setMessage(''), 3000);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Dados Copiados!', { body: `Telefone/CPF copiado: ${text}`, icon: '/logoautismo.png', tag: 'copy-notification' });
        }
      } else {
        throw new Error('Falha no comando de cópia');
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
      setMessage(`❌ Erro ao copiar: ${text}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      console.log('🔄 EditAppointmentModal: handleSubmit iniciado', { action, appointmentId: appointment?.id });
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
        status: formData.get('status') || appointment.status,
        posto: formData.get('posto') || appointment.posto,
        observacoes: formData.get('observacoes') || appointment.observacoes,
      };

      if (action === 'iniciar') {
        console.log('🔄 EditAppointmentModal: Iniciando atendimento...');
        if (!protocolo.trim()) {
          setMessage('Por favor, informe o número de protocolo.');
          setLoading(false);
          return;
        }
        const cpfEditado = formData.get('cpf') || appointment.cpf;
        if (!/^[0-9]{11}$/.test(cpfEditado)) {
          setMessage('CPF inválido. Use apenas números, sem pontos ou traços.');
          setLoading(false);
          return;
        }
        const { data: existingCpf, error: cpfCheckError } = await supabase
          .from('atendimentos')
          .select('cpf')
          .eq('cpf', cpfEditado)
          .single();
        if (cpfCheckError && cpfCheckError.code !== 'PGRST116') {
          setMessage('Erro ao verificar CPF: ' + cpfCheckError.message);
          setLoading(false);
          return;
        }
        if (existingCpf) {
          setMessage('CPF já cadastrado no sistema. Verifique se o atendimento já foi realizado.');
          setLoading(false);
          return;
        }

        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];
        const atendenteNome = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Atendente';
        const nomeEditado = formData.get('nome') || appointment.nome;
        const emailEditado = formData.get('email') || appointment.email;

        // Executar atualização do status e criação do atendimento em paralelo
        const [updateRes, insertRes] = await Promise.all([
          supabase
            .from('agendamentos')
            .update({ status: 'concluido', locked_by: null, locked_at: null })
            .eq('id', appointment.id),
          supabase
            .from('atendimentos')
            .insert([
              {
                nome: nomeEditado,
                cpf: cpfEditado,
                email: emailEditado,
                solicitante: formData.get('solicitante') || '',
                horario,
                dia_atual: diaAtual,
                usuario_id: appointment.usuario_id || appointment.user_id,
                atendente_nome: atendenteNome,
                protocolo,
                status: 'em_andamento',
                atendimento_preferencial: appointment.atendimento_preferencial || false,
              },
            ])
            .select('id')
            .single()
        ]);

        if (updateRes.error) {
          console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateRes.error);
          throw updateRes.error;
        }
        if (insertRes.error) {
          console.error('❌ EditAppointmentModal: Erro ao criar atendimento:', insertRes.error);
          throw insertRes.error;
        }

        onStatusChange(appointment.id, 'concluido');
        const novoAteId = insertRes.data?.id;

        // Histórico e envio de e-mail assíncronos (não-bloqueantes para resposta instantânea)
        if (novoAteId && user) {
          registrarHistorico({
            atendimento_id: novoAteId,
            acao: 'criacao',
            atendente_id: user.id,
            atendente_nome: atendenteNome,
          }).catch(err => console.error('Erro historico background:', err));
        }

        if (emailEditado) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': session ? `Bearer ${session.access_token}` : ''
              },
              body: JSON.stringify({
                to: emailEditado,
                subject: `Atendimento Realizado, ${nomeEditado}! 🎉`,
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
        Olá, ${nomeEditado}! Seu atendimento foi realizado com sucesso. O prazo para retirada é de 20 dias.
      </p>
      <p style="margin-bottom: 10px;">
        <b>Nome:</b> ${nomeEditado}<br>
        <b>CPF:</b> ${cpfEditado}<br>
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
            }).catch(err => console.error('Erro envio email background:', err));
          });
        }

        console.log('✅ EditAppointmentModal: Atendimento concluído instantaneamente');
        onClose();
        return;
      } else if (action === 'ausente') {
        console.log('🔄 EditAppointmentModal: Marcando como ausente...');
        if (!motivo.trim()) {
          setMessage('Por favor, informe o motivo da ausência.');
          setLoading(false);
          return;
        }
        try {
          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({ status: 'ausente', tipo_cancelamento: motivo, observacoes: `Ausente - Motivo: ${motivo}`, locked_by: null, locked_at: null })
            .eq('id', appointment.id);
          if (updateError) {
            console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
            throw updateError;
          }
          onStatusChange(appointment.id, 'ausente');
          console.log('✅ EditAppointmentModal: Status atualizado para ausente');
        } catch (error) {
          console.error('❌ EditAppointmentModal: Erro ao marcar como ausente:', error);
          throw error;
        }
      } else if (action === 'concluido') {
        console.log('🔄 EditAppointmentModal: Concluindo atendimento...');
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'concluido', locked_by: null, locked_at: null })
          .eq('id', appointment.id);
        if (updateError) {
          console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
          throw updateError;
        }
        onStatusChange(appointment.id, 'concluido');
        console.log('✅ EditAppointmentModal: Status atualizado para concluido');
      } else if (action === 'cancelar') {
        console.log('🔄 EditAppointmentModal: Cancelando atendimento...');
        if (!motivo.trim()) {
          setMessage('Por favor, informe o motivo do cancelamento.');
          setLoading(false);
          return;
        }
        try {
          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado', tipo_cancelamento: motivo, observacoes: `Cancelado - Motivo: ${motivo}`, locked_by: null, locked_at: null })
            .eq('id', appointment.id);
          if (updateError) {
            console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
            throw updateError;
          }
          onStatusChange(appointment.id, 'cancelado');
          console.log('✅ EditAppointmentModal: Status atualizado para cancelado');
        } catch (error) {
          console.error('❌ EditAppointmentModal: Erro ao cancelar:', error);
          throw error;
        }
      } else if (action === 'edit') {
        console.log('🔄 EditAppointmentModal: Editando agendamento...');
        const dbPayload = {
          nome: updatedAppointment.nome,
          email: updatedAppointment.email,
          cpf: updatedAppointment.cpf,
          telefone: updatedAppointment.telefone,
          data: updatedAppointment.data,
          horario: updatedAppointment.horario,
          data_nascimento: updatedAppointment.data_nascimento,
          atendimento_preferencial: updatedAppointment.atendimento_preferencial,
          status: updatedAppointment.status,
          posto: updatedAppointment.posto,
          observacoes: updatedAppointment.observacoes,
        };
        const { error } = await supabase
          .from('agendamentos')
          .update(dbPayload)
          .eq('id', appointment.id);
        if (error) throw error;
        await onSave(updatedAppointment);
      } else if (action === 'delete') {
        if (onDelete) {
          await onDelete(appointment.id);
        }
      }

      onClose();
    } catch (err) {
      console.error('❌ EditAppointmentModal: Erro no handleSubmit:', err);
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : 'No stack trace available');
      setMessage(`Erro ao ${action} atendimento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const config = ACTION_CONFIG[action || ''] || ACTION_CONFIG.edit;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-4 shadow-2xl overflow-hidden border border-slate-200/50">

        {/* Header com gradiente */}
        <div className={`bg-gradient-to-r ${config.gradient} px-6 py-5 relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white`}>
                {config.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{config.title}</h2>
                <div className="flex items-center gap-2 text-white/80 text-sm mt-0.5">
                  <FiClock className="w-3.5 h-3.5" />
                  <span className="font-medium">{appointment.horario?.substring(0, 5)}</span>
                  <span className="text-white/50">•</span>
                  <FiUser className="w-3.5 h-3.5" />
                  <span className="font-medium truncate max-w-[200px]">{appointment.nome}</span>
                </div>
              </div>
            </div>
            <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-200">
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Mensagem de feedback */}
          {message && (
            <div className={`mb-5 rounded-2xl border-2 p-4 flex items-start gap-3 ${message.includes('sucesso') || message.includes('✅')
              ? 'bg-emerald-50 border-emerald-200'
              : message.includes('❌') || message.includes('Erro') || message.includes('inválido') || message.includes('obrigat')
                ? 'bg-rose-50 border-rose-200'
                : 'bg-blue-50 border-blue-200'
              }`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${message.includes('sucesso') || message.includes('✅')
                ? 'bg-emerald-100 text-emerald-600'
                : message.includes('❌') || message.includes('Erro') || message.includes('inválido') || message.includes('obrigat')
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-blue-100 text-blue-600'
                }`}>
                {message.includes('sucesso') || message.includes('✅') ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertTriangle className="w-4 h-4" />}
              </div>
              <p className={`text-sm font-medium pt-1.5 ${message.includes('sucesso') || message.includes('✅') ? 'text-emerald-800' : message.includes('❌') || message.includes('Erro') ? 'text-rose-800' : 'text-blue-800'}`}>
                {message}
              </p>
            </div>
          )}

          {/* DELETE */}
          {action === 'delete' ? (
            <div className="space-y-5">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-800 mb-2">Confirmar Exclusão</h3>
                <p className="text-red-700 text-sm">
                  Tem certeza que deseja excluir o agendamento de <strong>{appointment.nome}</strong> para o dia <strong>{appointment.data}</strong> às <strong>{appointment.horario?.substring(0, 5)}</strong>?
                </p>
                <p className="text-red-500 text-xs mt-3 font-semibold">Esta ação não pode ser desfeita.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={handleClose} disabled={loading}
                  className="flex-1 px-5 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 font-bold text-sm">
                  Cancelar
                </button>
                <button onClick={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)} disabled={loading}
                  className="flex-1 px-5 py-3 text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl transition-all duration-200 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-200/50">
                  {loading ? <><Loading /><span>Excluindo...</span></> : <><FiTrash2 className="w-4 h-4" />Excluir</>}
                </button>
              </div>
            </div>
          ) : (

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* CONCLUIDO - Confirmação simples */}
              {action === 'concluido' && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-800 mb-2">Confirmar Conclusão</h3>
                  <p className="text-emerald-700 text-sm">
                    Tem certeza que deseja marcar o atendimento de <strong>{appointment.nome}</strong> como concluído?
                  </p>
                </div>
              )}

              {/* AUSENTE / CANCELAR - com motivo */}
              {(action === 'ausente' || action === 'cancelar') && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-5 border-2 ${action === 'ausente' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action === 'ausente' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {action === 'ausente' ? <FiXCircle className="w-5 h-5" /> : <FiSlash className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className={`font-bold ${action === 'ausente' ? 'text-rose-800' : 'text-amber-800'}`}>
                          {action === 'ausente' ? 'Marcar como Ausente' : 'Cancelar Atendimento'}
                        </h3>
                        <p className={`text-sm ${action === 'ausente' ? 'text-rose-600' : 'text-amber-600'}`}>
                          {action === 'ausente'
                            ? `Confirme que ${appointment.nome} não compareceu.`
                            : `Confirme o cancelamento de ${appointment.nome}.`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {action === 'ausente' ? 'Motivo da Ausência' : 'Motivo do Cancelamento'} *
                    </label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm resize-none"
                      placeholder={action === 'ausente'
                        ? 'Ex: Cliente não compareceu, não atendeu o telefone...'
                        : 'Ex: Cliente solicitou cancelamento, reagendamento...'}
                      required
                    />
                  </div>
                </div>
              )}

              {/* INICIAR - Dados do cliente */}
              {action === 'iniciar' && (
                <div className="space-y-5">
                  {/* Info card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-bold text-blue-800 text-sm">Dados do Cliente</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-blue-500 text-xs font-semibold">Nome</span>
                        <p className="text-blue-800 font-medium truncate">{appointment.nome}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-blue-500 text-xs font-semibold">CPF</span>
                        <p className="text-blue-800 font-medium font-mono">{appointment.cpf}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-blue-500 text-xs font-semibold">Email</span>
                        <p className="text-blue-800 font-medium truncate">{appointment.email}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <span className="text-blue-500 text-xs font-semibold">Telefone</span>
                        <p className="text-blue-800 font-medium">{appointment.telefone}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2 col-span-2">
                        <span className="text-blue-500 text-xs font-semibold">Criado por</span>
                        <p className="text-blue-800 font-medium truncate">{appointment.criado_por_nome || 'Agendamento Online'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Campos editáveis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nome *</label>
                      <input type="text" name="nome" defaultValue={appointment.nome} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email *</label>
                      <input type="email" name="email" defaultValue={appointment.email} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        CPF * <span className="text-blue-500 normal-case font-normal">(F8 copiar)</span>
                      </label>
                      <div className="relative">
                        <input type="text" name="cpf" defaultValue={appointment.cpf} required
                          className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium font-mono" />
                        <button type="button" onClick={() => copyCPF()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all">
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Telefone <span className="text-blue-500 normal-case font-normal">(F7 copiar)</span>
                      </label>
                      <div className="relative">
                        <input type="tel" name="telefone" defaultValue={appointment.telefone}
                          className="w-full px-4 py-3 pr-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                        <button type="button" onClick={() => copyPhone()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all">
                          <FiCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Solicitante</label>
                      <input type="text" name="solicitante" required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium"
                        placeholder="Nome do solicitante" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        <span className="text-red-500">*</span> Nº Protocolo
                      </label>
                      <input type="text" value={protocolo} onChange={(e) => setProtocolo(e.target.value)} required
                        className="w-full px-4 py-3 border-2 border-emerald-300 bg-emerald-50/50 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all duration-200 text-sm font-bold"
                        placeholder="Digite o nº do protocolo" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <FiHash className="w-3 h-3" /> Este número será usado para rastreamento do atendimento
                  </p>
                </div>
              )}

              {/* EDIT - Edição completa */}
              {action === 'edit' && (
                <div className="space-y-4">
                  {appointment.criado_por_nome && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Criado por: <strong className="text-slate-800">{appointment.criado_por_nome}</strong></span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Data</label>
                      <input type="date" name="data" defaultValue={appointment.data} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Horário</label>
                      <input type="time" name="horario" defaultValue={appointment.horario?.substring(0, 5)} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Status</label>
                      <select name="status" defaultValue={appointment.status} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium">
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="ausente">Ausente</option>
                        <option value="concluido">Concluído</option>
                        <option value="bloqueado">Bloqueado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Posto</label>
                      <select name="posto" defaultValue={appointment.posto} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium">
                        <option value="Sala Sensorial">Sala Sensorial</option>
                        <option value="Alece Itinerante I">Alece Itinerante I</option>
                        <option value="Alece Itinerante II">Alece Itinerante II</option>
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Nome</label>
                    <input type="text" name="nome" defaultValue={appointment.nome} required
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Telefone</label>
                      <input type="tel" name="telefone" defaultValue={appointment.telefone} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Email</label>
                      <input type="email" name="email" defaultValue={appointment.email} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">CPF</label>
                      <input type="text" name="cpf" defaultValue={appointment.cpf} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Data de Nascimento</label>
                      <input type="date" name="data_nascimento" defaultValue={appointment.data_nascimento} required
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <input type="checkbox" name="atendimento_preferencial" defaultChecked={appointment.atendimento_preferencial || false}
                      className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-slate-300 rounded-lg" />
                    <label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <FiStar className="w-4 h-4 text-amber-500" /> Atendimento Preferencial
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Observações</label>
                    <textarea name="observacoes" rows={3} defaultValue={appointment.observacoes}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400 transition-all duration-200 text-sm font-medium resize-none"
                      placeholder="Observações sobre o atendimento" />
                  </div>
                </div>
              )}

              {/* Teclas de Atalho */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-200/80 mt-2 mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-700 shadow-2xs">Esc</kbd> Fechar modal
                </span>
                {action === 'iniciar' && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium">
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-700 shadow-2xs">F7</kbd> Copiar Tel
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[11px] font-bold text-slate-700 shadow-2xs">F8</kbd> Copiar CPF
                    </span>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {action === 'edit' && onDelete && (
                  <button type="button" onClick={() => setAction('delete')} disabled={loading}
                    className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 font-bold text-sm flex items-center gap-2 border-2 border-transparent hover:border-red-200">
                    <FiTrash2 className="w-4 h-4" /> Excluir
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={handleClose} disabled={loading}
                    className="px-5 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 font-bold text-sm">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading}
                    className={`px-6 py-3 text-white rounded-xl transition-all duration-300 font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none bg-gradient-to-r ${config.gradient}`}>
                    {loading ? (
                      <><Loading /><span>Processando...</span></>
                    ) : (
                      <>{action === 'iniciar' && <FiCheckCircle className="w-4 h-4" />}
                        {action === 'ausente' && <FiXCircle className="w-4 h-4" />}
                        {action === 'concluido' && <FiCheck className="w-4 h-4" />}
                        {action === 'cancelar' && <FiSlash className="w-4 h-4" />}
                        {action === 'edit' && <FiCheck className="w-4 h-4" />}
                        {action === 'iniciar' ? 'Concluir Atendimento' :
                          action === 'ausente' ? 'Marcar Ausente' :
                            action === 'concluido' ? 'Concluir' :
                              action === 'cancelar' ? 'Cancelar Atendimento' :
                                'Salvar Alterações'}</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
