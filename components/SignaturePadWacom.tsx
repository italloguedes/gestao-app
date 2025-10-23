'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiX, FiRotateCcw, FiCheck, FiPenTool, FiZap, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { useWacomSDK } from '@/hooks/useWacomSDK';

interface SignaturePadWacomProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: WacomSignatureResult) => void;
  title?: string;
  subtitle?: string;
  licence: string;
  sdkPath?: string;
  who?: string; // Nome do signatário
  why?: string; // Razão da assinatura
  documentHash?: Uint8Array; // Hash do documento para binding
}

export interface WacomSignatureResult {
  png: string; // Base64 PNG data URL
  iso: Uint8Array; // Formato ISO/IEC 19794-7 (FSS)
  who?: string;
  why?: string;
  when: Date;
  width: number;
  height: number;
  hasDocumentBinding: boolean;
}

export default function SignaturePadWacom({
  isOpen,
  onClose,
  onSave,
  title = 'Assinatura Digital - Wacom STU-300',
  subtitle = 'Assine no dispositivo Wacom STU-300',
  licence,
  sdkPath = '/wacom-sdk',
  who,
  why,
  documentHash
}: SignaturePadWacomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // SDK Wacom
  const { isLoaded, isLicenceValid, error: sdkError, sigObj, module } = useWacomSDK({
    licence,
    sdkPath,
    autoLoad: true
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  // Detecta dispositivo STU-300
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('');

  // Logging helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  }, []);

  // Detectar dispositivo Wacom
  const detectDevice = useCallback(async () => {
    try {
      // Solicita acesso a dispositivos HID (Wacom STU-300)
      if (!navigator.hid) {
        setErrorMessage('WebHID não suportado neste navegador');
        addLog('✗ WebHID não disponível');
        return false;
      }

      // Lista dispositivos
      const devices = await navigator.hid.getDevices();

      // Filtrar Wacom (Vendor ID: 0x056a)
      const wacomDevice = devices.find(d => d.vendorId === 0x056a);

      if (wacomDevice) {
        setDeviceConnected(true);
        setDeviceName(wacomDevice.productName || 'Wacom STU-300');
        addLog(`✓ Dispositivo: ${wacomDevice.productName}`);
        return true;
      } else {
        setDeviceConnected(false);
        addLog('⚠️  Dispositivo Wacom não encontrado');
        return false;
      }
    } catch (error: any) {
      console.error('Erro ao detectar dispositivo:', error);
      addLog('✗ Erro ao detectar dispositivo');
      return false;
    }
  }, [addLog]);

  // Solicitar permissão para dispositivo
  const requestDevice = useCallback(async () => {
    try {
      if (!navigator.hid) {
        setErrorMessage('WebHID não suportado. Use Chrome/Edge 89+');
        return false;
      }

      addLog('Solicitando permissão para dispositivo...');

      // Solicita acesso ao Wacom (Vendor ID: 0x056a)
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: 0x056a }] // Wacom
      });

      if (devices.length > 0) {
        setDeviceConnected(true);
        setDeviceName(devices[0].productName || 'Wacom STU-300');
        addLog(`✓ Permissão concedida: ${devices[0].productName}`);
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        setErrorMessage('Nenhum dispositivo Wacom selecionado');
      } else {
        setErrorMessage(`Erro: ${error.message}`);
      }
      addLog('✗ Falha ao solicitar dispositivo');
      return false;
    }
  }, [addLog]);

  // Iniciar captura
  const handleStartCapture = useCallback(async () => {
    if (!sigObj || !isLoaded || !isLicenceValid) {
      setErrorMessage('SDK não inicializado ou licença inválida');
      return;
    }

    if (!deviceConnected) {
      const granted = await requestDevice();
      if (!granted) return;
    }

    setIsCapturing(true);
    setHasCaptured(false);
    setSignatureImage(null);
    setErrorMessage('');
    addLog('⚠️ ASSINE NO WACOM STU-300!');

    // Aqui você integraria com a API de captura do STU-300
    // Por ora, simulamos uma captura (você deve usar a SDK Wacom completa)
    addLog('Aguardando assinatura no pad...');
  }, [sigObj, isLoaded, isLicenceValid, deviceConnected, requestDevice, addLog]);

  // Parar captura (simulado - integrar com SDK real)
  const handleStopCapture = useCallback(() => {
    if (!isCapturing) return;

    setIsCapturing(false);
    addLog('✓ Captura finalizada');

    // Aqui você obteria os dados reais do STU-300
    setHasCaptured(true);
  }, [isCapturing, addLog]);

  // Renderizar assinatura e salvar
  const handleSave = useCallback(async () => {
    if (!sigObj || !hasCaptured) return;

    try {
      addLog('Gerando PNG...');

      // Renderizar assinatura como PNG
      const pngData = sigObj.RenderBitmap(
        'png',
        sigObj.getWidth(),
        sigObj.getHeight(),
        '#000000', // Cor da tinta
        2, // Espessura
        '#FFFFFF', // Fundo branco
        0, // Flags
        10 // Padding
      );

      // Converter para Base64
      const blob = new Blob([pngData], { type: 'image/png' });
      const reader = new FileReader();

      reader.onload = async () => {
        const pngDataUrl = reader.result as string;
        setSignatureImage(pngDataUrl);

        // Adicionar metadados
        if (who) sigObj.setTextData(who);
        if (why) sigObj.setExtraData('reason', why);

        // Binding com documento (se fornecido)
        let hasBinding = false;
        if (documentHash && module) {
          try {
            const hash = new module.Hash(module.HashType.SHA256);
            hash.add(documentHash);
            sigObj.generateSignature(hash);
            hasBinding = true;
            addLog('✓ Assinatura vinculada ao documento');
          } catch (hashError) {
            console.error('Erro ao vincular documento:', hashError);
          }
        }

        // Exportar no formato ISO (FSS)
        const isoData = sigObj.exportIso();

        const result: WacomSignatureResult = {
          png: pngDataUrl,
          iso: isoData,
          who: who || sigObj.getWho(),
          why: why || sigObj.getExtraData('reason'),
          when: new Date(),
          width: sigObj.getWidth(),
          height: sigObj.getHeight(),
          hasDocumentBinding: hasBinding
        };

        addLog(`✓ Assinatura salva (${isoData.length} bytes ISO)`);
        onSave(result);
        handleClose();
      };

      reader.readAsDataURL(blob);
    } catch (error: any) {
      setErrorMessage(`Erro ao salvar: ${error.message}`);
      addLog(`✗ Erro: ${error.message}`);
    }
  }, [sigObj, hasCaptured, who, why, documentHash, module, onSave, addLog]);

  const handleClear = useCallback(() => {
    setHasCaptured(false);
    setSignatureImage(null);
    setIsCapturing(false);
    addLog('Canvas limpo');
  }, [addLog]);

  const handleClose = useCallback(() => {
    if (isCapturing) {
      handleStopCapture();
    }
    handleClear();
    onClose();
  }, [isCapturing, handleStopCapture, handleClear, onClose]);

  // Detectar dispositivo ao abrir
  useEffect(() => {
    if (isOpen) {
      detectDevice();
      addLog('Modal aberto');
    } else {
      setLogs([]);
      setErrorMessage('');
    }
  }, [isOpen, detectDevice, addLog]);

  // ESC para fechar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  // Mostrar erro do SDK
  const displayError = sdkError || errorMessage;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="signature-title" className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FiPenTool className="w-6 h-6" />
                </div>
                {title}
              </h2>
              <p className="text-white/90 text-sm mt-1">{subtitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
              aria-label="Fechar modal"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-100 border-b-2 border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* SDK Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isLoaded && isLicenceValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isLoaded && isLicenceValid ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="text-sm font-semibold">
                  {isLoaded && isLicenceValid ? 'SDK OK' : 'SDK Erro'}
                </span>
              </div>

              {/* Device Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                deviceConnected ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <span className="text-sm font-semibold">
                  {deviceConnected ? `${deviceName}` : 'Dispositivo não detectado'}
                </span>
              </div>

              {/* Capturing Status */}
              {isCapturing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <FiZap className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-semibold">Capturando</span>
                </div>
              )}
            </div>

            {!deviceConnected && (
              <button
                onClick={requestDevice}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Conectar Dispositivo
              </button>
            )}
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b-2 border-cyan-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiInfo className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-cyan-900 mb-2">📋 Instruções:</p>
              <ol className="text-sm text-cyan-800 space-y-1 list-decimal list-inside">
                <li className="font-semibold">Conecte o dispositivo Wacom STU-300 via USB</li>
                <li className="font-semibold">Clique em "Conectar Dispositivo" (se necessário)</li>
                <li className="font-semibold">Clique em "Iniciar Captura"</li>
                <li className="font-semibold">ASSINE NO PAD FÍSICO WACOM STU-300</li>
                <li className="font-semibold">Clique em "Parar Captura" quando terminar</li>
                <li className="font-semibold">Clique em "Salvar Assinatura"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Canvas/Preview Area */}
        <div className="p-6 overflow-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-300">
            <div className="relative">
              {/* Label */}
              <div className="absolute top-3 right-3 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold z-10">
                📺 PREVIEW
              </div>

              {/* Canvas/Preview */}
              <div className="bg-white rounded-xl border-4 border-dashed border-cyan-300 shadow-inner overflow-hidden relative min-h-[320px] flex items-center justify-center">
                {signatureImage ? (
                  <img
                    src={signatureImage}
                    alt="Assinatura capturada"
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={320}
                    className="max-w-full h-auto"
                    style={{ pointerEvents: 'none', cursor: 'default' }}
                  />
                )}

                {/* Overlay quando capturando */}
                {isCapturing && !hasCaptured && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-cyan-500/10 animate-pulse">
                    <div className="text-center bg-cyan-500 text-white px-6 py-4 rounded-2xl shadow-lg">
                      <FiPenTool className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-bold text-lg">ASSINE NO PAD</p>
                      <p className="text-sm">WACOM STU-300</p>
                    </div>
                  </div>
                )}

                {/* Mensagem quando não está capturando */}
                {!isCapturing && !hasCaptured && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-slate-400">
                      <FiPenTool className="w-16 h-16 mx-auto mb-3" />
                      <p className="font-bold">Aguardando captura...</p>
                      <p className="text-sm">Conecte o dispositivo e clique em "Iniciar Captura"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {displayError && (
              <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800 font-semibold">{displayError}</p>
              </div>
            )}

            {/* Logs */}
            <div className="mt-4 bg-slate-900 rounded-xl p-3 font-mono text-xs text-green-400 max-h-24 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-slate-500">Aguardando eventos...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-slate-200 bg-white px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleClear}
            disabled={!hasCaptured && !isCapturing}
            className="px-6 py-3 bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRotateCcw className="w-5 h-5" />
            Limpar
          </button>

          <div className="flex gap-3">
            {!isCapturing ? (
              <button
                onClick={handleStartCapture}
                disabled={!isLoaded || !isLicenceValid}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiZap className="w-5 h-5" />
                Iniciar Captura
              </button>
            ) : (
              <button
                onClick={handleStopCapture}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <FiX className="w-5 h-5" />
                Parar Captura
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!hasCaptured || isCapturing}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiCheck className="w-5 h-5" />
              Salvar Assinatura
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
