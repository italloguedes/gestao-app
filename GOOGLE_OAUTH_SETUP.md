# Configuração do Google OAuth no Supabase

Este guia explica como configurar o login com Google usando Supabase para sua aplicação.

## 🔧 Pré-requisitos

- Conta no Supabase
- Conta no Google Cloud Console
- Variáveis de ambiente configuradas

## 📝 Passo a Passo

### 1. Configurar Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para **APIs & Services** > **Credentials**
4. Clique em **Create Credentials** > **OAuth client ID**
5. Selecione **Web application**
6. Configure:
   - **Name**: Nome da sua aplicação (ex: "CIADI App")
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**:
     - `https://seu-projeto.supabase.co/auth/v1/callback`
     - Substitua `seu-projeto` pelo ID do seu projeto Supabase

7. Clique em **Create**
8. Copie o **Client ID** e **Client Secret**

### 2. Configurar Supabase

1. Acesse seu [Dashboard do Supabase](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá para **Authentication** > **Providers**
4. Encontre **Google** na lista de providers
5. Ative o Google provider
6. Cole:
   - **Client ID**: O Client ID copiado do Google
   - **Client Secret**: O Client Secret copiado do Google
7. Clique em **Save**

### 3. Configurar Variáveis de Ambiente

Certifique-se de que seu arquivo `.env.local` contém:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 4. Teste o Login

1. Execute a aplicação:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000`
3. Clique no botão **Entrar com Google**
4. Autorize a aplicação
5. Você será redirecionado de volta para a aplicação após o login

## 🎨 Recursos Implementados

✅ Botão de login com Google integrado
✅ Design moderno e lúdico com tema de autismo
✅ Cores vibrantes e amigáveis para crianças
✅ Animações suaves e transições
✅ Criação automática de usuário no primeiro login
✅ Redirecionamento baseado em role (admin/atendente → dashboard, user → agendamento)

## 🛠️ Estrutura de Arquivos Modificados

- `app/page.tsx` - Tela de login modernizada com Google OAuth
- `app/auth/callback/route.ts` - Manipulador de callback OAuth
- `components/LoginForm.tsx` - Componente de formulário (não mais utilizado)

## 🐛 Solução de Problemas

### Erro: "redirect_uri_mismatch"

Verifique se a URL de redirecionamento no Google Cloud Console está correta:
- Deve ser: `https://seu-projeto.supabase.co/auth/v1/callback`

### Erro: "Invalid provider"

Certifique-se de que o Google provider está ativado no Supabase Dashboard.

### Usuário não é redirecionado após login

Verifique se a tabela `users` existe no banco de dados com as colunas:
- `email` (text)
- `name` (text)
- `role` (text) - valores: 'user', 'admin', 'atendente'
- `status` (text)

## 📚 Recursos Adicionais

- [Documentação do Supabase Auth](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

## 🎨 Tema e Design

A tela de login foi modernizada com:

- **Cores do autismo**: Azul (#23B4E7), Verde (#3AC28D), Laranja (#FFA726), Amarelo (#FFD600)
- **Elementos lúdicos**: Emojis, estrelas, quebra-cabeças
- **Animações**: Pulse, bounce, scale
- **Gradientes**: Cores vibrantes e transições suaves
- **Acessibilidade**: Alto contraste e elementos visuais claros

## 🌈 Sobre o Projeto

Esta aplicação é dedicada ao gerenciamento da **Sala Sensorial / ALECE** - Centro Inclusivo para Atendimento e Desenvolvimento Infantil.

Nossa missão é proporcionar um ambiente acolhedor e organizado para o desenvolvimento e acompanhamento das atividades de crianças com autismo.

---

Desenvolvido com ❤️ para crianças especiais
