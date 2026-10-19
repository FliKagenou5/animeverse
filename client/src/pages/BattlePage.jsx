import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  Info,
  Percent,
  RotateCcw,
  Scale,
  Swords,
  Target,
  Zap,
} from 'lucide-react';
import { api, getApiError } from '../api/client.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { clamp, formatDate } from '../utils/format.js';
import { BATTLE_RESULT_META, tierColor } from '../utils/constants.js';
import { CharacterAvatar } from '../components/characters/CharacterAvatar.jsx';
import { StatBar } from '../components/characters/StatBar.jsx';
import { TierBadge } from '../components/characters/TierBadge.jsx';
import { DataSourceBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Field, Select } from '../components/ui/Form.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui/StateViews.jsx';

function groupByAnime(characters) {
  const groups = [];
  for (const character of characters) {
    let group = groups.find((item) => item.anime === character.anime.title);
    if (!group) {
      group = { anime: character.anime.title, characters: [] };
      groups.push(group);
    }
    group.characters.push(character);
  }
  return groups;
}

function FighterPicker({ side, character, otherId, roster, onSelect }) {
  const label = side === 'a' ? 'First fighter' : 'Second fighter';
  const groups = groupByAnime(roster);

  return (
    <div className={`fighter-picker fighter-${side}`}>
      <div className="fighter-number" aria-hidden="true">
        {side.toUpperCase()}
      </div>
      <Field label={label} htmlFor={`fighter-${side}`}>
        <Select
          id={`fighter-${side}`}
          value={character ? String(character.id) : ''}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">Choose a character…</option>
          {groups.map((group) => (
            <optgroup key={group.anime} label={group.anime}>
              {group.characters
                .filter((item) => String(item.id) !== String(otherId))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.alias ? ` — ${item.alias}` : ''} · {item.tier.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      {character ? (
        <div className="fighter-preview">
          <CharacterAvatar character={character} size="lg" />
          <div className="fighter-copy">
            <Link to={`/characters/${character.id}`} className="fighter-name">
              {character.name}
            </Link>
            <span className="fighter-anime">{character.anime.title}</span>
            <div className="fighter-tags">
              <TierBadge tier={character.tier} />
              <DataSourceBadge source={character.dataSource} compact />
            </div>
          </div>
        </div>
      ) : (
        <div className="fighter-placeholder">
          <span aria-hidden="true">
            <Swords size={20} />
          </span>
          <p>Pick a character to fill this side of the arena.</p>
        </div>
      )}
    </div>
  );
}

function ComparisonBar({ row, side, color }) {
  const value = side === 'a' ? row.a : row.b;
  const winner = row.winner === side;
  return (
    <div className={`compare-side compare-${side} ${winner ? 'is-winner' : ''}`}>
      <div className="compare-value">
        {value === null ? <span>No data</span> : <strong>{value}</strong>}
        {winner ? (
          <span className="compare-win" aria-label="Higher value">
            <Check size={12} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="compare-track" aria-hidden="true">
        <span
          className="compare-fill"
          style={{
            width: `${typeof value === 'number' ? clamp(value, 0, 100) : 0}%`,
            '--compare-color': color,
          }}
        />
      </div>
    </div>
  );
}

function SavedBattleModal({ battle, onClose }) {
  const analysis = battle.analysis;
  const meta = BATTLE_RESULT_META[battle.result] || BATTLE_RESULT_META.insufficient;

  return (
    <Modal
      title="Archived battle snapshot"
      description={`Saved ${formatDate(battle.createdAt)}. The snapshot keeps the analysis as it was recorded.`}
      onClose={onClose}
      size="lg"
      footer={<Button variant="secondary" onClick={onClose}>Close snapshot</Button>}
    >
      {analysis ? (
        <div className="saved-snapshot">
          <div className={`saved-result result-${meta.tone}`}>
            <span>{meta.label}</span>
            <strong>
              {analysis.characterA.name} vs {analysis.characterB.name}
            </strong>
          </div>
          <div className="saved-scores">
            <div>
              <span>{analysis.characterA.name}</span>
              <strong>{analysis.scores.a ?? '—'}</strong>
              <small>coverage {analysis.coverage.a}%</small>
            </div>
            <span className="saved-vs">vs</span>
            <div>
              <span>{analysis.characterB.name}</span>
              <strong>{analysis.scores.b ?? '—'}</strong>
              <small>coverage {analysis.coverage.b}%</small>
            </div>
          </div>
          <p className="saved-summary">{analysis.summary}</p>
          <div className="saved-stat-list">
            {analysis.stats.map((row) => (
              <div key={row.key} className="saved-stat-row">
                <span>{row.label}</span>
                <b>{row.a ?? '—'}</b>
                <span className="saved-stat-vs">:</span>
                <b>{row.b ?? '—'}</b>
              </div>
            ))}
          </div>
          <p className="panel-note">
            Hax and named abilities were excluded from the score in this snapshot as well.
          </p>
        </div>
      ) : (
        <p>The stored snapshot could not be read.</p>
      )}
    </Modal>
  );
}

export default function BattlePage() {
  useDocumentTitle('VS Battle Arena');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const aId = searchParams.get('a') || '';
  const bId = searchParams.get('b') || '';

  const rosterQuery = useApiQuery('/characters', { page: 1, limit: 100, sort: 'name_asc' });
  const savedQuery = useApiQuery('/battles', {}, { enabled: isAuthenticated });
  const roster = rosterQuery.data?.data || [];

  const selectedA = useMemo(
    () => roster.find((character) => String(character.id) === aId) || null,
    [roster, aId],
  );
  const selectedB = useMemo(
    () => roster.find((character) => String(character.id) === bId) || null,
    [roster, bId],
  );

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedView, setSavedView] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const bothChosen = Boolean(aId && bId);
  const sameCharacter = Boolean(aId && bId && aId === bId);

  const setFighter = (side, value) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(side, value);
      else next.delete(side);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!bothChosen) {
      setAnalysis(null);
      setAnalyzing(false);
      setAnalysisError(null);
      return undefined;
    }
    if (sameCharacter) {
      setAnalysis(null);
      setAnalyzing(false);
      setAnalysisError({
        message: 'Choose two different characters to compare.',
        code: 'SAME_CHARACTER',
      });
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setAnalyzing(true);
      setAnalysisError(null);
      api
        .post(
          '/battles/analyze',
          { characterAId: Number(aId), characterBId: Number(bId) },
          { signal: controller.signal },
        )
        .then((response) => {
          setAnalysis(response.data.analysis);
          setAnalyzing(false);
        })
        .catch((error) => {
          if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') return;
          setAnalysis(null);
          setAnalysisError(getApiError(error));
          setAnalyzing(false);
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [aId, bId, bothChosen, sameCharacter, retryNonce]);

  const reset = () => {
    setSearchParams({}, { replace: true });
    setAnalysis(null);
    setAnalysisError(null);
  };

  const handleSave = async () => {
    if (!user) {
      toast.info('Sign in to archive this comparison.', 'Account required');
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (saving || !analysis) return;
    setSaving(true);
    try {
      await api.post('/battles', {
        characterAId: Number(aId),
        characterBId: Number(bId),
      });
      toast.success('The battle snapshot was saved to your archive.', 'Battle archived');
      savedQuery.refetch();
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const displayA = analysis?.characterA || selectedA;
  const displayB = analysis?.characterB || selectedB;
  const resultMeta = analysis
    ? BATTLE_RESULT_META[analysis.result] || BATTLE_RESULT_META.insufficient
    : null;
  const savedBattles = savedQuery.data?.data || [];

  return (
    <div className="page battle-page">
      <header className="battle-hero glass">
        <div className="battle-hero-copy">
          <div className="eyebrow-row">
            <span className="eyebrow-line" aria-hidden="true" />
            <span className="eyebrow">Head to head</span>
          </div>
          <h1>
            VS Battle <span className="gradient-text">Arena</span>
          </h1>
          <p>
            Choose two characters and read a transparent, weighted comparison. Tiers never decide a
            winner on their own, and hax is discussed outside the numbers.
          </p>
        </div>
        <div className="battle-hero-mark" aria-hidden="true">
          <span>VS</span>
          <Swords size={26} />
        </div>
      </header>

      {rosterQuery.loading ? <PageLoader label="Loading the roster…" /> : null}
      {rosterQuery.error ? (
        <ErrorState
          title="The roster could not load"
          error={rosterQuery.error}
          onRetry={rosterQuery.refetch}
        />
      ) : null}

      {rosterQuery.data ? (
        <section className={`arena glass ${bothChosen ? 'is-ready' : ''}`.trim()}>
          <FighterPicker
            side="a"
            character={selectedA}
            otherId={bId}
            roster={roster}
            onSelect={(value) => setFighter('a', value)}
          />
          <div className="arena-center" aria-hidden="true">
            <span className="arena-vs">VS</span>
            <span className="arena-line" />
          </div>
          <FighterPicker
            side="b"
            character={selectedB}
            otherId={aId}
            roster={roster}
            onSelect={(value) => setFighter('b', value)}
          />
          <div className="arena-actions">
            <Button
              variant="ghost"
              icon={RotateCcw}
              onClick={reset}
              disabled={!aId && !bId}
            >
              Reset
            </Button>
            {bothChosen && !analyzing ? (
              <Button
                variant="secondary"
                icon={BookmarkPlus}
                onClick={handleSave}
                loading={saving}
              >
                {isAuthenticated ? 'Save battle' : 'Sign in to save'}
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {sameCharacter ? (
        <div className="inline-alert" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Choose two different characters to compare.</span>
        </div>
      ) : null}

      {analyzing ? (
        <div className="analysis-loading glass">
          <span className="analysis-pulse" aria-hidden="true" />
          <p>Calibrating both profiles against the same scale…</p>
        </div>
      ) : null}

      {analysisError && !analyzing ? (
        <ErrorState
          title="Analysis unavailable"
          error={analysisError}
          onRetry={() => setRetryNonce((value) => value + 1)}
        />
      ) : null}

      {!bothChosen && rosterQuery.data ? (
        <EmptyState
          icon={Swords}
          title="Select two fighters"
          message="Pick a character on each side. The analysis updates automatically as soon as both are chosen."
        />
      ) : null}

      {analysis && !analyzing ? (
        <>
          <section className={`analysis-banner result-${resultMeta.tone}`}>
            <div className="analysis-banner-main">
              <span className="result-eyebrow">Transparent read</span>
              <h2>{resultMeta.label}</h2>
              <p>{analysis.summary}</p>
            </div>
            <div className="analysis-banner-side">
              <div>
                <span>Weighted score</span>
                <strong>
                  {analysis.scores.a ?? '—'} <em>vs</em> {analysis.scores.b ?? '—'}
                </strong>
              </div>
              <div>
                <span>Margin</span>
                <strong>{analysis.margin === null ? '—' : `${analysis.margin} pts`}</strong>
              </div>
              <Button icon={BookmarkPlus} onClick={handleSave} loading={saving}>
                {isAuthenticated ? 'Save battle' : 'Sign in to save'}
              </Button>
            </div>
          </section>

          <section className="battle-scoreboard glass">
            <div className="score-side score-a" style={{ '--fighter-color': tierColor(displayA.tier.key) }}>
              <span className="score-label">Weighted profile</span>
              <div className="score-number">{analysis.scores.a ?? '—'}</div>
              <span className="score-name">{analysis.characterA.name}</span>
              <div className="score-track" aria-hidden="true">
                <span style={{ width: `${analysis.scores.a ?? 0}%` }} />
              </div>
              <span className="score-coverage">
                <Percent size={12} aria-hidden="true" /> {analysis.coverage.a}% data coverage
              </span>
            </div>
            <div className="score-middle" aria-hidden="true">
              <Scale size={20} />
              <span>Weighted</span>
            </div>
            <div className="score-side score-b" style={{ '--fighter-color': tierColor(displayB.tier.key) }}>
              <span className="score-label">Weighted profile</span>
              <div className="score-number">{analysis.scores.b ?? '—'}</div>
              <span className="score-name">{analysis.characterB.name}</span>
              <div className="score-track" aria-hidden="true">
                <span style={{ width: `${analysis.scores.b ?? 0}%` }} />
              </div>
              <span className="score-coverage">
                <Percent size={12} aria-hidden="true" /> {analysis.coverage.b}% data coverage
              </span>
            </div>
          </section>

          <div className="battle-columns">
            <section className="panel glass battle-stats">
              <header className="battle-stats-head">
                <div className="battle-stats-name">
                  <CharacterAvatar character={displayA} size="sm" />
                  <div>
                    <strong>{displayA.name}</strong>
                    <small>{displayA.anime.title}</small>
                  </div>
                </div>
                <div className="battle-stats-title">
                  <span className="eyebrow">Parameter duel</span>
                  <h2>Stat comparison</h2>
                </div>
                <div className="battle-stats-name battle-stats-name-right">
                  <div>
                    <strong>{displayB.name}</strong>
                    <small>{displayB.anime.title}</small>
                  </div>
                  <CharacterAvatar character={displayB} size="sm" />
                </div>
              </header>

              <div className="compare-legend" aria-hidden="true">
                <span>Higher value takes the row</span>
                <span className="compare-legend-win">
                  <Check size={11} /> 4+ point gap
                </span>
              </div>

              <div className="compare-rows">
                {analysis.stats.map((row) => (
                  <div key={row.key} className="compare-row">
                    <ComparisonBar
                      row={row}
                      side="a"
                      color={tierColor(displayA.tier.key)}
                    />
                    <div className="compare-label">
                      <strong>{row.label}</strong>
                      <span>{row.weight}% weight</span>
                      <em className={`compare-verdict verdict-${row.winner}`}>
                        {row.winner === 'a'
                          ? `${displayA.name.split(' ')[0]} leads`
                          : row.winner === 'b'
                            ? `${displayB.name.split(' ')[0]} leads`
                            : row.winner === 'even'
                              ? 'Even'
                              : 'No data'}
                      </em>
                    </div>
                    <ComparisonBar
                      row={row}
                      side="b"
                      color={tierColor(displayB.tier.key)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <aside className="battle-side">
              <section className="battle-method glass">
                <header className="panel-head">
                  <div>
                    <span className="eyebrow">The formula</span>
                    <h2>How the score is built</h2>
                  </div>
                  <Info size={17} aria-hidden="true" />
                </header>
                <p>
                  Each present parameter contributes{' '}
                  <code>value × weight</code>. The total is divided by the weight that is actually
                  available, so missing data lowers coverage instead of being treated as zero.
                </p>
                <div className="weight-chips">
                  {analysis.weights.map((weight) => (
                    <span key={weight.key} className="weight-chip">
                      {weight.label}
                      <b>{weight.weight}%</b>
                    </span>
                  ))}
                </div>
                <ul className="method-rules">
                  <li>AP, Speed and Durability are required on both sides.</li>
                  <li>At least 60% weighted coverage is required to produce a result.</li>
                  <li>A margin below 3 points is reported as too close to call.</li>
                  <li>Hax is shown separately and never added to the score.</li>
                  <li>Tier labels are context only; they never award an automatic win.</li>
                </ul>
              </section>

              <section className="battle-weakness glass">
                <header className="panel-head">
                  <div>
                    <span className="eyebrow">Beyond the numbers</span>
                    <h2>Weaknesses</h2>
                  </div>
                  <Target size={17} aria-hidden="true" />
                </header>
                <div className="weakness-compare">
                  <div>
                    <strong>{displayA.name}</strong>
                    <p>{displayA.weaknesses}</p>
                  </div>
                  <div>
                    <strong>{displayB.name}</strong>
                    <p>{displayB.weaknesses}</p>
                  </div>
                </div>
              </section>
            </aside>
          </div>

          <section className="hax-duel glass">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Outside the score</span>
                <h2>Hax & special abilities</h2>
              </div>
              <Zap size={18} aria-hidden="true" />
            </header>
            <p className="panel-note">{analysis.hax.disclaimer}</p>
            <div className="hax-columns">
              {[
                { side: 'a', character: displayA, data: analysis.hax.a },
                { side: 'b', character: displayB, data: analysis.hax.b },
              ].map((entry) => (
                <div key={entry.side} className="hax-column">
                  <div className="hax-column-head">
                    <CharacterAvatar character={entry.character} size="sm" />
                    <div>
                      <strong>{entry.character.name}</strong>
                      <span className="hax-index">
                        {entry.data.index === null ? 'No hax index' : `${entry.data.index}/100`}
                        <small>qualitative</small>
                      </span>
                    </div>
                  </div>
                  {entry.data.note ? <p>{entry.data.note}</p> : <p className="muted">No hax note recorded.</p>}
                  <div className="ability-chips">
                    {entry.data.abilities.map((ability) => (
                      <span key={ability} className="ability-chip">
                        {ability}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="analysis-notes glass">
            <div>
              <h2>What this comparison can and cannot say</h2>
              <ul>
                {analysis.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            </div>
            <div className="analysis-disclaimer">
              <AlertTriangle size={17} aria-hidden="true" />
              <p>{analysis.disclaimer}</p>
            </div>
            <div className="analysis-actions">
              <Button variant="ghost" icon={RotateCcw} onClick={reset}>
                Reset arena
              </Button>
              <Button icon={BookmarkPlus} onClick={handleSave} loading={saving}>
                {isAuthenticated ? 'Save battle' : 'Sign in to save'}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {isAuthenticated ? (
        <section className="panel glass saved-battles">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Your archive</span>
              <h2>Saved battles</h2>
            </div>
            <span className="count-chip">{savedBattles.length} / 50</span>
          </header>
          {savedQuery.loading ? <p className="panel-note">Loading saved battles…</p> : null}
          {savedQuery.error ? (
            <p className="panel-note">Saved battles could not load: {savedQuery.error.message}</p>
          ) : null}
          {!savedQuery.loading && !savedQuery.error && savedBattles.length === 0 ? (
            <p className="panel-note">
              No saved battles yet. Run a comparison and use “Save battle” to archive it.
            </p>
          ) : null}
          {savedBattles.length ? (
            <div className="saved-battle-list">
              {savedBattles.map((battle) => {
                const meta = BATTLE_RESULT_META[battle.result] || BATTLE_RESULT_META.insufficient;
                const names = battle.analysis
                  ? `${battle.analysis.characterA.name} vs ${battle.analysis.characterB.name}`
                  : 'Saved comparison';
                return (
                  <article key={battle.id} className="saved-battle-item">
                    <span className={`saved-result-pill result-${meta.tone}`}>{meta.label}</span>
                    <div className="saved-battle-copy">
                      <strong>{names}</strong>
                      <p>{battle.summary}</p>
                    </div>
                    <time dateTime={battle.createdAt}>{formatDate(battle.createdAt)}</time>
                    <Button
                      size="sm"
                      variant="secondary"
                      iconRight={ArrowRight}
                      onClick={() => setSavedView(battle)}
                    >
                      View
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="battle-save-cta glass">
          <span className="cta-icon" aria-hidden="true">
            <BookmarkPlus size={20} />
          </span>
          <div>
            <h2>Keep a record of your debates</h2>
            <p>
              Create an account to archive battle snapshots. Comparison stays free for everyone.
            </p>
          </div>
          <Link to="/login" state={{ from: `${location.pathname}${location.search}` }}>
            <Button variant="secondary">Sign in to save</Button>
          </Link>
        </section>
      )}

      {savedView ? (
        <SavedBattleModal battle={savedView} onClose={() => setSavedView(null)} />
      ) : null}
    </div>
  );
}
