import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { CharacterAvatar } from '../characters/CharacterAvatar.jsx';
import { TierBadge } from '../characters/TierBadge.jsx';
import { Spinner } from '../ui/Spinner.jsx';

const SUGGESTIONS = ['Gojo', 'Goku', 'Frieren'];

export function GlobalSearch({ className = '', autoFocus = false, onNavigate, placeholder }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const debouncedQuery = useDebounce(query.trim(), 260);

  useEffect(() => {
    if (autoFocus) {
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    api
      .get('/characters', {
        params: { search: debouncedQuery, limit: 6, sort: 'name_asc' },
        signal: controller.signal,
      })
      .then((response) => {
        setResults(response.data.data || []);
        setActiveIndex(-1);
      })
      .catch((requestError) => {
        if (requestError.code === 'ERR_CANCELED' || requestError.name === 'CanceledError') return;
        setError('Search is unavailable right now.');
        setResults([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    setOpen(false);
    setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const goToCharacter = (character) => {
    setOpen(false);
    setQuery('');
    onNavigate?.();
    navigate(`/characters/${character.id}`);
  };

  const goToAll = () => {
    if (!query.trim()) return;
    setOpen(false);
    const search = query.trim();
    setQuery('');
    onNavigate?.();
    navigate(`/characters?search=${encodeURIComponent(search)}`);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        goToCharacter(results[activeIndex]);
      } else {
        goToAll();
      }
    }
  };

  const showPanel = open;
  const hasQuery = query.trim().length >= 2;

  return (
    <div className={`global-search ${className}`.trim()} ref={rootRef}>
      <div className={`global-search-shell ${open ? 'is-focused' : ''}`.trim()}>
        <Search size={17} className="global-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined
          }
          aria-label="Search characters"
          placeholder={placeholder || 'Search characters, aliases…'}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {loading ? <Spinner size={15} /> : null}
        <span className="global-search-hint" aria-hidden="true">
          /
        </span>
      </div>

      {showPanel ? (
        <div className="global-search-panel" id="global-search-results" role="listbox">
          {!hasQuery ? (
            <div className="search-suggest">
              <p>Search by character name or alias.</p>
              <div className="suggest-chips">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setQuery(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {hasQuery && !loading && results.length === 0 && !error ? (
            <div className="search-empty">
              <p>No characters match “{query.trim()}”.</p>
              <span>Try a shorter name, an alias, or the full character database.</span>
            </div>
          ) : null}

          {error ? <div className="search-empty"><p>{error}</p></div> : null}

          {results.length > 0 ? (
            <div className="search-results">
              {results.map((character, index) => (
                <button
                  key={character.id}
                  type="button"
                  id={`global-search-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`search-result ${activeIndex === index ? 'is-active' : ''}`}
                  onClick={() => goToCharacter(character)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <CharacterAvatar character={character} size="xs" />
                  <span className="search-result-copy">
                    <strong>{character.name}</strong>
                    <small>
                      {character.anime.title}
                      {character.alias ? ` · ${character.alias}` : ''}
                    </small>
                  </span>
                  <TierBadge tier={character.tier} />
                </button>
              ))}
            </div>
          ) : null}

          {hasQuery ? (
            <button type="button" className="search-view-all" onClick={goToAll}>
              <span>View all results for “{query.trim()}”</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <div className="search-footnote">Press Enter to see every match. Esc to close.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
