# Sistema de Síntese de Voz - Guia Completo

## Visão Geral

O sistema agora inclui **síntese de voz (Text-to-Speech)** que fala automaticamente o nome da pessoa quando a senha é chamada. Isso torna o sistema muito mais eficaz para chamar os pacientes.

## Funcionalidades de Voz

### 🎤 Recursos Implementados

- **Fala Automática**: O sistema fala o nome da pessoa automaticamente quando a senha é chamada
- **Mensagens Personalizadas**: Diferentes mensagens para chamadas normais e preferenciais
- **Configurações Otimizadas**: Velocidade, tom e volume ajustados para clareza
- **Detecção de Voz Portuguesa**: Prioriza vozes em português brasileiro
- **Teste de Voz**: Botões para testar se a síntese está funcionando
- **Indicadores Visuais**: Mostra quando o sistema está falando

### 📢 Mensagens de Voz

O sistema fala diferentes mensagens dependendo da situação:

- **Chamada Normal**: "Chamada para [Nome]. Dirija-se ao atendimento."
- **Chamada Preferencial**: "Chamada preferencial para [Nome]. Dirija-se ao atendimento."
- **Teste**: "Teste de voz. Sistema funcionando corretamente."

## Como Usar

### Para Testar a Voz

1. **Na Tela Pública** (`/chamada-senhas`):
   - Clique no botão "🔊 Testar Voz" na parte inferior
   - O sistema falará uma mensagem de teste

2. **Na Página de Gerenciamento** (`/admin/chamadas`):
   - Clique no botão "Testar Voz" no cabeçalho
   - Ou clique em "Falar Nome" em qualquer chamada específica

### Para Chamar uma Senha com Voz

1. **Na página de agendamentos** (`/admin/agendamentos/hoje`):
   - Clique em "📢 CHAMAR SENHA" no agendamento desejado
   - O sistema automaticamente:
     - Cria a chamada
     - Exibe na tela pública
     - **Fala o nome da pessoa**

2. **Na tela pública** (`/chamada-senhas`):
   - As chamadas aparecem automaticamente
   - O sistema fala o nome quando uma nova chamada é adicionada
   - Indicador visual mostra quando está falando

## Configurações de Voz

### Configurações Padrão

```typescript
{
  rate: 0.8,        // Velocidade ligeiramente mais lenta para clareza
  pitch: 1.1,       // Tom ligeiramente mais alto
  volume: 0.9,      // Volume alto mas confortável
  language: 'pt-BR' // Português brasileiro
}
```

### Personalização

As configurações podem ser ajustadas no arquivo `lib/voiceConfig.ts`:

```typescript
export const VOICE_CONFIGS = {
  chamada: {
    rate: 0.8,      // Velocidade para chamadas
    pitch: 1.1,     // Tom para chamadas
    volume: 0.9,    // Volume para chamadas
    language: 'pt-BR',
  },
  // ... outras configurações
};
```

## Compatibilidade com Navegadores

### ✅ Navegadores Suportados

- **Chrome/Chromium**: Suporte completo
- **Firefox**: Suporte completo
- **Safari**: Suporte completo
- **Edge**: Suporte completo

### ⚠️ Limitações

- **Navegadores móveis**: Pode ter limitações de volume
- **Navegadores antigos**: Pode não funcionar em versões muito antigas
- **Permissões**: Alguns navegadores podem bloquear áudio sem interação do usuário

## Solução de Problemas

### Voz Não Funciona

1. **Verificar permissões do navegador**:
   - Clique no botão "Testar Voz" primeiro
   - Alguns navegadores precisam de interação do usuário

2. **Verificar se o navegador suporta**:
   - Abra o console do navegador (F12)
   - Digite: `'speechSynthesis' in window`
   - Deve retornar `true`

3. **Verificar vozes disponíveis**:
   - No console: `speechSynthesis.getVoices()`
   - Deve mostrar uma lista de vozes

### Voz Muito Rápida/Lenta

1. **Ajustar configurações**:
   - Edite `lib/voiceConfig.ts`
   - Modifique o valor de `rate` (0.1 = muito lento, 10 = muito rápido)

### Voz em Idioma Errado

1. **Verificar vozes disponíveis**:
   - O sistema prioriza vozes em português brasileiro
   - Se não encontrar, usa a voz padrão do sistema

2. **Instalar vozes em português**:
   - Windows: Configurações > Hora e Idioma > Voz
   - macOS: Preferências do Sistema > Acessibilidade > Voz
   - Linux: Instalar pacotes de síntese de voz

### Volume Muito Baixo/Alto

1. **Ajustar volume do sistema**:
   - Verifique o volume do navegador
   - Verifique o volume do sistema operacional

2. **Ajustar configurações**:
   - Edite `lib/voiceConfig.ts`
   - Modifique o valor de `volume` (0 = mudo, 1 = máximo)

## Exemplos de Uso

### Chamada Normal
```
Usuário clica "CHAMAR SENHA" → Sistema fala: "Chamada para João Silva. Dirija-se ao atendimento."
```

### Chamada Preferencial
```
Usuário clica "CHAMAR SENHA" em agendamento preferencial → Sistema fala: "Chamada preferencial para Maria Santos. Dirija-se ao atendimento."
```

### Teste de Voz
```
Usuário clica "Testar Voz" → Sistema fala: "Teste de voz. Sistema funcionando corretamente."
```

## Monitoramento

### Indicadores Visuais

- **🔊 Ícone piscando**: Sistema está falando
- **"Falando: [texto]"**: Mostra o que está sendo dito
- **Botão "Testar Voz"**: Para verificar se funciona

### Logs

- Erros de voz aparecem no console do navegador
- Verifique se há mensagens de erro relacionadas a `speechSynthesis`

## Melhorias Futuras

### Possíveis Adições

1. **Múltiplas vozes**: Diferentes vozes para diferentes tipos de chamada
2. **Repetição automática**: Repetir chamada após X minutos
3. **Configurações por usuário**: Cada atendente pode ter suas preferências
4. **Gravação de voz**: Usar gravações reais em vez de síntese
5. **Integração com alto-falantes**: Conectar com sistema de som da sala

### Configurações Avançadas

```typescript
// Exemplo de configuração personalizada
const customConfig = {
  rate: 0.7,        // Mais lento
  pitch: 1.3,       // Mais agudo
  volume: 1.0,      // Volume máximo
  language: 'pt-BR',
  voiceName: 'Microsoft Helena Desktop' // Voz específica
};
```

## Suporte

Se a síntese de voz não estiver funcionando:

1. Teste primeiro com o botão "Testar Voz"
2. Verifique o console do navegador para erros
3. Confirme que o navegador suporta `speechSynthesis`
4. Tente em um navegador diferente
5. Verifique as configurações de áudio do sistema

O sistema de síntese de voz torna as chamadas muito mais eficazes, especialmente em ambientes com ruído ou quando os pacientes não estão olhando para a tela!
