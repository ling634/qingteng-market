import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  // 支持一位小数定价：整数不带 .0，小数如实显示（¥12 / ¥12.5）
  return `¥${Number(price.toFixed(1))}`;
}
