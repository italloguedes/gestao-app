# Sistema de Chamada de Senhas - ALECE

## Visão Geral

O Sistema de Chamada de Senhas foi desenvolvido para automatizar e gerenciar as chamadas de pacientes na Sala Sensorial da ALECE. O sistema permite que os atendentes chamem senhas através de uma interface intuitiva, enquanto uma tela pública exibe as chamadas em tempo real.

## Funcionalidades

### 🎯 Principais Recursos

- **Chamada Automática de Senhas**: Botão destacado na página de agendamentos para chamar pacientes
- **Tela Pública de Chamadas**: Exibição em tempo real das senhas chamadas
- **Gerenciamento de Chamadas**: Interface administrativa para controlar todas as chamadas
- **Notificações Sonoras**: Alertas sonoros quando novas chamadas são feitas
- **Status de Chamadas**: Controle de status (chamada, atendido, ausente)
- **Atendimento Preferencial**: Destaque especial para pacientes preferenciais

### 📱 Interfaces

1. **Página de Agendamentos de Hoje** (`/admin/agendamentos/hoje`)
   - Botão "CHAMAR SENHA" destacado para cada agendamento confirmado
   - Status visual para agendamentos chamados
   - Botão para abrir tela pública de chamadas

2. **Tela Pública de Chamadas** (`/chamada-senhas`)
   - Exibição em tempo real das chamadas ativas
   - Design otimizado para telas grandes
   - Notificações sonoras automáticas
   - Atualização automática a cada 5 segundos

3. **Gerenciamento de Chamadas** (`/admin/chamadas`)
   - Lista completa de todas as chamadas
   - Controle de status das chamadas
   - Filtros por data e status
   - Remoção de chamadas

## Instalação

### 1. Executar Script SQL

Execute o script SQL para criar a tabela de chamadas:

```sql
-- Execute o arquivo sql/create_chamada_senhas_table.sql
-- Este script cria a tabela chamada_senhas e adiciona o status 'chamado' aos agendamentos
```

### 2. Configuração do Banco de Dados

O sistema utiliza a tabela `chamada_senhas` com a seguinte estrutura:

```sql
CREATE TABLE chamada_senhas (
  id SERIAL PRIMARY KEY,
  agendamento_id INTEGER NOT NULL REFERENCES agendamentos(id),
  nome VARCHAR(255) NOT NULL,
  horario TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'chamada',
  data_chamada DATE NOT NULL DEFAULT CURRENT_DATE,
  atendente_id UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Permissões

Certifique-se de que os usuários com role 'admin' ou 'superadmin' tenham acesso às funcionalidades.

## Como Usar

### Para Atendentes

1. **Acesse a página de agendamentos de hoje**:
   - Vá para `/admin/agendamentos/hoje`
   - Visualize os agendamentos do dia

2. **Chamar uma senha**:
   - Clique no botão "📢 CHAMAR SENHA" no agendamento desejado
   - A senha será exibida na tela pública automaticamente
   - O status do agendamento mudará para "chamado"

3. **Abrir tela pública**:
   - Clique em "Tela de Chamadas" para abrir em nova aba
   - A tela será exibida em modo fullscreen para melhor visualização

### Para Administradores

1. **Gerenciar chamadas**:
   - Acesse `/admin/chamadas`
   - Visualize todas as chamadas do dia
   - Use filtros para encontrar chamadas específicas

2. **Controlar status**:
   - Marque chamadas como "Atendido" ou "Ausente"
   - Remova chamadas se necessário
   - Adicione observações

### Para Pacientes

1. **Visualizar chamadas**:
   - Acesse `/chamada-senhas`
   - Aguarde sua chamada aparecer na tela
   - O sistema reproduzirá um som quando sua senha for chamada

## API Endpoints

### GET `/api/chamada-senhas`
Busca chamadas ativas
- Query params: `status`, `data`
- Retorna: Array de chamadas

### POST `/api/chamada-senhas`
Cria nova chamada
- Body: `{ agendamento_id, atendente_id?, observacoes? }`
- Retorna: Chamada criada

### PUT `/api/chamada-senhas`
Atualiza status da chamada
- Body: `{ id, status, observacoes? }`
- Retorna: Chamada atualizada

### DELETE `/api/chamada-senhas`
Remove chamada
- Query param: `id`
- Retorna: Confirmação

## Configurações Avançadas

### Notificações Sonoras

O sistema utiliza Web Audio API para reproduzir notificações sonoras. As configurações podem ser ajustadas no componente `NotificationSound.tsx`:

```typescript
const getFrequenciesForType = (soundType: string): number[] => {
  switch (soundType) {
    case 'chamada':
      return [800, 1000, 1200, 800]; // Sequência para chamada
    case 'success':
      return [523, 659, 784]; // C-E-G (acorde maior)
    case 'error':
      return [200, 150, 100]; // Tons graves
    default:
      return [800, 600, 800];
  }
};
```

### Atualização em Tempo Real

- **Tela Pública**: Atualiza a cada 5 segundos
- **Gerenciamento**: Atualiza a cada 10 segundos
- **Agendamentos**: Atualiza a cada 5 minutos

### Personalização Visual

As cores e estilos podem ser personalizados editando as classes Tailwind CSS nos componentes:

- **Tela Pública**: `app/chamada-senhas/page.tsx`
- **Gerenciamento**: `app/admin/chamadas/page.tsx`
- **Botões de Chamada**: `app/admin/agendamentos/hoje/page.tsx`

## Troubleshooting

### Problemas Comuns

1. **Som não funciona**:
   - Verifique se o navegador permite reprodução de áudio
   - Alguns navegadores bloqueiam áudio sem interação do usuário

2. **Chamadas não aparecem**:
   - Verifique se a tabela `chamada_senhas` foi criada
   - Confirme as permissões do usuário

3. **Status não atualiza**:
   - Verifique a conexão com o banco de dados
   - Confirme se o status 'chamado' foi adicionado aos agendamentos

### Logs

Os erros são registrados no console do navegador e no servidor. Verifique:

- Console do navegador (F12)
- Logs do servidor Next.js
- Logs do Supabase

## Suporte

Para suporte técnico ou dúvidas sobre o sistema:

1. Verifique este documento primeiro
2. Consulte os logs de erro
3. Entre em contato com a equipe de desenvolvimento

## Changelog

### v1.0.0
- Implementação inicial do sistema
- Chamada automática de senhas
- Tela pública de chamadas
- Gerenciamento administrativo
- Notificações sonoras
- Integração com sistema de agendamentos existente
