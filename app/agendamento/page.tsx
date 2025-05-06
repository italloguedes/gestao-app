"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "./Header";
import DocumentosInfo from '@/components/DocumentosInfo';
import { FiInfo } from "react-icons/fi";
import { sendEmailConfirmation } from '@/lib/emailService';

const UNIDADE = "Sala Sensorial ALECE";
const ENDERECO = "Prédio da Assembleia Legislativa Anexo III, Sala Sensorial";
const ENDERECO_COMPLETO = "Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238";
const HORARIOS = [
  "08:00", "09:00", "10:00", "11:00", // manhã
  "13:00", "14:00", "15:00", "16:00", // tarde
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
  return date.toISOString().split("T")[0];
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
            <div class="info"><b>Horário:</b> ${agendamento.horario.slice(0,5)}</div>
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
                  <div><b>Data:</b> {a.data} <b>Horário:</b> {a.horario.slice(0,5)}</div>
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
    const { data: agendamentos, error } = await supabase
      .from("agendamentos")
      .select("horario")
      .eq("data", formatDate(data));

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
      return [];
    }

    // Normalizar os horários para o formato HH:mm
    const horariosOcupados = agendamentos?.map(a => {
      const [hora, minuto] = a.horario.split(':');
      return `${hora}:${minuto}`;
    }) || [];

    // Verificar se é o dia atual
    const hoje = new Date();
    const isHoje = data.getDate() === hoje.getDate() && 
                  data.getMonth() === hoje.getMonth() && 
                  data.getFullYear() === hoje.getFullYear();

    // Filtrar horários que já passaram no dia atual
    const horariosFiltrados = HORARIOS.filter(h => {
      if (!isHoje) return true; // Se não for hoje, retorna todos os horários
      
      const [hora, minuto] = h.split(':');
      const horarioAtual = new Date();
      const horarioAgendamento = new Date();
      horarioAgendamento.setHours(parseInt(hora), parseInt(minuto), 0, 0);
      
      return horarioAgendamento > horarioAtual;
    });

    console.log("Horários ocupados:", horariosOcupados);
    return horariosFiltrados.filter(h => !horariosOcupados.includes(h));
  } catch (err) {
    console.error("Erro ao buscar horários disponíveis:", err);
    return [];
  }
}

// Adicionar estas funções de feedback
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white ${
    type === 'success' ? 'bg-emerald-600' :
    type === 'error' ? 'bg-red-600' :
    'bg-blue-600'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export default function AgendamentoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      getHorariosDisponiveis(selectedDate)
        .then(horarios => {
          console.log("Horários disponíveis:", horarios); // Log para debug
          setHorariosDisponiveis(horarios);
          // Se o horário selecionado não estiver mais disponível, limpa a seleção
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
        .eq("horario", horario + ":00"); // Adicionar segundos para comparação

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
        horario: horario + ":00", // Adicionar segundos ao salvar
        status: 'confirmado' // Definindo como confirmado por padrão
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

  // Navegação do calendário
  const prevMonth = () => {
    if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const nextMonth = () => {
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

  return (
    <Fragment>
      <Header onOpenAgendamentos={() => setModalOpen(true)} />
      <div className="pt-20"> {/* Espaço para o header fixo */}
        <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto py-10 px-4">
          {/* Calendário */}
          <div className="bg-white rounded-lg shadow p-6 w-full md:w-[380px]">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-emerald-700 mb-2">Selecione uma data</h2>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiInfo className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                    O agendamento de emissão de documentos na sala sensorial / ALECE é exclusiva para pessoas autistas, com
                    síndrome de Down e TDAH.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={prevMonth}
                  className={`rounded-full p-1 border ${currentMonth === today.getMonth() && currentYear === today.getFullYear() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-50'}`}
                  disabled={currentMonth === today.getMonth() && currentYear === today.getFullYear()}
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
                  const isDisabled = isPast || isWeekend || isAfter4PM;
                  const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);
                  
                  // Verificar se há horários disponíveis para este dia
                  const [hasAvailableTimes, setHasAvailableTimes] = useState(false);
                  useEffect(() => {
                    if (!isDisabled) {
                      getHorariosDisponiveis(date)
                        .then(horarios => setHasAvailableTimes(horarios.length > 0))
                        .catch(() => setHasAvailableTimes(false));
                    }
                  }, [date, isDisabled]);

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
          <div className="flex-1 bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-emerald-700 mb-2">Agendamento para emissão da CIN</h2>
            <p className="text-lg text-gray-700 mb-1">Local: <span className="font-semibold text-emerald-700">{ENDERECO}</span></p>
            <p className="text-sm text-gray-600 mb-1">Endereço: <span className="text-emerald-700">{ENDERECO_COMPLETO}</span></p>
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
                  className="w-full mt-4 py-3 px-4 text-lg bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold disabled:opacity-50 shadow-md"
                  disabled={loading}
                >
                  {loading ? "Agendando..." : "Confirmar Agendamento"}
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

