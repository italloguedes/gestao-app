using Hanvon.Bridge.Core;
using Hanvon.Bridge.WebSocket;

var builder = WebApplication.CreateBuilder(args);

// Configuração de logs
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Carrega configurações
var bridgeConfig = builder.Configuration
    .GetSection("Bridge")
    .Get<BridgeConfiguration>() ?? new BridgeConfiguration();

var captureConfig = builder.Configuration
    .GetSection("Capture")
    .Get<CaptureConfiguration>() ?? new CaptureConfiguration();

// Registra serviços
builder.Services.AddSingleton(bridgeConfig);
builder.Services.AddSingleton(captureConfig);
builder.Services.AddSingleton<CaptureService>();
builder.Services.AddSingleton<BridgeServer>();

// Configura Kestrel para escutar apenas localhost
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(bridgeConfig.Port);
});

var app = builder.Build();

// Habilita WebSockets
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

// Endpoint de saúde
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
    version = "1.0.0"
}));

// Endpoint WebSocket
app.Map("/ws", async context =>
{
    var bridgeServer = context.RequestServices.GetRequiredService<BridgeServer>();
    await bridgeServer.HandleWebSocketAsync(context);
});

// Endpoint raiz com informações
app.MapGet("/", () => Results.Text(
    """
    Hanvon ESP560 WebSocket Bridge
    ===============================

    WebSocket Endpoint: ws://127.0.0.1:9123/ws
    Health Check: http://127.0.0.1:9123/health

    Comandos suportados:
    - {"command": "start"}  - Inicia captura
    - {"command": "stop"}   - Para captura
    - {"command": "save"}   - Salva PNG + JSON
    - {"command": "ping"}   - Verifica conexão

    Eventos enviados ao cliente:
    - {"type": "point", "data": {...}}
    - {"type": "state", "isCapturing": bool}
    - {"type": "saved", "png": "...", "json": "..."}
    - {"type": "error", "message": "..."}
    """,
    "text/plain"));

// Inicializa o serviço de captura
var captureService = app.Services.GetRequiredService<CaptureService>();
var logger = app.Services.GetRequiredService<ILogger<Program>>();

logger.LogInformation("Iniciando Hanvon Bridge na porta {Port}...", bridgeConfig.Port);
logger.LogInformation("Origens permitidas: {Origins}",
    string.Join(", ", bridgeConfig.AllowedOrigins));

// Inicializa dispositivo em background
_ = Task.Run(async () =>
{
    try
    {
        logger.LogInformation("Inicializando dispositivo Hanvon...");
        var success = await captureService.InitializeAsync();

        if (success)
        {
            logger.LogInformation("✓ Dispositivo inicializado com sucesso");
        }
        else
        {
            logger.LogError("✗ Falha ao inicializar dispositivo");
            logger.LogError("Verifique se:");
            logger.LogError("  1. O dispositivo está conectado");
            logger.LogError("  2. Os drivers estão instalados");
            logger.LogError("  3. A DLL está no caminho correto");
            logger.LogError("  4. Nenhum outro aplicativo está usando o dispositivo");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Erro ao inicializar dispositivo");
    }
});

// Graceful shutdown
var lifetime = app.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStopping.Register(() =>
{
    logger.LogInformation("Encerrando Hanvon Bridge...");
    captureService.Dispose();
});

logger.LogInformation("Hanvon Bridge iniciado em http://127.0.0.1:{Port}", bridgeConfig.Port);
logger.LogInformation("WebSocket disponível em ws://127.0.0.1:{Port}/ws", bridgeConfig.Port);

app.Run();
