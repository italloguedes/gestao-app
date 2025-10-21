"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import DocumentosInfo from '@/components/DocumentosInfo';
import { FiInfo } from "react-icons/fi";
import { sendEmailConfirmation } from '@/lib/emailService';
import Header from './Header';

const UNIDADE = "Sala Sensorial ALECE";
const ENDERECO = "Prédio da Assembleia Legislativa Anexo III, Sala Sensorial";
const ENDERECO_COMPLETO = "Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238";
const HORARIOS = [
  "08:00", "08:30", "09:00", "10:00", "11:00", // manhã
  "13:00", "13:30", "14:00", "14:30", "15:00", // tarde
];

function getMonthDays(year: number, month: number) {
  const days = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

// Adicionar esta função para formatação de exibição
function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatCPF(cpf: string) {
  return cpf
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

function formatPhone(phone: string) {
  return phone
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
}

function validateCPF(cpf: string) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function AgendamentosModal({ open, onClose, user }: { open: boolean, onClose: () => void, user: any }) {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAgendamentos = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, data, horario, nome, email, cpf, telefone, data_nascimento, created_at")
        .eq("user_id", user.id)
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
        setError("Erro ao buscar agendamentos.");
      } else {
        console.log("Agendamentos encontrados:", data);
        setAgendamentos(data || []);
      }
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      setError("Erro ao buscar agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchAgendamentos();
    }
  }, [open, user]);

  const handleCancelar = async (id: number) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) {
        console.error("Erro ao cancelar agendamento:", error);
        setError("Erro ao cancelar agendamento.");
        showToast("Erro ao cancelar agendamento", 'error');
      } else {
        setSuccess("Agendamento cancelado!");
        showToast("Agendamento cancelado com sucesso", 'success');
        setAgendamentos(agendamentos.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error("Erro ao cancelar agendamento:", err);
      setError("Erro ao cancelar agendamento.");
      showToast("Erro ao cancelar agendamento", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = (agendamento: any) => {
    const win = window.open('', '_blank');
    win!.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprovante de Agendamento</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 10px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #047857;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 20px;
            }
            .info-container {
              background-color: #f0fdf4;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .info {
              margin-bottom: 10px;
            }
            .info b {
              color: #047857;
            }
            .two-columns {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .column {
              flex: 1;
            }
            .section {
              background-color: #f8fafc;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 15px;
            }
            .section-title {
              font-weight: bold;
              color: #047857;
              margin-bottom: 10px;
            }
            .warning {
              color: #b45309;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .list {
              margin: 0;
              padding-left: 20px;
            }
            .list li {
              margin-bottom: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logoautismo.png" alt="Logo CIADI" class="logo">
            <div class="title">Comprovante de Agendamento</div>
            <div class="subtitle">Sala Sensorial ALECE</div>
          </div>

          <div class="info-container">
            <div class="info"><b>Local:</b> ${ENDERECO}</div>
            <div class="info"><b>Endereço:</b> ${ENDERECO_COMPLETO}</div>
            <div class="info"><b>Nome:</b> ${agendamento.nome}</div>
            <div class="info"><b>E-mail:</b> ${agendamento.email}</div>
            <div class="info"><b>CPF:</b> ${agendamento.cpf}</div>
            <div class="info"><b>Telefone:</b> ${agendamento.telefone}</div>
            <div class="info"><b>Data de Nascimento:</b> ${new Date(agendamento.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            <div class="info"><b>Data do Atendimento:</b> ${new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
            <div class="info"><b>Horário:</b> ${agendamento.horario.slice(0, 5)}</div>
          </div>

          <div class="two-columns">
            <div class="column">
              <div class="section">
                <div class="section-title">Documentos Obrigatórios</div>
                <div class="warning">
                  Documentos Obrigatórios (apenas originais) legíveis e sem rasura:
                </div>
                <ul class="list">
                  <li>CPF</li>
                  <li>Endereço com CEP válido</li>
                  <li>Número de telefone</li>
                  <li>Certidão conforme o estado civil:
                    <ul>
                      <li>Se Solteiro(a), certidão de nascimento</li>
                      <li>Se casado(a), certidão de casamento</li>
                      <li>Divorciado(a): certidão de casamento com averbação de divórcio</li>
                      <li>Viúvo(a): certidão de casamento com averbação de óbito</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div class="section">
                <div class="section-title">Sobre a Gratuidade</div>
                <ul class="list">
                  <li>1ª via da Carteira de Identidade Nacional (CIN) é gratuita.</li>
                  <li>Para 2ª via, é necessário pagar uma taxa. Consulte o valor do boleto em: 
                    <a href="https://pagamento-cin-ceara.services-valid.com.br/" target="_blank">
                      https://pagamento-cin-ceara.services-valid.com.br/
                    </a>
                  </li>
                  <li>Atenção: a taxa deve ser paga com pelo menos 3 dias de antecedência da data agendada.</li>
                </ul>
              </div>
            </div>

            <div class="column">
              <div class="section">
                <div class="section-title">Documentos Opcionais</div>
                <p style="font-size: 9pt;">Apresente os documentos físicos, originais, legíveis, sem rasuras e sem divergências para inclusão na versão digital da Carteira de Identidade Nacional (CIN):</p>
                <ul class="list">
                  <li>Título de Eleitor</li>
                  <li>Cartão Nacional de Saúde (CNS)</li>
                  <li>Cartão NIS, PIS ou PASEP</li>
                  <li>Carteira Nacional de Habilitação (CNH)</li>
                  <li>Certificado de Reservista</li>
                  <li>Tipo sanguíneo (cartão do HEMOCE ou exame laboratorial)</li>
                  <li>Atestado médico ou documento oficial com CID, CRM e assinatura</li>
                  <li>Nome social (pode ser solicitado e preenchido no momento do atendimento)</li>
                </ul>
              </div>

              <div class="section">
                <div class="section-title">Informações Importantes</div>
                <ul class="list">
                  <li>O agendamento é gratuito, pessoal e intransferível</li>
                  <li>A apresentação da documentação completa é obrigatória</li>
                  <li>Documentos rasurados, danificados ou ilegíveis não serão aceitos</li>
                  <li>O comprovante de agendamento deve ser apresentado impresso ou no celular</li>
                  <li>A tolerância máxima para ativação da senha é de 15 minutos</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Emitido em: ${new Date().toLocaleString('pt-BR')}</p>
            <p>Centro Inclusivo para Atendimento e Desenvolvimento Infantil</p>
          </div>
        </body>
      </html>
    `);
    win!.print();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-2xl" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4 text-emerald-700">Meus Agendamentos</h2>
        {loading ? (
          <p>Carregando...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : agendamentos.length === 0 ? (
          <p>Nenhum agendamento encontrado.</p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {agendamentos.map(a => (
              <div key={a.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-emerald-50">
                <div>
                  <div><b>Data:</b> {a.data} <b>Horário:</b> {a.horario.slice(0, 5)}</div>
                  <div><b>Nome:</b> {a.nome}</div>
                  <div><b>Telefone:</b> {a.telefone}</div>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                  <button
                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    onClick={() => handleCancelar(a.id)}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800"
                    onClick={() => handleImprimir(a)}
                  >
                    Imprimir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {success && <div className="mt-2 text-green-600">{success}</div>}
      </div>
    </div>
  );
}

// Adicionar esta função para verificar horários disponíveis
async function getHorariosDisponiveis(data: Date) {
  try {
    const dataFormatada = formatDate(data);

    // Busca todos os agendamentos para a data (confirmados e bloqueados)
    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("horario, status")
      .eq("data", dataFormatada);

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
      return [];
    }

    // Verificar se é o dia atual
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVerificar = new Date(data);
    dataVerificar.setHours(0, 0, 0, 0);

    // Filtrar horários disponíveis
    const horariosDisponiveis = HORARIOS.filter(h => {
      // Se for hoje, verificar se o horário já passou
      if (dataVerificar.getTime() === hoje.getTime()) {
        const [hora, minuto] = h.split(':');
        const horarioAtual = new Date();
        const horarioAgendamento = new Date();
        horarioAgendamento.setHours(parseInt(hora), parseInt(minuto), 0, 0);

        // Adicionar 15 minutos ao horário atual para criar uma margem
        const horarioLimite = new Date(horarioAtual.getTime() + 15 * 60000);

        if (horarioAgendamento <= horarioLimite) {
          return false;
        }
      }

      // Verificar se existe agendamento para este horário
      const horarioCompleto = h + ':00';
      const agendamentoExistente = agendamentos?.find(a => a.horario === horarioCompleto);

      // Um horário está disponível se:
      // 1. Não existe agendamento OU
      // 2. Não está bloqueado nem confirmado
      return !agendamentoExistente || (agendamentoExistente.status !== 'bloqueado' && agendamentoExistente.status !== 'confirmado');
    });

    console.log("Horários disponíveis:", horariosDisponiveis);
    return horariosDisponiveis;
  } catch (err) {
    console.error("Erro ao buscar horários disponíveis:", err);
    return [];
  }
}

// Adicionar estas funções de feedback
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-emerald-600' :
    type === 'error' ? 'bg-red-600' :
      'bg-blue-600'
    }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Componente principal que só será renderizado no cliente
function AgendamentoContent() {
  const router = useRouter();

  // 1. Todos os estados
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [horario, setHorario] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<{ [key: string]: boolean }>({});

  // 2. Todos os useEffects
  useEffect(() => {
    const today = new Date();
    setCurrentDate(today);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Verificar disponibilidade de horários
  useEffect(() => {
    if (currentDate === null || currentMonth === null || currentYear === null) return;

    const checkAvailability = async () => {
      const availability: { [key: string]: boolean } = {};

      // Começar do dia atual
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // Verificar disponibilidade para os próximos 10 dias úteis
      let daysChecked = 0;
      let currentCheckDate = new Date(startDate);

      while (daysChecked < 10) {
        // Pular fins de semana
        if (currentCheckDate.getDay() !== 0 && currentCheckDate.getDay() !== 6) {
          const formattedDate = formatDate(currentCheckDate);
          try {
            const horarios = await getHorariosDisponiveis(currentCheckDate);
            availability[formattedDate] = horarios.length > 0;
            daysChecked++;
          } catch (err) {
            console.error("Erro ao verificar disponibilidade:", err);
            availability[formattedDate] = false;
          }
        }

        // Avançar para o próximo dia
        currentCheckDate.setDate(currentCheckDate.getDate() + 1);
      }

      setAvailableDays(availability);
    };

    checkAvailability();
  }, [currentDate, currentMonth, currentYear]);

  // Verificar horários disponíveis quando a data é selecionada
  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      getHorariosDisponiveis(selectedDate)
        .then(horarios => {
          console.log("Horários disponíveis:", horarios);
          setHorariosDisponiveis(horarios);
          if (horario && !horarios.includes(horario)) {
            setHorario("");
            showToast("Este horário não está mais disponível. Por favor, selecione outro horário.", 'error');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao buscar horários:", err);
          setError("Erro ao buscar horários disponíveis.");
          setLoading(false);
        });
    } else {
      setHorariosDisponiveis([]);
    }
  }, [selectedDate]);

  // 3. Loading state check
  if (currentDate === null || currentMonth === null || currentYear === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  // 4. Funções auxiliares
  const isDateAllowed = (date: Date) => {
    if (!currentDate) return false;

    // Não permitir datas no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck < today) return false;

    // Não permitir fins de semana
    if (date.getDay() === 0 || date.getDay() === 6) return false;

    // Permitir agendamentos até 10 dias úteis à frente
    const maxDate = new Date(today);
    let daysToAdd = 14; // 2 semanas para garantir 10 dias úteis
    maxDate.setDate(today.getDate() + daysToAdd);
    maxDate.setHours(23, 59, 59, 999);

    return dateToCheck <= maxDate;
  };

  const prevMonth = () => {
    if (!currentDate || !currentMonth || !currentYear) return;
    if (currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear()) return;

    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (!currentDate || !currentMonth || !currentYear) return;

    const currentDay = new Date(currentDate);
    const daysSinceMonday = currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1;
    const thisWeekStart = new Date(currentDay);
    thisWeekStart.setDate(currentDay.getDate() - daysSinceMonday);

    const nextWeekEnd = new Date(thisWeekStart);
    nextWeekEnd.setDate(thisWeekStart.getDate() + 11);

    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    if (nextMonthDate > nextWeekEnd) return;

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const days = getMonthDays(currentYear, currentMonth);
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const weekDays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

  const handleAgendar = async () => {
    setError("");
    setSuccess("");

    // Validações básicas
    if (!user) {
      setError("Você precisa estar autenticado para agendar.");
      return;
    }
    if (!selectedDate || !horario) {
      setError("Selecione a data e o horário.");
      return;
    }
    if (!nome || !email || !cpf || !telefone || !dataNascimento) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    // Verificar se o horário ainda está disponível
    const horariosDisponiveis = await getHorariosDisponiveis(selectedDate);
    if (!horariosDisponiveis.includes(horario)) {
      setError("Este horário não está mais disponível. Por favor, selecione outro horário.");
      return;
    }

    setLoading(true);
    try {
      // Verificar novamente se o horário está disponível antes de inserir
      const { data: verificaHorario, error: verificaError } = await supabase
        .from("agendamentos")
        .select("horario")
        .eq("data", formatDate(selectedDate))
        .eq("horario", horario + ":00");

      if (verificaError) {
        throw verificaError;
      }

      if (verificaHorario && verificaHorario.length > 0) {
        setError("Este horário não está mais disponível. Por favor, selecione outro horário.");
        setLoading(false);
        return;
      }

      const { error: insertError, data: newAgendamento } = await supabase.from("agendamentos").insert({
        user_id: user.id,
        nome,
        email,
        cpf: cpf.replace(/\D/g, ''),
        telefone: telefone.replace(/\D/g, ''),
        data_nascimento: dataNascimento,
        data: formatDate(selectedDate),
        horario: horario + ":00",
        status: 'confirmado'
      }).select().single();

      if (insertError) {
        console.error("Erro ao agendar:", insertError);
        setError("Erro ao agendar: " + insertError.message);
        showToast("Erro ao realizar agendamento", 'error');
      } else {
        setSuccess("Agendamento realizado com sucesso!");
        showToast("Agendamento realizado com sucesso!", 'success');

        // Enviar email de confirmação
        try {
          await sendEmailConfirmation(newAgendamento);
          console.log("Email de confirmação enviado com sucesso");
        } catch (emailError) {
          console.error("Erro ao enviar email de confirmação:", emailError);
        }

        // Atualiza a lista de agendamentos
        if (modalOpen) {
          const { data: agendamentos } = await supabase
            .from("agendamentos")
            .select("*")
            .eq("user_id", user.id)
            .order("data", { ascending: true })
            .order("horario", { ascending: true });
          setAgendamentos(agendamentos || []);
        }

        // Limpa os campos
        setSelectedDate(null);
        setHorario("");
        setNome("");
        setEmail("");
        setCpf("");
        setTelefone("");
        setDataNascimento("");
      }
    } catch (err) {
      console.error("Erro ao agendar:", err);
      setError("Erro ao agendar. Por favor, tente novamente.");
      showToast("Erro ao realizar agendamento", 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Render
  return (
    <Fragment>
      <Header onOpenAgendamentos={() => setModalOpen(true)} />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
        {/* Page Title */}
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-6 animate-slide-up">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-12 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Agendar Atendimento
            </h1>
          </div>
          <p className="text-gray-600 ml-6 text-sm md:text-base">Escolha a melhor data e horário para seu atendimento na Sala Sensorial</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto px-4 pb-10">
          {/* Calendário */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-6 w-full md:w-[380px] hover:shadow-2xl transition-shadow duration-300">
            <div className="mb-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Selecione uma data</h2>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex items-start bg-orange-100 p-4 rounded">
                    <div className="flex-shrink-0">
                      <FiInfo className="h-5 w-5 text-orange-700" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-orange-700">
                        O agendamento de emissão de documentos na sala sensorial / ALECE é exclusivo para pessoas autistas, com
                        síndrome de Down e TDAH.
                      </p>
                    </div>
                  </div>

                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={prevMonth}
                  className={`rounded-full p-1 border ${currentMonth === currentDate?.getMonth() && currentYear === currentDate?.getFullYear() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-50'}`}
                  disabled={currentMonth === currentDate?.getMonth() && currentYear === currentDate?.getFullYear()}
                  aria-label="Mês anterior"
                >
                  <span className="text-2xl text-emerald-700">&#8592;</span>
                </button>
                <span className="font-bold text-gray-700">{new Date(currentYear, currentMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</span>
                <button
                  onClick={nextMonth}
                  className="rounded-full p-1 border hover:bg-emerald-50"
                  aria-label="Próximo mês"
                >
                  <span className="text-2xl text-emerald-700">&#8594;</span>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((wd) => (
                  <div key={wd} className="text-xs text-center text-gray-400 font-semibold">{wd}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(firstDayOfWeek).fill(null).map((_, i) => (
                  <div key={i}></div>
                ))}
                {days.map((date) => {
                  const today = new Date();
                  const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                  const isAfter4PM = isToday && today.getHours() >= 16;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isDisabled = isPast || isWeekend || isAfter4PM || !isDateAllowed(date);
                  const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);
                  const hasAvailableTimes = !isDisabled && availableDays[formatDate(date)];

                  return (
                    <button
                      key={date.toISOString()}
                      className={`w-10 h-10 rounded flex items-center justify-center font-semibold transition-all relative
                        ${isDisabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed' :
                          isSelected ? 'bg-orange-500 text-white' :
                            hasAvailableTimes ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-200 text-gray-500'}
                      `}
                      disabled={isDisabled || !hasAvailableTimes}
                      onClick={() => setSelectedDate(date)}
                      title={isDisabled ? (isAfter4PM ? "Horário de agendamento encerrado para hoje" : "Data indisponível") : hasAvailableTimes ? "Clique para ver horários disponíveis" : "Sem horários disponíveis"}
                    >
                      {date.getDate()}
                      {hasAvailableTimes && !isDisabled && (
                        <span className="absolute bottom-1 w-2 h-2 rounded-full bg-white opacity-75"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Horários */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-8 hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-start space-x-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Agendamento para emissão da CIN</h2>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700"><span className="font-semibold">Local:</span> {ENDERECO}</p>
                  <p className="text-xs text-gray-600"><span className="font-semibold">Endereço:</span> {ENDERECO_COMPLETO}</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-emerald-700 mb-2">
                Horários disponíveis
                {selectedDate && (
                  <span className="ml-2 text-sm text-gray-500">
                    em {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                )}
              </h3>
              {!selectedDate ? (
                <p className="text-gray-500">Selecione uma data no calendário</p>
              ) : loading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
                </div>
              ) : horariosDisponiveis.length === 0 ? (
                <p className="text-gray-500">Não há horários disponíveis para este dia</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HORARIOS.map(h => {
                    const isDisponivel = horariosDisponiveis.includes(h);
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`text-lg px-4 py-2 rounded-lg font-semibold border transition-all
                          ${!isDisponivel
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : horario === h
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          }`}
                        onClick={() => isDisponivel && setHorario(h)}
                        disabled={!isDisponivel}
                        title={!isDisponivel ? "Horário indisponível" : "Clique para selecionar"}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {error && <div className="mb-2 text-red-600">{error}</div>}
            {success && <div className="mb-2 text-green-600">{success}</div>}
            {user && selectedDate && horario && horariosDisponiveis.includes(horario) && (
              <form
                className="space-y-4 mt-8"
                onSubmit={e => { e.preventDefault(); handleAgendar(); }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">
                      Nome completo
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="input border rounded px-3 py-2 w-full"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      maxLength={100}
                      required
                      placeholder="Digite seu nome completo"
                    />
                    <div className="text-xs text-gray-500 text-right">{nome.length}/100</div>
                    <div className="absolute right-2 top-8 text-gray-400" title="Nome completo é obrigatório">
                      <FiInfo />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">
                      E-mail
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="email"
                      className="input border rounded px-3 py-2 w-full"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                    />
                    <div className="absolute right-2 top-8 text-gray-400" title="E-mail é obrigatório">
                      <FiInfo />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">
                      CPF
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="input border rounded px-3 py-2 w-full"
                      value={cpf}
                      onChange={e => setCpf(formatCPF(e.target.value))}
                      maxLength={14}
                      required
                      placeholder="000.000.000-00"
                    />
                    <div className="absolute right-2 top-8 text-gray-400" title="CPF é obrigatório e deve ser válido">
                      <FiInfo />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">
                      Telefone
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="tel"
                      className="input border rounded px-3 py-2 w-full"
                      value={telefone}
                      onChange={e => setTelefone(formatPhone(e.target.value))}
                      maxLength={15}
                      required
                      placeholder="(00) 00000-0000"
                    />
                    <div className="absolute right-2 top-8 text-gray-400" title="Telefone é obrigatório">
                      <FiInfo />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">
                      Data de nascimento
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      className="input border rounded px-3 py-2 w-full"
                      value={dataNascimento}
                      onChange={e => setDataNascimento(e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <div className="absolute right-2 top-8 text-gray-400" title="Data de nascimento é obrigatória">
                      <FiInfo />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="group w-full mt-4 py-4 px-4 text-lg bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 text-white rounded-2xl hover:from-emerald-700 hover:via-emerald-800 hover:to-teal-700 font-bold disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:hover:scale-100 relative overflow-hidden"
                  disabled={loading}
                >
                  {!loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Agendando...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Confirmar Agendamento
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}
            {!user && (
              <div className="mt-8 text-center">
                <p className="mb-2 text-gray-700">Você precisa estar autenticado para agendar.</p>
                <button
                  className="py-2 px-4 bg-emerald-600 text-white rounded hover:bg-emerald-700 font-bold"
                  onClick={() => router.push("/")}
                >
                  Fazer Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <AgendamentosModal open={modalOpen} onClose={() => setModalOpen(false)} user={user} />
      <DocumentosInfo />
    </Fragment>
  );
}

// Componente wrapper que evita problemas de hidratação
export default function AgendamentoPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  return <AgendamentoContent />;
}