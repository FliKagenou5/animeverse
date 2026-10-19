import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BATTLE_WEIGHTS, analyzePair } from '../src/services/battleAnalysis.js';

const BASE_STATS = {
  ap: 80,
  speed: 80,
  durability: 80,
  strength: 80,
  intelligence: 80,
  stamina: 80,
  hax: 50,
  range: 80,
  combatSkill: 80,
};

function makeCharacter(name, overrides = {}) {
  const { stats = {}, haxNote = '', abilities = [], ...rest } = overrides;
  return {
    name,
    tier: '5-B',
    ...rest,
    stats: { ...BASE_STATS, ...stats },
    haxNote,
    abilities,
  };
}

describe('battle analysis formula', () => {
  it('exposes eight published weights that sum to 100', () => {
    assert.equal(BATTLE_WEIGHTS.length, 8);
    assert.equal(
      BATTLE_WEIGHTS.reduce((sum, item) => sum + item.weight, 0),
      100,
    );
  });

  it('draws when weighted profiles are within the draw threshold', () => {
    const analysis = analyzePair(makeCharacter('Alpha'), makeCharacter('Beta'));
    assert.equal(analysis.result, 'draw');
    assert.equal(analysis.margin, 0);
    assert.equal(analysis.scores.a, 80);
    assert.equal(analysis.scores.b, 80);
    assert.match(analysis.summary, /within 3 points/);
  });

  it('declares a directional winner when the margin is large enough', () => {
    const analysis = analyzePair(
      makeCharacter('Strong', {
        stats: { ap: 95, speed: 92, durability: 90, strength: 88, stamina: 84, combatSkill: 90 },
      }),
      makeCharacter('Weak', {
        stats: { ap: 55, speed: 50, durability: 52, strength: 48, stamina: 50, combatSkill: 55 },
      }),
    );
    assert.equal(analysis.result, 'a');
    assert.ok(analysis.margin >= 3);
    assert.ok(analysis.scores.a > analysis.scores.b);
    assert.match(analysis.summary, /Strong leads Weak/);
  });

  it('never lets a tier label decide a draw', () => {
    const analysis = analyzePair(
      makeCharacter('High Tier', { tier: 'Tier 0' }),
      makeCharacter('Low Tier', { tier: '10-C' }),
    );
    assert.equal(analysis.result, 'draw');
  });

  it('marks a comparison insufficient when a core stat is missing', () => {
    const analysis = analyzePair(
      makeCharacter('Alpha'),
      makeCharacter('Incomplete', { stats: { durability: null } }),
    );
    assert.equal(analysis.result, 'insufficient');
    assert.match(analysis.summary, /AP, Speed and Durability are required/);
    assert.ok(analysis.summary.includes('Incomplete'));
  });

  it('marks a comparison insufficient below 60% weighted coverage', () => {
    const sparse = makeCharacter('Sparse', {
      stats: {
        ap: 90,
        speed: 90,
        durability: 90,
        strength: null,
        intelligence: null,
        stamina: null,
        hax: null,
        range: null,
        combatSkill: null,
      },
    });
    const analysis = analyzePair(makeCharacter('Alpha'), sparse);
    assert.equal(analysis.coverage.b, 50);
    assert.equal(analysis.result, 'insufficient');
  });

  it('normalizes the score over the stats that are present', () => {
    const partial = makeCharacter('Partial', {
      stats: {
        ap: 100,
        speed: 100,
        durability: 100,
        strength: 100,
        intelligence: null,
        stamina: null,
        hax: null,
        range: null,
        combatSkill: null,
      },
    });
    const analysis = analyzePair(partial, makeCharacter('Alpha'));
    assert.equal(analysis.coverage.a, 60);
    assert.equal(analysis.scores.a, 100);
    assert.equal(analysis.result, 'a');
  });

  it('excludes hax from the numeric score while reporting it separately', () => {
    const lowHax = makeCharacter('Low Hax', { stats: { hax: 0 } });
    const highHax = makeCharacter('High Hax', {
      stats: { hax: 100 },
      haxNote: 'Narrative ability note.',
      abilities: ['Example ability'],
    });
    const analysis = analyzePair(lowHax, highHax);
    assert.equal(analysis.scores.a, analysis.scores.b);
    assert.equal(analysis.result, 'draw');
    assert.equal(analysis.hax.a.index, 0);
    assert.equal(analysis.hax.b.index, 100);
    assert.deepEqual(analysis.hax.b.abilities, ['Example ability']);
    assert.match(analysis.hax.disclaimer, /excluded from the numeric score/);
  });

  it('flags per-stat winners only when the gap is at least four points', () => {
    const analysis = analyzePair(
      makeCharacter('Alpha', { stats: { ap: 84, speed: 82 } }),
      makeCharacter('Beta', { stats: { ap: 80, speed: 80 } }),
    );
    const ap = analysis.stats.find((row) => row.key === 'ap');
    const speed = analysis.stats.find((row) => row.key === 'speed');
    assert.equal(ap.winner, 'a');
    assert.equal(speed.winner, 'even');
  });

  it('reports unknown row winners when a stat is absent', () => {
    const analysis = analyzePair(
      makeCharacter('Alpha', { stats: { range: null } }),
      makeCharacter('Beta'),
    );
    const range = analysis.stats.find((row) => row.key === 'range');
    assert.equal(range.winner, 'unknown');
    assert.equal(range.a, null);
  });
});
