-- Migration script: create_viagens_tables.sql
-- Tabela principal de Gestão de Viagens (Ações Itinerantes)

CREATE TABLE IF NOT EXISTS public.viagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    municipio VARCHAR(255) NOT NULL,
    local_evento TEXT,
    data_ida TIMESTAMPTZ NOT NULL,
    data_retorno TIMESTAMPTZ NOT NULL,
    dias_acao INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'planejada', -- 'planejada', 'em_andamento', 'concluida', 'cancelada'
    setor VARCHAR(100) DEFAULT 'DIRETORIA GERAL',
    responsavel_nome VARCHAR(255),
    objetivo TEXT,
    meta_atendimentos INTEGER DEFAULT 0,
    orcamento_estimado NUMERIC(10, 2) DEFAULT 0.00,
    transporte_info TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Servidores Alocados por Conjunto (Equipe 1, Equipe 2, Apoio, etc.)
CREATE TABLE IF NOT EXISTS public.viagem_servidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    matricula VARCHAR(50),
    funcao_na_viagem VARCHAR(100),
    equipe_set VARCHAR(50) NOT NULL DEFAULT 'Equipe 1', -- 'Equipe 1', 'Equipe 2', 'Equipe de Apoio', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Checklist Logístico Pré-Viagem
CREATE TABLE IF NOT EXISTS public.viagem_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    concluido BOOLEAN DEFAULT FALSE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_viagens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_viagens_updated_at ON public.viagens;
CREATE TRIGGER trg_viagens_updated_at
    BEFORE UPDATE ON public.viagens
    FOR EACH ROW
    EXECUTE FUNCTION update_viagens_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_servidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_checklist ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para viagens
CREATE POLICY "Permitir leitura de viagens para usuarios autenticados" 
    ON public.viagens FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir insercao de viagens para usuarios autenticados" 
    ON public.viagens FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de viagens para usuarios autenticados" 
    ON public.viagens FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir exclusao de viagens para usuarios autenticados" 
    ON public.viagens FOR DELETE 
    TO authenticated 
    USING (true);

-- Políticas para viagem_servidores
CREATE POLICY "Permitir leitura de viagem_servidores" 
    ON public.viagem_servidores FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir insercao de viagem_servidores" 
    ON public.viagem_servidores FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de viagem_servidores" 
    ON public.viagem_servidores FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir exclusao de viagem_servidores" 
    ON public.viagem_servidores FOR DELETE 
    TO authenticated 
    USING (true);

-- Políticas para viagem_checklist
CREATE POLICY "Permitir leitura de viagem_checklist" 
    ON public.viagem_checklist FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir insercao de viagem_checklist" 
    ON public.viagem_checklist FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de viagem_checklist" 
    ON public.viagem_checklist FOR UPDATE 
    TO authenticated 
    USING (true);

CREATE POLICY "Permitir exclusao de viagem_checklist" 
    ON public.viagem_checklist FOR DELETE 
    TO authenticated 
    USING (true);
