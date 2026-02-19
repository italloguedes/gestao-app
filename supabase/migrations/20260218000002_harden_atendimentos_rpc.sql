-- Harden RPC access related to atendimentos.
-- Goal: block anonymous execution of SECURITY DEFINER functions.

REVOKE EXECUTE ON FUNCTION public.get_atendimentos_stats(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_proximo_atendimento_digitais(uuid, varchar) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_atendimentos_stats(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_proximo_atendimento_digitais(uuid, varchar) TO authenticated, service_role;
