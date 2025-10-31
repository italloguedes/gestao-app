#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de empacotamento do Hanvon Bridge para Windows

.DESCRIPTION
    Este script compila e empacota o Hanvon Bridge como aplicação standalone
    ou Windows Service.

.PARAMETER BuildConfiguration
    Configuração de build (Debug ou Release). Padrão: Release

.PARAMETER ServiceMode
    Se especificado, configura para rodar como Windows Service

.PARAMETER OutputPath
    Caminho de saída do pacote. Padrão: ./publish

.EXAMPLE
    .\package.ps1
    Compila em modo Release para aplicação standalone

.EXAMPLE
    .\package.ps1 -ServiceMode
    Compila em modo Release para Windows Service

.EXAMPLE
    .\package.ps1 -BuildConfiguration Debug -OutputPath "./dist"
    Compila em modo Debug para o diretório ./dist
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('Debug', 'Release')]
    [string]$BuildConfiguration = 'Release',

    [Parameter()]
    [switch]$ServiceMode,

    [Parameter()]
    [string]$OutputPath = './publish'
)

# Configurações
$ErrorActionPreference = 'Stop'
$ProjectPath = Join-Path $PSScriptRoot '..' 'bridge' 'Hanvon.Bridge' 'Hanvon.Bridge.csproj'
$RootPath = Join-Path $PSScriptRoot '..'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hanvon Bridge - Empacotamento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se o projeto existe
if (-not (Test-Path $ProjectPath)) {
    Write-Error "Projeto não encontrado: $ProjectPath"
    exit 1
}

# Verifica se o .NET SDK está instalado
try {
    $dotnetVersion = dotnet --version
    Write-Host "✓ .NET SDK encontrado: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Error ".NET SDK não encontrado. Instale o .NET 8 SDK de https://dot.net"
    exit 1
}

# Cria diretório de saída
$OutputPath = Join-Path $RootPath $OutputPath
if (Test-Path $OutputPath) {
    Write-Host "Limpando diretório de saída..." -ForegroundColor Yellow
    Remove-Item -Path $OutputPath -Recurse -Force
}
New-Item -Path $OutputPath -ItemType Directory -Force | Out-Null

# Build e publicação
Write-Host ""
Write-Host "Compilando projeto..." -ForegroundColor Cyan
Write-Host "  Configuração: $BuildConfiguration" -ForegroundColor Gray
Write-Host "  Runtime: win-x64" -ForegroundColor Gray
Write-Host "  Single File: Sim" -ForegroundColor Gray
Write-Host ""

$publishArgs = @(
    'publish',
    $ProjectPath,
    '-c', $BuildConfiguration,
    '-r', 'win-x64',
    '--self-contained', 'true',
    '-p:PublishSingleFile=true',
    '-p:EnableCompressionInSingleFile=true',
    '-p:IncludeNativeLibrariesForSelfExtract=true',
    '-o', $OutputPath
)

try {
    & dotnet @publishArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Build falhou com código $LASTEXITCODE"
    }
    Write-Host ""
    Write-Host "✓ Compilação concluída" -ForegroundColor Green
} catch {
    Write-Error "Erro durante a compilação: $_"
    exit 1
}

# Copia arquivos adicionais
Write-Host ""
Write-Host "Copiando arquivos adicionais..." -ForegroundColor Cyan

# Copia frontend
$FrontendSource = Join-Path $RootPath 'frontend'
$FrontendDest = Join-Path $OutputPath 'frontend'
if (Test-Path $FrontendSource) {
    Copy-Item -Path $FrontendSource -Destination $FrontendDest -Recurse -Force
    Write-Host "  ✓ Frontend copiado" -ForegroundColor Green
}

# Copia scripts auxiliares
$ScriptsSource = Join-Path $RootPath 'scripts'
$ScriptsDest = Join-Path $OutputPath 'scripts'
New-Item -Path $ScriptsDest -ItemType Directory -Force | Out-Null

# Cria script de instalação
$InstallScriptContent = @'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Instala o Hanvon Bridge como aplicação de usuário ou Windows Service
#>

param(
    [Parameter()]
    [switch]$AsService,

    [Parameter()]
    [string]$ServiceName = 'HanvonBridge',

    [Parameter()]
    [string]$ServiceDisplayName = 'Hanvon ESP560 WebSocket Bridge',

    [Parameter()]
    [int]$Port = 9123
)

$ErrorActionPreference = 'Stop'
$ExePath = Join-Path $PSScriptRoot 'Hanvon.Bridge.exe'

if (-not (Test-Path $ExePath)) {
    Write-Error "Executável não encontrado: $ExePath"
    exit 1
}

if ($AsService) {
    Write-Host "Instalando como Windows Service..." -ForegroundColor Cyan

    # Verifica privilégios de administrador
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "É necessário executar como Administrador para instalar serviços"
        exit 1
    }

    # Remove serviço existente
    $existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Host "Removendo serviço existente..." -ForegroundColor Yellow
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        sc.exe delete $ServiceName
        Start-Sleep -Seconds 2
    }

    # Cria serviço
    Write-Host "Criando serviço $ServiceName..." -ForegroundColor Cyan
    sc.exe create $ServiceName binPath= $ExePath start= auto DisplayName= $ServiceDisplayName

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falha ao criar serviço"
        exit 1
    }

    # Configura descrição
    sc.exe description $ServiceName "Bridge WebSocket para captura de assinatura digital via Hanvon ESP560"

    # Inicia serviço
    Write-Host "Iniciando serviço..." -ForegroundColor Cyan
    Start-Service -Name $ServiceName

    Write-Host ""
    Write-Host "✓ Serviço instalado e iniciado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Comandos úteis:" -ForegroundColor Yellow
    Write-Host "  Start-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Stop-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Restart-Service $ServiceName" -ForegroundColor Gray
    Write-Host "  Get-Service $ServiceName" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Para desinstalar:" -ForegroundColor Yellow
    Write-Host "  Stop-Service $ServiceName; sc.exe delete $ServiceName" -ForegroundColor Gray

} else {
    Write-Host "Instalando como aplicação de usuário..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para executar o bridge, use:" -ForegroundColor Yellow
    Write-Host "  .\Hanvon.Bridge.exe" -ForegroundColor Gray
    Write-Host ""
    Write-Host "O bridge estará disponível em:" -ForegroundColor Yellow
    Write-Host "  WebSocket: ws://127.0.0.1:$Port/ws" -ForegroundColor Gray
    Write-Host "  Health: http://127.0.0.1:$Port/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Abra o frontend em:" -ForegroundColor Yellow
    Write-Host "  .\frontend\index.html" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✓ Instalação concluída!" -ForegroundColor Green
'@

$InstallScriptPath = Join-Path $OutputPath 'install.ps1'
Set-Content -Path $InstallScriptPath -Value $InstallScriptContent -Encoding UTF8
Write-Host "  ✓ Script de instalação criado" -ForegroundColor Green

# Cria script de execução rápida
$RunScriptContent = @'
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Executa o Hanvon Bridge rapidamente
#>

$ErrorActionPreference = 'Stop'
$ExePath = Join-Path $PSScriptRoot 'Hanvon.Bridge.exe'

if (-not (Test-Path $ExePath)) {
    Write-Error "Executável não encontrado: $ExePath"
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hanvon ESP560 WebSocket Bridge" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WebSocket: ws://127.0.0.1:9123/ws" -ForegroundColor Yellow
Write-Host "Health: http://127.0.0.1:9123/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Abra o frontend em: frontend\index.html" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar" -ForegroundColor Gray
Write-Host ""

& $ExePath
'@

$RunScriptPath = Join-Path $OutputPath 'run.ps1'
Set-Content -Path $RunScriptPath -Value $RunScriptContent -Encoding UTF8
Write-Host "  ✓ Script de execução criado" -ForegroundColor Green

# Cria README do pacote
$PackageReadmeContent = @'
# Hanvon ESP560 WebSocket Bridge - Pacote de Distribuição

Este pacote contém o Hanvon Bridge compilado e pronto para uso.

## Conteúdo

- `Hanvon.Bridge.exe` - Executável principal
- `appsettings.json` - Configurações
- `frontend/` - Interface web para captura
- `install.ps1` - Script de instalação
- `run.ps1` - Script de execução rápida

## Instalação Rápida

### Como Aplicação de Usuário

```powershell
.\run.ps1
```

Abra `frontend/index.html` no navegador.

### Como Windows Service

```powershell
.\install.ps1 -AsService
```

**Requer privilégios de administrador.**

## Configuração

Edite `appsettings.json` para configurar:

- Porta do servidor
- Origens permitidas (CORS)
- Índice do dispositivo
- Dimensões do canvas

## Requisitos

- Windows 10/11 (x64)
- Driver e SDK do Hanvon ESP560 instalados
- DLL do Hanvon no mesmo diretório ou no PATH

## Suporte

Para problemas ou dúvidas, consulte o README principal do projeto.
'@

$PackageReadmePath = Join-Path $OutputPath 'README.txt'
Set-Content -Path $PackageReadmePath -Value $PackageReadmeContent -Encoding UTF8
Write-Host "  ✓ README do pacote criado" -ForegroundColor Green

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Empacotamento Concluído!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pacote criado em: $OutputPath" -ForegroundColor Green
Write-Host ""
Write-Host "Conteúdo:" -ForegroundColor Yellow
Get-ChildItem -Path $OutputPath -File | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name) ($size MB)" -ForegroundColor Gray
}
Get-ChildItem -Path $OutputPath -Directory | ForEach-Object {
    Write-Host "  $($_.Name)/ (diretório)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Copie a DLL do Hanvon para $OutputPath" -ForegroundColor Gray
Write-Host "  2. Execute: cd $OutputPath && .\run.ps1" -ForegroundColor Gray
Write-Host "  3. Abra frontend\index.html no navegador" -ForegroundColor Gray
Write-Host ""
