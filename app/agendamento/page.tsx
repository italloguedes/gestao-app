"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import DocumentosInfo from '@/components/DocumentosInfo';
import { FiInfo, FiX, FiPrinter, FiTrash2 } from "react-icons/fi";
import { sendEmailConfirmation } from '@/lib/emailService';
import Header from './Header';

const UNIDADE = "Sala Sensorial ALECE";
const ENDERECO = "Prédio da Assembleia Legislativa Anexo III, Sala Sensorial";
const ENDERECO_COMPLETO = "Av. Pontes Vieira, 2300 - São João do Tauape, Fortaleza - CE, 60135-238";

const showToast = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
        console.log(`✅ ${message}`);
    } else {
        console.error(`❌ ${message}`);
    }
    // Fallback to alert for now since no toast library is found
    // alert(message); 
};

interface User {
    id: string;
    email?: string;
    user_metadata?: {
        full_name?: string;
        [key: string]: any;
    };
}

interface Agendamento {
    id: number;
    data: string;
    horario: string;
    status: string;
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
    data_nascimento: string;
    created_at: string;
    user_id: string;
}

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

function AgendamentosModal({ open, onClose, user }: { open: boolean, onClose: () => void, user: User | null }) {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
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

    const handleImprimir = (agendamento: Agendamento) => {
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
                </ul>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Agendamento realizado em ${new Date().toLocaleString('pt-BR')}</p>
            <button class="no-print" onclick="window.print()" style="padding: 10px 20px; background-color: #047857; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimir</button>
          </div>
        </body>
      </html>
    `);
        win!.document.close();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-2xl font-bold text-gray-800">Meus Agendamentos</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <FiX className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-red-600 bg-red-50 rounded-xl border border-red-100">
                            <p className="font-medium">{error}</p>
                        </div>
                    ) : agendamentos.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500 text-lg">Nenhum agendamento encontrado.</p>
                            <p className="text-sm text-gray-400 mt-2">Seus agendamentos futuros aparecerão aqui.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {agendamentos.map((agendamento) => (
                                <div key={agendamento.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full">
                                                Confirmado
                                            </span>
                                            <span className="text-sm text-gray-400">#{agendamento.id}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </h3>
                                        <p className="text-gray-600 flex items-center gap-2">
                                            <span className="font-medium text-emerald-700">{agendamento.horario.slice(0, 5)}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>{agendamento.nome}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => handleImprimir(agendamento)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition-colors"
                                            title="Imprimir Comprovante"
                                        >
                                            <FiPrinter className="h-4 w-4" />
                                            <span className="md:hidden">Imprimir</span>
                                        </button>
                                        <button
                                            onClick={() => handleCancelar(agendamento.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors"
                                            title="Cancelar Agendamento"
                                        >
                                            <FiTrash2 className="h-4 w-4" />
                                            <span className="md:hidden">Cancelar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

async function getHorariosDisponiveis(date: Date) {
    const dateStr = formatDate(date);
    const { data, error } = await supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', dateStr)
        .eq('status', 'confirmado');

    if (error) throw error;

    const agendados = data.map((a: { horario: string }) => a.horario.slice(0, 5));

    // Horários fixos
    const manhaSlots = ["08:00", "08:40", "09:20", "10:00", "10:40", "11:20"];
    const tardeSlots = ["13:00", "13:40", "14:20", "15:00", "15:40", "16:20"];

    return {
        manha: manhaSlots.filter(h => !agendados.includes(h)),
        tarde: tardeSlots.filter(h => !agendados.includes(h))
    };
}

function AgendamentoContent() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
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
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
    const [horariosDisponiveis, setHorariosDisponiveis] = useState<{ manha: string[], tarde: string[] }>({ manha: [], tarde: [] });
    const [availableDays, setAvailableDays] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const today = new Date();
        setCurrentDate(today);
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    useEffect(() => {
        if (currentDate === null || currentMonth === null || currentYear === null) return;

        const checkAvailability = async () => {
            const availability: { [key: string]: boolean } = {};
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            let daysChecked = 0;
            let currentCheckDate = new Date(startDate);

            // Limit check to avoid infinite loops if something goes wrong
            while (daysChecked < 30) {
                if (currentCheckDate.getDay() !== 0 && currentCheckDate.getDay() !== 6) {
                    const formattedDate = formatDate(currentCheckDate);
                    try {
                        const slots = await getHorariosDisponiveis(currentCheckDate);
                        availability[formattedDate] = slots.manha.length > 0 || slots.tarde.length > 0;
                    } catch (err) {
                        console.error("Erro ao verificar disponibilidade:", err);
                        availability[formattedDate] = false;
                    }
                }
                currentCheckDate.setDate(currentCheckDate.getDate() + 1);
                daysChecked++;
            }
            setAvailableDays(availability);
        };
        checkAvailability();
    }, [currentDate, currentMonth, currentYear]);

    useEffect(() => {
        if (selectedDate) {
            setLoading(true);
            getHorariosDisponiveis(selectedDate)
                .then(slots => {
                    setHorariosDisponiveis(slots);
                    const allSlots = [...slots.manha, ...slots.tarde];
                    if (horario && !allSlots.includes(horario)) {
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
            setHorariosDisponiveis({ manha: [], tarde: [] });
        }
    }, [selectedDate]);

    if (currentDate === null || currentMonth === null || currentYear === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
            </div>
        );
    }

    const isDateAllowed = (date: Date) => {
        if (!currentDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateToCheck = new Date(date);
        dateToCheck.setHours(0, 0, 0, 0);

        if (dateToCheck < today) return false;
        if (date.getDay() === 0 || date.getDay() === 6) return false;

        const maxDate = new Date(today);
        let daysToAdd = 21;
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
        const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 21);

        if (nextMonthDate > maxDate) return;

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

        setLoading(true);

        try {
            const slots = await getHorariosDisponiveis(selectedDate);
            const allSlots = [...slots.manha, ...slots.tarde];
            if (!allSlots.includes(horario)) {
                setError("Este horário não está mais disponível. Por favor, selecione outro horário.");
                setLoading(false);
                return;
            }

            const { data: verificaHorario, error: verificaError } = await supabase
                .from("agendamentos")
                .select("horario")
                .eq("data", formatDate(selectedDate))
                .eq("horario", horario + ":00");

            if (verificaError) throw verificaError;

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
                try {
                    await sendEmailConfirmation(newAgendamento);
                } catch (emailError) {
                    console.error("Erro ao enviar email de confirmação:", emailError);
                }
                if (modalOpen) {
                    const { data: agendamentos } = await supabase
                        .from("agendamentos")
                        .select("*")
                        .eq("user_id", user.id)
                        .order("data", { ascending: true })
                        .order("horario", { ascending: true });
                    setAgendamentos(agendamentos || []);
                }
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

                            <div className="flex justify-between items-center mb-4">
                                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Mês anterior">
                                    <span className="text-2xl text-emerald-700">&#8592;</span>
                                </button>
                                <h3 className="text-lg font-bold text-gray-800 capitalize">
                                    {currentDate && currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                                </h3>
                                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Próximo mês">
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
                                {days.map((date, index) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const dateObj = new Date(date);
                                    dateObj.setHours(0, 0, 0, 0);

                                    const isPast = dateObj < today;
                                    const isToday = dateObj.getTime() === today.getTime();
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                    // Disable if past or weekend
                                    const isDisabled = isPast || isWeekend;
                                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

                                    return (
                                        <button
                                            key={index}
                                            onClick={() => !isDisabled && setSelectedDate(date)}
                                            disabled={isDisabled}
                                            className={`
                                                h-10 w-full rounded-lg flex items-center justify-center text-sm font-medium transition-all
                                                ${isSelected ? 'bg-emerald-600 text-white shadow-md' : ''}
                                                ${!isSelected && !isDisabled ? 'hover:bg-emerald-50 text-gray-700 hover:text-emerald-700' : ''}
                                                ${isDisabled ? 'text-gray-300 cursor-not-allowed' : ''}
                                                ${isToday && !isSelected ? 'border border-emerald-500 text-emerald-700' : ''}
                                            `}
                                        >
                                            {date.getDate()}
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
                            ) : (horariosDisponiveis.manha.length === 0 && horariosDisponiveis.tarde.length === 0) ? (
                                <p className="text-gray-500">Não há horários disponíveis para este dia</p>
                            ) : (
                                <div className="space-y-6">
                                    {/* Manhã */}
                                    {horariosDisponiveis.manha.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <FiInfo className="h-4 w-4" />
                                                Manhã
                                            </h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {horariosDisponiveis.manha.map((h) => (
                                                    <button
                                                        key={h}
                                                        type="button"
                                                        onClick={() => setHorario(h)}
                                                        className={`text-sm px-4 py-2 rounded-lg font-semibold border transition-all
                                                            ${horario === h
                                                                ? "bg-emerald-700 text-white border-emerald-700"
                                                                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                                            } `}
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tarde */}
                                    {horariosDisponiveis.tarde.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <FiInfo className="h-4 w-4" />
                                                Tarde
                                            </h4>
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                                {horariosDisponiveis.tarde.map((h) => (
                                                    <button
                                                        key={h}
                                                        type="button"
                                                        onClick={() => setHorario(h)}
                                                        className={`text-sm px-4 py-2 rounded-lg font-semibold border transition-all
                                                            ${horario === h
                                                                ? "bg-emerald-700 text-white border-emerald-700"
                                                                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                                            } `}
                                                    >
                                                        {h}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {error && <div className="mb-2 text-red-600">{error}</div>}
                            {success && <div className="mb-2 text-green-600">{success}</div>}

                            {user && selectedDate && horario && (horariosDisponiveis.manha.includes(horario) || horariosDisponiveis.tarde.includes(horario)) && (
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
                                                required
                                                placeholder="Digite seu nome completo"
                                            />
                                            <div className="absolute right-2 top-8 text-gray-400" title="Nome é obrigatório">
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
                                                onChange={e => {
                                                    const formatted = formatCPF(e.target.value);
                                                    setCpf(formatted);
                                                }}
                                                required
                                                placeholder="000.000.000-00"
                                            />
                                            <div className="absolute right-2 top-8 text-gray-400" title="CPF é obrigatório">
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
                                                onChange={e => {
                                                    const formatted = formatPhone(e.target.value);
                                                    setTelefone(formatted);
                                                }}
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
                </div >
                <AgendamentosModal open={modalOpen} onClose={() => setModalOpen(false)} user={user} />
                <DocumentosInfo />
            </div >
        </Fragment >
    );
}

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