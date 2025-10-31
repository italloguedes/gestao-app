-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON public.atendimento_observacoes_historico;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON public.atendimento_observacoes_historico;

-- Desabilitar RLS temporariamente para permitir acesso via Service Role
-- A API já tem autenticação e autorização via checkAuth()
ALTER TABLE public.atendimento_observacoes_historico DISABLE ROW LEVEL SECURITY;
