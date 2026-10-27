import { useMemo, useState, type FormEvent } from 'react';
import { Bot, ExternalLink, Send, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useI18n } from '@/i18n/context';
import { getBlockscoutTxUrl } from '@/services/blockscout';
import { askWalletCopilot, type CopilotMessage } from '@/services/walletCopilot';

export function WalletCopilot() {
  const { t, lang } = useI18n();
  const { analysisResult, chainId, transactions } = useApp();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const transactionLinks = useMemo(
    () => new Map(transactions.map((tx) => [tx.hash.toLowerCase(), getBlockscoutTxUrl(chainId, tx.hash)])),
    [chainId, transactions],
  );

  if (!analysisResult) return null;

  const submitQuestion = async (event?: FormEvent<HTMLFormElement>, suggestedQuestion?: string) => {
    event?.preventDefault();
    const prompt = (suggestedQuestion ?? question).trim();
    if (!prompt || sending) return;

    const nextMessages: CopilotMessage[] = [...messages, { role: 'user', text: prompt }];
    setMessages(nextMessages);
    setQuestion('');
    setError(null);
    setSending(true);

    try {
      const answer = await askWalletCopilot(
        prompt,
        messages,
        analysisResult.summary,
        analysisResult.tokenHoldings,
        transactions,
        chainId,
      );
      setMessages([...nextMessages, { role: 'model', text: answer }]);
    } catch (cause) {
      setMessages(messages);
      setQuestion(prompt);
      setError(cause instanceof Error ? cause.message : t('copilot.error'));
    } finally {
      setSending(false);
    }
  };

  const suggestions = lang === 'hi'
    ? [
        'Is wallet mein sabse zyada kharcha kis par hua?',
        'Mere recent transactions mein gas fees samjhao.',
        'Mera latest transaction simple Hindi mein samjhao.',
      ]
    : [
        'Where did this wallet spend the most?',
        'Explain the gas fees in my recent transactions.',
        'Explain my latest transaction in simple terms.',
      ];

  return (
    <section className="glass-card rounded-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3 p-5 md:p-6 border-b border-surface-700">
        <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{t('copilot.title')}</h2>
          <p className="text-sm text-slate-400">{t('copilot.subtitle')}</p>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <p className="text-xs text-slate-500">{t('copilot.privacy')}</p>

        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl bg-surface-800/70 p-4">
              <Bot className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">{t('copilot.welcome')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void submitQuestion(undefined, suggestion)}
                  disabled={sending}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-surface-600 text-slate-300 hover:text-white hover:border-accent-500/50 transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-h-[30rem] overflow-y-auto space-y-4 pr-1" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex gap-3 rounded-xl p-4 ${
                  message.role === 'user' ? 'bg-accent-500/10 ml-6' : 'bg-surface-800/70 mr-6'
                }`}
              >
                {message.role === 'model' && <Bot className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />}
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {renderCitedHashes(message.text, transactionLinks)}
                </p>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
                <span className="w-4 h-4 border-2 border-accent-400/30 border-t-accent-400 rounded-full animate-spin" />
                {t('copilot.thinking')}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-negative" role="alert">{error}</p>
        )}

        <form onSubmit={(event) => void submitQuestion(event)} className="flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={1000}
            placeholder={t('copilot.placeholder')}
            aria-label={t('copilot.placeholder')}
            disabled={sending}
            className="min-w-0 flex-1 px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !question.trim()}
            aria-label={t('copilot.send')}
            className="px-4 rounded-xl bg-accent-500 text-white hover:bg-accent-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function renderCitedHashes(text: string, transactionLinks: Map<string, string>) {
  const hashPattern = /(0x[a-fA-F0-9]{64})/g;
  const parts = text.split(hashPattern);

  return parts.map((part, index) => {
    const explorerUrl = transactionLinks.get(part.toLowerCase());
    if (!explorerUrl) return part;
    return (
      <a
        key={`${part}-${index}`}
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-accent-300 hover:text-accent-200 underline"
      >
        {part.slice(0, 10)}…{part.slice(-6)}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  });
}
