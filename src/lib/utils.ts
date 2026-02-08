import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert datetime-local input value to ISO string (preserving local time intent) */
export function localDatetimeToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return datetimeLocal;
  return new Date(datetimeLocal).toISOString();
}

/** Convert ISO/UTC date string to datetime-local input format */
export function isoToLocalDatetime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
