import { Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/i18n/context';

export function Tooltip({ text, translationKey }: { text?: string; translationKey?: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const content = text || (translationKey ? t(translationKey) : '');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-slate-500 hover:text-accent-400 transition-colors"
        aria-label="More information"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 rounded-lg bg-surface-900 border border-surface-600 text-xs text-slate-300 shadow-xl z-50 animate-fade-in">
          {content}
        </span>
      )}
    </span>
  );
}
