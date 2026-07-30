import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um CPF para exibição: xxx.xxx.xxx-xx
 * Aceita CPF com ou sem formatação. Retorna string formatada.
 */
export function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Extrai apenas os dígitos do CPF (para gravação no banco).
 */
export function unformatCpf(cpf: string): string {
  return cpf.replace(/\D/g, "").slice(0, 11);
}