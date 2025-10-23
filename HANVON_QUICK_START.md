# Hanvon ESP560 - Início Rápido

## ⚡ Setup em 5 Minutos

### 1️⃣ Pré-requisitos

- ✅ Windows 10/11 (x64)
- ✅ .NET 8 SDK instalado
- ✅ Dispositivo Hanvon ESP560 conectado
- ✅ Driver/SDK do Hanvon instalado

### 2️⃣ Configurar DLL

Edite `bridge/Hanvon.Bridge/Interop/HanvonNative.cs` linha 11:

```csharp
private const string DllName = "SUA_DLL_AQUI.dll"; // Ex: "HanvonSDK.dll"
```

### 3️⃣ Executar

```powershell
# Opção A: Desenvolvimento
cd bridge/Hanvon.Bridge
dotnet run

# Opção B: Compilar e rodar
cd scripts
.\package.ps1
cd ../publish
.\run.ps1
```

### 4️⃣ Usar Interface

1. Abra `frontend/index.html` no navegador
2. Clique em **"Iniciar Captura"**
3. **ASSINE NO PAD FÍSICO HANVON ESP560** (não no computador!)
   - Use a caneta EMR no dispositivo físico
   - O canvas mostra apenas a visualização em tempo real
4. Clique em **"Parar Captura"**
5. Clique em **"Salvar Assinatura"**
6. PNG + JSON serão baixados automaticamente

> ⚠️ **IMPORTANTE**: A assinatura deve ser feita no **dispositivo físico Hanvon ESP560**, não com o mouse na tela! O canvas do navegador é apenas para visualização em tempo real.

---

## 🔧 Configuração Essencial

Edite `bridge/Hanvon.Bridge/appsettings.json`:

```json
{
  "Bridge": {
    "Port": 9123,                    // ← Porta do WebSocket
    "AllowedOrigins": ["*"]          // ← Em dev: "*", em prod: lista específica
  },
  "Capture": {
    "DeviceIndex": 0,                // ← 0 para primeiro dispositivo
    "FilterHoverPoints": true        // ← true = filtrar hover
  }
}
```

---

## 📝 Checklist de Substituição

Antes de usar em produção, substitua:

- [ ] **Nome da DLL** em `HanvonNative.cs` linha 11
- [ ] **Assinaturas das funções** conforme SDK (CallingConvention, parâmetros)
- [ ] **Struct SignaturePoint** conforme SDK (adicionar campos se necessário)
- [ ] **Códigos de erro** conforme SDK
- [ ] **Área ativa do dispositivo** (Width, Height, MaxPressure) se GetDeviceInfo() falhar
- [ ] **AllowedOrigins** em produção (remover `"*"`)

---

## 🐛 Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| Bridge não inicia | Verifique se DLL está no diretório do executável |
| Frontend não conecta | Verifique se bridge está rodando na porta 9123 |
| Nenhum ponto capturado | Desabilite FilterHoverPoints temporariamente |
| Pontos fora da escala | Ajuste Width/Height em CaptureService.cs |

---

## 📚 Documentação Completa

Para documentação detalhada, consulte: **HANVON_BRIDGE_README.md**

---

## 🎯 Arquitetura em 1 Minuto

```
Navegador (index.html)
    ↓ WebSocket (ws://127.0.0.1:9123/ws)
Bridge (.NET 8, C#)
    ↓ P/Invoke
DLL Hanvon SDK
    ↓ USB/RS-232
Dispositivo ESP560
```

**Fluxo**:
1. Cliente envia `{"command": "start"}`
2. Bridge inicia captura via DLL
3. Pontos são lidos e enviados via WebSocket: `{"type": "point", "data": {...}}`
4. Frontend desenha em canvas
5. Cliente envia `{"command": "save"}`
6. Bridge retorna PNG (base64) + JSON + hashes SHA-256

---

**Boa captura! 🖊️✨**
