import { useI18n } from '@/i18n/context';
import { useApp } from '@/context/AppContext';
import { LandingPage } from '@/components/landing/LandingPage';
import { LanguageSelectionPage } from '@/components/landing/LanguageSelectionPage';
import { Dashboard } from '@/components/dashboard/Dashboard';

function AppContent() {
  const { isFirstLaunch } = useI18n();
  const { view, loading, error } = useApp();

  if (isFirstLaunch) {
    return <LanguageSelectionPage />;
  }

  if (view === 'dashboard') {
    return <Dashboard />;
  }

  return <LandingPage />;
}

export default function App() {
  return <AppContent />;
}
