import { supabase } from '@/lib/supabase-client';
import { Viagem, ViagemFormData, ViagemServidor, ViagemChecklist, ViagemStatus, ViagemStats } from '@/types/viagem';

export async function fetchViagens(filters?: {
  status?: string;
  municipio?: string;
  search?: string;
}): Promise<Viagem[]> {
  let query = supabase
    .from('viagens')
    .select(`
      *,
      servidores:viagem_servidores(*),
      checklist:viagem_checklist(*)
    `)
    .order('data_ida', { ascending: false });

  if (filters?.status && filters.status !== 'todas') {
    query = query.eq('status', filters.status);
  }

  if (filters?.municipio) {
    query = query.ilike('municipio', `%${filters.municipio}%`);
  }

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`titulo.ilike.${term},municipio.ilike.${term},responsavel_nome.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar viagens:', error);
    throw error;
  }

  return (data || []) as Viagem[];
}

export async function fetchViagemById(id: string): Promise<Viagem | null> {
  const { data, error } = await supabase
    .from('viagens')
    .select(`
      *,
      servidores:viagem_servidores(*),
      checklist:viagem_checklist(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Erro ao buscar viagem com ID ${id}:`, error);
    return null;
  }

  // Ordenar o checklist por ordem
  if (data?.checklist) {
    data.checklist.sort((a: ViagemChecklist, b: ViagemChecklist) => (a.ordem || 0) - (b.ordem || 0));
  }

  return data as Viagem;
}

export async function createViagem(
  formData: ViagemFormData,
  servidores: ViagemServidor[],
  checklistItems: string[]
): Promise<Viagem> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;

  // 1. Inserir a viagem
  const { data: viagem, error: viagemError } = await supabase
    .from('viagens')
    .insert({
      ...formData,
      created_by: userId
    })
    .select()
    .single();

  if (viagemError || !viagem) {
    console.error('Erro ao criar viagem:', viagemError);
    throw viagemError || new Error('Falha ao criar registro de viagem');
  }

  const viagemId = viagem.id;

  // 2. Inserir servidores se houver
  if (servidores.length > 0) {
    const servidoresToInsert = servidores.map(s => ({
      viagem_id: viagemId,
      user_id: s.user_id || null,
      nome: s.nome,
      cpf: s.cpf || null,
      matricula: s.matricula || null,
      funcao_na_viagem: s.funcao_na_viagem || null,
      equipe_set: s.equipe_set || 'Equipe 1'
    }));

    const { error: servError } = await supabase
      .from('viagem_servidores')
      .insert(servidoresToInsert);

    if (servError) {
      console.error('Erro ao cadastrar servidores da viagem:', servError);
    }
  }

  // 3. Inserir itens de checklist
  if (checklistItems.length > 0) {
    const checklistToInsert = checklistItems.map((item, index) => ({
      viagem_id: viagemId,
      item,
      concluido: false,
      ordem: index + 1
    }));

    const { error: checkError } = await supabase
      .from('viagem_checklist')
      .insert(checklistToInsert);

    if (checkError) {
      console.error('Erro ao cadastrar checklist da viagem:', checkError);
    }
  }

  return fetchViagemById(viagemId) as Promise<Viagem>;
}

export async function updateViagem(
  id: string,
  formData: ViagemFormData,
  servidores: ViagemServidor[],
  checklist: ViagemChecklist[]
): Promise<Viagem> {
  // 1. Atualizar dados principais
  const { error: updateError } = await supabase
    .from('viagens')
    .update(formData)
    .eq('id', id);

  if (updateError) {
    console.error(`Erro ao atualizar viagem ${id}:`, updateError);
    throw updateError;
  }

  // 2. Remover servidores existentes e recadastrar atualizados
  await supabase.from('viagem_servidores').delete().eq('viagem_id', id);

  if (servidores.length > 0) {
    const servidoresToInsert = servidores.map(s => ({
      viagem_id: id,
      user_id: s.user_id || null,
      nome: s.nome,
      cpf: s.cpf || null,
      matricula: s.matricula || null,
      funcao_na_viagem: s.funcao_na_viagem || null,
      equipe_set: s.equipe_set || 'Equipe 1'
    }));
    await supabase.from('viagem_servidores').insert(servidoresToInsert);
  }

  // 3. Remover checklist existente e recadastrar
  await supabase.from('viagem_checklist').delete().eq('viagem_id', id);

  if (checklist.length > 0) {
    const checklistToInsert = checklist.map((c, idx) => ({
      viagem_id: id,
      item: c.item,
      concluido: c.concluido,
      ordem: idx + 1
    }));
    await supabase.from('viagem_checklist').insert(checklistToInsert);
  }

  return fetchViagemById(id) as Promise<Viagem>;
}

export async function updateViagemStatus(id: string, status: ViagemStatus): Promise<void> {
  const { error } = await supabase
    .from('viagens')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error(`Erro ao atualizar status da viagem ${id}:`, error);
    throw error;
  }
}

export async function deleteViagem(id: string): Promise<void> {
  const { error } = await supabase
    .from('viagens')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Erro ao excluir viagem ${id}:`, error);
    throw error;
  }
}

export async function toggleChecklistItem(checklistId: string, concluido: boolean): Promise<void> {
  const { error } = await supabase
    .from('viagem_checklist')
    .update({ concluido })
    .eq('id', checklistId);

  if (error) {
    console.error(`Erro ao alterar item de checklist ${checklistId}:`, error);
    throw error;
  }
}

export function calculateViagemStats(viagens: Viagem[]): ViagemStats {
  const stats: ViagemStats = {
    total: viagens.length,
    planejadas: 0,
    emAndamento: 0,
    concluidas: 0,
    canceladas: 0,
    totalServidores: 0,
    totalAtendimentosMeta: 0
  };

  viagens.forEach(v => {
    if (v.status === 'planejada') stats.planejadas++;
    else if (v.status === 'em_andamento') stats.emAndamento++;
    else if (v.status === 'concluida') stats.concluidas++;
    else if (v.status === 'cancelada') stats.canceladas++;

    stats.totalAtendimentosMeta += (v.meta_atendimentos || 0);
    if (v.servidores) {
      stats.totalServidores += v.servidores.length;
    }
  });

  return stats;
}
