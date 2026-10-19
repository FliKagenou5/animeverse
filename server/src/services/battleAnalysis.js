export const BATTLE_WEIGHTS = [
  { key: 'ap', label: 'Attack Potency', weight: 20 },
  { key: 'speed', label: 'Speed', weight: 15 },
  { key: 'durability', label: 'Durability', weight: 15 },
  { key: 'strength', label: 'Strength', weight: 10 },
  { key: 'intelligence', label: 'Intelligence', weight: 10 },
  { key: 'stamina', label: 'Stamina', weight: 10 },
  { key: 'range', label: 'Range', weight: 5 },
  { key: 'combatSkill', label: 'Combat Skill', weight: 15 },
];

const CORE_STATS = ['ap', 'speed', 'durability'];
const MIN_COVERAGE = 60;
const DRAW_THRESHOLD = 3;

function statValue(character, key) {
  const value = character?.stats?.[key];
  return Number.isFinite(value) ? value : null;
}

function sideProfile(character) {
  let earned = 0;
  let availableWeight = 0;

  for (const { key, weight } of BATTLE_WEIGHTS) {
    const value = statValue(character, key);
    if (value !== null) {
      earned += value * weight;
      availableWeight += weight;
    }
  }

  return {
    score: availableWeight > 0 ? earned / availableWeight : null,
    coverage: availableWeight,
    missingCore: CORE_STATS.filter((key) => statValue(character, key) === null),
  };
}

function round1(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function buildStatRows(a, b) {
  return BATTLE_WEIGHTS.map(({ key, label, weight }) => {
    const valueA = statValue(a, key);
    const valueB = statValue(b, key);
    let winner = 'unknown';

    if (valueA !== null && valueB !== null) {
      if (valueA - valueB >= 4) winner = 'a';
      else if (valueB - valueA >= 4) winner = 'b';
      else winner = 'even';
    }

    return { key, label, weight, a: valueA, b: valueB, winner };
  });
}

export function analyzePair(characterA, characterB) {
  const profileA = sideProfile(characterA);
  const profileB = sideProfile(characterB);
  const scoreA = round1(profileA.score);
  const scoreB = round1(profileB.score);

  const enoughA = profileA.missingCore.length === 0 && profileA.coverage >= MIN_COVERAGE;
  const enoughB = profileB.missingCore.length === 0 && profileB.coverage >= MIN_COVERAGE;

  const insufficientNames = [];
  if (!enoughA) insufficientNames.push(characterA.name);
  if (!enoughB) insufficientNames.push(characterB.name);

  const margin =
    scoreA !== null && scoreB !== null ? round1(Math.abs(scoreA - scoreB)) : null;

  let result = 'insufficient';
  let summary;

  if (!enoughA || !enoughB || scoreA === null || scoreB === null) {
    const missing = [...new Set([...profileA.missingCore, ...profileB.missingCore])];
    summary =
      `Comparison unavailable: ${insufficientNames.join(' and ')} ` +
      `${insufficientNames.length === 1 ? 'does' : 'do'} not have enough comparable data. ` +
      `AP, Speed and Durability are required, and each side needs at least ${MIN_COVERAGE}% weighted coverage.` +
      (missing.length ? ` Missing core parameters: ${missing.join(', ')}.` : '');
  } else if (margin < DRAW_THRESHOLD) {
    result = 'draw';
    summary =
      `The weighted profiles are within ${DRAW_THRESHOLD} points (${scoreA} vs ${scoreB}). ` +
      'The numeric comparison cannot separate them; abilities, conditions and context matter more than the score.';
  } else {
    const aWins = scoreA > scoreB;
    result = aWins ? 'a' : 'b';
    const winner = aWins ? characterA : characterB;
    const loser = aWins ? characterB : characterA;
    summary =
      `${winner.name} leads ${loser.name} by ${margin} points on the weighted stat profile ` +
      `(${Math.max(scoreA, scoreB)} vs ${Math.min(scoreA, scoreB)}). ` +
      'This is a directional reading of community-entered parameters, not a guaranteed battle outcome.';
  }

  const notices = [
    'Tier labels are context only. A higher tier never awards an automatic win.',
    'Hax and named abilities are shown separately and are not included in the weighted score.',
    `Weights: ${BATTLE_WEIGHTS.map((item) => `${item.label} ${item.weight}%`).join(', ')}.`,
    'Scores are normalized over the parameters that are present for each character.',
  ];

  if (profileA.coverage < 100 || profileB.coverage < 100) {
    notices.push(
      `Coverage: ${characterA.name} ${profileA.coverage}%, ${characterB.name} ${profileB.coverage}%. Missing parameters are excluded rather than guessed.`,
    );
  }

  return {
    characterA,
    characterB,
    stats: buildStatRows(characterA, characterB),
    scores: { a: scoreA, b: scoreB },
    coverage: { a: profileA.coverage, b: profileB.coverage },
    margin,
    result,
    summary,
    weights: BATTLE_WEIGHTS,
    hax: {
      a: {
        index: statValue(characterA, 'hax'),
        note: characterA.haxNote || '',
        abilities: characterA.abilities || [],
      },
      b: {
        index: statValue(characterB, 'hax'),
        note: characterB.haxNote || '',
        abilities: characterB.abilities || [],
      },
      disclaimer:
        'Hax is intentionally excluded from the numeric score. A high hax index is not a verdict; read the ability notes.',
    },
    notices,
    disclaimer:
      'ANIMEVERSE battle analysis is a transparent comparison tool for demo and community-interpretation data. It is not an official power-scaling verdict.',
  };
}
