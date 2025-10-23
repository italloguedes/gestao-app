/**
 * Definições TypeScript para Wacom Signature SDK JavaScript
 * Baseado na API: https://developer.wacom.com
 */

declare global {
  interface Window {
    Module: WacomModule;
  }
}

export interface WacomModule {
  onRuntimeInitialized?: () => void;
  SigObj: new () => SigObj;
  Hash: new (hashType: HashType) => Hash;
  HashType: typeof HashType;
  AdditionalImportIsoData: new () => AdditionalImportIsoData;
}

export enum HashType {
  None = 0,
  MD5 = 1,
  SHA1 = 2,
  SHA224 = 3,
  SHA256 = 4,
  SHA384 = 5,
  SHA512 = 6
}

export interface SigObj {
  // Licença
  setLicence(licence: string): Promise<boolean>;
  getLicence(): string;
  isEvaluation(): boolean;

  // Captura
  isCaptured(): boolean;
  isCrossedOut(): boolean;

  // Dados da assinatura
  setSigData(data: Uint8Array): void;
  getSigData(): Uint8Array;

  // Dados de texto
  setTextData(text: string): void;
  getTextData(): string;

  // Metadados
  getWho(): string;
  getWhy(): string;
  getWhen(): Date;
  getWidth(): number;
  getHeight(): number;

  // Dados extras
  setExtraData(key: string, value: string): void;
  getExtraData(key: string): string;
  getAdditionalData(): string;

  // Renderização
  RenderBitmap(
    imageType: string,
    width: number,
    height: number,
    inkColor: string,
    inkWidth: number,
    backgroundColor: string,
    flags: number,
    padding: number
  ): Uint8Array;

  ReadEncodedBitmapBinary(imageType: string): Uint8Array;

  // ISO
  importIso(isoData: Uint8Array, additionalData?: AdditionalImportIsoData): boolean;
  exportIso(): Uint8Array;

  // Criptografia
  isEncrypted(): boolean;
  canEncrypt(): boolean;
  canDecrypt(): boolean;
  setEncryptionPassword(password: string): void;
  setPublicKey(key: string): void;
  setPrivateKey(key: string): void;

  // Integridade
  checkIntegrity(): boolean;
  checkSignedData(): boolean;
  generateSignature(hash: Hash): void;

  // Externo
  isExternal(): boolean;
}

export interface Hash {
  add(data: Uint8Array): void;
}

export interface AdditionalImportIsoData {
  setWho(who: string): void;
  setWhy(why: string): void;
  setWhen(when: Date): void;
  putExtraData(key: string, value: string): void;
}

export interface WacomSignatureData {
  png: string; // Base64 PNG
  iso: Uint8Array; // Formato ISO (FSS - ISO/IEC 19794-7)
  who?: string;
  why?: string;
  when?: Date;
  width: number;
  height: number;
}
