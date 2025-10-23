'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WacomModule, SigObj } from '@/lib/wacom-sdk';

interface UseWacomSDKOptions {
  sdkPath?: string;
  licence: string;
  autoLoad?: boolean;
}

interface UseWacomSDKReturn {
  isLoaded: boolean;
  isLicenceValid: boolean;
  error: string | null;
  sigObj: SigObj | null;
  module: WacomModule | null;
  loadSDK: () => Promise<boolean>;
}

/**
 * Hook personalizado para gerenciar o Wacom Signature SDK
 *
 * @example
 * ```tsx
 * const { isLoaded, sigObj, error } = useWacomSDK({
 *   licence: 'YOUR_LICENCE_KEY',
 *   sdkPath: '/wacom-sdk',
 *   autoLoad: true
 * });
 * ```
 */
export function useWacomSDK({
  sdkPath = '/wacom-sdk',
  licence,
  autoLoad = true
}: UseWacomSDKOptions): UseWacomSDKReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLicenceValid, setIsLicenceValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sigObj, setSigObj] = useState<SigObj | null>(null);
  const [module, setModule] = useState<WacomModule | null>(null);

  const loadSDK = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Verifica se já está carregado
      if (window.Module) {
        setModule(window.Module);
        return true;
      }

      // Carrega o script do SDK
      const script = document.createElement('script');
      script.src = `${sdkPath}/signature_sdk.js`;
      script.async = true;

      const scriptLoadPromise = new Promise<boolean>((resolve, reject) => {
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error('Failed to load Wacom SDK script'));
      });

      document.head.appendChild(script);
      await scriptLoadPromise;

      // Aguarda o WebAssembly carregar
      if (!window.Module) {
        throw new Error('Wacom Module not found after script load');
      }

      await new Promise<void>((resolve) => {
        if (window.Module.onRuntimeInitialized) {
          // Já inicializado
          resolve();
        } else {
          window.Module.onRuntimeInitialized = () => {
            resolve();
          };
        }
      });

      setModule(window.Module);
      setIsLoaded(true);

      // Cria objeto de assinatura
      const newSigObj = new window.Module.SigObj();
      setSigObj(newSigObj);

      // Configura licença
      try {
        const licenceValid = await newSigObj.setLicence(licence);
        setIsLicenceValid(licenceValid);

        if (!licenceValid) {
          setError('Invalid Wacom SDK licence');
          return false;
        }

        console.log('✓ Wacom SDK loaded successfully');
        return true;
      } catch (licenceError: any) {
        setError(`Licence error: ${licenceError.name}`);
        return false;
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load Wacom SDK';
      setError(errorMsg);
      console.error('Wacom SDK load error:', err);
      return false;
    }
  }, [sdkPath, licence]);

  // Auto-load se solicitado
  useEffect(() => {
    if (autoLoad && !isLoaded && !error) {
      loadSDK();
    }
  }, [autoLoad, isLoaded, error, loadSDK]);

  return {
    isLoaded,
    isLicenceValid,
    error,
    sigObj,
    module,
    loadSDK
  };
}
