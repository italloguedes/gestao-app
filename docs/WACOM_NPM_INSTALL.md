# Instalação do Wacom Signature SDK via NPM

## 📦 Instalação Rápida

### Passo 1: Configurar Registro Privado

O SDK Wacom está em um registro NPM privado. Configure o acesso:

```bash
# Opção A: Criar .npmrc na raiz do projeto
echo "@wacom:registry=https://npm.wacom.com/node-modules/" >> .npmrc
echo "//npm.wacom.com/node-modules/:_authToken=SEU_TOKEN_AQUI" >> .npmrc
echo "always-auth=true" >> .npmrc

# Opção B: Copiar o template
cp .npmrc.wacom.example .npmrc
# Depois edite .npmrc e substitua AUTH_TOKEN_HERE pelo seu token
```

### Passo 2: Obter Token de Autenticação

1. Acesse: https://developer.wacom.com
2. Faça login
3. Vá para sua **Dashboard**
4. Copie o **Auth Token** exibido
5. Cole no arquivo `.npmrc` (substitua `AUTH_TOKEN_HERE`)

### Passo 3: Instalar o Pacote

```bash
npm install @wacom/signature-sdk
```

Ou com yarn:

```bash
yarn add @wacom/signature-sdk
```

### Passo 4: Verificar Instalação

```bash
# Deve listar @wacom/signature-sdk
npm list @wacom/signature-sdk
```

---

## 🔐 Segurança

**⚠️ IMPORTANTE**: O arquivo `.npmrc` contém seu token privado!

Adicione ao `.gitignore`:

```bash
echo ".npmrc" >> .gitignore
```

**Nunca commite `.npmrc` no Git!**

---

## 📝 Uso no Código

Depois de instalado, o SDK está disponível globalmente via `window.sdkReady`:

```typescript
import '@wacom/signature-sdk';

// Aguardar SDK carregar
await window.sdkReady;

// Usar o SDK
const sigObj = new Module.SigObj();
const licenceValid = await sigObj.setLicence('SUA_LICENCA');
```

---

## 🆚 Comparação: Download Manual vs NPM

| Aspecto | Download Manual | NPM Package (⭐ Recomendado) |
|---------|-----------------|------------------------------|
| **Setup** | Copiar WASM para public/ | `npm install` |
| **Atualizações** | Manual | `npm update` |
| **Versionamento** | Difícil | Semver (`package.json`) |
| **CI/CD** | Commitar WASM no Git | Instala automaticamente |
| **Tamanho repo** | Grande (WASM ~2MB) | Pequeno (node_modules) |
| **Build** | Path relativo | Import direto |

**Use NPM sempre que possível!**

---

## 🐛 Troubleshooting

### Erro: 401 Unauthorized

**Causa**: Token inválido ou expirado.

**Solução**:
1. Verifique se o token está correto no `.npmrc`
2. Gere um novo token em https://developer.wacom.com
3. Atualize o `.npmrc`

### Erro: 404 Not Found

**Causa**: Registro não configurado.

**Solução**:
```bash
# Verifique se a linha está no .npmrc:
@wacom:registry=https://npm.wacom.com/node-modules/
```

### Erro: "Module not found"

**Causa**: Pacote não instalado.

**Solução**:
```bash
npm install @wacom/signature-sdk
```

---

## 📚 Próximos Passos

1. ✅ Configure `.npmrc`
2. ✅ Instale `@wacom/signature-sdk`
3. ✅ Adicione `.npmrc` ao `.gitignore`
4. ✅ Obtenha licença do SDK
5. ✅ Use `SignaturePadWacom` no dashboard

Consulte `docs/INTEGRACAO_WACOM.md` para o guia completo!
