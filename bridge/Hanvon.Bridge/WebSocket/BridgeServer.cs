using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Hanvon.Bridge.Core;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing.Processing;

namespace Hanvon.Bridge.WebSocket;

/// <summary>
/// Servidor WebSocket que expõe a captura de assinatura para clientes web.
/// Endpoint: ws://127.0.0.1:{PORT}/ws
/// </summary>
public class BridgeServer
{
    private readonly ILogger<BridgeServer> _logger;
    private readonly CaptureService _captureService;
    private readonly BridgeConfiguration _config;

    // Clientes conectados
    private readonly ConcurrentDictionary<string, System.Net.WebSockets.WebSocket> _clients = new();

    public BridgeServer(
        ILogger<BridgeServer> logger,
        CaptureService captureService,
        BridgeConfiguration config)
    {
        _logger = logger;
        _captureService = captureService;
        _config = config;

        // Inscreve-se em eventos de captura
        _captureService.PointCaptured += OnPointCaptured;
        _captureService.ErrorOccurred += OnErrorOccurred;
        _captureService.CaptureStateChanged += OnCaptureStateChanged;
    }

    #region Handlers de Eventos

    private void OnPointCaptured(object? sender, NormalizedPoint point)
    {
        // Broadcast do ponto para todos os clientes conectados
        var message = new
        {
            type = "point",
            data = new
            {
                x = point.X,
                y = point.Y,
                pressure = point.Pressure,
                timestamp = point.Timestamp,
                penStatus = point.PenStatus
            }
        };

        BroadcastAsync(message).GetAwaiter().GetResult();
    }

    private void OnErrorOccurred(object? sender, string error)
    {
        var message = new { type = "error", message = error };
        BroadcastAsync(message).GetAwaiter().GetResult();
    }

    private void OnCaptureStateChanged(object? sender, bool isCapturing)
    {
        var message = new { type = "state", isCapturing };
        BroadcastAsync(message).GetAwaiter().GetResult();
    }

    #endregion

    #region WebSocket Handler

    /// <summary>
    /// Manipula conexões WebSocket recebidas.
    /// </summary>
    public async Task HandleWebSocketAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = 400;
            return;
        }

        // Valida origem (CORS para WebSocket)
        if (!ValidateOrigin(context))
        {
            _logger.LogWarning("Origem rejeitada: {Origin}", context.Request.Headers.Origin.ToString());
            context.Response.StatusCode = 403;
            await context.Response.WriteAsync("Origin not allowed");
            return;
        }

        var clientId = Guid.NewGuid().ToString();
        System.Net.WebSockets.WebSocket? webSocket = null;

        try
        {
            webSocket = await context.WebSockets.AcceptWebSocketAsync();
            _clients.TryAdd(clientId, webSocket);
            _logger.LogInformation("Cliente conectado: {ClientId}, Total: {Count}",
                clientId, _clients.Count);

            // Envia estado inicial
            await SendMessageAsync(webSocket, new
            {
                type = "connected",
                clientId,
                isCapturing = false
            });

            // Loop de recepção de mensagens
            await ReceiveLoopAsync(clientId, webSocket);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro no WebSocket para cliente {ClientId}", clientId);
        }
        finally
        {
            if (webSocket != null)
            {
                _clients.TryRemove(clientId, out _);
                if (webSocket.State == WebSocketState.Open)
                {
                    await webSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "Connection closed",
                        CancellationToken.None);
                }
                webSocket.Dispose();
            }
            _logger.LogInformation("Cliente desconectado: {ClientId}, Total: {Count}",
                clientId, _clients.Count);
        }
    }

    /// <summary>
    /// Valida a origem da requisição WebSocket.
    /// </summary>
    private bool ValidateOrigin(HttpContext context)
    {
        var origin = context.Request.Headers.Origin.ToString();

        if (string.IsNullOrWhiteSpace(origin))
        {
            // Permite conexões sem Origin (ex: ferramentas de teste)
            return true;
        }

        // Verifica se a origem está na lista permitida
        return _config.AllowedOrigins.Any(allowed =>
            origin.Equals(allowed, StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region Recepção de Mensagens

    /// <summary>
    /// Loop que recebe e processa mensagens de um cliente.
    /// </summary>
    private async Task ReceiveLoopAsync(string clientId, System.Net.WebSockets.WebSocket webSocket)
    {
        var buffer = new byte[4096];

        while (webSocket.State == WebSocketState.Open)
        {
            try
            {
                var result = await webSocket.ReceiveAsync(
                    new ArraySegment<byte>(buffer),
                    CancellationToken.None);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessClientMessageAsync(clientId, webSocket, message);
                }
            }
            catch (WebSocketException ex) when (ex.WebSocketErrorCode == WebSocketError.ConnectionClosedPrematurely)
            {
                _logger.LogWarning("Conexão fechada prematuramente para cliente {ClientId}", clientId);
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao receber mensagem de {ClientId}", clientId);
                break;
            }
        }
    }

    /// <summary>
    /// Processa mensagens recebidas do cliente.
    /// Comandos: "start", "stop", "save"
    /// </summary>
    private async Task ProcessClientMessageAsync(
        string clientId,
        System.Net.WebSockets.WebSocket webSocket,
        string message)
    {
        _logger.LogDebug("Mensagem de {ClientId}: {Message}", clientId, message);

        try
        {
            using var doc = JsonDocument.Parse(message);
            var root = doc.RootElement;

            if (!root.TryGetProperty("command", out var commandElement))
            {
                await SendErrorAsync(webSocket, "Missing 'command' field");
                return;
            }

            var command = commandElement.GetString();

            switch (command?.ToLowerInvariant())
            {
                case "start":
                    await HandleStartCommandAsync(webSocket);
                    break;

                case "stop":
                    await HandleStopCommandAsync(webSocket);
                    break;

                case "save":
                    await HandleSaveCommandAsync(webSocket);
                    break;

                case "ping":
                    await SendMessageAsync(webSocket, new { type = "pong" });
                    break;

                default:
                    await SendErrorAsync(webSocket, $"Unknown command: {command}");
                    break;
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON inválido de {ClientId}", clientId);
            await SendErrorAsync(webSocket, "Invalid JSON");
        }
    }

    #endregion

    #region Comandos

    private async Task HandleStartCommandAsync(System.Net.WebSockets.WebSocket webSocket)
    {
        var success = await _captureService.StartCaptureAsync();
        await SendMessageAsync(webSocket, new
        {
            type = "start_response",
            success,
            message = success ? "Capture started" : "Failed to start capture"
        });
    }

    private async Task HandleStopCommandAsync(System.Net.WebSockets.WebSocket webSocket)
    {
        var success = await _captureService.StopCaptureAsync();
        await SendMessageAsync(webSocket, new
        {
            type = "stop_response",
            success,
            message = success ? "Capture stopped" : "Failed to stop capture"
        });
    }

    private async Task HandleSaveCommandAsync(System.Net.WebSockets.WebSocket webSocket)
    {
        try
        {
            var points = _captureService.GetCurrentSessionPoints();

            if (points.Length == 0)
            {
                await SendErrorAsync(webSocket, "No points to save");
                return;
            }

            // Gera PNG a partir dos pontos
            var pngBase64 = await GeneratePngFromPointsAsync(points);

            // Serializa pontos como JSON
            var jsonPayload = JsonSerializer.Serialize(points, new JsonSerializerOptions
            {
                WriteIndented = false
            });

            // Calcula hashes para auditoria
            var pngHash = ComputeSha256(Convert.FromBase64String(
                pngBase64.Replace("data:image/png;base64,", "")));
            var jsonHash = ComputeSha256(Encoding.UTF8.GetBytes(jsonPayload));

            await SendMessageAsync(webSocket, new
            {
                type = "saved",
                png = pngBase64,
                json = jsonPayload,
                count = points.Length,
                pngHash,
                jsonHash,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            });

            _logger.LogInformation("Assinatura salva: {Count} pontos, PNG: {PngHash}, JSON: {JsonHash}",
                points.Length, pngHash, jsonHash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao salvar assinatura");
            await SendErrorAsync(webSocket, $"Save failed: {ex.Message}");
        }
    }

    #endregion

    #region Geração de Imagem

    /// <summary>
    /// Gera uma imagem PNG a partir dos pontos capturados.
    /// Usa ImageSharp para desenho.
    /// TODO: Instalar pacote SixLabors.ImageSharp ou implementar alternativa.
    /// </summary>
    private async Task<string> GeneratePngFromPointsAsync(NormalizedPoint[] points)
    {
        return await Task.Run(() =>
        {
            // TODO: Se não quiser depender de ImageSharp, pode gerar via System.Drawing
            // ou retornar apenas os pontos para o cliente desenhar no canvas.
            // Por ora, retornamos um placeholder

            using var image = new Image<Rgba32>(_config.CanvasWidth, _config.CanvasHeight);

            // Fundo branco
            image.Mutate(ctx => ctx.BackgroundColor(Color.White));

            // Desenha os pontos
            for (int i = 1; i < points.Length; i++)
            {
                var p1 = points[i - 1];
                var p2 = points[i];

                // Ignora se houve levantamento da caneta
                if (p1.PenStatus != 1 || p2.PenStatus != 1)
                    continue;

                // Espessura proporcional à pressão (1-3 pixels)
                var thickness = (float)(1 + p2.Pressure * 2);

                image.Mutate(ctx => ctx.DrawLine(
                    Color.Black,
                    thickness,
                    new PointF(p1.X, p1.Y),
                    new PointF(p2.X, p2.Y)));
            }

            using var ms = new MemoryStream();
            image.SaveAsPng(ms);
            var base64 = Convert.ToBase64String(ms.ToArray());
            return $"data:image/png;base64,{base64}";
        });
    }

    #endregion

    #region Helpers

    /// <summary>
    /// Envia uma mensagem para todos os clientes conectados.
    /// </summary>
    private async Task BroadcastAsync(object message)
    {
        var json = JsonSerializer.Serialize(message);
        var buffer = Encoding.UTF8.GetBytes(json);

        var tasks = _clients.Values
            .Where(ws => ws.State == WebSocketState.Open)
            .Select(ws => ws.SendAsync(
                new ArraySegment<byte>(buffer),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None));

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Envia uma mensagem para um cliente específico.
    /// </summary>
    private async Task SendMessageAsync(System.Net.WebSockets.WebSocket webSocket, object message)
    {
        if (webSocket.State != WebSocketState.Open)
            return;

        var json = JsonSerializer.Serialize(message);
        var buffer = Encoding.UTF8.GetBytes(json);

        await webSocket.SendAsync(
            new ArraySegment<byte>(buffer),
            WebSocketMessageType.Text,
            true,
            CancellationToken.None);
    }

    /// <summary>
    /// Envia uma mensagem de erro para um cliente.
    /// </summary>
    private async Task SendErrorAsync(System.Net.WebSockets.WebSocket webSocket, string error)
    {
        await SendMessageAsync(webSocket, new { type = "error", message = error });
    }

    /// <summary>
    /// Calcula SHA-256 de um array de bytes.
    /// </summary>
    private static string ComputeSha256(byte[] data)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(data);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }

    #endregion
}

#region Configuração

/// <summary>
/// Configuração do servidor WebSocket.
/// </summary>
public class BridgeConfiguration
{
    public int Port { get; set; } = 9123;
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
    public int CanvasWidth { get; set; } = 640;
    public int CanvasHeight { get; set; } = 480;
}

#endregion
