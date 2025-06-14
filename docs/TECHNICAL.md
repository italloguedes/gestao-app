# Documentação Técnica - Sistema de Gestão de Agendamentos

## Arquitetura do Sistema

### Frontend
- **Framework**: Next.js 15.2.4
- **UI**: React 19 + Tailwind CSS
- **Estado**: React Hooks + Context API
- **Tipagem**: TypeScript
- **Build**: Turbopack (desenvolvimento)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Email**: Resend
- **Storage**: Supabase Storage

## Estrutura de Diretórios

### `/app`
Contém todas as rotas da aplicação usando o App Router do Next.js 13+.

```
/app
├── admin/                 # Rotas administrativas
│   ├── agendamentos/     # Gestão de agendamentos
│   ├── usuarios/         # Gestão de usuários
│   └── configuracoes/    # Configurações do sistema
├── api/                  # API Routes
│   ├── auth/            # Rotas de autenticação
│   ├── agendamentos/    # Rotas de agendamentos
│   └── webhooks/        # Webhooks
└── (auth)/              # Rotas autenticadas
    ├── agendamento/     # Área do cliente
    └── perfil/          # Perfil do usuário
```

### `/components`
Componentes reutilizáveis da aplicação.

```
/components
├── ui/                  # Componentes de UI básicos
├── forms/              # Componentes de formulário
├── layout/             # Componentes de layout
└── shared/             # Componentes compartilhados
```

### `/lib`
Utilitários e configurações.

```
/lib
├── supabase/           # Configuração do cliente Supabase
├── utils/              # Funções utilitárias
└── constants/          # Constantes do sistema
```

## Banco de Dados

### Tabelas Principais

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### agendamentos
```sql
CREATE TABLE agendamentos (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Autenticação

O sistema utiliza Supabase Auth com os seguintes fluxos:

1. **Login/Registro**
   - Email/Password
   - Magic Link

2. **Autorização**
   - RBAC (Role-Based Access Control)
   - Roles: admin, user

## API Routes

### `/api/auth/*`
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/logout`

### `/api/agendamentos/*`
- GET `/api/agendamentos`
- POST `/api/agendamentos`
- PUT `/api/agendamentos/:id`
- DELETE `/api/agendamentos/:id`

## Componentes Principais

### DashboardHeader
Componente de cabeçalho do dashboard administrativo.

```typescript
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
```

### AgendamentoCard
Componente para exibição de agendamentos.

```typescript
interface AgendamentoCardProps {
  agendamento: Agendamento;
  onStatusChange?: (id: number, status: string) => void;
  onPrint?: (id: number) => void;
}
```

## Hooks Customizados

### useAuth
Hook para gerenciamento de autenticação.

```typescript
const { user, isAdmin, login, logout } = useAuth();
```

### useAgendamentos
Hook para gerenciamento de agendamentos.

```typescript
const { 
  agendamentos, 
  loading, 
  error, 
  loadAgendamentos,
  updateStatus 
} = useAgendamentos();
```

## Estilização

O projeto utiliza Tailwind CSS com as seguintes configurações:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cores personalizadas
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
```

## Scripts Disponíveis

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

## Convenções de Código

### Nomenclatura
- Componentes: PascalCase
- Funções: camelCase
- Variáveis: camelCase
- Constantes: UPPER_SNAKE_CASE
- Interfaces: PascalCase com prefixo I (opcional)

### Imports
```typescript
// React e Next.js
import React from 'react';
import { useRouter } from 'next/navigation';

// Componentes
import { Button } from '@/components/ui/Button';

// Hooks
import { useAuth } from '@/hooks/useAuth';

// Utilitários
import { formatDate } from '@/lib/utils/date';
```

### Componentes
```typescript
interface Props {
  // Props do componente
}

export const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Lógica do componente
  return (
    // JSX
  );
};
```

## Testes

O projeto utiliza Jest e React Testing Library para testes.

```typescript
describe('Component', () => {
  it('should render correctly', () => {
    // Teste
  });
});
```

## Deploy

### Vercel
1. Conecte o repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático na branch main

### Build
```bash
npm run build
```

## Monitoramento

- Vercel Analytics
- Supabase Dashboard
- Resend Dashboard

## Segurança

- Autenticação via Supabase Auth
- Proteção de rotas
- Validação de dados
- Sanitização de inputs
- Rate limiting
- CORS configurado 