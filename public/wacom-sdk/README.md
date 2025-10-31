# Wacom Signature SDK - Instalação Manual

## 📥 Download Rápido

Baixe os arquivos do SDK diretamente:

**Opção 1: Download via NPX (Mais Fácil)**
```bash
cd public/wacom-sdk
npx @wacom/sdk-download signature
```

**Opção 2: Download Manual**

1. Acesse: https://developer.wacom.com
2. Faça login (crie conta gratuita se necessário)
3. Vá em "Downloads" → "Signature SDK for JavaScript"
4. Baixe o arquivo ZIP
5. Extraia os seguintes arquivos para esta pasta:
   - `signature_sdk.js`
   - `signature_sdk.wasm`

## 📁 Estrutura Final

Após o download, esta pasta deve conter:
```
public/wacom-sdk/
├── README.md (este arquivo)
├── signature_sdk.js
└── signature_sdk.wasm
```

## 🔑 Licença

O SDK requer uma licença. Você pode:

1. **Licença Gratuita de Teste**: Disponível ao criar conta em https://developer.wacom.com
2. **Licença Comercial**: Contate a Wacom para produção

Configure a licença no arquivo `.env.local`:
```
NEXT_PUBLIC_WACOM_LICENCE=sua_licenca_aqui
```

## ✅ Verificar Instalação

Execute no terminal (na raiz do projeto):
```bash
ls -lh public/wacom-sdk/
```

Deve mostrar:
- signature_sdk.js (~100KB)
- signature_sdk.wasm (~1-2MB)
