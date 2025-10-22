# 🚀 Guia Rápido - Google OAuth

## ⚡ Configuração Expressa (5 minutos)

### 📋 Informações do Seu Projeto

**URL do Supabase:** `https://jbyiypkivxnxjsvebhqk.supabase.co`

**URL de Callback OAuth:** `https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback`

---

## 🔧 Passo 1: Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Vá em **APIs & Services** → **Credentials**
3. Clique em **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Selecione **Web application**
5. Preencha:

```
Nome: CIADI App

Authorized JavaScript origins:
http://localhost:3000

Authorized redirect URIs:
https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback
```

6. Clique em **CREATE**
7. ✅ Copie o **Client ID** e **Client Secret**

---

## 🔐 Passo 2: Supabase Dashboard

1. Acesse: https://app.supabase.com/
2. Selecione seu projeto: **jbyiypkivxnxjsvebhqk**
3. Vá em **Authentication** → **Providers**
4. Encontre **Google** e clique nele
5. Ative o toggle **Enable Sign in with Google**
6. Cole:
   - **Client ID**: (copiado do Google)
   - **Client Secret**: (copiado do Google)
7. Clique em **Save**

---

## 📝 Checklist de Verificação

- [ ] Projeto criado no Google Cloud Console
- [ ] OAuth Client ID criado
- [ ] Redirect URI configurada: `https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback`
- [ ] Client ID e Secret copiados
- [ ] Google Provider ativado no Supabase
- [ ] Client ID e Secret colados no Supabase
- [ ] Configurações salvas no Supabase

---

## ✅ Testar o Login

1. Execute: `npm run dev`
2. Acesse: `http://localhost:3000`
3. Clique em **Entrar com Google**
4. Autorize a aplicação
5. Você será redirecionado automaticamente!

---

## 🎯 URLs Importantes

| Recurso | URL |
|---------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| Supabase Dashboard | https://app.supabase.com/ |
| Seu Projeto Supabase | https://jbyiypkivxnxjsvebhqk.supabase.co |
| OAuth Callback | https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback |

---

## 💡 Dica Extra

Se você ainda não tem um domínio em produção, pode adicionar apenas o localhost por enquanto. Quando tiver um domínio, adicione:

**Authorized JavaScript origins:**
- `https://seu-dominio.com`

**Authorized redirect URIs:**
- Mantenha: `https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback`

---

## 🆘 Problemas Comuns

### Erro: "redirect_uri_mismatch"
➡️ Verifique se copiou exatamente: `https://jbyiypkivxnxjsvebhqk.supabase.co/auth/v1/callback`

### Erro: "Access blocked: This app's request is invalid"
➡️ Verifique se adicionou `http://localhost:3000` nos Authorized JavaScript origins

### Botão do Google não aparece
➡️ Verifique se o Google Provider está ATIVADO no Supabase (toggle verde)

---

**Pronto! 🎉 Seu login com Google está configurado!**
