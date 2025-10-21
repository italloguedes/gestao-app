# Configuração de Autenticação - Guia Completo

## 📋 Índice
1. [Setup Inicial](#setup-inicial)
2. [Criar Super Administrador](#criar-super-administrador)
3. [Gerenciar Usuários](#gerenciar-usuários)
4. [Níveis de Acesso](#níveis-de-acesso)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Setup Inicial

### 1. Criar a Tabela Users no Supabase

Se ainda não criou, execute o script:
```bash
sql/create_users_table.sql
```

### 2. Configurar o Primeiro Super Administrador

Você tem **3 opções**:

---

## 👑 Criar Super Administrador

### Opção A: Via Supabase Dashboard (Recomendado para primeiro setup)

1. Acesse o **Supabase Dashboard**
2. Vá em **Table Editor** → selecione a tabela **users**
3. Clique em **"Insert row"** ou **"+ New row"**
4. Preencha os campos:
   ```
   name:       Seu Nome Completo
   email:      seu-email@dominio.com
   role:       superadmin
   status:     active
   auth_id:    (deixe vazio por enquanto)
   ```
5. Clique em **Save**

### Opção B: Via SQL Editor no Supabase

1. No Supabase Dashboard, vá em **SQL Editor**
2. Clique em **"New query"**
3. Cole e execute:
   ```sql
   INSERT INTO users (name, email, role, status, created_at, updated_at)
   VALUES (
       'Seu Nome',
       'seu-email@dominio.com',
       'superadmin',
       'active',
       NOW(),
       NOW()
   );
   ```

### Opção C: Script de Inicialização Completo

1. Edite o arquivo `sql/initial_setup.sql`
2. Altere o email na linha 12:
   ```sql
   'admin@seudominio.com',  -- ALTERE AQUI!
   ```
3. Execute o script completo no SQL Editor do Supabase

---

## 🔄 Processo de Login pela Primeira Vez

### Quando você fizer login pela primeira vez:

1. **Faça login** na aplicação usando Supabase Auth
2. O sistema vai:
   - Buscar o usuário na tabela `users` por email
   - Automaticamente vincular o `auth_id` do Supabase Auth
   - Carregar suas permissões baseado no `role`

3. **Se você já está na tabela users** mas sem `auth_id`:
   - O sistema vai detectar seu email
   - Vai automaticamente atualizar o `auth_id`
   - Você terá acesso imediato com o role configurado

4. **Se você NÃO está na tabela users**:
   - O sistema cria automaticamente um usuário com role `user`
   - Você só terá acesso à rota pública `/agendamento`
   - Um superadmin precisa alterar seu role manualmente

---

## 🎯 Gerenciar Usuários

### Após ter um Super Administrador configurado:

1. **Faça login** como superadmin
2. Acesse **Dashboard** → **Gestão de Usuários** (menu superior)
3. Use a interface para:
   - ➕ **Criar novos usuários**
   - ✏️ **Editar usuários existentes**
   - 🗑️ **Excluir usuários**
   - 🔄 **Alterar roles e status**

### Criar Usuário pela Interface:

1. Clique em **"Novo Usuário"**
2. Preencha:
   - **Nome Completo**
   - **Email**
   - **Função/Permissão**: Escolha o role apropriado
   - **Status**: Ativo ou Inativo
3. Clique em **"Criar Usuário"**

**Importante**: Quando você cria um usuário pela interface, ele recebe um `auth_id` temporário. Na primeira vez que essa pessoa fizer login com Supabase Auth, o sistema vai sincronizar automaticamente o `auth_id` real.

---

## 🔐 Níveis de Acesso

### 👑 Super Administrador (`superadmin`)
**Acesso Total ao Sistema**
- ✅ Gerenciar usuários e permissões
- ✅ Acessar /admin/users (gestão de usuários)
- ✅ Todas as funcionalidades de admin e atendente
- ✅ Configurações do sistema
- ✅ Dashboard completo

**Rotas Permitidas:**
- `/dashboard` - Dashboard principal
- `/admin/*` - Todas as rotas administrativas
- `/dashboard/relatorios` - Relatórios
- `/agendamento` - Área pública

---

### ⚡ Administrador (`admin`)
**Gestão Completa do Dashboard**
- ✅ Dashboard completo
- ✅ Gerenciar atendimentos
- ✅ Visualizar e gerar relatórios
- ✅ Ver estatísticas
- ❌ NÃO pode gerenciar usuários

**Rotas Permitidas:**
- `/dashboard` - Dashboard principal
- `/dashboard/relatorios` - Relatórios
- `/agendamento` - Área pública

---

### 👨‍💼 Atendente (`atendente`)
**Operação do Dashboard**
- ✅ Acessar dashboard
- ✅ Gerenciar atendimentos básicos
- ❌ NÃO pode acessar relatórios completos
- ❌ NÃO pode gerenciar usuários

**Rotas Permitidas:**
- `/dashboard` - Dashboard principal
- `/agendamento` - Área pública

---

### 👤 Usuário (`user`)
**Acesso Público Apenas**
- ✅ Criar e acompanhar agendamentos
- ❌ NÃO tem acesso ao dashboard
- ❌ NÃO tem acesso a rotas administrativas

**Rotas Permitidas:**
- `/agendamento` - Área pública (única rota)

---

## 🔧 Troubleshooting

### Problema: "Não consigo acessar a área de usuários"

**Solução:**
1. Verifique seu role no banco de dados:
   ```sql
   SELECT name, email, role, status FROM users WHERE email = 'seu-email@dominio.com';
   ```
2. Se não for `superadmin`, atualize:
   ```sql
   UPDATE users SET role = 'superadmin' WHERE email = 'seu-email@dominio.com';
   ```
3. Faça logout e login novamente

---

### Problema: "Usuário não encontrado após login"

**Solução:**
1. Verifique se o usuário existe na tabela users:
   ```sql
   SELECT * FROM users WHERE email = 'seu-email@dominio.com';
   ```
2. Se não existir, o sistema cria automaticamente como `user`
3. Um superadmin precisa alterar o role manualmente

---

### Problema: "auth_id está vazio"

**Solução:**
Isso é normal antes do primeiro login. O `auth_id` será preenchido automaticamente quando:
1. O usuário fizer login pela primeira vez
2. O sistema detectar o email correspondente
3. Atualizar o `auth_id` automaticamente

Você pode sincronizar manualmente:
```sql
-- Busque o auth_id no Supabase Auth → Users
-- Então atualize:
UPDATE users
SET auth_id = 'uuid-do-supabase-auth'
WHERE email = 'email-do-usuario@dominio.com';
```

---

### Problema: "Acesso negado mesmo sendo superadmin"

**Checklist:**
1. ✅ Verifique o role no banco: `SELECT role FROM users WHERE email = 'seu-email';`
2. ✅ Confirme que status é 'active': `SELECT status FROM users WHERE email = 'seu-email';`
3. ✅ Faça logout completo do sistema
4. ✅ Limpe o cache do navegador
5. ✅ Faça login novamente
6. ✅ Verifique o console do navegador (F12) para erros

---

## 📊 Verificar Configuração Atual

Execute este SQL para ver todos os usuários e suas permissões:

```sql
SELECT
    id,
    name,
    email,
    role,
    status,
    auth_id IS NOT NULL as tem_auth_id,
    created_at,
    CASE
        WHEN role = 'superadmin' THEN '👑 Super Admin - Acesso Total'
        WHEN role = 'admin' THEN '⚡ Admin - Dashboard Completo'
        WHEN role = 'atendente' THEN '👨‍💼 Atendente - Dashboard Básico'
        WHEN role = 'user' THEN '👤 Usuário - Apenas Público'
    END as permissoes
FROM users
ORDER BY
    CASE role
        WHEN 'superadmin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'atendente' THEN 3
        WHEN 'user' THEN 4
    END,
    created_at DESC;
```

---

## 🎓 Boas Práticas

1. **Sempre tenha pelo menos 1 superadmin ativo**
2. **Use roles apropriados**: Não dê permissões desnecessárias
3. **Desative usuários** ao invés de deletar (mude status para 'inactive')
4. **Revise permissões periodicamente**
5. **Monitore acessos** através dos logs

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique a seção [Troubleshooting](#troubleshooting)
2. Confira o console do navegador (F12)
3. Verifique os logs do Supabase
4. Revise as configurações de ambiente (.env)

---

**Última atualização**: 2025-10-21
