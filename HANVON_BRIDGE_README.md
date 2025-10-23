# Hanvon ESP560 WebSocket Bridge

> Arquitetura Web para captura de assinatura digital do Hanvon ESP560 via navegador

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Empacotamento](#empacotamento)
- [Segurança](#segurança)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

---

## 🎯 Visão Geral

Este projeto implementa uma solução **Browser/Server (B/S)** para captura de assinatura digital usando o dispositivo **Hanvon ESP560** (USB/RS-232, caneta EMR).

### Componentes

1. **Bridge Local** (.NET 8, C#, Windows)
   - Comunica com a DLL nativa do ESP560 via P/Invoke
   - Expõe servidor WebSocket em `ws://127.0.0.1:9123`
   - Captura pontos em tempo real e faz broadcast para clientes

2. **Frontend** (HTML/JS puro)
   - Interface web com `<canvas>` para **visualização em tempo real**
   - Conecta ao bridge via WebSocket
   - Exibe a assinatura sendo feita no **pad físico** em tempo real
   - Canvas com `pointer-events: none` (não aceita mouse)
   - Overlay animado com instruções para assinar no dispositivo
   - Salva PNG (base64) + JSON biométrico com hashes SHA-256

### Funcionalidades

- ✅ Captura de pontos com pressão, timestamp e status da caneta
- ✅ Desenho em tempo real no canvas proporcional à pressão (1-3px)
- ✅ Normalização de coordenadas (dispositivo → canvas)
- ✅ Filtro de pontos hover (configurable)
- ✅ Reconexão automática do WebSocket
- ✅ Validação de origem (CORS/Origin header)
- ✅ Geração de PNG e JSON com hashes SHA-256
- ✅ Logs estruturados
- ✅ Testes unitários

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Navegador Web                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  frontend/index.html                                   │ │
│  │  - Canvas 640x480                                      │ │
│  │  - WebSocket Client                                    │ │
│  │  - Desenho em tempo real                              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket
                       │ ws://127.0.0.1:9123/ws
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Bridge Local (Windows Service/App)              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  bridge/Hanvon.Bridge/                                 │ │
│  │  - Program.cs (ASP.NET Core Minimal API)              │ │
│  │  - WebSocket/BridgeServer.cs                          │ │
│  │  - Core/CaptureService.cs (Loop assíncrono)           │ │
│  │  - Interop/HanvonNative.cs (P/Invoke)                 │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ P/Invoke
                       │ DLL Nativa
                       ↓
┌─────────────────────────────────────────────────────────────┐
│           Hanvon ESP560 Device (USB/RS-232)                  │
│           Driver + SDK DLL                                   │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Inicialização**
   - Bridge inicializa SDK (`Init()`)
   - Abre dispositivo (`OpenDevice(deviceIndex)`)
   - Frontend conecta ao WebSocket

2. **Captura**
   - Cliente envia `{"command": "start"}`
   - Bridge chama `StartCapture()` na DLL
   - **Usuário assina no pad físico Hanvon ESP560 com a caneta EMR**
   - Loop assíncrono lê pontos via `ReadPoints()` do dispositivo
   - Pontos são normalizados e enviados via WebSocket
   - Frontend **visualiza** no canvas em tempo real (não aceita desenho com mouse)

3. **Salvamento**
   - Cliente envia `{"command": "stop"}`
   - Cliente envia `{"command": "save"}`
   - Bridge gera PNG a partir dos pontos
   - Calcula hashes SHA-256 do PNG e JSON
   - Retorna `{"type": "saved", "png": "...", "json": "...", "pngHash": "...", "jsonHash": "..."}`

---

## 📦 Requisitos

### Sistema

- **SO**: Windows 10/11 (x64)
- **.NET**: .NET 8 SDK ([Download](https://dot.net))
- **Dispositivo**: Hanvon ESP560 (USB ou RS-232)
- **Driver**: Driver/SDK do Hanvon instalado

### Para Desenvolvimento

- Visual Studio 2022+ ou VS Code + C# Extension
- PowerShell 7+
- Navegador moderno (Chrome, Edge, Firefox)

### Para Produção

- Apenas o executável compilado + DLL do Hanvon
- Não requer .NET Runtime (self-contained)

---

## 🚀 Instalação

### 1. Clone o Repositório

```bash
git clone <URL_DO_REPO>
cd <NOME_DO_REPO>
```

### 2. Instale o Driver/SDK do Hanvon

**⚠️ IMPORTANTE**: Antes de prosseguir, instale o driver e SDK fornecido pelo fabricante.

1. Conecte o dispositivo ESP560 via USB ou RS-232
2. Instale o driver conforme instruções do fabricante
3. Verifique se o dispositivo é reconhecido no Gerenciador de Dispositivos
4. Localize a DLL do SDK (ex: `HanvonSDK.dll`, `ESP560.dll`, etc.)

### 3. Configure a DLL

Edite `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`:

```csharp
// Linha 11: Substitua pelo nome real da DLL
private const string DllName = "SUA_DLL_AQUI.dll"; // Ex: "HanvonSDK.dll"
```

**Ajuste também as assinaturas das funções conforme a documentação do SDK:**

```csharp
// Exemplo: Se o SDK usar CallingConvention diferente ou parâmetros adicionais
[DllImport(DllName, CallingConvention = CallingConvention.StdCall)] // ou Cdecl
public static extern int Init();
```

**Ajuste a struct `SignaturePoint` conforme o SDK:**

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct SignaturePoint
{
    public int X;
    public int Y;
    public int Pressure;
    public int PenStatus;
    public long Timestamp;
    // Adicione outros campos se necessário (tilt, azimuth, etc)
}
```

### 4. Compile o Projeto

```powershell
cd bridge/Hanvon.Bridge
dotnet restore
dotnet build -c Release
```

---

## ⚙️ Configuração

### Arquivo `appsettings.json`

Localizado em `bridge/Hanvon.Bridge/appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "Bridge": {
    "Port": 9123,                           // Porta do WebSocket
    "AllowedOrigins": [                     // CORS/Origin check
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "CanvasWidth": 640,                     // Dimensões do canvas
    "CanvasHeight": 480
  },
  "Capture": {
    "DeviceIndex": 0,                       // Índice do dispositivo (0 para USB)
    "CanvasWidth": 640,
    "CanvasHeight": 480,
    "FilterHoverPoints": true,              // Filtrar pontos hover (penStatus=0)
    "PollingIntervalMs": 10                 // Intervalo de leitura (ms)
  }
}
```

### Configurações Importantes

| Campo | Descrição | Padrão |
|-------|-----------|--------|
| `Bridge.Port` | Porta do servidor WebSocket | `9123` |
| `Bridge.AllowedOrigins` | Lista de origens permitidas (CORS). Use `["*"]` para desenvolvimento. | `["http://localhost:3000"]` |
| `Capture.DeviceIndex` | Índice do dispositivo Hanvon (0 para primeiro) | `0` |
| `Capture.FilterHoverPoints` | Filtrar pontos quando caneta não toca (penStatus=0) | `true` |
| `Capture.PollingIntervalMs` | Intervalo de polling para leitura de pontos | `10` ms |

---

## 🎨 Uso

### Modo 1: Executar em Desenvolvimento

```powershell
# Terminal 1: Inicia o bridge
cd bridge/Hanvon.Bridge
dotnet run

# Terminal 2: Abra o frontend
cd frontend
# Abra index.html no navegador (ou use um servidor HTTP simples)
# Ex: python -m http.server 8000
# Acesse: http://localhost:8000/index.html
```

### Modo 2: Usar Executável Compilado

```powershell
# Compile
cd scripts
.\package.ps1 -BuildConfiguration Release

# Execute
cd ../publish
.\run.ps1
```

Abra `publish/frontend/index.html` no navegador.

### Modo 3: Windows Service

```powershell
# Compile
cd scripts
.\package.ps1 -ServiceMode

# Instale (requer Admin)
cd ../publish
.\install.ps1 -AsService

# Verifique status
Get-Service HanvonBridge

# Para desinstalar
Stop-Service HanvonBridge
sc.exe delete HanvonBridge
```

### Interface Web

1. **Conectar**: A interface conecta automaticamente ao bridge
2. **Iniciar Captura**: Clique em "Iniciar Captura"
3. **Assinar**: **ASSINE NO PAD FÍSICO HANVON ESP560**
   - Use a caneta EMR no dispositivo físico
   - ⚠️ **NÃO assine com o mouse na tela do computador**
   - O canvas é apenas **visualização em tempo real** do que está sendo assinado no pad
   - Um overlay amarelo animado aparecerá lembrando de assinar no dispositivo
4. **Parar Captura**: Clique em "Parar Captura"
5. **Salvar**: Clique em "Salvar Assinatura"
   - PNG e JSON são baixados automaticamente
   - Hashes SHA-256 são exibidos para auditoria

> **NOTA IMPORTANTE**: O canvas no navegador tem `pointer-events: none`, ou seja, não responde a cliques ou movimentos do mouse. Ele serve **exclusivamente para visualização** do que está sendo capturado no dispositivo físico Hanvon ESP560.

---

## 🛠️ Desenvolvimento

### Estrutura de Diretórios

```
.
├── bridge/
│   └── Hanvon.Bridge/
│       ├── Interop/
│       │   └── HanvonNative.cs          # P/Invoke para DLL
│       ├── Core/
│       │   └── CaptureService.cs         # Lógica de captura
│       ├── WebSocket/
│       │   └── BridgeServer.cs           # Servidor WebSocket
│       ├── Program.cs                    # Entry point
│       ├── appsettings.json              # Configuração
│       └── Hanvon.Bridge.csproj
├── frontend/
│   └── index.html                        # Interface web
├── scripts/
│   └── package.ps1                       # Script de empacotamento
├── tests/
│   └── Hanvon.Bridge.Tests/
│       ├── CaptureTests.cs               # Testes unitários
│       └── Hanvon.Bridge.Tests.csproj
└── README.md
```

### Adicionar Novos Campos à Struct

Se o SDK do Hanvon fornecer campos adicionais (ex: `Tilt`, `Azimuth`):

1. **Edite `HanvonNative.cs`**:

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct SignaturePoint
{
    public int X;
    public int Y;
    public int Pressure;
    public int PenStatus;
    public long Timestamp;
    public int Tilt;        // ← NOVO
    public int Azimuth;     // ← NOVO
}
```

2. **Edite `CaptureService.cs`** (método `NormalizePoint`):

```csharp
return new NormalizedPoint
{
    // ... campos existentes
    Tilt = raw.Tilt,
    Azimuth = raw.Azimuth
};
```

3. **Edite `BridgeServer.cs`** (handler `OnPointCaptured`):

```csharp
var message = new
{
    type = "point",
    data = new
    {
        // ... campos existentes
        tilt = point.Tilt,
        azimuth = point.Azimuth
    }
};
```

4. **Edite `frontend/index.html`** para usar os novos campos.

### Alternar Geração de PNG

Por padrão, usamos **SixLabors.ImageSharp** (requer pacote NuGet).

**Para usar apenas no cliente** (sem gerar PNG no servidor):

1. Remova dependência de ImageSharp do `BridgeServer.cs`
2. No comando `save`, retorne apenas o JSON:

```csharp
await SendMessageAsync(webSocket, new
{
    type = "saved",
    json = jsonPayload,
    count = points.Length
});
```

3. No `frontend/index.html`, gere PNG no navegador:

```javascript
const pngDataUrl = canvas.toDataURL('image/png');
// Download localmente
```

---

## 🧪 Testes

### Rodar Testes Unitários

```powershell
cd tests/Hanvon.Bridge.Tests
dotnet test
```

### Testes Disponíveis

- Normalização de coordenadas
- Normalização de pressão
- Cálculo de espessura de linha
- Serialização de structs P/Invoke
- Validação de códigos de erro
- Filtro de pontos hover

### Adicionar Novos Testes

Edite `tests/Hanvon.Bridge.Tests/CaptureTests.cs`:

```csharp
[Fact]
public void MeuNovoTeste()
{
    // Arrange
    var config = new CaptureConfiguration();

    // Act
    var result = MinhaFuncao();

    // Assert
    result.Should().Be(expectedValue);
}
```

---

## 📦 Empacotamento

### Script PowerShell

Use `scripts/package.ps1` para gerar pacote de distribuição:

```powershell
# Build Release standalone
.\package.ps1

# Build Debug com output customizado
.\package.ps1 -BuildConfiguration Debug -OutputPath "./dist"

# Build para Windows Service
.\package.ps1 -ServiceMode
```

### Conteúdo do Pacote

Após executar `package.ps1`, o diretório `publish/` contém:

```
publish/
├── Hanvon.Bridge.exe          # Executável standalone
├── appsettings.json           # Configuração
├── frontend/                  # Interface web
│   └── index.html
├── scripts/
│   ├── install.ps1            # Instalador
│   └── run.ps1                # Executor rápido
└── README.txt                 # Instruções
```

### Distribuição

1. **Copie a DLL do Hanvon** para `publish/`
2. **Zipar** a pasta `publish/`
3. **Distribuir** o ZIP para usuários finais
4. Usuários executam `run.ps1` ou `install.ps1 -AsService`

---

## 🔒 Segurança

### Restrições Implementadas

1. **Servidor Local Apenas**
   - WebSocket escuta apenas em `127.0.0.1` (não `0.0.0.0`)
   - Não acessível pela rede

2. **Validação de Origem (CORS)**
   - Checagem de `Origin` header no handshake WebSocket
   - Lista configurável em `appsettings.json`

3. **Porta Customizável**
   - Evita conflitos com outras aplicações
   - Configurável via `appsettings.json`

### Recomendações

- **Não exponha o bridge para a internet** (use sempre 127.0.0.1)
- **Restrinja AllowedOrigins** em produção (nunca use `*` em produção)
- **Use HTTPS** no frontend se estiver em domínio remoto
- **Valide dados biométricos** no backend final (hashes SHA-256)

### Auditoria

Os hashes SHA-256 do PNG e JSON permitem validar integridade:

```javascript
// Frontend exibe hashes após salvar
console.log('PNG Hash:', data.pngHash);
console.log('JSON Hash:', data.jsonHash);
```

Armazene esses hashes em banco de dados para verificação posterior.

---

## 🐛 Troubleshooting

### Bridge não inicia

**Erro**: "Falha ao inicializar SDK"

- Verifique se o driver do Hanvon está instalado
- Verifique se o dispositivo está conectado (USB/RS-232)
- Verifique se a DLL está no mesmo diretório do executável
- Verifique nome da DLL em `HanvonNative.cs`

**Erro**: "Could not load file or assembly"

- DLL do Hanvon não encontrada
- Copie a DLL para o diretório do executável
- Ou adicione ao PATH do Windows

### Frontend não conecta

**Erro**: "WebSocket connection failed"

- Verifique se o bridge está rodando
- Verifique se a porta está correta (9123)
- Verifique firewall do Windows
- Verifique logs do bridge

**Erro**: "Origin not allowed"

- Adicione a origem em `appsettings.json` → `Bridge.AllowedOrigins`
- Em desenvolvimento, use `["*"]`

### Nenhum ponto capturado

- Verifique se o dispositivo está em modo de captura
- Verifique se a caneta está próxima/tocando o dispositivo
- Ajuste `FilterHoverPoints` para `false` temporariamente
- Verifique logs do bridge para erros da DLL

### Pontos fora da escala

- Ajuste `DeviceInfo.Width` e `DeviceInfo.Height` em `CaptureService.cs`
- Verifique documentação do SDK para área ativa real
- Ajuste normalização em `NormalizePoint()`

### Testes falham

- Verifique se todos os pacotes NuGet estão restaurados
- Execute `dotnet restore` na pasta de testes
- Verifique versão do .NET SDK

---

## 📚 API Reference

### WebSocket Protocol

**Endpoint**: `ws://127.0.0.1:9123/ws`

#### Mensagens Cliente → Servidor

```json
// Iniciar captura
{"command": "start"}

// Parar captura
{"command": "stop"}

// Salvar assinatura
{"command": "save"}

// Ping (heartbeat)
{"command": "ping"}
```

#### Mensagens Servidor → Cliente

```json
// Conexão estabelecida
{
  "type": "connected",
  "clientId": "uuid",
  "isCapturing": false
}

// Novo ponto capturado
{
  "type": "point",
  "data": {
    "x": 100,
    "y": 200,
    "pressure": 0.75,
    "timestamp": 1234567890,
    "penStatus": 1  // 0=hover, 1=touching, 2=lift
  }
}

// Mudança de estado
{
  "type": "state",
  "isCapturing": true
}

// Assinatura salva
{
  "type": "saved",
  "png": "data:image/png;base64,...",
  "json": "[{...}]",
  "count": 1234,
  "pngHash": "sha256...",
  "jsonHash": "sha256...",
  "timestamp": 1234567890
}

// Resposta a comando
{
  "type": "start_response",
  "success": true,
  "message": "Capture started"
}

// Erro
{
  "type": "error",
  "message": "Error description"
}

// Pong (resposta ao ping)
{
  "type": "pong"
}
```

### HTTP Endpoints

**Health Check**

```
GET http://127.0.0.1:9123/health

Response:
{
  "status": "healthy",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

**Root (Informações)**

```
GET http://127.0.0.1:9123/

Response: (text/plain)
Hanvon ESP560 WebSocket Bridge
===============================
...
```

---

## 📝 TODOs e Placeholders

Antes de usar em produção, substitua os seguintes placeholders:

### 1. Nome da DLL

**Arquivo**: `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`
**Linha**: 11

```csharp
private const string DllName = "<<NOME_DA_DLL>>"; // ← SUBSTITUIR
```

### 2. Assinaturas das Funções

**Arquivo**: `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`
**Linhas**: 44-94

Ajuste conforme documentação do SDK:
- `CallingConvention` (Cdecl, StdCall, etc)
- Parâmetros das funções
- Tipos de retorno

### 3. Struct SignaturePoint

**Arquivo**: `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`
**Linhas**: 17-27

Ajuste campos conforme SDK:

```csharp
[StructLayout(LayoutKind.Sequential)]
public struct SignaturePoint
{
    public int X;
    public int Y;
    public int Pressure;
    public int PenStatus;
    public long Timestamp;
    // TODO: Adicionar outros campos (tilt, azimuth, etc)
}
```

### 4. Códigos de Erro

**Arquivo**: `bridge/Hanvon.Bridge/Interop/HanvonNative.cs`
**Linhas**: 102-108

Mapeie códigos de erro reais do SDK.

### 5. Área Ativa do Dispositivo

**Arquivo**: `bridge/Hanvon.Bridge/Core/CaptureService.cs`
**Linhas**: 145-149

Se `GetDeviceInfo()` falhar, ajuste valores padrão:

```csharp
// TODO: Ajustar valores padrão conforme seu dispositivo
_deviceInfo.Width = 640;   // ← Largura em mm ou pixels
_deviceInfo.Height = 480;  // ← Altura em mm ou pixels
_deviceInfo.MaxPressure = 1023; // ← Pressão máxima
```

### 6. Normalização de Coordenadas

**Arquivo**: `bridge/Hanvon.Bridge/Core/CaptureService.cs`
**Linhas**: 187-192

Se o SDK retornar coordenadas em mm, ajuste a normalização.

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie um branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Add MinhaFeature'`)
4. Push para o branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📄 Licença

[Especificar licença aqui]

---

## 📞 Suporte

Para problemas ou dúvidas:

- Abra uma issue no repositório
- Consulte a documentação do SDK Hanvon
- Verifique os logs do bridge em `appsettings.json` → `Logging.LogLevel`

---

## 🙏 Créditos

- **Hanvon Technology**: Fabricante do ESP560
- **.NET Foundation**: Framework .NET
- **SixLabors**: ImageSharp (geração de PNG)

---

**Desenvolvido com ❤️ para captura de assinatura digital**
