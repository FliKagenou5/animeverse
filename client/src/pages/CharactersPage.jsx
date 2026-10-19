import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  UserRoundSearch,
  Users,
  X,
} from 'lucide-react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import {
  DATA_SOURCE_META,
  PAGE_SIZE,
  SORT_OPTIONS,
  STATUSES,
  tierFamily,
} from '../utils/constants.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, SearchField, Select } from '../components/ui/Form.jsx';
import { CardGridSkeleton, EmptyState, ErrorState } from '../components/ui/StateViews.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { CharacterCard } from '../components/characters/CharacterCard.jsx';
import { CharacterFormModal } from '../components/characters/CharacterFormModal.jsx';

export default function CharactersPage() {
  useDocumentTitle('Character Database');
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);

  const search = searchParams.get('search') || '';
  const animeId = searchParams.get('anime') || '';
  const tier = searchParams.get('tier') || '';
  const status = searchParams.get('status') || '';
  const sort = searchParams.get('sort') || 'name_asc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput.trim(), 320);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch === search) return;
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedSearch) next.set('search', debouncedSearch);
        else next.delete('search');
        next.delete('page');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE, sort };
    if (search) next.search = search;
    if (animeId) next.animeId = animeId;
    if (tier) next.tier = tier;
    if (status) next.status = status;
    return next;
  }, [page, sort, search, animeId, tier, status]);

  const charactersQuery = useApiQuery('/characters', params);
  const animeQuery = useApiQuery('/anime');
  const tiersQuery = useApiQuery('/tiers');

  const animeList = animeQuery.data?.data || [];
  const tiers = tiersQuery.data?.data || [];
  const data = charactersQuery.data?.data || [];
  const pagination = charactersQuery.data?.pagination;

  useEffect(() => {
    if (!pagination) return;
    if (pagination.total > 0 && page > pagination.totalPages) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('page', String(pagination.totalPages));
          return next;
        },
        { replace: true },
      );
    }
  }, [pagination, page, setSearchParams]);

  const tierGroups = useMemo(() => {
    const groups = [];
    for (const item of tiers) {
      const family = tierFamily(item.key);
      let group = groups.find((entry) => entry.family === family);
      if (!group) {
        group = { family, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [tiers]);

  const activeFilters = [
    search ? { key: 'search', label: `Search: “${search}”` } : null,
    animeId
      ? {
          key: 'anime',
          label: `Anime: ${animeList.find((item) => String(item.id) === animeId)?.title || 'unknown'}`,
        }
      : null,
    tier ? { key: 'tier', label: `Tier: ${tier}` } : null,
    status ? { key: 'status', label: `Status: ${status}` } : null,
  ].filter(Boolean);

  const updateParam = (key, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const clearFilter = (key) => {
    if (key === 'search') {
      setSearchInput('');
      return;
    }
    updateParam(key, '');
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams({}, { replace: true });
  };

  const changePage = (nextPage) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage <= 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page characters-page">
      <PageHeader
        eyebrow="The roster"
        icon={Users}
        title="Character Database"
        description="Search the full roster, inspect profiles and manage the index. Power values are community interpretations, not official facts."
        actions={
          <>
            <Link to="/power-scaling">
              <Button variant="secondary" icon={SlidersHorizontal}>
                Tier system
              </Button>
            </Link>
            {isAdmin ? (
              <Button
                icon={Plus}
                onClick={() => setFormOpen(true)}
                disabled={!animeList.length || !tiers.length}
              >
                Add character
              </Button>
            ) : null}
          </>
        }
      />

      <section className="filter-panel glass" aria-label="Character filters">
        <div className="filter-row">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name or alias…"
            label="Search characters by name or alias"
            icon={UserRoundSearch}
            className="filter-search"
          />
          <Field label="Anime" htmlFor="filter-anime" className="filter-field">
            <Select
              id="filter-anime"
              value={animeId}
              onChange={(event) => updateParam('anime', event.target.value)}
            >
              <option value="">All anime</option>
              {animeList.map((anime) => (
                <option key={anime.id} value={anime.id}>
                  {anime.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tier" htmlFor="filter-tier" className="filter-field">
            <Select
              id="filter-tier"
              value={tier}
              onChange={(event) => updateParam('tier', event.target.value)}
            >
              <option value="">All tiers</option>
              {tierGroups.map((group) => (
                <optgroup key={group.family} label={group.family}>
                  {group.items.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="filter-status" className="filter-field">
            <Select
              id="filter-status"
              value={status}
              onChange={(event) => updateParam('status', event.target.value)}
            >
              <option value="">Any status</option>
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort" htmlFor="filter-sort" className="filter-field">
            <Select
              id="filter-sort"
              value={sort}
              onChange={(event) => updateParam('sort', event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="filter-foot">
          <p className="filter-count">
            {pagination ? (
              <>
                <strong>{pagination.total}</strong>{' '}
                {pagination.total === 1 ? 'character' : 'characters'} in this view
              </>
            ) : (
              'Loading roster…'
            )}
          </p>
          <div className="active-filters">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="filter-chip"
                onClick={() => clearFilter(filter.key)}
                aria-label={`Remove filter ${filter.label}`}
              >
                {filter.label}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
            {activeFilters.length > 1 ? (
              <button type="button" className="filter-clear" onClick={clearAll}>
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {charactersQuery.loading ? <CardGridSkeleton count={PAGE_SIZE} /> : null}

      {charactersQuery.error && !charactersQuery.loading ? (
        <ErrorState
          title="The character index could not load"
          error={charactersQuery.error}
          onRetry={charactersQuery.refetch}
        />
      ) : null}

      {!charactersQuery.loading && !charactersQuery.error && data.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={activeFilters.length ? 'No characters match this view' : 'No characters yet'}
          message={
            activeFilters.length
              ? 'Try a shorter search, remove a filter, or reset the full view.'
              : isAdmin
                ? 'Add the first character to start building the index.'
                : 'An administrator can add characters from this page.'
          }
          action={
            activeFilters.length ? (
              <Button variant="secondary" onClick={clearAll}>
                Reset filters
              </Button>
            ) : isAdmin ? (
              <Button icon={Plus} onClick={() => setFormOpen(true)}>
                Add character
              </Button>
            ) : null
          }
        />
      ) : null}

      {data.length > 0 ? (
        <>
          <div className="character-grid">
            {data.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={changePage}
            itemLabel="characters"
          />
        </>
      ) : null}

      <section className="data-note glass">
        <span className="data-note-icon" aria-hidden="true">
          <Sparkles size={17} />
        </span>
        <div>
          <h3>Reading the labels</h3>
          <p>
            {Object.values(DATA_SOURCE_META)
              .map((meta) => `${meta.label}: ${meta.description}`)
              .join(' ')}
          </p>
        </div>
        <Link to="/settings" className="panel-link">
          Data notes
        </Link>
      </section>

      {formOpen && isAdmin ? (
        <CharacterFormModal
          character={null}
          animeList={animeList}
          tiers={tiers}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            charactersQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}
