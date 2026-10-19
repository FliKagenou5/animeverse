import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { Logo } from './components/brand/Logo.jsx';
import { Spinner } from './components/ui/Spinner.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CharactersPage from './pages/CharactersPage.jsx';
import CharacterDetailPage from './pages/CharacterDetailPage.jsx';
import BattlePage from './pages/BattlePage.jsx';
import PowerScalingPage from './pages/PowerScalingPage.jsx';
import TierListPage from './pages/TierListPage.jsx';
import GalleryPage from './pages/GalleryPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function BootScreen() {
  return (
    <div className="boot-screen">
      <Logo />
      <Spinner size={22} />
      <p>Calibrating the universe index…</p>
    </div>
  );
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailPage />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/power-scaling" element={<PowerScalingPage />} />
        <Route path="/tier-list" element={<TierListPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
