import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, SearchX, UserPlus, Users } from 'lucide-react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { FAVORITE_SORT_OPTIONS } from '../utils/constants.js';
import { AuthGate } from '../components/ui/AuthGate.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, SearchField, Select } from '../components/ui/Form.jsx';
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/ui/StateViews.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { CharacterCard } from '../components/characters/CharacterCard.jsx';

function FavoritesWorkspace() {
  const { user } = useAuth();
  const { ids, loading: idsLoading } = useFavorites();
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('recent');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const params = useMemo(() => {
    const next = { sort };
    if (debouncedSearch) next.search = debouncedSearch;
    return next;
  }, [sort, debouncedSearch]);

  const favoritesQuery = useApiQuery('/favorites', params);
  const serverItems = favoritesQuery.data?.data || [];
  const visibleItems = serverItems.filter((character) => ids.has(character.id));
  const loading = favoritesQuery.loading || idsLoading;

  return (
    <>
      <section className="favorites-toolbar glass">
        <div className="filter-row">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search your favorites by name or alias…"
            label="Search favorites"
            className="filter-search"
          />
          <Field label="Sort" htmlFor="favorites-sort" className="filter-field">
            <Select
              id="favorites-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {FAVORITE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="filter-foot">
          <p className="filter-count">
            {loading ? (
              'Loading your collection…'
            ) : (
              <>
                <strong>{ids.size}</strong> {ids.size === 1 ? 'character' : 'characters'} saved to{' '}
                {user.name.split(' ')[0]}&apos;s list
              </>
            )}
          </p>
          <Link to="/characters" className="panel-link">
            Browse the full roster
            <Users size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {loading ? <CardGridSkeleton count={4} /> : null}

      {favoritesQuery.error && !loading ? (
        <ErrorState
          title="Your favorites could not load"
          error={favoritesQuery.error}
          onRetry={favoritesQuery.refetch}
        />
      ) : null}

      {!loading && !favoritesQuery.error ? (
        visibleItems.length > 0 ? (
          <div className="character-grid">
            {visibleItems.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        ) : debouncedSearch && ids.size > 0 ? (
          <EmptyState
            icon={SearchX}
            title="No favorites match that search"
            message={`Nothing in your list matches “${debouncedSearch}”. Try another name or clear the search.`}
            action={
              <Button variant="secondary" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Heart}
            title="Your favorites list is empty"
            message="Tap the heart on any character card to keep them here. Favorites are stored per account in the local database."
            action={
              <Link to="/characters">
                <Button icon={UserPlus}>Discover characters</Button>
              </Link>
            }
          />
        )
      ) : null}

      <section className="favorites-note glass">
        <Heart size={17} aria-hidden="true" />
        <div>
          <h2>Private to your account</h2>
          <p>
            This list is tied to <strong>{user.email}</strong>. Removing a favorite updates the
            database immediately; no global or shared favorites list is used.
          </p>
        </div>
        <Link to="/characters" className="panel-link">
          Add more
        </Link>
      </section>
    </>
  );
}

export default function FavoritesPage() {
  useDocumentTitle('Favorites');

  return (
    <div className="page favorites-page">
      <PageHeader
        eyebrow="Personal collection"
        icon={Heart}
        title="Favorites"
        description="The characters you want to keep close. Search them, sort them and open any profile for the full breakdown."
        actions={
          <Link to="/characters">
            <Button variant="secondary" icon={Users}>
              Character database
            </Button>
          </Link>
        }
      />
      <AuthGate
        title="Sign in to see your favorites"
        description="Favorites belong to individual accounts and are stored in the app's SQLite database. Sign in to open your personal collection."
      >
        <FavoritesWorkspace />
      </AuthGate>
    </div>
  );
}
