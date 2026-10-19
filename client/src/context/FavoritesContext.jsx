import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    api
      .get('/favorites/ids')
      .then((response) => {
        if (!active) return;
        setIds(new Set(response.data.characterIds || []));
      })
      .catch(() => {
        if (active) setIds(new Set());
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, refreshToken]);

  const isFavorite = useCallback((characterId) => ids.has(characterId), [ids]);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  const toggleFavorite = useCallback(
    async (characterId) => {
      if (!user) {
        const error = new Error('Sign in to save favorites.');
        error.code = 'AUTH_REQUIRED';
        throw error;
      }

      const wasFavorite = ids.has(characterId);
      setIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.delete(characterId);
        else next.add(characterId);
        return next;
      });

      try {
        if (wasFavorite) {
          await api.delete(`/favorites/${characterId}`);
        } else {
          await api.post('/favorites', { characterId });
        }
        return !wasFavorite;
      } catch (error) {
        setIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.add(characterId);
          else next.delete(characterId);
          return next;
        });
        throw error;
      }
    },
    [ids, user],
  );

  const value = useMemo(
    () => ({
      ids,
      count: ids.size,
      loading,
      isFavorite,
      toggleFavorite,
      refresh,
    }),
    [ids, loading, isFavorite, toggleFavorite, refresh],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites must be used inside FavoritesProvider');
  return value;
}
