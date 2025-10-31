using System.Collections.Concurrent;
using System.Diagnostics;
using Hanvon.Bridge.Interop;

namespace Hanvon.Bridge.Core;

/// <summary>
/// Serviço responsável pela captura assíncrona de pontos de assinatura.
/// Gerencia o ciclo de vida do dispositivo e notifica listeners via eventos.
/// </summary>
public class CaptureService : IDisposable
{
    private readonly ILogger<CaptureService> _logger;
    private readonly CaptureConfiguration _config;

    private IntPtr _deviceHandle = IntPtr.Zero;
    private bool _isCapturing = false;
    private bool _isInitialized = false;
    private CancellationTokenSource? _captureCts;

    // Informações do dispositivo
    private HanvonNative.DeviceInfo _deviceInfo;

    // Fila thread-safe para broadcast de pontos
    private readonly ConcurrentQueue<NormalizedPoint> _pointQueue = new();

    // Lista de pontos capturados na sessão atual
    private readonly List<NormalizedPoint> _currentSessionPoints = new();
    private readonly object _sessionLock = new();

    #region Eventos

    /// <summary>
    /// Disparado quando um novo ponto é capturado.
    /// </summary>
    public event EventHandler<NormalizedPoint>? PointCaptured;

    /// <summary>
    /// Disparado quando ocorre um erro durante a captura.
    /// </summary>
    public event EventHandler<string>? ErrorOccurred;

    /// <summary>
    /// Disparado quando o estado de captura muda.
    /// </summary>
    public event EventHandler<bool>? CaptureStateChanged;

    #endregion

    public CaptureService(ILogger<CaptureService> logger, CaptureConfiguration config)
    {
        _logger = logger;
        _config = config;
    }

    #region Inicialização e Abertura

    /// <summary>
    /// Inicializa o SDK e abre conexão com o dispositivo.
    /// </summary>
    public async Task<bool> InitializeAsync()
    {
        if (_isInitialized)
        {
            _logger.LogWarning("SDK já inicializado");
            return true;
        }

        try
        {
            _logger.LogInformation("Inicializando SDK Hanvon...");

            // Inicializa o SDK
            var initResult = HanvonNative.Init();
            if (initResult != HanvonNative.SUCCESS)
            {
                _logger.LogError("Falha ao inicializar SDK: {Error}",
                    HanvonNative.GetErrorMessage(initResult));
                return false;
            }

            // Aguarda um pouco para o SDK estabilizar
            await Task.Delay(500);

            // Abre o dispositivo
            _logger.LogInformation("Abrindo dispositivo {DeviceIndex}...", _config.DeviceIndex);
            _deviceHandle = HanvonNative.OpenDevice(_config.DeviceIndex);

            if (_deviceHandle == IntPtr.Zero || _deviceHandle == new IntPtr(-1))
            {
                _logger.LogError("Falha ao abrir dispositivo");
                HanvonNative.Uninit();
                return false;
            }

            // Obtém informações do dispositivo
            var infoResult = HanvonNative.GetDeviceInfo(_deviceHandle, ref _deviceInfo);
            if (infoResult == HanvonNative.SUCCESS)
            {
                _logger.LogInformation(
                    "Dispositivo conectado: {Name}, Área: {Width}x{Height}, Max Pressure: {Pressure}, Serial: {Serial}",
                    _deviceInfo.DeviceName,
                    _deviceInfo.Width,
                    _deviceInfo.Height,
                    _deviceInfo.MaxPressure,
                    _deviceInfo.SerialNumber);
            }
            else
            {
                _logger.LogWarning("Não foi possível obter informações do dispositivo");
                // Define valores padrão se GetDeviceInfo falhar
                // TODO: Ajustar valores padrão conforme seu dispositivo
                _deviceInfo.Width = 640;
                _deviceInfo.Height = 480;
                _deviceInfo.MaxPressure = 1023;
            }

            _isInitialized = true;
            _logger.LogInformation("SDK inicializado com sucesso");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro durante inicialização");
            return false;
        }
    }

    #endregion

    #region Controle de Captura

    /// <summary>
    /// Inicia a captura de assinatura.
    /// </summary>
    public async Task<bool> StartCaptureAsync()
    {
        if (!_isInitialized)
        {
            _logger.LogError("SDK não inicializado");
            return false;
        }

        if (_isCapturing)
        {
            _logger.LogWarning("Captura já em andamento");
            return true;
        }

        try
        {
            _logger.LogInformation("Iniciando captura...");

            var result = HanvonNative.StartCapture(_deviceHandle);
            if (result != HanvonNative.SUCCESS)
            {
                _logger.LogError("Falha ao iniciar captura: {Error}",
                    HanvonNative.GetErrorMessage(result));
                return false;
            }

            // Limpa pontos da sessão anterior
            lock (_sessionLock)
            {
                _currentSessionPoints.Clear();
            }

            _isCapturing = true;
            CaptureStateChanged?.Invoke(this, true);

            // Inicia loop de leitura em background
            _captureCts = new CancellationTokenSource();
            _ = Task.Run(() => CaptureLoopAsync(_captureCts.Token), _captureCts.Token);

            _logger.LogInformation("Captura iniciada");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao iniciar captura");
            return false;
        }
    }

    /// <summary>
    /// Para a captura de assinatura.
    /// </summary>
    public async Task<bool> StopCaptureAsync()
    {
        if (!_isCapturing)
        {
            _logger.LogWarning("Nenhuma captura em andamento");
            return true;
        }

        try
        {
            _logger.LogInformation("Parando captura...");

            // Cancela o loop de captura
            _captureCts?.Cancel();
            await Task.Delay(100); // Aguarda loop finalizar

            var result = HanvonNative.StopCapture(_deviceHandle);
            if (result != HanvonNative.SUCCESS)
            {
                _logger.LogWarning("Aviso ao parar captura: {Error}",
                    HanvonNative.GetErrorMessage(result));
            }

            _isCapturing = false;
            CaptureStateChanged?.Invoke(this, false);

            _logger.LogInformation("Captura parada. Total de pontos: {Count}",
                _currentSessionPoints.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao parar captura");
            return false;
        }
    }

    #endregion

    #region Loop de Captura

    /// <summary>
    /// Loop assíncrono que lê pontos do dispositivo continuamente.
    /// </summary>
    private async Task CaptureLoopAsync(CancellationToken ct)
    {
        const int bufferSize = 128;
        var buffer = new HanvonNative.SignaturePoint[bufferSize];
        var sw = Stopwatch.StartNew();

        _logger.LogInformation("Loop de captura iniciado");

        try
        {
            while (!ct.IsCancellationRequested && _isCapturing)
            {
                try
                {
                    // Lê pontos disponíveis
                    var result = HanvonNative.ReadPoints(
                        _deviceHandle,
                        buffer,
                        bufferSize,
                        out int pointsRead);

                    if (result != HanvonNative.SUCCESS)
                    {
                        _logger.LogWarning("Erro ao ler pontos: {Error}",
                            HanvonNative.GetErrorMessage(result));
                        await Task.Delay(50, ct);
                        continue;
                    }

                    if (pointsRead > 0)
                    {
                        for (int i = 0; i < pointsRead; i++)
                        {
                            var rawPoint = buffer[i];

                            // Filtra pontos de hover se configurado
                            if (_config.FilterHoverPoints && rawPoint.PenStatus == 0)
                                continue;

                            // Normaliza o ponto para coordenadas do canvas
                            var normalized = NormalizePoint(rawPoint);

                            // Adiciona à sessão
                            lock (_sessionLock)
                            {
                                _currentSessionPoints.Add(normalized);
                            }

                            // Enfileira para broadcast
                            _pointQueue.Enqueue(normalized);

                            // Dispara evento
                            PointCaptured?.Invoke(this, normalized);
                        }
                    }

                    // Polling interval
                    await Task.Delay(_config.PollingIntervalMs, ct);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro no loop de captura");
                    ErrorOccurred?.Invoke(this, ex.Message);
                    await Task.Delay(100, ct);
                }
            }
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation("Loop de captura finalizado após {Elapsed}ms", sw.ElapsedMilliseconds);
        }
    }

    /// <summary>
    /// Normaliza um ponto bruto para coordenadas do canvas.
    /// TODO: Ajustar conforme escala real do dispositivo (mm vs pixels).
    /// </summary>
    private NormalizedPoint NormalizePoint(HanvonNative.SignaturePoint raw)
    {
        // Calcula escala: dispositivo -> canvas
        double scaleX = (double)_config.CanvasWidth / _deviceInfo.Width;
        double scaleY = (double)_config.CanvasHeight / _deviceInfo.Height;

        // Normaliza pressão para 0-1
        double normalizedPressure = _deviceInfo.MaxPressure > 0
            ? (double)raw.Pressure / _deviceInfo.MaxPressure
            : 0.5;

        return new NormalizedPoint
        {
            X = (int)(raw.X * scaleX),
            Y = (int)(raw.Y * scaleY),
            Pressure = normalizedPressure,
            PenStatus = raw.PenStatus,
            Timestamp = raw.Timestamp,
            RawX = raw.X,
            RawY = raw.Y,
            RawPressure = raw.Pressure
        };
    }

    #endregion

    #region Acesso aos Dados

    /// <summary>
    /// Obtém todos os pontos capturados na sessão atual.
    /// </summary>
    public NormalizedPoint[] GetCurrentSessionPoints()
    {
        lock (_sessionLock)
        {
            return _currentSessionPoints.ToArray();
        }
    }

    /// <summary>
    /// Obtém pontos enfileirados para broadcast (consome a fila).
    /// </summary>
    public IEnumerable<NormalizedPoint> DequeuePoints()
    {
        var points = new List<NormalizedPoint>();
        while (_pointQueue.TryDequeue(out var point))
        {
            points.Add(point);
        }
        return points;
    }

    #endregion

    #region Dispose

    public void Dispose()
    {
        if (_isCapturing)
        {
            StopCaptureAsync().GetAwaiter().GetResult();
        }

        if (_deviceHandle != IntPtr.Zero)
        {
            HanvonNative.CloseDevice(_deviceHandle);
            _deviceHandle = IntPtr.Zero;
        }

        if (_isInitialized)
        {
            HanvonNative.Uninit();
            _isInitialized = false;
        }

        _captureCts?.Dispose();
    }

    #endregion
}

#region Modelos

/// <summary>
/// Configuração do serviço de captura.
/// </summary>
public class CaptureConfiguration
{
    public int DeviceIndex { get; set; } = 0;
    public int CanvasWidth { get; set; } = 640;
    public int CanvasHeight { get; set; } = 480;
    public bool FilterHoverPoints { get; set; } = true;
    public int PollingIntervalMs { get; set; } = 10;
}

/// <summary>
/// Ponto normalizado para envio ao cliente.
/// </summary>
public class NormalizedPoint
{
    public int X { get; set; }
    public int Y { get; set; }
    public double Pressure { get; set; }
    public int PenStatus { get; set; }
    public long Timestamp { get; set; }

    // Dados brutos para auditoria
    public int RawX { get; set; }
    public int RawY { get; set; }
    public int RawPressure { get; set; }
}

#endregion
