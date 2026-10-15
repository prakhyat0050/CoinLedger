import { useState } from 'react';
import { Globe, Check, ArrowRight } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { LANGUAGES, detectBrowserLanguage } from '@/i18n/languages';
import { getChain } from '@/services/chains';

export function LanguageSelectionPage() {
  const { t, lang, setLang, setLanguageSelected } = useI18n();
  const [selected, setSelected] = useState<string>(() => {
    const stored = localStorage.getItem('coinledger_lang');
    return stored || detectBrowserLanguage();
  });

  const handleContinue = () => {
    setLang(selected);
    setLanguageSelected();
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-4xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">CoinLedger</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">
          {t('langSelect.title')}
        </h1>
        <p className="text-slate-400 text-center mb-10 max-w-xl mx-auto">
          {t('langSelect.subtitle')}
        </p>

        {/* Language grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelected(l.code)}
              className={`group relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                selected === l.code
                  ? 'border-accent-500 bg-accent-500/10 glow-blue'
                  : 'border-surface-600 bg-surface-800/60 hover:border-surface-500 hover:bg-surface-700/60'
              }`}
              aria-pressed={selected === l.code}
            >
              <Globe className={`w-5 h-5 flex-shrink-0 ${selected === l.code ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
              <span className={`text-base font-medium ${selected === l.code ? 'text-white' : 'text-slate-300'}`}>
                {l.nativeName}
              </span>
              {selected === l.code && (
                <Check className="w-4 h-4 text-accent-400 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Continue button */}
        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold hover:from-accent-400 hover:to-accent-500 transition-all duration-200 shadow-lg hover:shadow-accent-500/25"
          >
            {t('langSelect.continue')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Trust line */}
        <p className="text-center text-xs text-slate-500 mt-8">
          {t('landing.poweredBy')}
        </p>
      </div>
    </div>
  );
}
