-- Migration: 20260122000000_enable_rls_security
-- Description: Enables RLS on all main tables and adds basic security policies.

-- ==========================================
-- 1. Helper Functions (To avoid infinite recursion)
-- ==========================================
-- Function to check if current user is admin/superadmin (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid()::text 
    AND role IN ('admin', 'superadmin')
  );
$$;

-- Function to check if current user is atendente (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_atendente()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid()::text 
    AND role = 'atendente'
  );
$$;

-- ==========================================
-- 2. Tabela USERS
-- ==========================================
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin and Admin can do everything
DROP POLICY IF EXISTS "Admins can do everything on users" ON "public"."users";
CREATE POLICY "Admins can do everything on users" 
ON "public"."users"
USING (public.is_admin_or_superadmin());

-- Policy: Users can read their own data
DROP POLICY IF EXISTS "Users can read own data" ON "public"."users";
CREATE POLICY "Users can read own data" 
ON "public"."users"
FOR SELECT 
USING (auth.uid()::text = auth_id);

-- Policy: Atendentes can read all users
DROP POLICY IF EXISTS "Atendentes can read all users" ON "public"."users";
CREATE POLICY "Atendentes can read all users" 
ON "public"."users"
FOR SELECT 
USING (public.is_atendente());


-- ==========================================
-- 2. Tabela ATENDIMENTOS
-- ==========================================
ALTER TABLE "public"."atendimentos" ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all (Dashboard view)
DROP POLICY IF EXISTS "Authenticated users can read atendimentos" ON "public"."atendimentos";
CREATE POLICY "Authenticated users can read atendimentos" 
ON "public"."atendimentos"
FOR SELECT 
TO authenticated
USING (true);

-- Policy: Atendentes/Admins can insert/update
DROP POLICY IF EXISTS "Authenticated users can insert/update atendimentos" ON "public"."atendimentos";
CREATE POLICY "Authenticated users can insert/update atendimentos" 
ON "public"."atendimentos"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ==========================================
-- 3. Tabela AGENDAMENTOS
-- ==========================================
ALTER TABLE "public"."agendamentos" ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read to check availability (e.g. for scheduling flow)
DROP POLICY IF EXISTS "Public can read agendamentos" ON "public"."agendamentos";
CREATE POLICY "Public can read agendamentos" 
ON "public"."agendamentos"
FOR SELECT 
USING (true);

-- Policy: Authenticated can Insert/Update
DROP POLICY IF EXISTS "Authenticated can manage agendamentos" ON "public"."agendamentos";
CREATE POLICY "Authenticated can manage agendamentos" 
ON "public"."agendamentos"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ==========================================
-- 4. Tabela ATENDIMENTO_OBSERVACOES_HISTORICO
-- ==========================================
ALTER TABLE "public"."atendimento_observacoes_historico" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage observacoes" ON "public"."atendimento_observacoes_historico";
CREATE POLICY "Authenticated can manage observacoes" 
ON "public"."atendimento_observacoes_historico"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
