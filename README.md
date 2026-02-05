# Sistema de Gestão de Agendamentos

Este é um sistema de gestão de agendamentos desenvolvido com Next.js, TypeScript, Tailwind CSS e Supabase.

## 🚀 Tecnologias

- [Next.js 15.2.4](https://nextjs.org/)
- [React 19](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.io/)
- [React Icons](https://react-icons.github.io/react-icons/)
- [React PDF](https://react-pdf.org/)
- [Resend](https://resend.com/) (para envio de emails)

## 📋 Pré-requisitos

- Node.js (versão LTS recomendada)
- npm ou yarn
- Conta no Supabase
- Conta no Resend (para funcionalidades de email)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/italloguedes/gestao-app.git
cd gestao-app
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Copie o arquivo `.env.example` para `.env.local` e preencha com suas credenciais:
```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais:
```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Email Gmail (obrigatório para notificações)
GMAIL_USER=seu_email@gmail.com
GMAIL_PASSWORD=sua_senha_de_aplicativo

# Configurações de Email Alternativas (opcional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha
EMAIL_FROM=seu_email@gmail.com
```

**Notas importantes:**
- Para Gmail: Use uma [senha de aplicativo](https://myaccount.google.com/apppasswords), não sua senha regular
- Obtenha as credenciais do Supabase em: [https://app.supabase.com/project/_/settings/api](https://app.supabase.com/project/_/settings/api)

## 🏗️ Estrutura do Projeto

```
gestao-app/
├── app/                    # Diretório principal da aplicação Next.js
│   ├── admin/             # Rotas administrativas
│   ├── api/               # API Routes
│   └── (auth)/            # Rotas autenticadas
├── components/            # Componentes reutilizáveis
├── contexts/             # Contextos do React
├── hooks/                # Custom hooks
├── lib/                  # Utilitários e configurações
├── public/               # Arquivos estáticos
├── sql/                  # Scripts SQL
├── supabase/             # Configurações do Supabase
└── types/                # Definições de tipos TypeScript
```

## 🚀 Executando o Projeto

1. Desenvolvimento:
```bash
npm run dev
```

2. Build:
```bash
npm run build
```

3. Produção:
```bash
npm start
```

## 🌐 Deploy

### Deploy no Vercel (Recomendado)

1. **Conecte seu repositório ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com sua conta GitHub
   - Clique em "New Project"
   - Importe seu repositório `gestao-app`

2. **Configure as variáveis de ambiente no Vercel:**
   - Vá para Settings > Environment Variables
   - Adicione as seguintes variáveis:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `RESEND_API_KEY`

3. **Deploy automático:**
   - O Vercel fará deploy automático a cada push para a branch `main`
   - Cada Pull Request criará um preview deployment

### Deploy Manual

Para fazer deploy manual via GitHub Actions:

1. Configure os secrets no GitHub:
   - Vá para Settings > Secrets and variables > Actions
   - Adicione os secrets necessários (VERCEL_TOKEN, ORG_ID, PROJECT_ID)

2. Push para a branch main:
```bash
git add .
git commit -m "Configuração de deploy"
git push origin main
```

## 📱 Funcionalidades Principais

### Área Administrativa
- ✅ Gestão completa de atendimentos (CIN - Carteira de Identidade Nacional)
- ✅ Dashboard com estatísticas em tempo real
- ✅ Visualização de agenda diária e semanal
- ✅ Controle de status de atendimentos (Pendente, Em Andamento, Concluído, Bloqueado, Correção)
- ✅ Geração e impressão de comprovantes em PDF
- ✅ Sistema de entrega de CIN com comprovante
- ✅ Gerenciamento de usuários e permissões
- ✅ Relatórios personalizados
- ✅ Sistema de chamadas (Painel de senhas)

### Área do Cliente
- ✅ Agendamento online com seleção de data e horário
- ✅ Consulta de atendimentos por CPF ou protocolo
- ✅ Visualização de horários disponíveis em tempo real
- ✅ Confirmação automática por email
- ✅ Notificações de status do atendimento

## 🔒 Autenticação e Autorização

O sistema utiliza Supabase Auth para gerenciar autenticação e autorização com políticas RLS (Row Level Security). Existem três níveis de acesso:

1. **Super Administrador**
   - Acesso total ao sistema
   - Gerenciamento de usuários e permissões
   - Configurações do sistema

2. **Administradores**
   - Acesso completo ao dashboard
   - Gerenciamento de atendimentos
   - Geração de relatórios
   - Visualização de estatísticas

3. **Usuários/Clientes**
   - Agendamento de horários
   - Consulta de atendimentos
   - Visualização de status

## 🔐 Segurança e Boas Práticas

### Configuração de Segurança
- ✅ Variáveis de ambiente protegidas (nunca commitadas)
- ✅ Autenticação via Supabase com tokens JWT
- ✅ Row Level Security (RLS) no banco de dados
- ✅ Validação de dados no cliente e servidor
- ✅ Proteção contra XSS e CSRF
- ✅ Rate limiting nas APIs

### Boas Práticas de Uso
1. **Nunca compartilhe o arquivo `.env.local`**
2. **Use senhas fortes para contas administrativas**
3. **Mantenha as dependências atualizadas**
4. **Faça backup regular do banco de dados**
5. **Use HTTPS em produção (habilitado automaticamente no Vercel)**
6. **Configure políticas de senha no Supabase**

## 📊 Banco de Dados

O sistema utiliza Supabase (PostgreSQL) como backend, com as seguintes tabelas principais:

- **`atendimentos`**: Registro de todos os atendimentos de CIN
  - Informações do cidadão (nome, CPF, email, telefone)
  - Status do atendimento
  - Protocolo único
  - Data e horário do agendamento
  - Informações de entrega

- **`agendamentos`**: Controle de agendamentos
  - Disponibilidade de vagas
  - Horários confirmados e cancelados
  - Integração com atendimentos

- **`users`** (Supabase Auth): Usuários do sistema
  - Informações de autenticação
  - Perfis e permissões (role)
  - Metadados do usuário

## 📧 Notificações

O sistema envia notificações por email utilizando Gmail/SMTP (Nodemailer) para:
- ✉️ Confirmação de agendamento
- ✉️ Notificação de CIN pronta para retirada
- ✉️ Conclusão de atendimento
- ✉️ Alterações de status
- ✉️ Lembretes automáticos

**Configuração de Email:**
- Suporta Gmail com senha de aplicativo
- Configurável para qualquer servidor SMTP
- Emails em formato HTML responsivo

## 🛠️ Desenvolvimento

### Convenções de Código
- TypeScript para tipagem estática
- Componentes funcionais com hooks
- Tailwind CSS para estilização
- ESLint para linting

### Estrutura de Componentes
- Componentes são organizados por funcionalidade
- Utilização de contextos para estado global
- Custom hooks para lógica reutilizável

## 📦 Deploy

O projeto está configurado para deploy na Vercel. O processo de deploy é automático através do GitHub.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Autores

- **Itallo Guedes** - *Desenvolvimento* - [GitHub](https://github.com/italloguedes)

## 🙏 Agradecimentos

- Equipe do Next.js
- Comunidade Supabase
- Tailwind CSS
- Todos os contribuidores
