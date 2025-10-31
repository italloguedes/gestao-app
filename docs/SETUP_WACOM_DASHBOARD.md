# Configuração do Wacom STU-300 no Dashboard

## ✅ Alterações Concluídas

O dashboard foi atualizado para usar captura de assinatura do dispositivo físico **Wacom STU-300** ao invés de captura por tela (mouse/touch).

### Arquivos Modificados

1. **app/dashboard/page.tsx**
   - Substituído `SignaturePad` por `SignaturePadWacom`
   - Atualizado `handleSaveSignature` para aceitar `WacomSignatureResult`
   - Adicionado estado para armazenar dados ISO/IEC 19794-7
   - Configurado props: `licence`, `who`, `why`, `useNpmPackage`

2. **.env.example**
   - Adicionado `NEXT_PUBLIC_WACOM_LICENCE` com documentação

---

## 📋 Próximos Passos (Configure o Ambiente)

### 1. Instalar Wacom SDK via NPM

```bash
# Passo 1: Criar arquivo .npmrc
cp .npmrc.wacom.example .npmrc

# Passo 2: Editar .npmrc e substituir AUTH_TOKEN_HERE
# Obtenha o token em: https://developer.wacom.com (faça login e copie do dashboard)
nano .npmrc

# Passo 3: Instalar o pacote
npm install @wacom/signature-sdk
```

**⚠️ IMPORTANTE**: O arquivo `.npmrc` já está no `.gitignore` e NUNCA deve ser commitado!

### 2. Configurar Licença do SDK

```bash
# Criar arquivo .env.local (se ainda não existe)
cp .env.example .env.local

# Editar e adicionar a licença Wacom
# Obtenha em: https://developer.wacom.com (mesmo dashboard onde pegou o auth token)
nano .env.local
```

No `.env.local`, configure:

```env
NEXT_PUBLIC_WACOM_LICENCE=sua_licenca_wacom_aqui
```

### 3. Verificar Instalação

```bash
# Verificar se o pacote foi instalado
npm list @wacom/signature-sdk

# Deve mostrar algo como:
# gestao-app@0.1.0
# └── @wacom/signature-sdk@x.x.x
```

---

## 🔧 Como Funciona Agora

### Fluxo de Assinatura Atualizado

1. **Usuário clica em "Entregar CIN"**
   - Modal de assinatura abre (`SignaturePadWacom`)

2. **Dispositivo Wacom é detectado**
   - Usando WebHID API (Chrome/Edge)
   - STU-300 conectado via USB

3. **Usuário assina no pad físico**
   - Caneta captura: posição XY, pressão, temporização
   - Canvas mostra preview em tempo real
   - **NÃO é possível assinar com mouse/touch**

4. **Ao clicar "Salvar"**
   - Gera PNG (imagem da assinatura)
   - Gera ISO/IEC 19794-7 (dados biométricos criptografados)
   - Retorna `WacomSignatureResult`:
     ```typescript
     {
       png: string;           // Base64 PNG para PDF
       iso: Uint8Array;       // ISO 19794-7 para auditoria
       who: string;           // Nome do signatário
       why: string;           // Razão da assinatura
       when: Date;            // Timestamp
       width: number;
       height: number;
       hasDocumentBinding: boolean;
     }
     ```

5. **Dados são salvos**
   - PNG: Salvo em `assinatura_base64` (Supabase)
   - ISO: Salvo em `assinaturaIsoData` (estado React)
   - PDF é gerado com a assinatura PNG

---

## 🔐 Segurança e Conformidade

### Dados Capturados

- **PNG**: Imagem visual para documentos
- **ISO/IEC 19794-7**: Dados biométricos (pressão, tempo, velocidade)
- **Who/Why/When**: Metadados para auditoria
- **Document Binding**: Hash SHA-256 opcional para vincular assinatura ao documento

### Vantagens sobre Mouse/Touch

| Aspecto | Mouse/Touch (Antigo) | Wacom STU-300 (Novo) |
|---------|----------------------|----------------------|
| **Autenticidade** | Baixa (qualquer um desenha) | Alta (biometria real) |
| **Dados** | Apenas PNG | PNG + ISO biométrico |
| **Auditoria** | Limitada | Completa (pressão, tempo) |
| **Conformidade** | Nenhuma | ISO/IEC 19794-7 |
| **UX** | Assinar com mouse (ruim) | Assinar com caneta (natural) |

---

## 🐛 Troubleshooting

### Erro: "SDK não carregado"

**Causa**: Pacote não instalado ou licença inválida.

**Solução**:
1. Verifique instalação: `npm list @wacom/signature-sdk`
2. Verifique licença em `.env.local`
3. Reinicie servidor: `npm run dev`

### Erro: "Dispositivo não detectado"

**Causa**: WebHID não suportado ou dispositivo desconectado.

**Solução**:
1. Use Chrome/Edge (Firefox não suporta WebHID)
2. Conecte Wacom STU-300 via USB
3. Aceite permissão do navegador ao abrir modal

### Erro: "401 Unauthorized" ao instalar SDK

**Causa**: Auth token inválido no `.npmrc`.

**Solução**:
1. Acesse https://developer.wacom.com
2. Faça login
3. Copie novo token do dashboard
4. Atualize `.npmrc`
5. Rode `npm install @wacom/signature-sdk` novamente

---

## 📚 Documentação Relacionada

- **Instalação NPM**: `docs/WACOM_NPM_INSTALL.md`
- **Integração Completa**: `docs/INTEGRACAO_WACOM.md`
- **Componente**: `components/SignaturePadWacom.tsx`
- **Hook SDK**: `hooks/useWacomSDK.ts`

---

## 🎯 Próxima Implementação (Opcional)

### Salvar ISO Data no Banco

Atualmente, o ISO data é capturado mas não persiste no banco. Para salvar:

1. **Adicionar coluna no Supabase**:
```sql
ALTER TABLE atendimentos
ADD COLUMN assinatura_iso_base64 TEXT;
```

2. **Atualizar handleSaveSignature** (linha ~251):
```typescript
// Converter ISO para Base64
const isoBase64 = btoa(String.fromCharCode(...result.iso));

const { error } = await supabase
  .from('atendimentos')
  .update({
    // ... outros campos
    assinatura_base64: result.png,
    assinatura_iso_base64: isoBase64, // ← NOVO
  })
  .eq('id', selectedAtendimento.id);
```

Isso permitirá auditoria completa com dados biométricos no futuro!

---

**✅ Commit**: `59787ea` - "Substituir captura de assinatura por tela com Wacom STU-300"
