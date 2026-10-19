import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  Gauge,
  Info,
  Layers3,
  Ruler,
  Scale,
  Settings2,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import {
  DATA_SOURCE_META,
  HAX_STAT,
  SCALED_STATS,
  tierColor,
  tierFamily,
} from '../utils/constants.js';
import { CharacterAvatar } from '../components/characters/CharacterAvatar.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ErrorState, PageLoader } from '../components/ui/StateViews.jsx';

const PRINCIPLES = [
  {
    icon: Ruler,
    title: 'Not a linear ruler',
    text: 'A step from 8-C to 8-B is not the same size as a step from 3-A to 2-C. Tiers are ordered bands of description, not evenly spaced numbers.',
  },
  {
    icon: Layers3,
    title: 'Interpretation, not canon',
    text: 'Every tier and stat in this build is a community-style interpretation or demo value. Entries carry a data-source label so the difference stays visible.',
  },
  {
    icon: Scale,
    title: 'Context beats a label',
    text: 'Matchups depend on abilities, conditions, range, stamina and knowledge. A tier difference never awards a battle automatically in this app.',
  },
];

function buildGroups(tiers) {
  const groups = [];
  for (const tier of tiers) {
    const family = tierFamily(tier.key);
    let group = groups.find((item) => item.family === family);
    if (!group) {
      group = { family, items: [] };
      groups.push(group);
    }
    group.items.push(tier);
  }
  return groups;
}

export default function PowerScalingPage() {
  useDocumentTitle('Power Scaling');
  const { isAdmin } = useAuth();
  const [openTier, setOpenTier] = useState('3-A');
  const tiersQuery = useApiQuery('/tiers');
  const rosterQuery = useApiQuery('/characters', { page: 1, limit: 100, sort: 'tier_asc' });

  const tiers = tiersQuery.data?.data || [];
  const characters = rosterQuery.data?.data || [];
  const groups = useMemo(() => buildGroups(tiers), [tiers]);
  const byTier = useMemo(() => {
    const map = new Map();
    for (const character of characters) {
      const key = character.tier.key;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(character);
    }
    return map;
  }, [characters]);

  const loading = tiersQuery.loading || rosterQuery.loading;
  const error = tiersQuery.error || rosterQuery.error;
  const retry = () => {
    tiersQuery.refetch();
    rosterQuery.refetch();
  };

  return (
    <div className="page scaling-page">
      <PageHeader
        eyebrow="The framework"
        icon={Gauge}
        title="Power Scaling"
        description="A shared language for comparing characters. Read what each band means, how the nine parameters are used, and where the data comes from."
        actions={
          <>
            <Link to="/battle">
              <Button icon={Swords}>Open battle arena</Button>
            </Link>
            {isAdmin ? (
              <Link to="/settings#tier-editor">
                <Button variant="secondary" icon={Settings2}>
                  Configure tiers
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <section className="scaling-principles">
        {PRINCIPLES.map((principle) => {
          const Icon = principle.icon;
          return (
            <article key={principle.title} className="principle-card glass">
              <span className="principle-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <h2>{principle.title}</h2>
              <p>{principle.text}</p>
            </article>
          );
        })}
      </section>

      {loading ? <PageLoader label="Loading the tier ladder…" /> : null}
      {error && !loading ? (
        <ErrorState title="The tier scale could not load" error={error} onRetry={retry} />
      ) : null}

      {!loading && !error ? (
        <div className="scaling-layout">
          <section className="tier-ladder glass" aria-label="Tier definitions">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Highest to lowest</span>
                <h2>Tier ladder</h2>
              </div>
              <span className="count-chip">{tiers.length} bands</span>
            </header>
            <p className="panel-note">
              Select a band to see its local description, example scale and indexed characters.
              Labels are stored in the database and can be edited by an administrator.
            </p>

            <div className="ladder-groups">
              {groups.map((group) => (
                <div key={group.family} className="ladder-group">
                  <div className="ladder-family">
                    <span className="ladder-family-line" aria-hidden="true" />
                    <span>{group.family}</span>
                  </div>
                  {group.items.map((tier) => {
                    const open = openTier === tier.key;
                    const members = byTier.get(tier.key) || [];
                    return (
                      <div
                        key={tier.key}
                        className={`tier-row ${open ? 'is-open' : ''}`.trim()}
                        style={{ '--tier-color': tierColor(tier.key) }}
                      >
                        <button
                          type="button"
                          className="tier-row-head"
                          onClick={() => setOpenTier(open ? null : tier.key)}
                          aria-expanded={open}
                        >
                          <span className="tier-key">{tier.label}</span>
                          <span className="tier-row-summary">
                            <strong>{tier.description.split(':')[0]}</strong>
                            <small>
                              {tier.characterCount}{' '}
                              {tier.characterCount === 1 ? 'character' : 'characters'} indexed
                            </small>
                          </span>
                          <ChevronDown
                            size={16}
                            className={`tier-chevron ${open ? 'is-open' : ''}`.trim()}
                            aria-hidden="true"
                          />
                        </button>
                        {open ? (
                          <div className="tier-row-body">
                            <p>{tier.description}</p>
                            {tier.example ? (
                              <p className="tier-example">
                                <Sparkles size={13} aria-hidden="true" />
                                <span>
                                  <strong>Scale reference:</strong> {tier.example}
                                </span>
                              </p>
                            ) : null}
                            {members.length ? (
                              <div className="tier-members">
                                {members.map((character) => (
                                  <Link
                                    key={character.id}
                                    to={`/characters/${character.id}`}
                                    className="tier-member"
                                  >
                                    <CharacterAvatar character={character} size="xs" />
                                    <span>{character.name}</span>
                                    <ArrowRight size={12} aria-hidden="true" />
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <p className="tier-empty">No indexed character is placed here yet.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <aside className="scaling-side">
            <section className="panel glass parameter-guide">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Battle inputs</span>
                  <h2>Parameters & weights</h2>
                </div>
                <Scale size={18} aria-hidden="true" />
              </header>
              <p className="panel-note">
                These eight 0–100 parameters feed the weighted battle score. The percentages are the
                exact weights used by the server.
              </p>
              <div className="weight-list">
                {SCALED_STATS.map((stat) => (
                  <div key={stat.key} className="weight-row">
                    <span className="weight-label">
                      {stat.short}
                      <em>{stat.label}</em>
                    </span>
                    <div className="weight-track" aria-hidden="true">
                      <span style={{ width: `${stat.weight * 5}%` }} />
                    </div>
                    <b>{stat.weight}%</b>
                  </div>
                ))}
              </div>
              <div className="hax-callout">
                <Zap size={16} aria-hidden="true" />
                <div>
                  <strong>{HAX_STAT.label} stays separate</strong>
                  <p>
                    Special abilities are described in words and never mixed into the weighted
                    total. A numeric hax index is a rough label, not a verdict.
                  </p>
                </div>
              </div>
            </section>

            <section className="panel glass source-guide">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Provenance</span>
                  <h2>Data source labels</h2>
                </div>
                <Info size={18} aria-hidden="true" />
              </header>
              <ul className="source-list">
                {Object.entries(DATA_SOURCE_META).map(([key, meta]) => (
                  <li key={key}>
                    <span className={`source-dot source-${meta.tone}`} aria-hidden="true" />
                    <div>
                      <strong>{meta.label}</strong>
                      <p>{meta.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="source-fineprint">
                This demo does not reproduce official databooks or claim verified feats. Where a
                profile marker says “Official”, treat it as an unverified admin assertion until a
                primary source is attached.
              </p>
            </section>

            <section className="panel glass scaling-cta">
              <h2>Apply the framework</h2>
              <p>
                Put any two indexed characters side by side. Missing parameters reduce coverage, and
                the app will say when the data is not sufficient.
              </p>
              <Link to="/battle">
                <Button icon={Swords} block>
                  Start a VS battle
                </Button>
              </Link>
            </section>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
