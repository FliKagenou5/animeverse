import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ImageOff,
  Images,
  Minus,
  Plus,
  RotateCcw,
  SearchX,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { api, getApiError } from '../api/client.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { GALLERY_CATEGORIES } from '../utils/constants.js';
import { formatDate } from '../utils/format.js';
import { ArtImage } from '../components/ui/ArtImage.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/StateViews.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Field, SearchField, Select } from '../components/ui/Form.jsx';
import { Modal } from '../components/ui/Modal.jsx';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function GalleryCard({ item, onOpen, onFavorite, favoriteBusy }) {
  return (
    <article className="gallery-card">
      <button
        type="button"
        className="gallery-card-open"
        onClick={() => onOpen(item.id)}
        aria-label={`Preview ${item.title}`}
      >
        <ArtImage src={item.imageUrl} alt={item.title} className="gallery-card-art" />
        <div className="gallery-card-overlay">
          <span className="gallery-card-category">{item.category}</span>
          <h2>{item.title}</h2>
          <p>{item.anime?.title || 'Original artwork'}</p>
          <span className="gallery-card-zoom">
            <ZoomIn size={13} aria-hidden="true" />
            Preview
          </span>
        </div>
      </button>
      <button
        type="button"
        className={`gallery-fav ${item.isFavorite ? 'is-active' : ''}`.trim()}
        onClick={() => onFavorite(item)}
        disabled={favoriteBusy}
        aria-pressed={item.isFavorite}
        aria-label={item.isFavorite ? `Remove ${item.title} from favorites` : `Favorite ${item.title}`}
      >
        <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}

export default function GalleryPage() {
  useDocumentTitle('Anime Gallery');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [animeId, setAnimeId] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [favoriteBusyId, setFavoriteBusyId] = useState(null);
  const debouncedSearch = useDebounce(searchInput.trim(), 300);

  const params = useMemo(() => {
    const next = {};
    if (debouncedSearch) next.search = debouncedSearch;
    if (category) next.category = category;
    if (animeId) next.animeId = animeId;
    if (favoritesOnly && user) next.favorites = 'true';
    return next;
  }, [debouncedSearch, category, animeId, favoritesOnly, user]);

  const galleryQuery = useApiQuery('/gallery', params);
  const animeQuery = useApiQuery('/anime');

  const items = galleryQuery.data?.data || [];
  const animeList = animeQuery.data?.data || [];
  const categories = galleryQuery.data?.meta?.categories || GALLERY_CATEGORIES;
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const hasFilters = Boolean(debouncedSearch || category || animeId || favoritesOnly);

  const openItem = (id) => {
    setZoom(1);
    setActiveId(id);
  };

  const closeViewer = () => {
    setActiveId(null);
    setZoom(1);
  };

  const step = (direction) => {
    if (items.length < 2) return;
    const nextIndex = (activeIndex + direction + items.length) % items.length;
    setZoom(1);
    setActiveId(items[nextIndex].id);
  };

  useEffect(() => {
    if (!activeId) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeIndex, items.length]);

  useEffect(() => {
    if (!galleryQuery.loading && activeId && items.length && activeIndex < 0) {
      setActiveId(null);
    }
  }, [galleryQuery.loading, activeId, items.length, activeIndex]);

  const toggleFavorite = async (item) => {
    if (!user) {
      toast.info('Sign in to save artwork to your personal collection.', 'Account required');
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (favoriteBusyId) return;
    setFavoriteBusyId(item.id);

    const nextValue = !item.isFavorite;
    galleryQuery.setData((current) => {
      if (!current) return current;
      return {
        ...current,
        data: current.data.map((entry) =>
          entry.id === item.id ? { ...entry, isFavorite: nextValue } : entry,
        ),
      };
    });

    try {
      if (nextValue) await api.post(`/gallery/${item.id}/favorite`);
      else await api.delete(`/gallery/${item.id}/favorite`);
      toast.success(
        nextValue ? 'Artwork added to your favorites.' : 'Artwork removed from your favorites.',
        nextValue ? 'Saved' : 'Removed',
      );
      if (favoritesOnly) galleryQuery.refetch();
    } catch (error) {
      galleryQuery.setData((current) =>
        current
          ? {
              ...current,
              data: current.data.map((entry) =>
                entry.id === item.id ? { ...entry, isFavorite: item.isFavorite } : entry,
              ),
            }
          : current,
      );
      toast.error(getApiError(error).message);
    } finally {
      setFavoriteBusyId(null);
    }
  };

  const toggleFavoritesOnly = () => {
    if (!user) {
      toast.info('Sign in to view your favorite artwork.', 'Account required');
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setFavoritesOnly((value) => !value);
  };

  const clearFilters = () => {
    setSearchInput('');
    setCategory('');
    setAnimeId('');
    setFavoritesOnly(false);
  };

  return (
    <div className="page gallery-page">
      <PageHeader
        eyebrow="Original concept art"
        icon={Images}
        title="Anime Gallery"
        description="A curated, locally hosted gallery of original AI-generated concept art made for this demo. Every piece is unofficial and attributed in the preview."
        actions={
          <Button
            variant={favoritesOnly ? 'primary' : 'secondary'}
            icon={Heart}
            onClick={toggleFavoritesOnly}
            aria-pressed={favoritesOnly}
          >
            {favoritesOnly ? 'Showing favorites' : 'Favorites only'}
          </Button>
        }
      />

      <section className="gallery-filter glass" aria-label="Gallery filters">
        <div className="filter-row">
          <SearchField
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search titles and descriptions…"
            label="Search gallery"
            className="filter-search"
          />
          <Field label="Anime" htmlFor="gallery-anime" className="filter-field">
            <Select
              id="gallery-anime"
              value={animeId}
              onChange={(event) => setAnimeId(event.target.value)}
            >
              <option value="">All series</option>
              {animeList.map((anime) => (
                <option key={anime.id} value={anime.id}>
                  {anime.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="gallery-category-field">
            <span className="field-label">Category</span>
            <div className="category-chips">
              <button
                type="button"
                className={`category-chip ${!category ? 'is-active' : ''}`.trim()}
                onClick={() => setCategory('')}
              >
                All
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`category-chip ${category === item ? 'is-active' : ''}`.trim()}
                  onClick={() => setCategory(category === item ? '' : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="filter-foot">
          <p className="filter-count">
            {galleryQuery.loading ? (
              'Loading artwork…'
            ) : (
              <>
                <strong>{items.length}</strong> {items.length === 1 ? 'piece' : 'pieces'}
                {favoritesOnly ? ' in your favorites' : ' in this view'}
              </>
            )}
          </p>
          <div className="active-filters">
            {favoritesOnly ? (
              <button type="button" className="filter-chip" onClick={toggleFavoritesOnly}>
                Favorites only
                <Heart size={11} aria-hidden="true" />
              </button>
            ) : null}
            {hasFilters ? (
              <button type="button" className="filter-clear" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {galleryQuery.loading ? <CardGridSkeleton count={8} /> : null}

      {galleryQuery.error && !galleryQuery.loading ? (
        <ErrorState
          title="The gallery could not load"
          error={galleryQuery.error}
          onRetry={galleryQuery.refetch}
        />
      ) : null}

      {!galleryQuery.loading && !galleryQuery.error && items.length === 0 ? (
        <EmptyState
          icon={favoritesOnly ? Heart : SearchX}
          title={favoritesOnly ? 'No favorite artwork yet' : 'No artwork matches this view'}
          message={
            favoritesOnly
              ? 'Use the heart on any gallery card to collect art here.'
              : 'Try a different search, series or category.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="secondary" onClick={galleryQuery.refetch}>
                Refresh gallery
              </Button>
            )
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="gallery-grid">
          {items.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              onOpen={openItem}
              onFavorite={toggleFavorite}
              favoriteBusy={favoriteBusyId === item.id}
            />
          ))}
        </div>
      ) : null}

      <section className="gallery-note glass">
        <span className="gallery-note-icon" aria-hidden="true">
          <Sparkles size={17} />
        </span>
        <div>
          <h2>About this gallery</h2>
          <p>
            All images are original AI-generated concept art created for the ANIMEVERSE demo. They
            are not frames, scans or official illustrations from any series. Attribution is stored
            with each item and shown in the preview.
          </p>
        </div>
      </section>

      {activeItem ? (
        <Modal
          title={activeItem.title}
          description={[activeItem.anime?.title, activeItem.category].filter(Boolean).join(' · ')}
          size="xl"
          className="gallery-modal"
          onClose={closeViewer}
          footer={
            <div className="gallery-modal-footer">
              <div className="gallery-modal-nav">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ChevronLeft}
                  onClick={() => step(-1)}
                  disabled={items.length < 2}
                >
                  Previous
                </Button>
                <span>
                  {activeIndex + 1} / {items.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  iconRight={ChevronRight}
                  onClick={() => step(1)}
                  disabled={items.length < 2}
                >
                  Next
                </Button>
              </div>
              <Button
                variant={activeItem.isFavorite ? 'primary' : 'secondary'}
                icon={Heart}
                onClick={() => toggleFavorite(activeItem)}
                loading={favoriteBusyId === activeItem.id}
              >
                {activeItem.isFavorite ? 'Favorited' : 'Add to favorites'}
              </Button>
            </div>
          }
        >
          <div className="gallery-viewer">
            <div className="gallery-zoom-bar">
              <div className="zoom-controls">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  <Minus size={16} />
                </button>
                <span className="zoom-value">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setZoom(1)}
                  disabled={zoom === 1}
                  aria-label="Reset zoom"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <span className="zoom-hint">
                {zoom > 1 ? 'Scroll to explore the image' : 'Use ± to zoom. Arrow keys switch pieces.'}
              </span>
            </div>

            <div className={`gallery-preview ${zoom > 1 ? 'is-zoomed' : ''}`.trim()}>
              <div
                className="gallery-zoom-inner"
                style={{ width: `${zoom * 100}%` }}
              >
                <ArtImage
                  src={activeItem.imageUrl}
                  alt={activeItem.title}
                  loading="eager"
                  className="gallery-viewer-art"
                />
              </div>
            </div>

            <div className="gallery-viewer-info">
              <div>
                <Badge tone="info">{activeItem.category}</Badge>
                {activeItem.anime ? (
                  <Badge tone="neutral">{activeItem.anime.title}</Badge>
                ) : null}
                <Badge tone="demo">Original concept art</Badge>
              </div>
              <p>{activeItem.description}</p>
              <div className="gallery-attribution">
                <ImageOff size={13} aria-hidden="true" />
                <div>
                  <strong>Attribution & source</strong>
                  <p>{activeItem.attribution}</p>
                  {activeItem.sourceUrl ? (
                    <a
                      href={activeItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-link"
                    >
                      View the original source
                    </a>
                  ) : (
                    <span className="gallery-source-note">
                      No external source URL — this artwork is bundled with the local demo.
                    </span>
                  )}
                </div>
              </div>
              <span className="gallery-date">Added {formatDate(activeItem.createdAt)}</span>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
