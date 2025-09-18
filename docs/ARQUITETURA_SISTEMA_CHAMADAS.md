# Arquitetura do Sistema de Chamadas de Senhas

## Fluxo do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CHAMADAS DE SENHAS                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ATENDENTE     │    │   PACIENTE      │    │  ADMINISTRADOR  │
│                 │    │                 │    │                 │
│ • Visualiza     │    │ • Aguarda       │    │ • Gerencia      │
│   agendamentos  │    │   chamada       │    │   chamadas      │
│ • Chama senha   │    │ • Vê tela       │    │ • Controla      │
│ • Controla      │    │   pública       │    │   status        │
│   status        │    │ • Escuta som    │    │ • Remove        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACES                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Página de       │ Tela Pública    │ Gerenciamento de            │
│ Agendamentos    │ de Chamadas     │ Chamadas                    │
│                 │                 │                             │
│ /admin/         │ /chamada-senhas │ /admin/chamadas             │
│ agendamentos/   │                 │                             │
│ hoje            │ • Exibe chamadas│ • Lista todas chamadas      │
│                 │ • Som automático│ • Filtros por status        │
│ • Botão chamar  │ • Atualização   │ • Controle de status        │
│ • Status visual │   automática    │ • Remoção de chamadas       │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                    /api/chamada-senhas                         │
│                                                                 │
│ GET    - Buscar chamadas ativas                                │
│ POST   - Criar nova chamada                                    │
│ PUT    - Atualizar status da chamada                           │
│ DELETE - Remover chamada                                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS                            │
├─────────────────────────────────────────────────────────────────┤
│                    SUPABASE                                    │
│                                                                 │
│ Tabelas:                                                        │
│ • chamada_senhas (nova)                                        │
│ • agendamentos (atualizada)                                    │
│ • users (existente)                                            │
│                                                                 │
│ Relacionamentos:                                               │
│ • chamada_senhas.agendamento_id → agendamentos.id              │
│ • chamada_senhas.atendente_id → auth.users.id                  │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. API Endpoint (`/api/chamada-senhas/route.ts`)
- **GET**: Busca chamadas ativas com filtros
- **POST**: Cria nova chamada de senha
- **PUT**: Atualiza status da chamada
- **DELETE**: Remove chamada

### 2. Tela Pública (`/chamada-senhas/page.tsx`)
- Exibição em tempo real das chamadas
- Notificações sonoras automáticas
- Design otimizado para telas grandes
- Atualização automática a cada 5 segundos

### 3. Gerenciamento (`/admin/chamadas/page.tsx`)
- Interface administrativa completa
- Controle de status das chamadas
- Filtros por data e status
- Remoção de chamadas

### 4. Integração com Agendamentos (`/admin/agendamentos/hoje/page.tsx`)
- Botão destacado para chamar senha
- Status visual para agendamentos chamados
- Integração com sistema existente

### 5. Notificações Sonoras (`/components/NotificationSound.tsx`)
- Componente reutilizável para sons
- Diferentes tipos de notificação
- Baseado em Web Audio API

## Fluxo de Dados

### 1. Chamada de Senha
```
Atendente → Clica "CHAMAR SENHA" → API POST → Banco de Dados
    ↓
Atualiza status agendamento → Tela pública atualiza → Som toca
```

### 2. Atualização de Status
```
Admin → Altera status → API PUT → Banco de Dados
    ↓
Tela pública atualiza → Notificação visual
```

### 3. Visualização em Tempo Real
```
Tela pública → Polling a cada 5s → API GET → Banco de Dados
    ↓
Compara com estado anterior → Toca som se nova chamada
```

## Tecnologias Utilizadas

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Banco de Dados**: Supabase (PostgreSQL)
- **Notificações**: Web Audio API
- **Atualização**: Polling (5-10 segundos)

## Segurança

- Autenticação via Supabase Auth
- Autorização baseada em roles (admin/superadmin)
- Validação de dados na API
- Sanitização de inputs

## Performance

- Polling otimizado (5-10 segundos)
- Índices no banco de dados
- Componentes otimizados com React
- Lazy loading de componentes pesados

## Escalabilidade

- Arquitetura modular
- Componentes reutilizáveis
- API RESTful
- Fácil adição de novas funcionalidades
