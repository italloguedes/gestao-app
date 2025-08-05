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
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
RESEND_API_KEY=sua_chave_do_resend
```

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
- Gestão de agendamentos
- Visualização de agenda diária
- Controle de status de agendamentos
- Impressão de comprovantes
- Gerenciamento de usuários

### Área do Cliente
- Agendamento online
- Visualização de horários disponíveis
- Confirmação de agendamentos
- Cancelamento de agendamentos

## 🔒 Autenticação e Autorização

O sistema utiliza Supabase Auth para gerenciar autenticação e autorização. Existem dois níveis de acesso:

1. **Administradores**
   - Acesso completo ao sistema
   - Gerenciamento de agendamentos
   - Controle de usuários

2. **Clientes**
   - Agendamento de horários
   - Visualização de seus próprios agendamentos
   - Gerenciamento de seus dados

## 📊 Banco de Dados

O sistema utiliza Supabase como backend, com as seguintes tabelas principais:

- `users`: Usuários do sistema
- `agendamentos`: Registro de agendamentos
- `configuracoes`: Configurações do sistema

## 📧 Notificações

O sistema envia notificações por email utilizando o Resend para:
- Confirmação de agendamento
- Lembretes de agendamento
- Cancelamentos
- Alterações de status

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
