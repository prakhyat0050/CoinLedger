export interface LanguageMeta {
  code: string;
  nativeName: string;
  englishName: string;
  script: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', script: 'Latin' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', script: 'Devanagari' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', script: 'Bengali' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', script: 'Devanagari' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', script: 'Telugu' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', script: 'Tamil' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', script: 'Gujarati' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', script: 'Kannada' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', script: 'Malayalam' },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', script: 'Gurmukhi' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', script: 'Latin' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', script: 'Latin' },
];

export const SUPPORTED_LANG_CODES = LANGUAGES.map((l) => l.code);

export function getLanguageMeta(code: string): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

export function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language || 'en';
  const shortCode = browserLang.split('-')[0].toLowerCase();
  if (SUPPORTED_LANG_CODES.includes(shortCode)) {
    return shortCode;
  }
  return 'en';
}

export const STORAGE_KEY_LANG = 'coinledger_lang';
export const STORAGE_KEY_LANG_SELECTED = 'coinledger_lang_selected';

export function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_LANG);
  } catch {
    return null;
  }
}

export function storeLanguage(lang: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
    localStorage.setItem(STORAGE_KEY_LANG_SELECTED, 'true');
  } catch {
    // ignore
  }
}

export function hasLanguageBeenSelected(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_LANG_SELECTED) === 'true';
  } catch {
    return false;
  }
}
