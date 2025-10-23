'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiX, FiRotateCcw, FiCheck, FiPenTool, FiZap, FiAlertCircle } from 'react-icons/fi';

interface SignaturePadHanvonProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string, biometricData?: string) => void;
  title?: string;
  subtitle?: string;
  bridgeUrl?: string; // URL do bridge WebSocket
}

interface Point {
  x: number;
  y: number;
  pressure: number;
  penStatus: number;
  timestamp: number;
}

export default function SignaturePadHanvon({
  isOpen,
  onClose,
  onSave,
  title = 'Assinatura Digital - Hanvon ESP560',
  subtitle = 'Assine no dispositivo físico Hanvon',
  bridgeUrl = 'ws://127.0.0.1:9123/ws'
}: SignaturePadHanvonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [isEmpty, setIsEmpty] = useState(true);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // Logging helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  }, []);

  // Inicializar canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Desenhar ponto no canvas (visualização)
  const drawPoint = useCallback((point: Point, lastPt: Point | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Só desenha se caneta está tocando
    if (point.penStatus !== 1) {
      return;
    }

    if (lastPt && lastPt.penStatus === 1) {
      // Espessura proporcional à pressão (1-3 px)
      const lineWidth = 1 + point.pressure * 2;

      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, []);

  // Conectar ao WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    addLog('Conectando ao bridge Hanvon...');

    try {
      const ws = new WebSocket(bridgeUrl);

      ws.onopen = () => {
        setWsConnected(true);
        setErrorMessage('');
        addLog('✓ Conectado ao bridge!');

        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      ws.onerror = () => {
        setErrorMessage('Erro ao conectar com o bridge Hanvon');
        addLog('✗ Erro de conexão');
      };

      ws.onclose = () => {
        setWsConnected(false);
        setIsCapturing(false);
        addLog('✗ Desconectado do bridge');

        // Tentar reconectar se modal ainda está aberto
        if (isOpen && !reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setErrorMessage('Não foi possível conectar ao bridge Hanvon');
      addLog('✗ Falha ao conectar');
    }
  }, [bridgeUrl, isOpen, addLog]);

  // Handler de mensagens WebSocket
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connected':
        addLog(`Cliente conectado: ${message.clientId}`);
        break;

      case 'point':
        const point: Point = message.data;
        setPointCount(prev => prev + 1);
        setIsEmpty(false);

        // Desenha no canvas
        setLastPoint(prevLast => {
          drawPoint(point, prevLast);
          return point;
        });
        break;

      case 'state':
        setIsCapturing(message.isCapturing);
        if (message.isCapturing) {
          addLog('⚠️ ASSINE NO PAD HANVON ESP560!');
        }
        break;

      case 'saved':
        addLog(`✓ Assinatura salva: ${message.count} pontos`);
        // Chama callback com a imagem PNG e dados biométricos
        onSave(message.png, message.json);
        handleClose();
        break;

      case 'start_response':
        addLog(message.success ? '✓ Captura iniciada' : '✗ Erro ao iniciar');
        break;

      case 'stop_response':
        addLog(message.success ? '✓ Captura parada' : '✗ Erro ao parar');
        break;

      case 'error':
        setErrorMessage(message.message);
        addLog(`✗ Erro: ${message.message}`);
        break;
    }
  }, [addLog, drawPoint, onSave]);

  // Comandos para o bridge
  const sendCommand = useCallback((command: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    } else {
      setErrorMessage('Bridge não conectado');
    }
  }, []);

  const handleStartCapture = useCallback(() => {
    initCanvas();
    setPointCount(0);
    setIsEmpty(true);
    setLastPoint(null);
    sendCommand('start');
  }, [initCanvas, sendCommand]);

  const handleStopCapture = useCallback(() => {
    sendCommand('stop');
  }, [sendCommand]);

  const handleSaveSignature = useCallback(() => {
    sendCommand('save');
  }, [sendCommand]);

  const handleClear = useCallback(() => {
    initCanvas();
    setPointCount(0);
    setIsEmpty(true);
    setLastPoint(null);
  }, [initCanvas]);

  const handleClose = useCallback(() => {
    // Para captura se estiver ativa
    if (isCapturing) {
      sendCommand('stop');
    }
    handleClear();
    onClose();
  }, [isCapturing, sendCommand, handleClear, onClose]);

  // Effect: Conectar ao WebSocket quando modal abre
  useEffect(() => {
    if (isOpen) {
      initCanvas();
      connectWebSocket();
      addLog('Modal aberto. Aguardando conexão...');
    } else {
      // Fechar WebSocket quando modal fecha
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setLogs([]);
      setErrorMessage('');
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isOpen, initCanvas, connectWebSocket, addLog]);

  // Effect: ESC para fechar
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
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6">
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-green-500' : 'bg-red-500'
                } animate-pulse`}></div>
                <span className="text-sm font-semibold">
                  {wsConnected ? 'Bridge Conectado' : 'Bridge Desconectado'}
                </span>
              </div>

              {isCapturing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <FiZap className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-semibold">Capturando</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">
              <span className="text-sm font-semibold">{pointCount} pontos</span>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-b-2 border-amber-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiPenTool className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900 mb-2">📋 Instruções:</p>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li className="font-semibold">Clique em "Iniciar Captura"</li>
                <li className="font-semibold">ASSINE NO DISPOSITIVO FÍSICO HANVON ESP560 com a caneta EMR</li>
                <li className="font-semibold">Clique em "Parar Captura"</li>
                <li className="font-semibold">Clique em "Salvar Assinatura"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-6 overflow-auto flex-1">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border-2 border-slate-300">
            <div className="relative">
              {/* Label de Visualização */}
              <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold z-10">
                📺 VISUALIZAÇÃO EM TEMPO REAL
              </div>

              {/* Canvas */}
              <div className="bg-white rounded-xl border-4 border-dashed border-blue-300 shadow-inner overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="w-full h-auto"
                  style={{ pointerEvents: 'none', cursor: 'default' }}
                />

                {/* Overlay quando capturando e vazio */}
                {isCapturing && isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-amber-500/10 animate-pulse">
                    <div className="text-center bg-amber-500 text-white px-6 py-4 rounded-2xl shadow-lg">
                      <FiPenTool className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-bold text-lg">ASSINE NO PAD</p>
                      <p className="text-sm">HANVON ESP560</p>
                    </div>
                  </div>
                )}

                {/* Mensagem quando não está capturando */}
                {!isCapturing && isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-slate-400">
                      <FiPenTool className="w-16 h-16 mx-auto mb-3" />
                      <p className="font-bold">Aguardando captura...</p>
                      <p className="text-sm">Clique em "Iniciar Captura"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800 font-semibold">{errorMessage}</p>
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
            disabled={isEmpty && !isCapturing}
            className="px-6 py-3 bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 text-amber-700 font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiRotateCcw className="w-5 h-5" />
            Limpar
          </button>

          <div className="flex gap-3">
            {!isCapturing ? (
              <button
                onClick={handleStartCapture}
                disabled={!wsConnected}
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
              onClick={handleSaveSignature}
              disabled={isEmpty || isCapturing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
