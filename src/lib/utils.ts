import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple CUID-like generator (for file names)
export function cuid() {
  return `clx${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`
}