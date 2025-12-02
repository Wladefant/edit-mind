import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}