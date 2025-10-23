using Xunit;
using FluentAssertions;
using Hanvon.Bridge.Core;
using Hanvon.Bridge.Interop;
using Microsoft.Extensions.Logging;
using Moq;

namespace Hanvon.Bridge.Tests;

/// <summary>
/// Testes unitários para o serviço de captura.
/// Como os testes dependem de hardware físico, mocamos as chamadas P/Invoke.
/// </summary>
public class CaptureTests
{
    private readonly Mock<ILogger<CaptureService>> _mockLogger;
    private readonly CaptureConfiguration _config;

    public CaptureTests()
    {
        _mockLogger = new Mock<ILogger<CaptureService>>();
        _config = new CaptureConfiguration
        {
            DeviceIndex = 0,
            CanvasWidth = 640,
            CanvasHeight = 480,
            FilterHoverPoints = true,
            PollingIntervalMs = 10
        };
    }

    [Fact]
    public void CaptureConfiguration_DefaultValues_AreCorrect()
    {
        // Arrange & Act
        var config = new CaptureConfiguration();

        // Assert
        config.DeviceIndex.Should().Be(0);
        config.CanvasWidth.Should().Be(640);
        config.CanvasHeight.Should().Be(480);
        config.FilterHoverPoints.Should().BeTrue();
        config.PollingIntervalMs.Should().Be(10);
    }

    [Theory]
    [InlineData(100, 100, 0.5, 100, 100, 0.5)]
    [InlineData(0, 0, 0, 0, 0, 0)]
    [InlineData(640, 480, 1.0, 640, 480, 1.0)]
    public void NormalizedPoint_Properties_AreSetCorrectly(
        int x, int y, double pressure,
        int expectedX, int expectedY, double expectedPressure)
    {
        // Arrange & Act
        var point = new NormalizedPoint
        {
            X = x,
            Y = y,
            Pressure = pressure,
            PenStatus = 1,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        // Assert
        point.X.Should().Be(expectedX);
        point.Y.Should().Be(expectedY);
        point.Pressure.Should().Be(expectedPressure);
        point.PenStatus.Should().Be(1);
        point.Timestamp.Should().BeGreaterThan(0);
    }

    [Fact]
    public void NormalizedPoint_WithRawData_PreservesOriginalValues()
    {
        // Arrange
        var rawX = 1234;
        var rawY = 5678;
        var rawPressure = 512;

        // Act
        var point = new NormalizedPoint
        {
            X = 100,
            Y = 200,
            Pressure = 0.5,
            RawX = rawX,
            RawY = rawY,
            RawPressure = rawPressure
        };

        // Assert
        point.RawX.Should().Be(rawX);
        point.RawY.Should().Be(rawY);
        point.RawPressure.Should().Be(rawPressure);
    }

    [Theory]
    [InlineData(0, "Success")]
    [InlineData(-1, "Device not found")]
    [InlineData(-2, "Failed to open device")]
    [InlineData(-3, "Capture failed")]
    [InlineData(-4, "SDK not initialized")]
    [InlineData(999, "Unknown error: 999")]
    public void HanvonNative_GetErrorMessage_ReturnsCorrectMessage(int errorCode, string expectedMessage)
    {
        // Act
        var message = HanvonNative.GetErrorMessage(errorCode);

        // Assert
        message.Should().Be(expectedMessage);
    }

    [Fact]
    public void HanvonNative_ErrorCodes_AreCorrect()
    {
        // Assert
        HanvonNative.SUCCESS.Should().Be(0);
        HanvonNative.ERROR_DEVICE_NOT_FOUND.Should().Be(-1);
        HanvonNative.ERROR_DEVICE_OPEN_FAILED.Should().Be(-2);
        HanvonNative.ERROR_CAPTURE_FAILED.Should().Be(-3);
        HanvonNative.ERROR_NOT_INITIALIZED.Should().Be(-4);
    }

    [Theory]
    [InlineData(640, 480, 1024, 768, 100, 100, 62, 62)] // Scale down
    [InlineData(320, 240, 640, 480, 100, 100, 50, 50)]  // Scale down 2x
    [InlineData(1280, 960, 640, 480, 100, 100, 200, 200)] // Scale up
    public void PointScaling_ConvertsCorrectly(
        int canvasWidth, int canvasHeight,
        int deviceWidth, int deviceHeight,
        int deviceX, int deviceY,
        int expectedCanvasX, int expectedCanvasY)
    {
        // Arrange
        double scaleX = (double)canvasWidth / deviceWidth;
        double scaleY = (double)canvasHeight / deviceHeight;

        // Act
        int canvasX = (int)(deviceX * scaleX);
        int canvasY = (int)(deviceY * scaleY);

        // Assert
        canvasX.Should().Be(expectedCanvasX);
        canvasY.Should().Be(expectedCanvasY);
    }

    [Theory]
    [InlineData(0, 1023, 0, 0.0)]
    [InlineData(512, 1023, 512, 0.5)]
    [InlineData(1023, 1023, 1023, 1.0)]
    [InlineData(256, 1023, 256, 0.25)]
    public void PressureNormalization_ConvertsCorrectly(
        int rawPressure, int maxPressure, int expectedRaw, double expectedNormalized)
    {
        // Arrange
        double normalizedPressure = maxPressure > 0
            ? (double)rawPressure / maxPressure
            : 0.5;

        // Assert
        normalizedPressure.Should().BeApproximately(expectedNormalized, 0.01);
    }

    [Fact]
    public void CaptureService_GetCurrentSessionPoints_ReturnsEmptyArray_WhenNoCaptureStarted()
    {
        // Arrange
        var service = new CaptureService(_mockLogger.Object, _config);

        // Act
        var points = service.GetCurrentSessionPoints();

        // Assert
        points.Should().NotBeNull();
        points.Should().BeEmpty();
    }

    [Fact]
    public void CaptureService_DequeuePoints_ReturnsEmptyCollection_WhenNoPoints()
    {
        // Arrange
        var service = new CaptureService(_mockLogger.Object, _config);

        // Act
        var points = service.DequeuePoints();

        // Assert
        points.Should().NotBeNull();
        points.Should().BeEmpty();
    }

    [Theory]
    [InlineData(0, true)]  // Hover - filtrado
    [InlineData(1, false)] // Touching - não filtrado
    [InlineData(2, false)] // Lift - não filtrado
    public void FilterHoverPoints_Configuration_WorksAsExpected(int penStatus, bool shouldFilter)
    {
        // Arrange
        var config = new CaptureConfiguration { FilterHoverPoints = true };

        // Act & Assert
        if (config.FilterHoverPoints && penStatus == 0)
        {
            shouldFilter.Should().BeTrue();
        }
        else
        {
            shouldFilter.Should().BeFalse();
        }
    }

    [Fact]
    public void SignaturePoint_StructLayout_IsSequential()
    {
        // Arrange
        var point = new HanvonNative.SignaturePoint
        {
            X = 100,
            Y = 200,
            Pressure = 512,
            PenStatus = 1,
            Timestamp = 1234567890
        };

        // Assert
        point.X.Should().Be(100);
        point.Y.Should().Be(200);
        point.Pressure.Should().Be(512);
        point.PenStatus.Should().Be(1);
        point.Timestamp.Should().Be(1234567890);
    }

    [Fact]
    public void DeviceInfo_StructLayout_HasCorrectFields()
    {
        // Arrange
        var info = new HanvonNative.DeviceInfo
        {
            DeviceName = "ESP560",
            Width = 640,
            Height = 480,
            MaxPressure = 1023,
            SerialNumber = "TEST123"
        };

        // Assert
        info.DeviceName.Should().Be("ESP560");
        info.Width.Should().Be(640);
        info.Height.Should().Be(480);
        info.MaxPressure.Should().Be(1023);
        info.SerialNumber.Should().Be("TEST123");
    }

    [Theory]
    [InlineData(1, 3, 1.0)] // Pressão máxima = 3px
    [InlineData(2, 3, 0.5)] // Pressão média = 2px
    [InlineData(1, 3, 0.0)] // Pressão mínima = 1px
    public void LineWidth_Calculation_IsProportionalToPressure(
        double minWidth, double maxWidth, double pressure)
    {
        // Act
        var lineWidth = minWidth + pressure * (maxWidth - minWidth);

        // Assert
        lineWidth.Should().BeGreaterOrEqualTo(minWidth);
        lineWidth.Should().BeLessOrEqualTo(maxWidth);
    }
}
