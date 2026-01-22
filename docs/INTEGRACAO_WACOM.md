# Integração do Wacom STU-300 com Signature SDK JavaScript

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação do SDK](#instalação-do-sdk)
- [Obter Licença](#obter-licença)
- [Integração no Dashboard](#integração-no-dashboard)
- [Exemplo Completo](#exemplo-completo)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Comparação: Hanvon vs Wacom](#comparação-hanvon-vs-wacom)

---

## 🎯 Visão Geral

Esta integração permite capturar assinaturas do **Wacom STU-300** (pad físico USB) diretamente no navegador usando o **Signature SDK for JavaScript** (WebAssembly).

### Diferenças da Abordagem Hanvon

| Aspecto | Hanvon ESP560 | Wacom STU-300 |
|---------|---------------|---------------|
| **Arquitetura** | Bridge .NET + WebSocket | SDK JavaScript no navegador |
| **Backend necessário** | ✅ Sim (Windows, .NET 8) | ❌ Não |
| **Tecnologia** | P/Invoke + WebSocket | WebAssembly + WebHID |
| **Compatibilidade** | Apenas Windows | Chrome/Edge 89+ (Windows/Mac/Linux) |
| **Formato de saída** | PNG + JSON custom | PNG + ISO/IEC 19794-7 (FSS) |
| **Licença** | Fornecida pelo fabricante | Wacom Developer Dashboard |
| **Binding de documento** | Via hash custom | Suporte nativo (Hash + RSA) |

---

## 🏗️ Arquitetura

### Hanvon (abordagem anterior):
```
Dashboard (Next.js)
    ↓ WebSocket
.NET Bridge (Windows)
    ↓ P/Invoke
DLL Hanvon
    ↓ USB
Hanvon ESP560
```

### Wacom (nova abordagem):
```
Dashboard (Next.js)
    ↓ Import SDK
signature_sdk.wasm (WebAssembly)
    ↓ WebHID API
Wacom STU-300 (USB)
```

**Vantagens**:
- ✅ Não precisa de backend .NET
- ✅ Funciona no Mac/Linux (não apenas Windows)
- ✅ Formato ISO padrão internacional
- ✅ Suporte nativo a criptografia e binding

---

## 📦 Pré-requisitos

### 1. Navegador Compatível

- **Chrome 89+** ou **Edge 89+**
- **WebHID API** habilitada (habilitado por padrão)
- **WebAssembly** suportado

### 2. Dispositivo Wacom STU-300

- Conectado via USB
- Driver instalado (Windows: geralmente automático)
- Funcionando corretamente

### 3. Conexão HTTPS

- Servidor deve usar **HTTPS** (ou `localhost` para dev)
- WebHID requer contexto seguro

---

## 🔽 Instalação do SDK

### ⭐ Método Recomendado: Pacote NPM

O Wacom SDK está disponível como pacote NPM privado. Este é o método **mais fácil e recomendado**.

#### Passo 1: Configurar Registro Privado

Crie um arquivo `.npmrc` na raiz do projeto:

```bash
# Copiar template
cp .npmrc.wacom.example .npmrc

# Ou criar manualmente
cat > .npmrc << 'EOF'
@wacom:registry=https://npm.wacom.com/node-modules/
//npm.wacom.com/node-modules/:_authToken=SEU_TOKEN_AQUI
always-auth=true
EOF
```

#### Passo 2: Obter Token de Autenticação

1. Acesse: https://developer.wacom.com
2. Faça login
3. Vá para **Dashboard**
4. Copie o **Auth Token**
5. Substitua `SEU_TOKEN_AQUI` no `.npmrc`

#### Passo 3: Instalar Pacote

```bash
npm install @wacom/signature-sdk
```

#### Passo 4: Adicionar ao .gitignore

**⚠️ IMPORTANTE**: Nunca commite `.npmrc` (contém token privado)!

```bash
echo ".npmrc" >> .gitignore
```

**Pronto!** O SDK será carregado automaticamente.

---

### 📦 Método Alternativo: Download Manual (Legado)

<details>
<summary>Clique para ver instruções de download manual</summary>

Se preferir não usar NPM:

1. Acesse: https://developer.wacom.com
2. Baixe: **Signature SDK for JavaScript**
3. Copie os arquivos para `public/wacom-sdk/`:

```
public/
└── wacom-sdk/
    ├── signature_sdk.wasm
    └── signature_sdk.js
```

4. Use `useNpmPackage={false}` no componente

</details>

---

## 🔑 Obter Licença

### Licença de Avaliação (Evaluation)

1. Acesse: https://developer.wacom.com/en-us/developer-dashboard/license-keys
2. Clique em **Request Evaluation License**
3. Preencha o formulário
4. Você receberá uma chave como:
   ```
   eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
   ```

**Limitações**:
- Válida por 90 dias
- Marca d'água "EVALUATION" nas assinaturas
- Apenas para desenvolvimento

### Licença Comercial

1. Entre em contato com a Wacom para cotação
2. Licença permanente sem marca d'água
3. Suporte comercial incluído

### Configurar Licença no Projeto

Crie um arquivo `.env.local`:

```bash
NEXT_PUBLIC_WACOM_LICENCE="sua_chave_aqui"
```

**⚠️ IMPORTANTE**: Nunca commite a licença no Git! Adicione `.env.local` ao `.gitignore`.

---

## 🔧 Integração no Dashboard

### Passo 1: Importar o Componente

```tsx
import SignaturePadWacom from '@/components/SignaturePadWacom';
import type { WacomSignatureResult } from '@/components/SignaturePadWacom';
```

### Passo 2: Usar no JSX

```tsx
const [showSignaturePad, setShowSignaturePad] = useState(false);

<SignaturePadWacom
  isOpen={showSignaturePad}
  onClose={() => setShowSignaturePad(false)}
  onSave={handleSaveSignature}
  licence={process.env.NEXT_PUBLIC_WACOM_LICENCE!}
  useNpmPackage={true}  // ⭐ Usa pacote NPM (padrão)
  who="João da Silva"  // Nome do signatário
  why="Aceite de termos"  // Razão da assinatura
  title="Assinatura do Requerente"
  subtitle="Por favor, assine no Wacom STU-300"
/>
```

**Nota**: `useNpmPackage={true}` é o padrão. Se instalou via NPM, não precisa especificar.

### Passo 3: Handler de Salvamento

```tsx
const handleSaveSignature = async (result: WacomSignatureResult) => {
  console.log('PNG:', result.png);  // Base64 data URL
  console.log('ISO:', result.iso);  // Uint8Array (formato FSS)
  console.log('Quem:', result.who);
  console.log('Por quê:', result.why);
  console.log('Quando:', result.when);
  console.log('Dimensões:', result.width, 'x', result.height);
  console.log('Binding:', result.hasDocumentBinding);

  // Salvar no banco
  await fetch('/api/assinatura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      png: result.png,
      iso: Array.from(result.iso),  // Converter Uint8Array para array
      who: result.who,
      why: result.why,
      when: result.when.toISOString(),
      width: result.width,
      height: result.height
    })
  });
};
```

---

## 💡 Exemplo Completo

```tsx
'use client';

import { useState } from 'react';
import SignaturePadWacom, { WacomSignatureResult } from '@/components/SignaturePadWacom';

export default function AtendimentoPage() {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [atendimento] = useState({
    id: 123,
    requerente: 'João da Silva',
    protocolo: '2026/001234'
  });

  const handleSaveSignature = async (result: WacomSignatureResult) => {
    try {
      // Converter ISO (Uint8Array) para Base64 para enviar via JSON
      const isoBase64 = btoa(String.fromCharCode(...result.iso));

      const response = await fetch('/api/atendimentos/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atendimento_id: atendimento.id,
          signature_png: result.png,
          signature_iso: isoBase64,
          signature_who: result.who,
          signature_why: result.why,
          signature_when: result.when.toISOString(),
          signature_width: result.width,
          signature_height: result.height,
          has_document_binding: result.hasDocumentBinding
        })
      });

      if (response.ok) {
        alert('Assinatura salva com sucesso!');
        setShowSignaturePad(false);
      } else {
        alert('Erro ao salvar assinatura');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar assinatura');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Atendimento #{atendimento.id}
      </h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Requerente</h2>
        <p className="mb-4">{atendimento.requerente}</p>

        <button
          onClick={() => setShowSignaturePad(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all"
        >
          Capturar Assinatura do Requerente
        </button>
      </div>

      {/* Modal de Assinatura Wacom */}
      <SignaturePadWacom
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveSignature}
        licence={process.env.NEXT_PUBLIC_WACOM_LICENCE!}
        who={atendimento.requerente}
        why={`Atendimento ${atendimento.protocolo}`}
        title="Assinatura do Requerente"
        subtitle="Entregue o dispositivo Wacom STU-300 ao requerente"
      />
    </div>
  );
}
```

---

## 📚 API Reference

### SignaturePadWacom Props

```typescript
interface SignaturePadWacomProps {
  isOpen: boolean;                    // Mostrar/ocultar modal
  onClose: () => void;                // Callback ao fechar
  onSave: (result: WacomSignatureResult) => void;  // Callback ao salvar
  title?: string;                     // Título do modal
  subtitle?: string;                  // Subtítulo
  licence: string;                    // Licença Wacom (obrigatório)
  useNpmPackage?: boolean;            // Se true (padrão), usa pacote NPM
  who?: string;                       // Nome do signatário
  why?: string;                       // Razão da assinatura
  documentHash?: Uint8Array;          // Hash do documento para binding
}
```

### WacomSignatureResult

```typescript
interface WacomSignatureResult {
  png: string;                        // Base64 PNG data URL
  iso: Uint8Array;                    // Formato ISO/IEC 19794-7 (FSS)
  who?: string;                       // Nome do signatário
  why?: string;                       // Razão da assinatura
  when: Date;                         // Data/hora da captura
  width: number;                      // Largura em pixels
  height: number;                     // Altura em pixels
  hasDocumentBinding: boolean;        // Se foi vinculada a um documento
}
```

### Hook useWacomSDK

```typescript
const {
  isLoaded,         // SDK carregado?
  isLicenceValid,   // Licença válida?
  error,            // Mensagem de erro
  sigObj,           // Objeto de assinatura
  module,           // Módulo Wacom
  loadSDK           // Função para carregar manualmente
} = useWacomSDK({
  licence: 'sua_licenca',
  sdkPath: '/wacom-sdk',
  autoLoad: true  // Carregar automaticamente
});
```

---

## 🐛 Troubleshooting

### Problema: "SDK não carregado"

**Causa**: Pacote NPM não instalado ou arquivos não encontrados.

**Solução (usando NPM)**:
1. Verifique se instalou: `npm list @wacom/signature-sdk`
2. Se não instalado: `npm install @wacom/signature-sdk`
3. Verifique `.npmrc` com token correto

**Solução (usando download manual)**:
1. Verifique se os arquivos estão em `public/wacom-sdk/`
2. Acesse http://localhost:3000/wacom-sdk/signature_sdk.js
3. Use `useNpmPackage={false}` no componente

### Problema: "Invalid licence"

**Causa**: Licença inválida ou expirada.

**Solução**:
1. Verifique se copiou a licença completa
2. Licença de avaliação expira em 90 dias
3. Solicite nova licença em https://developer.wacom.com

### Problema: "WebHID não suportado"

**Causa**: Navegador não suporta WebHID.

**Solução**:
- Use Chrome 89+ ou Edge 89+
- Firefox não suporta WebHID (use alternativa)

### Problema: "Dispositivo não detectado"

**Causa**: Wacom STU-300 não conectado ou driver não instalado.

**Solução**:
1. Conecte o dispositivo via USB
2. Instale o driver do Wacom (Windows: geralmente automático)
3. Clique em "Conectar Dispositivo" para solicitar permissão
4. Selecione o Wacom na lista

### Problema: "Failed to load WASM"

**Causa**: `signature_sdk.wasm` não carregou.

**Solução**:
1. Verifique se o arquivo existe em `public/wacom-sdk/`
2. Verifique o MIME type do servidor (deve ser `application/wasm`)
3. Em Next.js, o `public/` mapeia para `/` automaticamente

### Problema: "HTTPS required"

**Causa**: WebHID requer contexto seguro.

**Solução**:
- Em desenvolvimento: use `localhost` (não precisa HTTPS)
- Em produção: use HTTPS

---

## 🔄 Binding com Documento (Avançado)

Para vincular a assinatura a um documento específico (PDF, contrato, etc.):

```typescript
// 1. Gerar hash do documento
const documentBytes = await fetch('/api/documento/123').then(r => r.arrayBuffer());
const documentHash = new Uint8Array(await crypto.subtle.digest('SHA-256', documentBytes));

// 2. Passar para o componente
<SignaturePadWacom
  ...
  documentHash={documentHash}
/>

// 3. A assinatura será vinculada ao documento
// result.hasDocumentBinding === true
```

Isso permite verificar posteriormente se o documento foi alterado após a assinatura.

---

## 📊 Comparação: Hanvon vs Wacom

| Critério | Hanvon ESP560 | Wacom STU-300 |
|----------|---------------|---------------|
| **Backend necessário** | ✅ Sim (.NET 8, Windows) | ❌ Não |
| **Compatibilidade OS** | Windows apenas | Windows/Mac/Linux |
| **Navegadores** | Qualquer (usa WebSocket) | Chrome/Edge 89+ |
| **Setup** | Complexo (bridge + SDK) | Simples (SDK no browser) |
| **Formato saída** | PNG + JSON custom | PNG + ISO/IEC 19794-7 |
| **Licença** | Fabricante Hanvon | Wacom Developer Dashboard |
| **Custo SDK** | Variável | Gratuito (avaliação 90 dias) |
| **Binding documento** | Manual (hash custom) | Nativo (ISO standard) |
| **Criptografia** | Manual | Nativa (RSA, AES) |
| **Padrão internacional** | ❌ Não | ✅ Sim (ISO/IEC 19794-7) |
| **Validação jurídica** | Depende da implementação | Alta (padrão ISO) |

**Recomendação**:
- **Hanvon**: Se já tem infraestrutura Windows e precisa de Hanvon específico
- **Wacom**: Para novos projetos, maior compatibilidade e padrão internacional

---

## ✅ Checklist de Integração

- [ ] SDK baixado de developer.wacom.com
- [ ] Arquivos copiados para `public/wacom-sdk/`
- [ ] Licença obtida (avaliação ou comercial)
- [ ] Licença configurada em `.env.local`
- [ ] `.env.local` adicionado ao `.gitignore`
- [ ] Componente `SignaturePadWacom` importado
- [ ] Handler `onSave` implementado
- [ ] Testado em Chrome/Edge
- [ ] Dispositivo Wacom STU-300 conectado
- [ ] Permissão WebHID concedida
- [ ] Fluxo completo testado (conectar → capturar → salvar)
- [ ] PNG e ISO salvos corretamente no banco
- [ ] Documentado para outros desenvolvedores

---

## 📖 Recursos

- **Wacom Developer Portal**: https://developer.wacom.com
- **Signature SDK Docs**: https://developer.wacom.com/products/signature-sdk
- **WebHID API**: https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API
- **ISO/IEC 19794-7**: Padrão internacional de assinatura biométrica

---

## 📝 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `components/SignaturePadWacom.tsx` | Componente React |
| `hooks/useWacomSDK.ts` | Hook para gerenciar SDK |
| `lib/wacom-sdk.d.ts` | Definições TypeScript |
| `docs/INTEGRACAO_WACOM.md` | Esta documentação |

---

**Dúvidas?** Consulte a documentação oficial da Wacom ou abra uma issue no repositório.
