# ⚡ Instalação Rápida - Wacom STU-300

## 🎯 Passo a Passo (5 minutos)

### 1️⃣ Baixar SDK da Wacom (2 min)

**Acesse**: https://developer.wacom.com

1. Crie uma conta gratuita (se não tiver)
2. Faça login
3. Vá em **Downloads** → **Signature SDK for JavaScript**
4. Baixe o arquivo ZIP

### 2️⃣ Extrair Arquivos SDK (1 min)

Do arquivo ZIP baixado, copie 2 arquivos para a pasta `public/wacom-sdk/`:

```bash
# Os arquivos que você precisa copiar:
signature_sdk.js      # ~100KB
signature_sdk.wasm    # ~1-2MB
```

**Estrutura final**:
```
gestao-app/
└── public/
    └── wacom-sdk/
        ├── README.md
        ├── signature_sdk.js    ← COPIE AQUI
        └── signature_sdk.wasm  ← COPIE AQUI
```

### 3️⃣ Configurar Licença (1 min)

No portal da Wacom (https://developer.wacom.com), copie sua **licença de teste gratuita**.

Crie/edite o arquivo `.env.local` na raiz do projeto:

```bash
# Se o arquivo não existe, crie:
cp .env.example .env.local
```

Adicione esta linha:
```env
NEXT_PUBLIC_WACOM_LICENCE=SUA_LICENCA_AQUI
```

### 4️⃣ Reiniciar Servidor (30 seg)

```bash
# Parar o servidor (Ctrl+C se estiver rodando)

# Iniciar novamente
npm run dev
```

### 5️⃣ Testar! (1 min)

1. Conecte o **Wacom STU-300** via USB
2. Abra o dashboard
3. Clique em **"Entregar CIN"**
4. No modal, clique em **"Conectar Dispositivo"**
5. Aceite a permissão do navegador
6. Clique em **"Iniciar Captura"**
7. **Assine no pad físico!**

---

## ✅ Verificar Instalação

Execute no terminal:

```bash
# Verificar se os arquivos estão no lugar
ls -lh public/wacom-sdk/

# Deve mostrar:
# signature_sdk.js
# signature_sdk.wasm
```

```bash
# Verificar se a licença está configurada
cat .env.local | grep WACOM

# Deve mostrar:
# NEXT_PUBLIC_WACOM_LICENCE=...
```

---

## 🐛 Problemas Comuns

### ❌ "SDK Erro"
**Causa**: Arquivos SDK não estão em `public/wacom-sdk/`

**Solução**: Verifique se copiou os 2 arquivos (`signature_sdk.js` e `signature_sdk.wasm`)

### ❌ "Failed to set licence"
**Causa**: Licença inválida ou não configurada

**Solução**:
1. Verifique `.env.local` tem `NEXT_PUBLIC_WACOM_LICENCE=...`
2. Copie a licença correta do portal Wacom
3. Reinicie o servidor (`npm run dev`)

### ❌ "Dispositivo não detectado"
**Causa**: Wacom não conectado ou navegador não suporta WebHID

**Solução**:
1. Use Chrome ou Edge (Firefox não suporta WebHID)
2. Conecte o Wacom STU-300 via USB
3. Aceite a permissão quando o navegador pedir

---

## 📱 URLs Importantes

- **Portal Wacom**: https://developer.wacom.com
- **Documentação Completa**: `docs/INTEGRACAO_WACOM.md`
- **Configuração Dashboard**: `docs/SETUP_WACOM_DASHBOARD.md`

---

## 🚀 Pronto!

Depois desses 5 passos, você terá captura de assinatura biométrica funcionando com o Wacom STU-300!

**Dúvidas?** Consulte `docs/INTEGRACAO_WACOM.md` para documentação completa.
