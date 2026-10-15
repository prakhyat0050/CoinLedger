import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { LANGUAGES, getLanguageMeta } from '@/i18n/languages';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = getLanguageMeta(lang);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-surface-700 transition-colors"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{current.nativeName}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-xl border border-surface-600 bg-surface-800 shadow-xl z-50 animate-fade-in">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-700 transition-colors ${
                l.code === lang ? 'text-accent-400 bg-surface-700/50' : 'text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 opacity-50" />
                {l.nativeName}
              </span>
              {l.code === lang && <Check className="w-4 h-4 text-accent-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
