using System.Runtime.InteropServices;

namespace Hanvon.Bridge.Interop;

/// <summary>
/// P/Invoke para a DLL nativa do Hanvon ESP560.
/// TODO: Substituir <<NOME_DA_DLL>> pelo nome real da DLL do SDK.
/// TODO: Ajustar assinaturas das funções conforme documentação do SDK.
/// </summary>
public static class HanvonNative
{
    // TODO: Substituir pelo nome real da DLL (ex: "HanvonSDK.dll", "ESP560.dll", etc)
    private const string DllName = "<<NOME_DA_DLL>>";

    #region Estruturas de Dados

    /// <summary>
    /// Estrutura que representa um ponto de assinatura capturado.
    /// TODO: Ajustar campos conforme struct real do SDK.
    /// </summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct SignaturePoint
    {
        public int X;              // Coordenada X (pode ser em mm ou pixels)
        public int Y;              // Coordenada Y (pode ser em mm ou pixels)
        public int Pressure;       // Pressão da caneta (0-1023 ou 0-4095)
        public int PenStatus;      // Status: 0=hover, 1=touching, 2=lift
        public long Timestamp;     // Timestamp em milissegundos

        // TODO: Adicionar outros campos se necessário (tilt, azimuth, etc)
    }

    /// <summary>
    /// Informações do dispositivo.
    /// TODO: Ajustar conforme struct do SDK.
    /// </summary>
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct DeviceInfo
    {
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string DeviceName;

        public int Width;          // Largura da área ativa em mm ou pixels
        public int Height;         // Altura da área ativa em mm ou pixels
        public int MaxPressure;    // Pressão máxima suportada

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string SerialNumber;
    }

    #endregion

    #region Funções P/Invoke

    /// <summary>
    /// Inicializa o SDK. Deve ser chamado antes de qualquer outra função.
    /// TODO: Ajustar assinatura conforme documentação.
    /// </summary>
    /// <returns>0 se sucesso, código de erro caso contrário.</returns>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int Init();

    /// <summary>
    /// Abre conexão com o dispositivo.
    /// TODO: Ajustar parâmetros (pode precisar de deviceIndex, port, etc).
    /// </summary>
    /// <param name="deviceIndex">Índice do dispositivo (geralmente 0 para USB).</param>
    /// <returns>Handle do dispositivo ou -1 em caso de erro.</returns>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr OpenDevice(int deviceIndex);

    /// <summary>
    /// Obtém informações do dispositivo conectado.
    /// </summary>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int GetDeviceInfo(IntPtr deviceHandle, ref DeviceInfo info);

    /// <summary>
    /// Inicia a captura de assinatura.
    /// </summary>
    /// <param name="deviceHandle">Handle retornado por OpenDevice.</param>
    /// <returns>0 se sucesso, código de erro caso contrário.</returns>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int StartCapture(IntPtr deviceHandle);

    /// <summary>
    /// Lê pontos de assinatura disponíveis.
    /// </summary>
    /// <param name="deviceHandle">Handle do dispositivo.</param>
    /// <param name="buffer">Buffer para armazenar os pontos.</param>
    /// <param name="bufferSize">Tamanho máximo do buffer (número de pontos).</param>
    /// <param name="pointsRead">Número de pontos efetivamente lidos.</param>
    /// <returns>0 se sucesso, código de erro caso contrário.</returns>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int ReadPoints(
        IntPtr deviceHandle,
        [Out] SignaturePoint[] buffer,
        int bufferSize,
        out int pointsRead);

    /// <summary>
    /// Para a captura de assinatura.
    /// </summary>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int StopCapture(IntPtr deviceHandle);

    /// <summary>
    /// Fecha o dispositivo e libera recursos.
    /// </summary>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int CloseDevice(IntPtr deviceHandle);

    /// <summary>
    /// Finaliza o SDK e libera todos os recursos.
    /// </summary>
    [DllImport(DllName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int Uninit();

    #endregion

    #region Códigos de Erro Comuns

    // TODO: Mapear códigos de erro reais do SDK
    public const int SUCCESS = 0;
    public const int ERROR_DEVICE_NOT_FOUND = -1;
    public const int ERROR_DEVICE_OPEN_FAILED = -2;
    public const int ERROR_CAPTURE_FAILED = -3;
    public const int ERROR_NOT_INITIALIZED = -4;

    #endregion

    #region Helpers

    /// <summary>
    /// Converte código de erro em mensagem legível.
    /// </summary>
    public static string GetErrorMessage(int errorCode)
    {
        return errorCode switch
        {
            SUCCESS => "Success",
            ERROR_DEVICE_NOT_FOUND => "Device not found",
            ERROR_DEVICE_OPEN_FAILED => "Failed to open device",
            ERROR_CAPTURE_FAILED => "Capture failed",
            ERROR_NOT_INITIALIZED => "SDK not initialized",
            _ => $"Unknown error: {errorCode}"
        };
    }

    #endregion
}
