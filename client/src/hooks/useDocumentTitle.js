import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} • ANIMEVERSE` : 'ANIMEVERSE — Explore the Infinite Anime Universe';
  }, [title]);
}
