'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WacomModule, SigObj } from '@/lib/wacom-sdk';

interface UseWacomSDKOptions {
  licence: string;
  autoLoad?: boolean;
  useNpmPackage?: boolean; // Se true, usa pacote NPM em vez de script manual
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
 * // Opção 1: Usando pacote NPM (recomendado)
 * const { isLoaded, sigObj, error } = useWacomSDK({
 *   licence: 'YOUR_LICENCE_KEY',
 *   autoLoad: true,
 *   useNpmPackage: true
 * });
 *
 * // Opção 2: Usando download manual (legado)
 * const { isLoaded, sigObj, error } = useWacomSDK({
 *   licence: 'YOUR_LICENCE_KEY',
 *   autoLoad: true,
 *   useNpmPackage: false
 * });
 * ```
 */
export function useWacomSDK({
  licence,
  autoLoad = true,
  useNpmPackage = true
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

      if (useNpmPackage) {
        // Carrega via pacote NPM @wacom/signature-sdk
        try {
          // O pacote NPM expõe window.sdkReady
          await import('@wacom/signature-sdk');

          // Aguarda SDK estar pronto
          if ((window as any).sdkReady) {
            await (window as any).sdkReady;
          }

          if (!window.Module) {
            throw new Error('Wacom Module not available from NPM package');
          }

          console.log('✓ Wacom SDK loaded from NPM package');
        } catch (npmError) {
          throw new Error(
            'Failed to load @wacom/signature-sdk NPM package. ' +
            'Make sure you have installed it: npm install @wacom/signature-sdk'
          );
        }
      } else {
        // Modo legado: carrega de /public/wacom-sdk/ (download manual)
        const script = document.createElement('script');
        script.src = '/wacom-sdk/signature_sdk.js';
        script.async = true;

        const scriptLoadPromise = new Promise<boolean>((resolve, reject) => {
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error(
            'Failed to load Wacom SDK script from /wacom-sdk/. ' +
            'Make sure the files are in public/wacom-sdk/ or use useNpmPackage: true'
          ));
        });

        document.head.appendChild(script);
        await scriptLoadPromise;

        // Aguarda o WebAssembly carregar
        if (!window.Module) {
          throw new Error('Wacom Module not found after script load');
        }

        await new Promise<void>((resolve) => {
          if (window.Module.onRuntimeInitialized) {
            resolve();
          } else {
            window.Module.onRuntimeInitialized = () => {
              resolve();
            };
          }
        });

        console.log('✓ Wacom SDK loaded from public/wacom-sdk/');
      }

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

        console.log('✓ Wacom SDK licence validated');
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
  }, [licence, useNpmPackage]);

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
