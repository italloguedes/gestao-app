# Solução de Problemas - Síntese de Voz

## Problema: Voz não está saindo

### 🔍 **Passo 1: Verificar Suporte Básico**

1. **Abra a tela de chamadas**: `/chamada-senhas`
2. **Clique em "🔍 Verificar Suporte"**
3. **Verifique o resultado**:
   - ✅ **Suporte: true** = Navegador suporta síntese de voz
   - ❌ **Suporte: false** = Navegador não suporta (veja soluções abaixo)

### 🔍 **Passo 2: Teste Direto**

1. **Clique em "🔊 Testar Voz"**
2. **Abra o console do navegador** (F12)
3. **Procure por mensagens**:
   - `🔊 Teste de voz iniciado` = Teste foi iniciado
   - `✅ Fala iniciada com sucesso` = Voz funcionando
   - `❌ Erro na fala: [erro]` = Problema identificado

### 🔍 **Passo 3: Verificar Permissões**

Alguns navegadores bloqueiam áudio sem interação do usuário:

1. **Clique primeiro em "Testar Voz"** (isso ativa as permissões)
2. **Aguarde alguns segundos**
3. **Tente novamente**

### 🔍 **Passo 4: Verificar Vozes Disponíveis**

No console do navegador, digite:
```javascript
speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang }))
```

**Resultados esperados**:
- Deve mostrar uma lista de vozes
- Procure por vozes com `lang: "pt-BR"` ou `lang: "pt"`

## 🛠️ **Soluções por Problema**

### ❌ **Problema: "Síntese de voz não suportada"**

**Causa**: Navegador muito antigo ou sem suporte

**Soluções**:
1. **Atualizar navegador** para versão mais recente
2. **Usar navegador diferente**:
   - Chrome (recomendado)
   - Firefox
   - Safari
   - Edge

### ❌ **Problema: "Nenhuma voz disponível"**

**Causa**: Sistema operacional sem vozes instaladas

**Soluções**:

#### Windows:
1. **Configurações** → **Hora e Idioma** → **Voz**
2. **Adicionar vozes** em português
3. **Reiniciar navegador**

#### macOS:
1. **Preferências do Sistema** → **Acessibilidade** → **Voz**
2. **Adicionar vozes** em português
3. **Reiniciar navegador**

#### Linux:
```bash
# Ubuntu/Debian
sudo apt-get install espeak-pt

# Fedora
sudo dnf install espeak-pt
```

### ❌ **Problema: "Erro na fala"**

**Causas comuns**:

1. **Volume muito baixo**:
   - Verificar volume do navegador
   - Verificar volume do sistema
   - Verificar se não está mudo

2. **Voz corrompida**:
   - Reiniciar navegador
   - Limpar cache do navegador
   - Reiniciar sistema

3. **Conflito de áudio**:
   - Fechar outros aplicativos de áudio
   - Verificar se não há outro áudio tocando

### ❌ **Problema: "Fala muito rápida/lenta"**

**Solução**: Ajustar configurações no código

Edite `lib/voiceConfig.ts`:
```typescript
export const VOICE_CONFIGS = {
  chamada: {
    rate: 0.6,      // Mais lento (padrão: 0.8)
    pitch: 1.0,     // Tom normal (padrão: 1.1)
    volume: 1.0,    // Volume máximo (padrão: 0.9)
    language: 'pt-BR',
  },
};
```

### ❌ **Problema: "Voz em inglês"**

**Solução**: Forçar voz em português

1. **Verificar vozes disponíveis**:
   ```javascript
   speechSynthesis.getVoices().filter(v => v.lang.includes('pt'))
   ```

2. **Se não houver vozes em português**:
   - Instalar vozes em português (veja seção acima)
   - Reiniciar navegador

## 🔧 **Testes Avançados**

### Teste 1: Verificar API
```javascript
// No console do navegador
console.log('Suporte:', 'speechSynthesis' in window);
console.log('Vozes:', speechSynthesis.getVoices().length);
```

### Teste 2: Teste Manual
```javascript
// No console do navegador
const utterance = new SpeechSynthesisUtterance('Teste manual');
utterance.onstart = () => console.log('Iniciou');
utterance.onend = () => console.log('Terminou');
utterance.onerror = (e) => console.error('Erro:', e);
speechSynthesis.speak(utterance);
```

### Teste 3: Verificar Eventos
```javascript
// No console do navegador
const utterance = new SpeechSynthesisUtterance('Teste eventos');
utterance.onstart = () => console.log('✅ onstart');
utterance.onend = () => console.log('✅ onend');
utterance.onerror = (e) => console.log('❌ onerror:', e.error);
utterance.onpause = () => console.log('⏸️ onpause');
utterance.onresume = () => console.log('▶️ onresume');
speechSynthesis.speak(utterance);
```

## 📱 **Problemas Específicos por Dispositivo**

### Mobile (Android/iOS)
- **Problema**: Volume baixo ou não funciona
- **Solução**: Verificar se não está no modo silencioso
- **Solução**: Aumentar volume do sistema
- **Solução**: Usar fone de ouvido

### Desktop
- **Problema**: Voz não sai pelos alto-falantes
- **Solução**: Verificar dispositivo de áudio padrão
- **Solução**: Verificar se não está mudo
- **Solução**: Testar com fone de ouvido

## 🚨 **Soluções de Emergência**

Se nada funcionar:

### Opção 1: Usar Som de Notificação
O sistema ainda funciona com sons de notificação mesmo sem síntese de voz.

### Opção 2: Implementar Fallback
```javascript
// Adicionar no código
if (!('speechSynthesis' in window)) {
  // Usar som de notificação como fallback
  playNotificationSound();
}
```

### Opção 3: Usar Texto Visual
Mostrar mensagem grande na tela em vez de falar.

## 📞 **Suporte Técnico**

Se o problema persistir:

1. **Colete informações**:
   - Navegador e versão
   - Sistema operacional
   - Mensagens do console
   - Resultado do teste de suporte

2. **Teste em navegador diferente**

3. **Teste em dispositivo diferente**

4. **Verifique se funciona em outros sites** que usam síntese de voz

## ✅ **Checklist de Verificação**

- [ ] Navegador suporta `speechSynthesis`
- [ ] Há vozes disponíveis no sistema
- [ ] Volume do sistema não está mudo
- [ ] Volume do navegador não está mudo
- [ ] Não há outros áudios tocando
- [ ] Teste direto funciona no console
- [ ] Vozes em português estão instaladas
- [ ] Navegador está atualizado
- [ ] Cache do navegador foi limpo
- [ ] Sistema foi reiniciado

Seguindo estes passos, a síntese de voz deve funcionar corretamente!
