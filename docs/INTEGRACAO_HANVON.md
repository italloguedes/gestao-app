# Integração do Hanvon ESP560 no Dashboard

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Pré-requisitos](#pré-requisitos)
- [Passo a Passo](#passo-a-passo)
- [Exemplo de Uso](#exemplo-de-uso)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este guia explica como **substituir** a captura de assinatura **pela tela** (mouse/touch) pela captura do **dispositivo físico Hanvon ESP560** no seu dashboard.

### O que foi criado:

1. **`SignaturePadHanvon.tsx`**: Novo componente que captura do pad físico
2. **`SignaturePad.tsx`**: Componente antigo (mantido para backup)

### Diferenças:

| Aspecto | SignaturePad (antigo) | SignaturePadHanvon (novo) |
|---------|----------------------|--------------------------|
| Captura | Mouse/Touch na tela | Dispositivo físico Hanvon ESP560 |
| Dependência | `react-signature-canvas` | WebSocket para bridge Hanvon |
| Canvas | Interativo (desenha com mouse) | Apenas visualização (não aceita mouse) |
| Dados | Apenas PNG | PNG + JSON biométrico + hashes SHA-256 |
| Pressão | Simulada | Real do dispositivo |

---

## 📦 Pré-requisitos

### 1. Bridge Hanvon Rodando

O bridge **deve estar rodando** antes de usar o componente:

```powershell
# Opção A: Executar diretamente
cd bridge/Hanvon.Bridge
dotnet run

# Opção B: Usar executável compilado
cd publish
.\run.ps1

# Opção C: Rodar como Windows Service
.\install.ps1 -AsService
```

**Verifique se está rodando**:
- Acesse: http://127.0.0.1:9123/health
- Deve retornar: `{"status":"healthy",...}`

### 2. Dispositivo Hanvon Conectado

- Conecte o Hanvon ESP560 via USB ou RS-232
- Verifique se o driver está instalado
- O bridge deve iniciar sem erros

### 3. Configurar Origem Permitida (CORS)

No arquivo `bridge/Hanvon.Bridge/appsettings.json`:

```json
{
  "Bridge": {
    "Port": 9123,
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000"
    ]
  }
}
```

Adicione a origem do seu dashboard Next.js (geralmente `http://localhost:3000`).

---

## 🔧 Passo a Passo

### Passo 1: Importar o Novo Componente

No arquivo onde você usa a assinatura (ex: página de atendimento):

```tsx
// ANTES (antigo)
import SignaturePad from '@/components/SignaturePad';

// DEPOIS (novo)
import SignaturePadHanvon from '@/components/SignaturePadHanvon';
```

### Passo 2: Substituir no JSX

```tsx
{/* ANTES (antigo - captura pela tela) */}
<SignaturePad
  isOpen={showSignaturePad}
  onClose={() => setShowSignaturePad(false)}
  onSave={handleSaveSignature}
  title="Assinatura do Requerente"
  subtitle="Por favor, assine no espaço abaixo"
/>

{/* DEPOIS (novo - captura pelo pad físico) */}
<SignaturePadHanvon
  isOpen={showSignaturePad}
  onClose={() => setShowSignaturePad(false)}
  onSave={handleSaveSignature}
  title="Assinatura do Requerente"
  subtitle="Assine no dispositivo físico Hanvon ESP560"
  bridgeUrl="ws://127.0.0.1:9123/ws"  // Opcional, padrão já é este
/>
```

### Passo 3: Atualizar Handler de Salvamento (Opcional)

O novo componente retorna **dois parâmetros**:

```tsx
// ANTES (antigo)
const handleSaveSignature = (signatureDataUrl: string) => {
  console.log('PNG:', signatureDataUrl);
  // Salvar apenas PNG
};

// DEPOIS (novo - com dados biométricos)
const handleSaveSignature = (signatureDataUrl: string, biometricData?: string) => {
  console.log('PNG:', signatureDataUrl);
  console.log('Dados biométricos:', biometricData);

  // Salvar PNG e dados biométricos
  // biometricData é um JSON string com array de pontos
  // Ex: '[{"x":100,"y":200,"pressure":0.5,...},...]'
};
```

Se quiser manter a mesma assinatura:

```tsx
const handleSaveSignature = (signatureDataUrl: string, biometricData?: string) => {
  // Usar apenas o PNG (compatível com código antigo)
  saveToDatabase(signatureDataUrl);

  // Opcionalmente, salvar também os dados biométricos para auditoria
  if (biometricData) {
    saveAuditData(biometricData);
  }
};
```

---

## 💡 Exemplo de Uso Completo

```tsx
'use client';

import { useState } from 'react';
import SignaturePadHanvon from '@/components/SignaturePadHanvon';

export default function AtendimentoPage() {
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const handleSaveSignature = async (pngDataUrl: string, biometricJson?: string) => {
    try {
      // Salvar assinatura no banco
      const response = await fetch('/api/atendimentos/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atendimento_id: 123,
          signature_png: pngDataUrl,
          signature_biometric: biometricJson, // Opcional: dados biométricos
        })
      });

      if (response.ok) {
        alert('Assinatura salva com sucesso!');
        setShowSignaturePad(false);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar assinatura');
    }
  };

  return (
    <div>
      <h1>Atendimento #123</h1>

      <button
        onClick={() => setShowSignaturePad(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Capturar Assinatura do Requerente
      </button>

      {/* Modal de Assinatura com Hanvon */}
      <SignaturePadHanvon
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveSignature}
        title="Assinatura do Requerente"
        subtitle="Entregue o dispositivo Hanvon ESP560 ao requerente"
      />
    </div>
  );
}
```

---

## 🔄 Fluxo Completo

```
1. Usuário clica em "Capturar Assinatura do Requerente"
   └─> Modal SignaturePadHanvon abre

2. Modal conecta ao bridge WebSocket
   └─> Status muda para "Bridge Conectado" (verde)

3. Atendente clica em "Iniciar Captura"
   └─> Bridge inicia captura no dispositivo Hanvon
   └─> Overlay amarelo aparece: "ASSINE NO PAD"

4. Requerente assina no PAD FÍSICO com caneta EMR
   └─> Pontos são enviados via WebSocket
   └─> Canvas mostra visualização em tempo real
   └─> Contador de pontos aumenta

5. Atendente clica em "Parar Captura"
   └─> Bridge para a captura

6. Atendente clica em "Salvar Assinatura"
   └─> Bridge gera PNG + JSON biométrico + hashes
   └─> Dados são enviados para handleSaveSignature
   └─> Modal fecha automaticamente
```

---

## 🛠️ Troubleshooting

### Problema: "Bridge Desconectado" (vermelho)

**Causa**: Bridge não está rodando ou não é acessível.

**Solução**:
1. Verifique se o bridge está rodando:
   ```powershell
   # Teste com curl
   curl http://127.0.0.1:9123/health
   ```

2. Se não estiver rodando, inicie:
   ```powershell
   cd bridge/Hanvon.Bridge
   dotnet run
   ```

3. Verifique logs do bridge para erros

### Problema: "Origin not allowed"

**Causa**: A origem do dashboard não está permitida no bridge.

**Solução**:
Adicione a origem em `bridge/Hanvon.Bridge/appsettings.json`:

```json
{
  "Bridge": {
    "AllowedOrigins": [
      "http://localhost:3000"  // ← Adicione a porta do seu Next.js
    ]
  }
}
```

Reinicie o bridge após alterar.

### Problema: Nenhum ponto capturado

**Causa**: Dispositivo Hanvon não conectado ou driver não instalado.

**Solução**:
1. Verifique se o dispositivo está conectado (USB/RS-232)
2. Verifique no Gerenciador de Dispositivos do Windows
3. Instale o driver do Hanvon se necessário
4. Reinicie o bridge

### Problema: Canvas não desenha

**Causa**: Canvas tem `pointer-events: none` (comportamento esperado).

**Solução**:
- Isso é proposital! O canvas é apenas **visualização**.
- A assinatura deve ser feita no **pad físico Hanvon ESP560**.
- Se quiser desenhar com mouse (modo antigo), use `SignaturePad.tsx`.

### Problema: Erro "Could not load DLL"

**Causa**: DLL do Hanvon não foi configurada no bridge.

**Solução**:
1. Edite `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`
2. Substitua o nome da DLL na linha 11:
   ```csharp
   private const string DllName = "SUA_DLL_AQUI.dll";
   ```
3. Recompile o bridge

---

## 🔀 Modo Híbrido (Opcional)

Se quiser oferecer **ambas opções** (tela + pad):

```tsx
const [captureMode, setCaptureMode] = useState<'screen' | 'pad'>('screen');

return (
  <>
    {/* Seletor de modo */}
    <div>
      <label>
        <input
          type="radio"
          checked={captureMode === 'screen'}
          onChange={() => setCaptureMode('screen')}
        />
        Assinar na Tela (mouse/touch)
      </label>
      <label>
        <input
          type="radio"
          checked={captureMode === 'pad'}
          onChange={() => setCaptureMode('pad')}
        />
        Assinar no Pad Hanvon ESP560
      </label>
    </div>

    {/* Renderizar componente conforme modo */}
    {captureMode === 'screen' ? (
      <SignaturePad {...props} />
    ) : (
      <SignaturePadHanvon {...props} />
    )}
  </>
);
```

---

## 📚 Referências

- **README do Bridge**: `HANVON_BRIDGE_README.md`
- **Guia Rápido**: `HANVON_QUICK_START.md`
- **Componente Antigo**: `components/SignaturePad.tsx`
- **Componente Novo**: `components/SignaturePadHanvon.tsx`

---

## ✅ Checklist de Integração

Antes de colocar em produção:

- [ ] Bridge compilado e testado
- [ ] Dispositivo Hanvon conectado e funcionando
- [ ] DLL do SDK configurada corretamente
- [ ] AllowedOrigins configurado com origem do dashboard
- [ ] Componente SignaturePadHanvon importado
- [ ] Handler de salvamento atualizado (opcional: com dados biométricos)
- [ ] Testado fluxo completo (conectar → iniciar → assinar → parar → salvar)
- [ ] Verificado que PNG e JSON são salvos corretamente
- [ ] Documentado para outros desenvolvedores

---

**Dúvidas?** Consulte `HANVON_BRIDGE_README.md` ou abra uma issue no repositório.
