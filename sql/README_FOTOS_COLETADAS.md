# Instalação da Coluna fotos_coletadas

## 📋 Sobre
Esta migration adiciona a coluna `fotos_coletadas` na tabela `atendimentos` para controlar se as fotos biométricas foram coletadas ou não.

## 🚀 Como Instalar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie e cole o conteúdo do arquivo `add_fotos_coletadas_column.sql`
5. Clique em **Run** para executar

### Opção 2: Via CLI do Supabase

```bash
# Se você estiver usando Supabase CLI
supabase migration up
```

## ✅ Verificação

Após executar o script, você pode verificar se a coluna foi criada com sucesso:

```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'atendimentos' 
AND column_name = 'fotos_coletadas';
```

## 📊 Estrutura da Coluna

- **Nome:** `fotos_coletadas`
- **Tipo:** `BOOLEAN`
- **Default:** `FALSE`
- **Nullable:** Sim
- **Índice:** Sim (para melhor performance)

## 🔄 Atualizar Registros Existentes (Opcional)

Se você quiser definir todos os registros existentes como `FALSE`:

```sql
UPDATE atendimentos 
SET fotos_coletadas = FALSE 
WHERE fotos_coletadas IS NULL;
```

## 📝 Notas

- A coluna é criada com `IF NOT EXISTS`, então é seguro executar o script múltiplas vezes
- O índice ajuda nas consultas filtradas por status de fotos coletadas
- O valor padrão é `FALSE` para novos registros

