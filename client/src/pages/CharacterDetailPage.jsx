import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Clapperboard,
  Database,
  Edit3,
  Gauge,
  Info,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
} from 'lucide-react';
import { api, getApiError } from '../api/client.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatDate, formatDateTime } from '../utils/format.js';
import {
  DATA_SOURCE_META,
  HAX_STAT,
  SCALED_STATS,
  tierColor,
  tierFamily,
} from '../utils/constants.js';
import { CharacterAvatar } from '../components/characters/CharacterAvatar.jsx';
import { CharacterFormModal } from '../components/characters/CharacterFormModal.jsx';
import { FavoriteButton } from '../components/characters/FavoriteButton.jsx';
import { StatBar } from '../components/characters/StatBar.jsx';
import { TierBadge } from '../components/characters/TierBadge.jsx';
import { DataSourceBadge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { PageLoader, ErrorState } from '../components/ui/StateViews.jsx';

function Fact({ icon: Icon, label, value }) {
  return (
    <div className="fact-row">
      <span className="fact-icon" aria-hidden="true">
        <Icon size={15} />
      </span>
      <span className="fact-label">{label}</span>
      <span className="fact-value">{value || '—'}</span>
    </div>
  );
}

export default function CharacterDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const characterQuery = useApiQuery(`/characters/${id}`);
  const animeQuery = useApiQuery('/anime', {}, { enabled: isAdmin });
  const tiersQuery = useApiQuery('/tiers', {}, { enabled: isAdmin });

  const character = characterQuery.data?.character;
  const animeList = animeQuery.data?.data || [];
  const tiers = tiersQuery.data?.data || [];

  useDocumentTitle(character ? character.name : 'Character profile');

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/characters/${character.id}`);
      toast.success(`${character.name} was removed from the index.`, 'Character deleted');
      navigate('/characters', { replace: true });
    } catch (error) {
      toast.error(getApiError(error).message);
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (characterQuery.loading) return <PageLoader label="Opening character profile…" />;

  if (characterQuery.error) {
    return (
      <div className="page">
        <BackLink />
        <ErrorState
          title="This profile could not be loaded"
          error={characterQuery.error}
          onRetry={characterQuery.refetch}
        />
      </div>
    );
  }

  if (!character) return null;

  const source = DATA_SOURCE_META[character.dataSource] || DATA_SOURCE_META.community;
  const availableStats = SCALED_STATS.filter(
    (stat) => typeof character.stats[stat.key] === 'number',
  ).length;
  const hasHax = typeof character.stats.hax === 'number' || character.haxNote;

  return (
    <div className="page character-detail-page">
      <BackLink />

      <section
        className="profile-hero glass"
        style={{ '--tier-color': tierColor(character.tier.key) }}
      >
        <div className="profile-hero-glow" aria-hidden="true" />
        <div className="profile-portrait">
          <CharacterAvatar character={character} size="hero" loading="eager" />
          <div className="profile-portrait-meta">
            <TierBadge tier={character.tier} showFamily />
            <DataSourceBadge source={character.dataSource} />
          </div>
        </div>

        <div className="profile-intro">
          <div className="profile-anime-line">
            <Clapperboard size={14} aria-hidden="true" />
            <span>{character.anime.title}</span>
            <span className="meta-divider" aria-hidden="true">·</span>
            <StatusBadge status={character.status} />
          </div>
          <h1>{character.name}</h1>
          {character.alias ? <p className="profile-alias">“{character.alias}”</p> : null}
          <p className="profile-description">{character.description}</p>

          <div className="profile-actions">
            <FavoriteButton characterId={character.id} withLabel className="profile-fav" />
            <Link to={`/battle?a=${character.id}`}>
              <Button icon={Swords} variant="secondary">
                Compare in battle
              </Button>
            </Link>
            {isAdmin ? (
              <>
                <Button
                  variant="ghost"
                  icon={Edit3}
                  onClick={() => setEditOpen(true)}
                  disabled={!animeList.length || !tiers.length}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  icon={Trash2}
                  className="danger-text"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <aside className="profile-facts">
          <h2>Profile facts</h2>
          <Fact icon={Clapperboard} label="Anime" value={character.anime.title} />
          <Fact icon={Gauge} label="Tier family" value={tierFamily(character.tier.key)} />
          <Fact icon={Sparkles} label="First appearance" value={character.firstAppearance} />
          <Fact icon={ShieldAlert} label="Status" value={character.status} />
          <Fact icon={Database} label="Data source" value={source.label} />
          <Fact icon={CalendarDays} label="Indexed" value={formatDate(character.createdAt)} />
          <Fact icon={CalendarDays} label="Updated" value={formatDateTime(character.updatedAt)} />
        </aside>
      </section>

      <div className="detail-columns">
        <section className="panel glass detail-power">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Power profile</span>
              <h2>Measured parameters</h2>
            </div>
            <span className="count-chip">{availableStats}/8 tracked</span>
          </header>
          <p className="panel-note">
            Values use a 0–100 comparison scale. Unknown parameters stay blank; battle analysis
            excludes missing values instead of guessing.
          </p>
          <div className="detail-stat-grid">
            {SCALED_STATS.map((stat) => (
              <StatBar
                key={stat.key}
                label={stat.label}
                value={character.stats[stat.key]}
                weight={stat.weight}
                tone={tierColor(character.tier.key)}
              />
            ))}
          </div>

          <section className={`hax-panel ${hasHax ? '' : 'hax-empty'}`}>
            <div className="hax-head">
              <span className="hax-icon" aria-hidden="true">
                <Sparkles size={17} />
              </span>
              <div>
                <h3>{HAX_STAT.label}</h3>
                <p>Qualitative context, excluded from the weighted battle score.</p>
              </div>
              {typeof character.stats.hax === 'number' ? (
                <span className="hax-index">{character.stats.hax}<small>/100</small></span>
              ) : (
                <span className="count-chip">No index</span>
              )}
            </div>
            {character.haxNote ? <p className="hax-note">{character.haxNote}</p> : null}
            {character.abilities.length ? (
              <div className="ability-chips">
                {character.abilities.map((ability) => (
                  <span key={ability} className="ability-chip">
                    {ability}
                  </span>
                ))}
              </div>
            ) : (
              <p className="panel-note">No abilities recorded.</p>
            )}
          </section>
        </section>

        <div className="detail-side">
          <section className="panel glass detail-weakness">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Tactical read</span>
                <h2>Weaknesses</h2>
              </div>
              <span className="weakness-icon" aria-hidden="true">
                <ShieldAlert size={18} />
              </span>
            </header>
            <p>{character.weaknesses}</p>
          </section>

          <section className={`panel glass source-panel source-${source.tone}`}>
            <header className="panel-head">
              <div>
                <span className="eyebrow">Data transparency</span>
                <h2>{source.label}</h2>
              </div>
              <span className="source-icon" aria-hidden="true">
                <Info size={17} />
              </span>
            </header>
            <p>{source.description}</p>
            <p className="source-fineprint">
              No official source, quote or feat is claimed for this entry unless explicitly stated
              by an administrator. Tier placement is interpretive.
            </p>
            <Link to="/power-scaling" className="panel-link">
              How tiers and stats work
              <ArrowLeft size={14} className="flip-horizontal" aria-hidden="true" />
            </Link>
          </section>

          <section className="panel glass detail-cta">
            <span className="cta-icon" aria-hidden="true">
              <Swords size={20} />
            </span>
            <h2>Put the profile to the test</h2>
            <p>
              Compare {character.name.split(' ')[0]} against any other character with a transparent,
              weighted breakdown.
            </p>
            <Link to={`/battle?a=${character.id}`}>
              <Button icon={Swords} block>
                Open VS battle
              </Button>
            </Link>
          </section>
        </div>
      </div>

      {deleteOpen ? (
        <ConfirmDialog
          title={`Delete ${character.name}?`}
          message="This permanently removes the character, its favorites and its placements in saved tier lists. This action cannot be undone."
          confirmLabel="Delete character"
          danger
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteOpen(false)}
        />
      ) : null}

      {editOpen && isAdmin ? (
        <CharacterFormModal
          character={character}
          animeList={animeList}
          tiers={tiers}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            characterQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/characters" className="back-link">
      <ArrowLeft size={15} aria-hidden="true" />
      Back to roster
    </Link>
  );
}
