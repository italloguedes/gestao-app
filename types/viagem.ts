export type ViagemStatus = 'planejada' | 'em_andamento' | 'concluida' | 'cancelada';

export type EquipeSet = 'Equipe 1' | 'Equipe 2' | 'Equipe de Apoio' | 'Outros';

export interface ViagemServidor {
  id?: string;
  viagem_id?: string;
  user_id?: string | null;
  nome: string;
  cpf?: string | null;
  matricula?: string | null;
  funcao_na_viagem?: string | null;
  equipe_set: EquipeSet | string;
  created_at?: string;
}

export interface ViagemChecklist {
  id?: string;
  viagem_id?: string;
  item: string;
  concluido: boolean;
  ordem?: number;
  created_at?: string;
}

export interface Viagem {
  id: string;
  titulo: string;
  municipio: string;
  local_evento?: string | null;
  data_ida: string;
  data_retorno: string;
  dias_acao: number;
  status: ViagemStatus;
  setor?: string | null;
  responsavel_nome?: string | null;
  objetivo?: string | null;
  meta_atendimentos?: number;
  orcamento_estimado?: number;
  transporte_info?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Relacionamentos inclusos nas buscas detalhadas
  servidores?: ViagemServidor[];
  checklist?: ViagemChecklist[];
}

export interface ViagemFormData {
  titulo: string;
  municipio: string;
  local_evento: string;
  data_ida: string;
  data_retorno: string;
  dias_acao: number;
  status: ViagemStatus;
  setor: string;
  responsavel_nome: string;
  objetivo: string;
  meta_atendimentos: number;
  orcamento_estimado: number;
  transporte_info: string;
}

export interface ViagemStats {
  total: number;
  planejadas: number;
  emAndamento: number;
  concluidas: number;
  canceladas: number;
  totalServidores: number;
  totalAtendimentosMeta: number;
}
