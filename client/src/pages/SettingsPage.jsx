import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  Check,
  Clapperboard,
  Database,
  Edit3,
  Heart,
  Info,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
} from 'lucide-react';
import { api, getApiError, getFieldErrors } from '../api/client.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatDate } from '../utils/format.js';
import { DATA_SOURCE_META, tierColor, tierFamily } from '../utils/constants.js';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Field, Input, Textarea } from '../components/ui/Form.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/StateViews.jsx';

function SettingsNavLink({ href, icon: Icon, label, active }) {
  return (
    <a
      href={href}
      className={`settings-nav-link ${active ? 'is-current' : ''}`.trim()}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </a>
  );
}

function ThemeOption({ mode, icon: Icon, title, description, active, onSelect }) {
  return (
    <button
      type="button"
      className={`theme-option ${active ? 'is-active' : ''}`.trim()}
      onClick={() => onSelect(mode)}
      aria-pressed={active}
    >
      <span className={`theme-swatch theme-swatch-${mode}`} aria-hidden="true">
        <span className="swatch-sidebar" />
        <span className="swatch-content">
          <span className="swatch-line" />
          <span className="swatch-line short" />
          <span className="swatch-card" />
        </span>
      </span>
      <span className="theme-option-copy">
        <span className="theme-option-title">
          <Icon size={15} aria-hidden="true" />
          {title}
          {active ? <Check size={14} className="theme-check" aria-hidden="true" /> : null}
        </span>
        <small>{description}</small>
      </span>
    </button>
  );
}

function AnimeFormModal({ anime, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: anime?.title || '',
    synopsis: anime?.synopsis || '',
    year: anime?.year ? String(anime.year) : '',
    studio: anime?.studio || '',
  });
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Title is required.';
    if (form.title.trim().length > 140) next.title = 'Use 140 characters or fewer.';
    if (form.synopsis.length > 1500) next.synopsis = 'Use 1500 characters or fewer.';
    if (form.year && (!Number.isInteger(Number(form.year)) || Number(form.year) < 1900 || Number(form.year) > 2100)) {
      next.year = 'Use a year between 1900 and 2100, or leave blank.';
    }
    if (form.studio.length > 120) next.studio = 'Use 120 characters or fewer.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setGeneralError('');
    try {
      const payload = {
        title: form.title.trim(),
        synopsis: form.synopsis.trim(),
        year: form.year ? Number(form.year) : null,
        studio: form.studio.trim(),
      };
      const response = anime
        ? await api.put(`/anime/${anime.id}`, payload)
        : await api.post('/anime', payload);
      toast.success(
        anime ? `${response.data.anime.title} was updated.` : `${response.data.anime.title} was added.`,
        anime ? 'Series updated' : 'Series added',
      );
      onSaved(response.data.anime);
    } catch (error) {
      setErrors(getFieldErrors(error));
      setGeneralError(getApiError(error).message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={anime ? `Edit ${anime.title}` : 'Add an anime series'}
      description="Series records group characters, filters and gallery items."
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="anime-form" icon={Save} loading={saving}>
            {anime ? 'Save series' : 'Create series'}
          </Button>
        </>
      }
    >
      <form id="anime-form" className="anime-form" onSubmit={submit} noValidate>
        {generalError ? <div className="form-alert" role="alert">{generalError}</div> : null}
        <Field label="Title" htmlFor="anime-title" error={errors.title} required>
          <Input
            id="anime-title"
            value={form.title}
            maxLength={140}
            onChange={(event) => update('title', event.target.value)}
            placeholder="e.g. Fullmetal Alchemist: Brotherhood"
            autoFocus
            aria-invalid={Boolean(errors.title)}
          />
        </Field>
        <div className="form-grid form-grid-2">
          <Field label="Year" htmlFor="anime-year" error={errors.year}>
            <Input
              id="anime-year"
              type="number"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(event) => update('year', event.target.value)}
              placeholder="e.g. 2009"
            />
          </Field>
          <Field label="Studio" htmlFor="anime-studio" error={errors.studio}>
            <Input
              id="anime-studio"
              value={form.studio}
              maxLength={120}
              onChange={(event) => update('studio', event.target.value)}
              placeholder="e.g. Bones"
            />
          </Field>
        </div>
        <Field
          label="Synopsis"
          htmlFor="anime-synopsis"
          error={errors.synopsis}
          hint="Optional. A short original description; avoid reproducing official marketing copy."
        >
          <Textarea
            id="anime-synopsis"
            rows={4}
            maxLength={1500}
            value={form.synopsis}
            onChange={(event) => update('synopsis', event.target.value)}
            placeholder="A quick summary in your own words…"
          />
        </Field>
      </form>
    </Modal>
  );
}

function TierConfigItem({ tier, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    label: tier.label,
    description: tier.description,
    example: tier.example,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.label.trim()) next.label = 'A label is required.';
    if (form.label.trim().length > 20) next.label = '20 characters or fewer.';
    if (!form.description.trim()) next.description = 'A description is required.';
    if (form.example.length > 180) next.example = '180 characters or fewer.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const response = await api.put(`/tiers/${encodeURIComponent(tier.key)}`, {
        label: form.label.trim(),
        description: form.description.trim(),
        example: form.example.trim(),
      });
      toast.success(`Tier ${response.data.tier.label} was updated.`, 'Tier saved');
      onSaved(response.data.tier);
    } catch (error) {
      setErrors(getFieldErrors(error));
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="tier-config-item" style={{ '--tier-color': tierColor(tier.key) }}>
      <summary>
        <span className="tier-config-key">{tier.label}</span>
        <span className="tier-config-copy">
          <strong>{tierFamily(tier.key)}</strong>
          <small>{tier.description}</small>
        </span>
        <span className="tier-config-count">{tier.characterCount} chars</span>
        <Edit3 size={14} aria-hidden="true" />
      </summary>
      <form className="tier-config-form" onSubmit={submit} noValidate>
        <div className="form-grid form-grid-2">
          <Field
            label="Label"
            htmlFor={`tier-label-${tier.key}`}
            error={errors.label}
            hint={`Key: ${tier.key} · order ${tier.orderIndex}`}
          >
            <Input
              id={`tier-label-${tier.key}`}
              value={form.label}
              maxLength={20}
              onChange={(event) => update('label', event.target.value)}
            />
          </Field>
          <Field label="Scale reference" htmlFor={`tier-example-${tier.key}`} error={errors.example}>
            <Input
              id={`tier-example-${tier.key}`}
              value={form.example}
              maxLength={180}
              onChange={(event) => update('example', event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Description"
          htmlFor={`tier-desc-${tier.key}`}
          error={errors.description}
        >
          <Textarea
            id={`tier-desc-${tier.key}`}
            rows={2}
            maxLength={500}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </Field>
        <div className="tier-config-actions">
          <Button type="submit" size="sm" icon={Save} loading={saving}>
            Save tier
          </Button>
        </div>
      </form>
    </details>
  );
}

function AdminTools() {
  const toast = useToast();
  const tiersQuery = useApiQuery('/tiers');
  const animeQuery = useApiQuery('/anime');
  const [animeModal, setAnimeModal] = useState(null);
  const [deleteAnime, setDeleteAnime] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const tiers = tiersQuery.data?.data || [];
  const anime = animeQuery.data?.data || [];

  const updateTierInCache = (updated) => {
    tiersQuery.setData((current) =>
      current
        ? {
            ...current,
            data: current.data.map((tier) =>
              tier.key === updated.key ? { ...tier, ...updated } : tier,
            ),
          }
        : current,
    );
  };

  const handleDeleteAnime = async () => {
    if (!deleteAnime || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/anime/${deleteAnime.id}`);
      toast.success(`${deleteAnime.title} was removed.`, 'Series deleted');
      setDeleteAnime(null);
      animeQuery.refetch();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section id="tier-editor" className="settings-section glass admin-section">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">Admin · power framework</span>
            <h2>Tier scale editor</h2>
            <p>
              Edit the labels, descriptions and examples that the whole app displays. Keys and order
              positions stay fixed to protect existing placements.
            </p>
          </div>
          <span className="settings-section-icon" aria-hidden="true">
            <Database size={19} />
          </span>
        </header>
        {tiersQuery.loading ? <PageLoader label="Loading tier definitions…" /> : null}
        {tiersQuery.error ? (
          <ErrorState error={tiersQuery.error} onRetry={tiersQuery.refetch} />
        ) : null}
        {!tiersQuery.loading && !tiersQuery.error ? (
          <div className="tier-config-list">
            {tiers.map((tier) => (
              <TierConfigItem key={tier.key} tier={tier} onSaved={updateTierInCache} />
            ))}
          </div>
        ) : null}
      </section>

      <section id="anime-library" className="settings-section glass admin-section">
        <header className="settings-section-head">
          <div>
            <span className="eyebrow">Admin · catalogue</span>
            <h2>Anime library</h2>
            <p>
              Series group characters, gallery filters and dashboard totals. A series with characters
              cannot be deleted until those characters are moved or removed.
            </p>
          </div>
          <Button
            icon={Plus}
            onClick={() => setAnimeModal({ mode: 'create', anime: null })}
          >
            Add series
          </Button>
        </header>

        {animeQuery.loading ? <PageLoader label="Loading series…" /> : null}
        {animeQuery.error ? (
          <ErrorState error={animeQuery.error} onRetry={animeQuery.refetch} />
        ) : null}
        {!animeQuery.loading && !animeQuery.error && anime.length === 0 ? (
          <EmptyState
            icon={Clapperboard}
            title="No series in the library"
            message="Add a series before creating characters for it."
            action={
              <Button icon={Plus} onClick={() => setAnimeModal({ mode: 'create', anime: null })}>
                Add the first series
              </Button>
            }
          />
        ) : null}

        {anime.length ? (
          <div className="anime-admin-list">
            {anime.map((series) => (
              <article key={series.id} className="anime-admin-row">
                <span className="anime-admin-poster" aria-hidden="true">
                  {series.title.slice(0, 2).toUpperCase()}
                </span>
                <div className="anime-admin-copy">
                  <strong>{series.title}</strong>
                  <small>
                    {[series.year, series.studio].filter(Boolean).join(' · ') || 'No year or studio'}
                  </small>
                  {series.synopsis ? <p>{series.synopsis}</p> : null}
                </div>
                <span className="count-chip">{series.characterCount ?? 0} characters</span>
                <div className="anime-admin-actions">
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={() => setAnimeModal({ mode: 'edit', anime: series })}
                    aria-label={`Edit ${series.title}`}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    onClick={() => setDeleteAnime(series)}
                    aria-label={`Delete ${series.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {animeModal ? (
        <AnimeFormModal
          anime={animeModal.anime}
          onClose={() => setAnimeModal(null)}
          onSaved={() => {
            setAnimeModal(null);
            animeQuery.refetch();
          }}
        />
      ) : null}

      {deleteAnime ? (
        <ConfirmDialog
          title={`Delete ${deleteAnime.title}?`}
          message={
            deleteAnime.characterCount > 0
              ? `This series still has ${deleteAnime.characterCount} character(s). The server will refuse the deletion until they are moved or removed.`
              : 'This permanently removes the series from the local database. This action cannot be undone.'
          }
          confirmLabel="Delete series"
          danger
          loading={deleting}
          onConfirm={handleDeleteAnime}
          onClose={() => setDeleteAnime(null)}
        />
      ) : null}
    </>
  );
}

export default function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, isAdmin, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target) {
      const timer = window.setTimeout(
        () => target.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [location.hash, isAdmin]);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      toast.success('You have been signed out.', 'Signed out');
      navigate('/');
    } catch (error) {
      toast.error(getApiError(error).message);
      setSigningOut(false);
    }
  };

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Control room"
        icon={Settings2}
        title="Settings"
        description="Account, appearance and the provenance rules behind the index. Administrator tools sit at the bottom."
      />

      <div className="settings-layout">
        <aside className="settings-nav glass" aria-label="Settings sections">
          <span className="settings-nav-title">On this page</span>
          <SettingsNavLink href="#account" icon={UserRound} label="Account" />
          <SettingsNavLink href="#appearance" icon={Sun} label="Appearance" />
          <SettingsNavLink href="#data-notes" icon={BookOpenCheck} label="Data notes" />
          <SettingsNavLink href="#security" icon={ShieldCheck} label="Security" />
          {isAdmin ? (
            <>
              <SettingsNavLink href="#tier-editor" icon={Database} label="Tier scale" />
              <SettingsNavLink href="#anime-library" icon={Clapperboard} label="Anime library" />
            </>
          ) : null}
          <div className="settings-nav-footer">
            <Info size={14} aria-hidden="true" />
            Local build · v1.0
          </div>
        </aside>

        <div className="settings-main">
          <section id="account" className="settings-section glass">
            <header className="settings-section-head">
              <div>
                <span className="eyebrow">Identity</span>
                <h2>Account</h2>
                <p>Your session, favorites and saved boards are tied to this local account.</p>
              </div>
              <span className="settings-section-icon" aria-hidden="true">
                <UserRound size={19} />
              </span>
            </header>

            {loading ? (
              <PageLoader label="Checking your session…" />
            ) : user ? (
              <div className="account-card">
                <span className="account-avatar" aria-hidden="true">
                  {user.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="account-copy">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <div className="account-tags">
                    <span className={`role-tag ${isAdmin ? 'role-admin' : ''}`}>
                      {isAdmin ? <ShieldCheck size={12} /> : <UserRound size={12} />}
                      {isAdmin ? 'Administrator' : 'Member'}
                    </span>
                    <span className="account-since">Joined {formatDate(user.createdAt)}</span>
                  </div>
                </div>
                <div className="account-actions">
                  <Link to="/favorites">
                    <Button variant="secondary" size="sm" icon={Heart}>
                      Favorites
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={LogOut}
                    onClick={handleLogout}
                    loading={signingOut}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="account-guest">
                <div>
                  <h3>You are browsing as a guest</h3>
                  <p>
                    Create a free local account to save favorites, tier boards and battle snapshots.
                    Characters and battles remain readable without signing in.
                  </p>
                </div>
                <div className="account-guest-actions">
                  <Link to="/login">
                    <Button>Sign in</Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="secondary">Create account</Button>
                  </Link>
                </div>
              </div>
            )}

            {import.meta.env.DEV ? (
              <div className="demo-creds-inline">
                <Sparkles size={15} aria-hidden="true" />
                <div>
                  <strong>Local demo accounts (development build)</strong>
                  <p>
                    Admin: <code>admin@animeverse.dev</code> / <code>Admin#1234</code>
                  </p>
                  <p>
                    Member: <code>explorer@animeverse.dev</code> / <code>Explore#1234</code>
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <section id="appearance" className="settings-section glass">
            <header className="settings-section-head">
              <div>
                <span className="eyebrow">Interface</span>
                <h2>Appearance</h2>
                <p>
                  Both themes are fully implemented and remembered on this device. The header toggle
                  stays in sync with this choice.
                </p>
              </div>
              <span className="settings-section-icon" aria-hidden="true">
                {theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
              </span>
            </header>
            <div className="theme-options">
              <ThemeOption
                mode="dark"
                icon={Moon}
                title="Deep space"
                description="Dark navy glass panels with aurora green and cyan accents."
                active={theme === 'dark'}
                onSelect={setTheme}
              />
              <ThemeOption
                mode="light"
                icon={Sun}
                title="Frost light"
                description="Cool, pale surfaces with the same accent system and readable contrast."
                active={theme === 'light'}
                onSelect={setTheme}
              />
            </div>
          </section>

          <section id="data-notes" className="settings-section glass">
            <header className="settings-section-head">
              <div>
                <span className="eyebrow">Provenance</span>
                <h2>Data notes</h2>
                <p>How ANIMEVERSE labels the information it stores.</p>
              </div>
              <span className="settings-section-icon" aria-hidden="true">
                <BookOpenCheck size={19} />
              </span>
            </header>

            <div className="source-definition-list">
              {Object.entries(DATA_SOURCE_META).map(([key, meta]) => (
                <div key={key} className={`source-definition source-${meta.tone}`}>
                  <span className="source-dot" aria-hidden="true" />
                  <div>
                    <strong>{meta.label}</strong>
                    <p>{meta.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <ul className="notes-list">
              <li>
                <strong>Power statistics</strong> are 0–100 comparison scores stored in SQLite. They
                are not official databook values, and a blank means unknown rather than zero.
              </li>
              <li>
                <strong>Tier bands</strong> are ordered descriptors, not an evenly spaced numeric
                scale. A tier label never decides a battle automatically.
              </li>
              <li>
                <strong>Battle analysis</strong> uses a published weighting and reports coverage. It
                is a directional reading of the entered data, not a definitive verdict.
              </li>
              <li>
                <strong>Gallery images</strong> are original AI-generated concept art created for
                this demo. They are unofficial, not frames from any series, and carry attribution.
              </li>
              <li>
                <strong>No invented sources.</strong> The app does not attach fake quotes, citations
                or official claims to characters. Confirm any claim against primary material.
              </li>
            </ul>

            <div className="note-callout">
              <Database size={16} aria-hidden="true" />
              <p>
                Data lives in a local SQLite file at <code>server/data/animeverse.db</code>. It
                survives server restarts and can be reset with <code>npm run db:reset</code>.
              </p>
            </div>
          </section>

          <section id="security" className="settings-section glass">
            <header className="settings-section-head">
              <div>
                <span className="eyebrow">Built-in safeguards</span>
                <h2>Security & privacy</h2>
                <p>The protections that apply to this local build.</p>
              </div>
              <span className="settings-section-icon" aria-hidden="true">
                <KeyRound size={19} />
              </span>
            </header>
            <div className="security-grid">
              <div className="security-item">
                <ShieldCheck size={17} aria-hidden="true" />
                <div>
                  <strong>Hashed passwords</strong>
                  <p>Passwords are hashed with bcrypt on the server and never returned to the client.</p>
                </div>
              </div>
              <div className="security-item">
                <KeyRound size={17} aria-hidden="true" />
                <div>
                  <strong>Server-side sessions</strong>
                  <p>
                    Session tokens are stored as httpOnly cookies and only their HMAC hashes live in
                    the database.
                  </p>
                </div>
              </div>
              <div className="security-item">
                <ShieldCheck size={17} aria-hidden="true" />
                <div>
                  <strong>Admin-only writes</strong>
                  <p>Character, anime and tier mutations require an administrator session.</p>
                </div>
              </div>
              <div className="security-item">
                <KeyRound size={17} aria-hidden="true" />
                <div>
                  <strong>Validation & limits</strong>
                  <p>
                    Request bodies are validated with Zod, responses use consistent error envelopes,
                    and sensitive endpoints are rate limited.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {isAdmin ? <AdminTools /> : null}
        </div>
      </div>
    </div>
  );
}
