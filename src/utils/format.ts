// Locale-aware formatting utilities

export interface LocaleConfig {
  code: string;
  bcp47: string;
  currency: string;
  currencySymbol: string;
}

const LOCALE_MAP: Record<string, LocaleConfig> = {
  en: { code: 'en', bcp47: 'en-US', currency: 'USD', currencySymbol: '$' },
  hi: { code: 'hi', bcp47: 'hi-IN', currency: 'INR', currencySymbol: '₹' },
  bn: { code: 'bn', bcp47: 'bn-IN', currency: 'INR', currencySymbol: '₹' },
  mr: { code: 'mr', bcp47: 'mr-IN', currency: 'INR', currencySymbol: '₹' },
  te: { code: 'te', bcp47: 'te-IN', currency: 'INR', currencySymbol: '₹' },
  ta: { code: 'ta', bcp47: 'ta-IN', currency: 'INR', currencySymbol: '₹' },
  gu: { code: 'gu', bcp47: 'gu-IN', currency: 'INR', currencySymbol: '₹' },
  kn: { code: 'kn', bcp47: 'kn-IN', currency: 'INR', currencySymbol: '₹' },
  ml: { code: 'ml', bcp47: 'ml-IN', currency: 'INR', currencySymbol: '₹' },
  pa: { code: 'pa', bcp47: 'pa-IN', currency: 'INR', currencySymbol: '₹' },
  es: { code: 'es', bcp47: 'es-ES', currency: 'EUR', currencySymbol: '€' },
  fr: { code: 'fr', bcp47: 'fr-FR', currency: 'EUR', currencySymbol: '€' },
};

export function getLocaleConfig(langCode: string): LocaleConfig {
  return LOCALE_MAP[langCode] || LOCALE_MAP.en;
}

export function formatCurrency(
  value: number,
  langCode: string,
  options?: { compact?: boolean; showSymbol?: boolean },
): string {
  const config = getLocaleConfig(langCode);
  const { compact = false, showSymbol = true } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat(config.bcp47, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(value);
    return showSymbol ? `${config.currencySymbol}${formatted}` : formatted;
  }

  const formatter = new Intl.NumberFormat(config.bcp47, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(value);
  return showSymbol ? `${config.currencySymbol}${formatted}` : formatted;
}

export function formatNumber(
  value: number,
  langCode: string,
  options?: { decimals?: number; compact?: boolean },
): string {
  const config = getLocaleConfig(langCode);
  const { decimals = 2, compact = false } = options || {};

  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(config.bcp47, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat(config.bcp47, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(
  dateStr: string,
  langCode: string,
  options?: { withTime?: boolean; short?: boolean },
): string {
  if (!dateStr) return '';
  const config = getLocaleConfig(langCode);
  const date = new Date(dateStr);
  const { withTime = false, short = false } = options || {};

  try {
    if (withTime) {
      return new Intl.DateTimeFormat(config.bcp47, {
        year: 'numeric',
        month: short ? '2-digit' : 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    return new Intl.DateTimeFormat(config.bcp47, {
      year: 'numeric',
      month: short ? '2-digit' : 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatTokenAmount(value: number, decimals: number = 4): string {
  if (value === 0) return '0';
  if (value < 0.0001) return '<0.0001';
  return value.toFixed(Math.min(decimals, 8));
}
