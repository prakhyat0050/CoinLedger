# CoinLedger

**Turn any crypto wallet address into a human-readable financial statement.**

CoinLedger is a production-quality crypto wallet financial intelligence dashboard powered by the Blockscout PRO API. It transforms raw on-chain transaction data into clear financial summaries — income, expenses, P&L estimates, token holdings, gas fee analytics, transaction categorization, tax-ready CSV exports, and smart insights.

Built for the Blockscout PRO API Buildathon.

## Features

- **Wallet Financial Summary** — Total received, total sent, gas fees, net flow, and estimated P&L with clear disclaimers about cost basis limitations
- **Money Flow Analysis** — Interactive area chart with 7D / 30D / 90D / 1Y / ALL time ranges showing incoming vs. outgoing value
- **Transaction Categorization** — Auto-categorizes transactions as income, payment, swap, transfer, NFT, contract interaction, or gas, with confidence levels
- **Transaction Table** — Searchable, filterable, sortable transaction history with category/direction/token filters and pagination
- **Transaction Details Drawer** — Side panel with human-readable explanation ("You sent 2.5 ETH to 0x1f2a...") and direct Blockscout verification links
- **Portfolio** — Token holdings table with USD valuations (where price data is available), NFT detection, and Blockscout token links
- **Gas Fee Analytics** — Total gas spent, average per transaction, highest-gas transaction, and daily/monthly bar charts
- **Tax-Ready Report** — Date-range filtering, category inclusion/exclusion, CSV export, and print support with tax preparation disclaimer
- **Smart Insights** — Auto-generated observations from real wallet data (largest transactions, gas ratio, most active token/period, net flow direction)
- **Wallet Health Score** — Activity-based score (not financial risk) combining transaction frequency (40%), active days (25%), unique contracts (20%), and token diversity (15%)
- **12-Language Support** — Full i18n across the entire app: English, Hindi, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Punjabi, Spanish, French
- **Locale-Aware Formatting** — Numbers, dates, and currency formatted using Intl APIs with locale-appropriate currency symbols (INR for Indic languages, EUR for Spanish/French, USD for English)

## Architecture

```
src/
  components/
    dashboard/
      Dashboard.tsx          — Dashboard shell with tab navigation
      Overview.tsx           — KPI cards, P&L card, flow chart, category donut
      TransactionTable.tsx   — Searchable/filterable transaction table
      TransactionDrawer.tsx  — Transaction details side drawer
      PortfolioTab.tsx       — Token holdings
      GasTab.tsx             — Gas fee analytics with chart
      TaxTab.tsx             — Tax report with CSV export
      InsightsTab.tsx        — Smart insights + wallet health
    landing/
      LandingPage.tsx        — Hero, wallet input, network selector, demo button
      LanguageSelectionPage.tsx — First-launch language picker
    ui/
      LanguageSwitcher.tsx   — Nav bar language dropdown
      Tooltip.tsx            — Info tooltip with i18n
      Skeleton.tsx           — Loading skeletons
  context/
    AppContext.tsx           — Global app state (view, wallet, analysis result)
  i18n/
    context.tsx              — I18nProvider, useI18n hook, translation function
    languages.ts             — 12 language definitions, browser detection
    types.ts                 — Translation type definitions
  locales/
    en.json + 11 others      — Complete translations for 12 languages
  services/
    blockscout.ts            — Blockscout API service (fetches via edge function proxy)
    analytics.ts             — Financial analytics computations
    chains.ts                — 10 EVM chain configs, stablecoin map, demo wallets
  types/
    index.ts                 — All internal types (decoupled from API formats)
  utils/
    format.ts                — Locale-aware currency/number/date formatting

supabase/
  functions/
    blockscout-api/index.ts  — Secure proxy edge function (API key server-side, SSRF prevention)
  config.toml                — Edge function config
```

## Key Design Decisions

### API Key Security
The Blockscout API key is never exposed to the browser. All Blockscout API calls go through a Supabase edge function (`blockscout-api`) that:
- Reads the API key from server-side environment variables
- Adds it as an `x-api-key` header to upstream requests
- Validates the target URL against an allowlist of known Blockscout instances (SSRF prevention)
- Returns user-friendly error messages for 404/429/5xx responses

### No Fabricated Data
- USD values use Blockscout's `exchange_rate` field when available
- Stablecoins (USDC, USDT, DAI, etc.) are assumed at $1
- When no price data is available, the value is shown as "Unavailable" — never fabricated
- P&L is clearly labeled as "Estimated P&L" with a note about cost basis limitations

### Blockscout as Evidence Source
Every transaction links directly to its Blockscout page for verification. The footer attributes Blockscout as the data source on every page.

### Internal Type System
The UI is coupled to internal types (`Transaction`, `TokenHolding`, `WalletSummary`, etc.), not to raw Blockscout API response shapes. This allows the API layer to change without affecting components.

### i18n Architecture
- 12 locale JSON files with 261+ translation keys
- Fallback to English when a key is missing
- Missing key warnings in development
- Technical terms (Blockscout, Wallet, Gas, Transaction) kept in English across all languages
- Language preference stored in localStorage with browser language auto-detection

## Supported Networks

Ethereum, Polygon, Optimism, Arbitrum One, Base, Gnosis, Scroll, zkSync Era, Linea, Mantle

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS with custom dark theme
- Recharts for data visualization
- Supabase Edge Functions (Deno runtime) for API proxying
- lucide-react for icons
- Google Fonts (Inter + Noto Sans for Indic scripts)

## Development

```bash
npm install
npm run dev
```

The Supabase project is pre-provisioned. Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are in `.env`.

The `BLOCKSCOUT_API_KEY` edge function secret is configured server-side and never exposed to the client.

## Disclaimer

CoinLedger is not affiliated with Blockscout. Data is provided as-is. Tax reports are for preparation purposes only and do not constitute tax advice.
