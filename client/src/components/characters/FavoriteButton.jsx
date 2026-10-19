import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getApiError } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFavorites } from '../../context/FavoritesContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Spinner } from '../ui/Spinner.jsx';

export function FavoriteButton({
  characterId,
  withLabel = false,
  className = '',
  size = 18,
}) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const active = isFavorite(characterId);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.info('Sign in to keep a personal favorites list.', 'Favorites need an account');
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    if (busy) return;
    setBusy(true);
    try {
      const nowFavorite = await toggleFavorite(characterId);
      toast.success(
        nowFavorite ? 'Added to your favorites.' : 'Removed from your favorites.',
        nowFavorite ? 'Saved' : 'Removed',
      );
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`favorite-button ${active ? 'is-active' : ''} ${withLabel ? 'has-label' : ''} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'Remove from favorites' : 'Add to favorites'}
      title={active ? 'Remove from favorites' : 'Add to favorites'}
      disabled={busy}
    >
      {busy ? (
        <Spinner size={16} />
      ) : (
        <Heart size={size} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
      )}
      {withLabel ? <span>{active ? 'Favorited' : 'Favorite'}</span> : null}
    </button>
  );
}
