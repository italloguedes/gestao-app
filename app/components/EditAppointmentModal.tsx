import React from 'react';
import { FiX, FiUser, FiPhone, FiCalendar, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase-client';
import Loading from './Loading';
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

  // Função para copiar telefone (F7)
  const copyPhone = () => {
    if (appointment?.telefone) {
      copyToClipboardWithFallback(appointment.telefone);
    }
  };

  // Função para copiar CPF (F8)
  const copyCPF = () => {
    if (appointment?.cpf) {
      copyToClipboardWithFallback(appointment.cpf);
    }
  };

  // Event listener para atalhos de teclado - funciona quando o modal está aberto
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Só funciona quando o modal está aberto e a ação é 'iniciar'
      if (!isOpen || action !== 'iniciar') return;

      // Atalhos F7 e F8
      if (event.key === 'F7') {
        event.preventDefault();
        event.stopPropagation();
        copyPhone();
      } else if (event.key === 'F8') {
        event.preventDefault();
        event.stopPropagation();
        copyCPF();
      }
    };

    // Adiciona o listener no window para capturar eventos
    if (isOpen && action === 'iniciar') {
      window.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, action, appointment]);

  // Função para copiar com fallback para navegadores mais antigos
  const copyToClipboardWithFallback = async (text: string) => {
    try {
      // Tenta usar a API moderna primeiro
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setMessage(`✅ Copiado: ${text}`);
        setTimeout(() => setMessage(''), 3000);

        // Mostra notificação se disponível
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Dados Copiados!', {
            body: `Telefone/CPF copiado: ${text}`,
            icon: '/logoautismo.png',
            tag: 'copy-notification'
          });
        }
        return;
      }

      // Fallback para navegadores mais antigos ou contextos não seguros
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

        // Mostra notificação se disponível
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Dados Copiados!', {
            body: `Telefone/CPF copiado: ${text}`,
            icon: '/logoautismo.png',
            tag: 'copy-notification'
          });
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
        observacoes: formData.get('observacoes') || appointment.observacoes,
      };

      if (action === 'iniciar') {
        console.log('🔄 EditAppointmentModal: Iniciando atendimento...');

        if (!protocolo.trim()) {
          setMessage('Por favor, informe o número de protocolo.');
          setLoading(false);
          return;
        }

        // Validar CPF
        const cpfEditado = formData.get('cpf') || appointment.cpf;
        if (!/^[0-9]{11}$/.test(cpfEditado)) {
          setMessage('CPF inválido. Use apenas números, sem pontos ou traços.');
          setLoading(false);
          return;
        }

        // Verificar se o CPF já existe na tabela de atendimentos
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

        // Atualizar o status do agendamento para 'concluido'
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'concluido' })
          .eq('id', appointment.id);

        if (updateError) {
          console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
          throw updateError;
        }

        // Atualizar estado local no componente pai para mudança instantânea de cor
        onStatusChange(appointment.id, 'concluido');

        // Criar registro na tabela de atendimentos
        const now = new Date();
        const diaAtual = now.toISOString().split('T')[0];
        const horario = now.toTimeString().split(' ')[0];

        // Buscar nome do atendente para salvar no registro
        let atendenteNome = 'Não identificado';
        if (user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name')
            .eq('auth_id', user.id)
            .single();

          if (userError) {
            console.error('Erro ao buscar dados do atendente:', userError);
          } else if (userData?.name) {
            atendenteNome = userData.name;
          }
        }

        const { error: atendimentoError } = await supabase.from('atendimentos').insert([
          {
            nome: formData.get('nome') || appointment.nome,
            cpf: formData.get('cpf') || appointment.cpf,
            email: formData.get('email') || appointment.email,
            solicitante: formData.get('solicitante') || '',
            horario,
            dia_atual: diaAtual,
            usuario_id: appointment.usuario_id || appointment.user_id,
            atendente_nome: atendenteNome,
            protocolo,
            status: 'em_andamento',
          },
        ]);

        if (atendimentoError) {
          console.error('❌ EditAppointmentModal: Erro ao criar atendimento:', atendimentoError);
          throw atendimentoError;
        }

        // Enviar e-mail de confirmação
        try {
          const nomeEditado = formData.get('nome') || appointment.nome;
          const emailEditado = formData.get('email') || appointment.email;
          const cpfEditado = formData.get('cpf') || appointment.cpf;

          // Obter token de autenticação
          const { data: { session } } = await supabase.auth.getSession();

          const res = await fetch('/api/send-email', {
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
          });

          const result = await res.json();
          if (res.ok) {
            setMessage('Atendimento concluído com sucesso! E-mail enviado.');
          } else {
            setMessage('Atendimento concluído, mas erro ao enviar e-mail: ' + result.error);
          }
        } catch (err) {
          setMessage('Atendimento concluído, mas houve erro ao enviar o e-mail.');
        }

        console.log('✅ EditAppointmentModal: Atendimento criado e concluído');
      } else if (action === 'ausente') {
        console.log('🔄 EditAppointmentModal: Marcando como ausente...');

        if (!motivo.trim()) {
          setMessage('Por favor, informe o motivo da ausência.');
          setLoading(false);
          return;
        }

        try {
          // Atualizar status e motivo
          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({
              status: 'ausente',
              tipo_cancelamento: motivo,
              observacoes: `Ausente - Motivo: ${motivo}`
            })
            .eq('id', appointment.id);

          if (updateError) {
            console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
            throw updateError;
          }

          // Atualizar estado local no componente pai para mudança instantânea de cor
          onStatusChange(appointment.id, 'ausente');

          console.log('✅ EditAppointmentModal: Status atualizado para ausente');
          setMessage('Atendimento marcado como ausente com sucesso!');
        } catch (error) {
          console.error('❌ EditAppointmentModal: Erro ao marcar como ausente:', error);
          throw error;
        }
      } else if (action === 'concluido') {
        console.log('🔄 EditAppointmentModal: Concluindo atendimento...');

        // Apenas atualizar o status do agendamento para 'concluido'
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'concluido' })
          .eq('id', appointment.id);

        if (updateError) {
          console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
          throw updateError;
        }

        // Atualizar estado local no componente pai para mudança instantânea de cor
        onStatusChange(appointment.id, 'concluido');

        console.log('✅ EditAppointmentModal: Status atualizado para concluido');
        setMessage('Atendimento concluído com sucesso!');
      } else if (action === 'cancelar') {
        console.log('🔄 EditAppointmentModal: Cancelando atendimento...');

        if (!motivo.trim()) {
          setMessage('Por favor, informe o motivo do cancelamento.');
          setLoading(false);
          return;
        }

        try {
          // Atualizar status e motivo
          const { error: updateError } = await supabase
            .from('agendamentos')
            .update({
              status: 'cancelado',
              tipo_cancelamento: motivo,
              observacoes: `Cancelado - Motivo: ${motivo}`
            })
            .eq('id', appointment.id);

          if (updateError) {
            console.error('❌ EditAppointmentModal: Erro ao atualizar status:', updateError);
            throw updateError;
          }

          // Atualizar estado local no componente pai para mudança instantânea de cor
          onStatusChange(appointment.id, 'cancelado');

          console.log('✅ EditAppointmentModal: Status atualizado para cancelado');
          setMessage('Atendimento cancelado com sucesso!');
        } catch (error) {
          console.error('❌ EditAppointmentModal: Erro ao cancelar:', error);
          throw error;
        }
      } else if (action === 'edit') {
        console.log('🔄 EditAppointmentModal: Editando agendamento...');
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

      // Fechar modal após 2 segundos se não houver erro
      setTimeout(() => {
        console.log('🔄 EditAppointmentModal: Fechando modal após sucesso');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('❌ EditAppointmentModal: Erro no handleSubmit:', err);
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : 'No stack trace available');
      setMessage(`Erro ao ${action} atendimento: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">
            {action === 'iniciar' ? 'Iniciar Atendimento' :
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
                onClick={() => handleSubmit({ preventDefault: () => { } } as React.FormEvent)}
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-3 text-slate-600 mb-4">
              <FiClock className="w-5 h-5" />
              <span className="font-medium text-lg">{appointment.horario}</span>
            </div>

            {/* Ações simples - Concluído */}
            {(action === 'concluido') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-green-600 text-lg font-semibold mb-2">
                  Confirmar Conclusão do Atendimento
                </div>
                <div className="text-green-700">
                  Tem certeza que deseja marcar o atendimento de <strong>{appointment.nome}</strong> como concluído?
                </div>
              </div>
            )}

            {/* Ações com motivo - Ausente e Cancelado */}
            {(action === 'ausente' || action === 'cancelar') && (
              <div className="space-y-4">
                <div className={`border rounded-lg p-4 ${
                  action === 'ausente' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className={`text-lg font-semibold mb-2 ${
                    action === 'ausente' ? 'text-rose-800' : 'text-amber-800'
                  }`}>
                    {action === 'ausente' ? 'Marcar como Ausente' : 'Cancelar Atendimento'}
                  </div>
                  <div className={`${
                    action === 'ausente' ? 'text-rose-700' : 'text-amber-700'
                  }`}>
                    {action === 'ausente' 
                      ? `Confirme que ${appointment.nome} não compareceu ao atendimento.`
                      : `Confirme o cancelamento do atendimento de ${appointment.nome}.`
                    }
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {action === 'ausente' ? 'Motivo da Ausência' : 'Motivo do Cancelamento'} *
                  </label>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder={action === 'ausente' 
                      ? 'Ex: Cliente não compareceu, não atendeu o telefone...'
                      : 'Ex: Cliente solicitou cancelamento, reagendamento...'
                  <input
                    type="text"
                    name="nome"
                    defaultValue={appointment.nome}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={appointment.email}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    CPF * 
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (F8 para copiar)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cpf"
                      defaultValue={appointment.cpf}
                      className="w-full px-3 py-2 pr-16 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Apenas números"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => copyCPF()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Copiar CPF (F8)"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Telefone
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (F7 para copiar)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="telefone"
                      defaultValue={appointment.telefone}
                      className="w-full px-3 py-2 pr-16 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="(85) 99999-9999"
                    />
                    <button
                      type="button"
                      onClick={() => copyPhone()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Copiar Telefone (F7)"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* Campos específicos do atendimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <span className="text-red-600">*</span> Número de Protocolo
                </label>
                <input
                  type="text"
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                  placeholder="Digite o número do protocolo"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-blue-600">
              Este número será usado para rastreamento do atendimento
            </p>
          </div>
        )}

        {action === 'edit' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Data e Horário */}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                name="status"
                defaultValue={appointment.status}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                required
              >
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
                <option value="ausente">Ausente</option>
                <option value="concluido">Concluído</option>
                <option value="bloqueado">Bloqueado</option>
              </select>
            </div>

            {/* Nome e Contatos */}
            <div className="md:col-span-2">
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

            {/* Email e CPF */}
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

            {/* Atendimento Preferencial */}
            <div className="md:col-span-2 lg:col-span-3">
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
            </div>
          </div>
        )}

        {action === 'edit' && (
          <div className="md:col-span-2 lg:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              name="observacoes"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              placeholder="Observações sobre o atendimento"
              defaultValue={appointment.observacoes}
            />
          </div>
        )}

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

            {/* Botão de submit - sempre visível exceto para ações simples */}
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
                  {action === 'cancelar' && <FiXCircle className="w-4 h-4 mr-2" />}
                  {getButtonText(action)}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
        )}
    </div>
    </div >
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