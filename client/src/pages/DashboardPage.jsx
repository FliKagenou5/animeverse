import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Clapperboard,
  FlaskConical,
  Gauge,
  Heart,
  Images,
  ListOrdered,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatDate, formatNumber } from '../utils/format.js';
import { BATTLE_RESULT_META, SCALED_STATS, tierColor } from '../utils/constants.js';
import { GlobalSearch } from '../components/layout/GlobalSearch.jsx';
import { CharacterAvatar } from '../components/characters/CharacterAvatar.jsx';
import { TierBadge } from '../components/characters/TierBadge.jsx';
import { DataSourceBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorState, PageLoader } from '../components/ui/StateViews.jsx';
import { Skeleton } from '../components/ui/StateViews.jsx';

const QUICK_ACTIONS = [
  {
    to: '/characters',
    icon: Users,
    label: 'Character database',
    text: 'Search, filter and inspect every fighter in the index.',
  },
  {
    to: '/battle',
    icon: Swords,
    label: 'Run a VS battle',
    text: 'Compare two profiles with a transparent weighted model.',
  },
  {
    to: '/tier-list',
    icon: ListOrdered,
    label: 'Build a tier list',
    text: 'Drag the roster into your own saved ranking board.',
  },
  {
    to: '/gallery',
    icon: Images,
    label: 'Open the gallery',
    text: 'Browse original concept art with attribution.',
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <Skeleton className="skeleton-hero" />
      <div className="stat-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="skeleton-stat" />
        ))}
      </div>
      <div className="dashboard-columns">
        <Skeleton className="skeleton-block" />
        <Skeleton className="skeleton-block" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone, to, badge }) {
  const content = (
    <>
      <div className="stat-card-top">
        <span className={`stat-card-icon tone-${tone}`} aria-hidden="true">
          <Icon size={19} />
        </span>
        {badge ? <span className="stat-card-badge">{badge}</span> : null}
      </div>
      <div className="stat-card-value">{formatNumber(value)}</div>
      <div className="stat-card-label">{label}</div>
      <p className="stat-card-detail">{detail}</p>
    </>
  );

  if (!to) return <div className="stat-card glass">{content}</div>;
  return (
    <Link to={to} className="stat-card glass stat-card-link">
      {content}
      <ArrowUpRight size={15} className="stat-card-arrow" aria-hidden="true" />
    </Link>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user, isAuthenticated } = useAuth();
  const { data, loading, error, refetch } = useApiQuery('/dashboard/stats');

  const totals = data?.totals;
  const activity = data?.activity;
  const userStats = data?.user;

  const favoriteValue = user ? userStats?.favorites ?? 0 : activity?.favorites ?? 0;
  const battleValue = user ? userStats?.battles ?? 0 : activity?.battles ?? 0;

  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero glass">
        <div className="hero-aurora" aria-hidden="true" />
        <div className="dashboard-hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-line" aria-hidden="true" />
            <span className="eyebrow">Universe dashboard</span>
          </div>
          <h1>
            {greeting()}
            {user ? `, ${user.name.split(' ')[0]}` : ', explorer'}.
            <span className="hero-accent"> The index is live.</span>
          </h1>
          <p>
            Explore characters, compare power profiles and curate your own corner of the infinite
            anime universe. Every number below is loaded from the local database.
          </p>
          <div className="dashboard-hero-actions">
            <Link to="/characters">
              <Button icon={Users}>Browse characters</Button>
            </Link>
            <Link to="/battle">
              <Button variant="secondary" icon={Swords}>
                Start a battle
              </Button>
            </Link>
            {!isAuthenticated ? (
              <Link to="/register" className="text-link hero-signin">
                Create an account for personal saves
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          <div className="dashboard-hero-search">
            <GlobalSearch placeholder="Search any character or alias…" />
          </div>
        </div>
        <div className="dashboard-hero-orbit" aria-hidden="true">
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />
          <div className="orbit-core">
            <Sparkles size={26} />
          </div>
          <span className="orbit-label orbit-label-one">Characters</span>
          <span className="orbit-label orbit-label-two">Tiers</span>
          <span className="orbit-label orbit-label-three">Battles</span>
        </div>
      </section>

      <div className="demo-strip">
        <FlaskConical size={15} aria-hidden="true" />
        <p>
          <strong>Demo dataset.</strong> Seeded power values are community interpretations created
          for this local build, never official statistics. Each entry carries a data-source label.
        </p>
        <Link to="/settings">Data notes</Link>
      </div>

      {loading ? <DashboardSkeleton /> : null}

      {error && !loading ? (
        <ErrorState
          title="The dashboard could not sync"
          error={error}
          onRetry={refetch}
        />
      ) : null}

      {data && !error ? (
        <>
          <section className="stat-grid" aria-label="Universe statistics">
            <StatCard
              icon={Users}
              label="Characters indexed"
              value={totals.characters}
              detail={`Across ${formatNumber(totals.anime)} anime series`}
              tone="cyan"
              to="/characters"
              badge="Live"
            />
            <StatCard
              icon={Clapperboard}
              label="Anime series"
              value={totals.anime}
              detail={`${formatNumber(totals.tiers)} power tiers configured`}
              tone="violet"
              to="/power-scaling"
            />
            <StatCard
              icon={Heart}
              label={user ? 'Your favorites' : 'Community favorites'}
              value={favoriteValue}
              detail={
                user
                  ? 'Saved privately to your account'
                  : 'Sign in to keep a list of your own'
              }
              tone="rose"
              to="/favorites"
              badge={user ? 'Yours' : 'All users'}
            />
            <StatCard
              icon={Swords}
              label={user ? 'Your saved battles' : 'Battles on record'}
              value={battleValue}
              detail={
                user ? 'Archived comparisons in your history' : 'Archived by local accounts'
              }
              tone="mint"
              to="/battle"
            />
          </section>

          <div className="dashboard-columns">
            <section className="panel glass dashboard-popular">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Community signal</span>
                  <h2>Popular right now</h2>
                </div>
                <Link to="/characters" className="panel-link">
                  All characters
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </header>
              <p className="panel-note">
                Ranked by saved favorites ×2 plus archived battles. Signal is a local activity
                count, not a power ranking.
              </p>
              {data.popular.length ? (
                <ol className="popular-list">
                  {data.popular.map((entry, index) => (
                    <li key={entry.character.id}>
                      <span className="popular-rank">0{index + 1}</span>
                      <Link
                        to={`/characters/${entry.character.id}`}
                        className="popular-character"
                      >
                        <CharacterAvatar character={entry.character} size="sm" />
                        <span className="popular-copy">
                          <strong>{entry.character.name}</strong>
                          <small>{entry.character.anime.title}</small>
                        </span>
                        <TierBadge tier={entry.character.tier} />
                      </Link>
                      <span className="popular-signal">
                        <Heart size={12} aria-hidden="true" />
                        {entry.favorites}
                        <span className="signal-sep" aria-hidden="true">·</span>
                        <Swords size={12} aria-hidden="true" />
                        {entry.battles}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="panel-note">No character has been favorited or battled yet.</p>
              )}
            </section>

            <section className="panel glass dashboard-new">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Fresh entries</span>
                  <h2>Newly added</h2>
                </div>
                <Link to="/characters?sort=newest" className="panel-link">
                  See newest
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </header>
              <ul className="new-list">
                {data.recent.map((character) => (
                  <li key={character.id}>
                    <Link to={`/characters/${character.id}`} className="new-row">
                      <CharacterAvatar character={character} size="xs" />
                      <span className="new-copy">
                        <strong>{character.name}</strong>
                        <small>
                          {character.anime.title} · added {formatDate(character.createdAt)}
                        </small>
                      </span>
                      <DataSourceBadge source={character.dataSource} compact />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="dashboard-columns">
            <section className="panel glass dashboard-top-tier">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Ceiling of the index</span>
                  <h2>Highest tiers</h2>
                </div>
                <Link to="/power-scaling" className="panel-link">
                  Tier scale
                  <Gauge size={14} aria-hidden="true" />
                </Link>
              </header>
              <div className="top-tier-list">
                {data.topTier.slice(0, 4).map((character) => (
                  <Link
                    key={character.id}
                    to={`/characters/${character.id}`}
                    className="top-tier-row"
                    style={{ '--tier-color': tierColor(character.tier.key) }}
                  >
                    <span className="top-tier-bar" aria-hidden="true" />
                    <CharacterAvatar character={character} size="xs" />
                    <span className="top-tier-copy">
                      <strong>{character.name}</strong>
                      <small>{character.anime.title}</small>
                    </span>
                    <TierBadge tier={character.tier} showFamily />
                  </Link>
                ))}
              </div>
              <p className="panel-note">
                Tier labels describe a character&apos;s interpreted scale. They are context, not an
                automatic battle verdict.
              </p>
            </section>

            <section className="panel glass dashboard-quick">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Shortcuts</span>
                  <h2>Quick actions</h2>
                </div>
              </header>
              <div className="quick-grid">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.to} to={action.to} className="quick-card">
                      <span className="quick-icon" aria-hidden="true">
                        <Icon size={18} />
                      </span>
                      <span>
                        <strong>{action.label}</strong>
                        <small>{action.text}</small>
                      </span>
                      <ArrowUpRight size={15} className="quick-arrow" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>

          {isAuthenticated && data.recentBattles?.length ? (
            <section className="panel glass dashboard-battles">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Your archive</span>
                  <h2>Recent battles</h2>
                </div>
                <Link to="/battle" className="panel-link">
                  Open battle arena
                  <Swords size={14} aria-hidden="true" />
                </Link>
              </header>
              <div className="recent-battle-grid">
                {data.recentBattles.map((battle) => {
                  const meta = BATTLE_RESULT_META[battle.result] || BATTLE_RESULT_META.insufficient;
                  return (
                    <Link to="/battle" key={battle.id} className="recent-battle-card">
                      <span className={`battle-result-dot result-${meta.tone}`} aria-hidden="true" />
                      <span className="recent-battle-copy">
                        <strong>
                          {battle.characterA?.name || 'Unknown'} vs{' '}
                          {battle.characterB?.name || 'Unknown'}
                        </strong>
                        <small>{meta.label}</small>
                      </span>
                      <time dateTime={battle.createdAt}>{formatDate(battle.createdAt)}</time>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="dashboard-method glass">
            <span className="method-icon" aria-hidden="true">
              <Gauge size={20} />
            </span>
            <div>
              <h2>How the numbers work</h2>
              <p>
                Battle analysis uses eight visible parameters:{' '}
                {SCALED_STATS.map((stat) => `${stat.label} ${stat.weight}%`).join(', ')}. Hax is
                discussed separately and never added to the score. Missing data is reported, not
                guessed.
              </p>
            </div>
            <Link to="/power-scaling">
              <Button variant="secondary" size="sm" iconRight={ArrowRight}>
                Read the scale
              </Button>
            </Link>
          </section>
        </>
      ) : null}
    </div>
  );
}
