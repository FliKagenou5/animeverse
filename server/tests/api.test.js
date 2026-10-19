import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startTestServer } from './helpers.js';

const ADMIN = { email: 'admin@animeverse.dev', password: 'Admin#1234' };
const MEMBER = { email: 'explorer@animeverse.dev', password: 'Explore#1234' };

let ctx;
let adminCookie;
let memberCookie;
let outsiderCookie;
let characters;
let animeList;
let bleach;

function characterId(name) {
  const id = characters[name]?.id;
  assert.ok(id, `Missing seed character ${name}`);
  return id;
}

function recipe(overrides = {}) {
  return {
    name: 'Test Shinigami',
    alias: 'Provisional Soul',
    animeId: bleach.id,
    description: 'A temporary test character used to verify the administrative CRUD endpoints.',
    tier: '3-A',
    ap: 70,
    speed: 70,
    durability: 65,
    strength: 60,
    intelligence: 60,
    stamina: 60,
    hax: 40,
    range: 55,
    combatSkill: 70,
    haxNote: 'A fictional note used by automated tests.',
    abilities: ['Test flash step'],
    weaknesses: 'Entirely fictional test weaknesses used for validation.',
    status: 'Alive',
    dataSource: 'demo',
    ...overrides,
  };
}

before(async () => {
  ctx = await startTestServer();
  adminCookie = await ctx.login(ADMIN.email, ADMIN.password);
  memberCookie = await ctx.login(MEMBER.email, MEMBER.password);

  const email = `outsider-${Date.now()}@example.com`;
  const registration = await ctx.request('POST', '/api/auth/register', {
    body: { name: 'Outside Observer', email, password: 'Outsider#123' },
  });
  assert.equal(registration.status, 201);
  const session = registration.cookies.find((item) => item.startsWith('av_session='));
  assert.ok(session, 'Registration should start a session.');
  outsiderCookie = session.split(';')[0];

  const characterResponse = await ctx.request('GET', '/api/characters?limit=100');
  characters = Object.fromEntries(characterResponse.body.data.map((item) => [item.name, item]));

  const animeResponse = await ctx.request('GET', '/api/anime');
  animeList = animeResponse.body.data;
  bleach = animeList.find((item) => item.title === 'Bleach');
});

after(async () => {
  if (ctx) await ctx.stop();
});

describe('health, auth and dashboard', () => {
  it('reports a healthy API and database', async () => {
    const response = await ctx.request('GET', '/api/health');
    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.database, 'ok');
  });

  it('returns a null user for anonymous visitors and the profile after login', async () => {
    const anonymous = await ctx.request('GET', '/api/auth/me');
    assert.equal(anonymous.status, 200);
    assert.equal(anonymous.body.user, null);

    const member = await ctx.request('GET', '/api/auth/me', { cookie: memberCookie });
    assert.equal(member.body.user.email, MEMBER.email);
    assert.equal(member.body.user.role, 'member');
    assert.equal('password_hash' in member.body.user, false);
  });

  it('rejects invalid credentials without leaking which field failed', async () => {
    const response = await ctx.request('POST', '/api/auth/login', {
      body: { email: ADMIN.email, password: 'WrongPassword1' },
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
    assert.match(response.body.error.message, /Email or password/);
  });

  it('rejects duplicate registration and validates registration input', async () => {
    const duplicate = await ctx.request('POST', '/api/auth/register', {
      body: { name: 'Outside Observer', email: `outsider-${Date.now()}@example.com`, password: 'Outsider#123' },
    });
    assert.equal(duplicate.status, 201);
    const duplicateAgain = await ctx.request('POST', '/api/auth/register', {
      body: {
        name: 'Outside Observer',
        email: duplicate.body.user.email,
        password: 'Outsider#123',
      },
    });
    assert.equal(duplicateAgain.status, 409);
    assert.equal(duplicateAgain.body.error.code, 'EMAIL_TAKEN');

    const weak = await ctx.request('POST', '/api/auth/register', {
      body: { name: 'X', email: 'not-an-email', password: 'short' },
    });
    assert.equal(weak.status, 400);
    assert.equal(weak.body.error.code, 'VALIDATION_ERROR');
    assert.ok(weak.body.error.details.fieldErrors.email);
  });

  it('invalidates only the session used to log out', async () => {
    const secondSession = await ctx.login(MEMBER.email, MEMBER.password);
    const logout = await ctx.request('POST', '/api/auth/logout', { cookie: secondSession });
    assert.equal(logout.status, 204);

    const revoked = await ctx.request('GET', '/api/auth/me', { cookie: secondSession });
    assert.equal(revoked.body.user, null);

    const stillValid = await ctx.request('GET', '/api/auth/me', { cookie: memberCookie });
    assert.equal(stillValid.body.user.email, MEMBER.email);
  });

  it('serves backend-driven dashboard totals and per-user activity', async () => {
    const anonymous = await ctx.request('GET', '/api/dashboard/stats');
    assert.equal(anonymous.status, 200);
    assert.deepEqual(anonymous.body.totals, { characters: 12, anime: 8, tiers: 31, gallery: 8 });
    assert.equal(anonymous.body.activity.favorites, 7);
    assert.equal(anonymous.body.activity.battles, 1);
    assert.equal(anonymous.body.user, null);
    assert.equal(anonymous.body.popular.length, 5);
    assert.equal(anonymous.body.recent.length, 6);
    assert.equal(anonymous.body.topTier.length, 6);
    assert.deepEqual(anonymous.body.recentBattles, []);

    const member = await ctx.request('GET', '/api/dashboard/stats', { cookie: memberCookie });
    assert.deepEqual(member.body.user, { favorites: 4, battles: 0, tierLists: 0 });
    assert.equal(member.body.recentBattles.length, 0);
    assert.ok(member.body.popular.every((entry) => entry.character && typeof entry.signal === 'number'));
  });
});

describe('character database', () => {
  it('lists seeded characters with pagination metadata', async () => {
    const response = await ctx.request('GET', '/api/characters?page=2&limit=5&sort=name_asc');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 5);
    assert.deepEqual(response.body.pagination, { page: 2, limit: 5, total: 12, totalPages: 3 });

    const goku = characters['Son Goku'];
    assert.deepEqual(goku.tier, { key: '2-C', label: '2-C', orderIndex: 6 });
    assert.equal(goku.anime.title, 'Dragon Ball');
    assert.equal(goku.dataSource, 'community');
    assert.equal(typeof goku.stats.ap, 'number');
  });

  it('searches by name and alias and escapes wildcard characters', async () => {
    const byName = await ctx.request('GET', '/api/characters?search=gojo');
    assert.deepEqual(byName.body.data.map((item) => item.name), ['Satoru Gojo']);

    const byAlias = await ctx.request('GET', '/api/characters?search=substitute');
    assert.deepEqual(byAlias.body.data.map((item) => item.name), ['Ichigo Kurosaki']);

    const wildcard = await ctx.request('GET', '/api/characters?search=%25');
    assert.equal(wildcard.body.pagination.total, 0);

    const injection = await ctx.request(
      'GET',
      `/api/characters?search=${encodeURIComponent("' OR 1=1 --")}`,
    );
    assert.equal(injection.status, 200);
    assert.equal(injection.body.pagination.total, 0);
  });

  it('filters by anime, tier and status', async () => {
    const onePiece = animeList.find((item) => item.title === 'One Piece');
    const byAnime = await ctx.request(`GET`, `/api/characters?animeId=${onePiece.id}&limit=100`);
    assert.deepEqual(
      byAnime.body.data.map((item) => item.name).sort(),
      ['Monkey D. Luffy', 'Roronoa Zoro'],
    );

    const tier = await ctx.request('GET', '/api/characters?tier=3-A&limit=100');
    assert.equal(tier.body.pagination.total, 2);
    assert.ok(tier.body.data.every((item) => item.tier.key === '3-A'));

    const unknown = await ctx.request('GET', '/api/characters?status=Unknown&limit=100');
    assert.deepEqual(unknown.body.data.map((item) => item.name), ['Satoru Gojo']);
  });

  it('sorts by name in both directions', async () => {
    const ascending = await ctx.request('GET', '/api/characters?sort=name_asc&limit=100');
    assert.equal(ascending.body.data[0].name, 'Anos Voldigoad');
    assert.equal(ascending.body.data.at(-1).name, 'Yuji Itadori');

    const descending = await ctx.request('GET', '/api/characters?sort=name_desc&limit=100');
    assert.equal(descending.body.data[0].name, 'Yuji Itadori');
    assert.equal(descending.body.data.at(-1).name, 'Anos Voldigoad');
  });

  it('validates query parameters and unknown ids', async () => {
    const badLimit = await ctx.request('GET', '/api/characters?limit=0');
    assert.equal(badLimit.status, 400);
    assert.equal(badLimit.body.error.code, 'VALIDATION_ERROR');
    assert.ok(badLimit.body.error.details.fieldErrors.limit);

    const badSort = await ctx.request('GET', '/api/characters?sort=secret_column');
    assert.equal(badSort.status, 400);

    const badId = await ctx.request('GET', '/api/characters/abc');
    assert.equal(badId.status, 400);
    assert.equal(badId.body.error.code, 'INVALID_ID');

    const missing = await ctx.request('GET', '/api/characters/999999');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');
  });

  it('requires admin rights for character mutations', async () => {
    const anonymous = await ctx.request('POST', '/api/characters', { body: recipe() });
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error.code, 'AUTH_REQUIRED');

    const member = await ctx.request('POST', '/api/characters', {
      cookie: memberCookie,
      body: recipe(),
    });
    assert.equal(member.status, 403);
    assert.equal(member.body.error.code, 'FORBIDDEN');
  });

  it('lets an admin create, update, validate and delete a character', async () => {
    const created = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe(),
    });
    assert.equal(created.status, 201);
    const id = created.body.character.id;
    assert.equal(created.body.character.name, 'Test Shinigami');
    assert.equal(created.body.character.dataSource, 'demo');

    const duplicate = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe(),
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, 'DUPLICATE_CHARACTER');

    const badTier = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe({ name: 'Tier Test', tier: '99-Z' }),
    });
    assert.equal(badTier.status, 400);
    assert.equal(badTier.body.error.code, 'INVALID_TIER');

    const badAnime = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe({ name: 'Anime Test', animeId: 999999 }),
    });
    assert.equal(badAnime.status, 400);
    assert.equal(badAnime.body.error.code, 'INVALID_ANIME');

    const invalid = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe({ name: 'Validation Test', description: 'Too short.' }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    assert.ok(invalid.body.error.details.fieldErrors.description);

    const updated = await ctx.request('PUT', `/api/characters/${id}`, {
      cookie: adminCookie,
      body: recipe({ name: 'Test Shinigami Updated', tier: '2-C', ap: 91, speed: 77 }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.character.name, 'Test Shinigami Updated');
    assert.equal(updated.body.character.tier.key, '2-C');
    assert.equal(updated.body.character.stats.ap, 91);

    const fetched = await ctx.request('GET', `/api/characters/${id}`);
    assert.equal(fetched.body.character.name, 'Test Shinigami Updated');

    const removed = await ctx.request('DELETE', `/api/characters/${id}`, {
      cookie: adminCookie,
    });
    assert.equal(removed.status, 204);

    const gone = await ctx.request('GET', `/api/characters/${id}`);
    assert.equal(gone.status, 404);
  });
});

describe('anime and tier configuration', () => {
  it('lists anime with character counts', async () => {
    assert.equal(animeList.length, 8);
    assert.equal(bleach.characterCount, 1);
    const onePiece = animeList.find((item) => item.title === 'One Piece');
    assert.equal(onePiece.characterCount, 2);
  });

  it('lets an admin manage anime and blocks deletion while characters exist', async () => {
    const forbidden = await ctx.request('POST', '/api/anime', {
      cookie: memberCookie,
      body: { title: 'Blocked Anime' },
    });
    assert.equal(forbidden.status, 403);

    const created = await ctx.request('POST', '/api/anime', {
      cookie: adminCookie,
      body: { title: 'Test Anime', synopsis: 'A test-only series.', year: 2026, studio: 'Test Studio' },
    });
    assert.equal(created.status, 201);
    const id = created.body.anime.id;
    assert.equal(created.body.anime.slug, 'test-anime');

    const updated = await ctx.request('PUT', `/api/anime/${id}`, {
      cookie: adminCookie,
      body: { title: 'Test Anime Revised', synopsis: 'A test-only series.', year: 2026 },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.anime.slug, 'test-anime-revised');

    const inUse = await ctx.request('DELETE', `/api/anime/${bleach.id}`, { cookie: adminCookie });
    assert.equal(inUse.status, 409);
    assert.equal(inUse.body.error.code, 'ANIME_IN_USE');

    const removed = await ctx.request('DELETE', `/api/anime/${id}`, { cookie: adminCookie });
    assert.equal(removed.status, 204);
  });

  it('serves the full tier ladder and protects tier configuration', async () => {
    const response = await ctx.request('GET', '/api/tiers');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 31);
    assert.equal(response.body.data[0].key, '0');
    assert.equal(response.body.data.at(-1).key, '10-C');
    assert.ok(response.body.data.every((tier) => tier.description.length > 10));

    const forbidden = await ctx.request('PUT', '/api/tiers/10-C', {
      cookie: memberCookie,
      body: { description: 'Member edits should not work.' },
    });
    assert.equal(forbidden.status, 403);

    const updated = await ctx.request('PUT', '/api/tiers/10-C', {
      cookie: adminCookie,
      body: { description: 'Below-human output, rewritten by the admin test.' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.tier.description, 'Below-human output, rewritten by the admin test.');

    const conflict = await ctx.request('PUT', '/api/tiers/10-C', {
      cookie: adminCookie,
      body: { orderIndex: 0 },
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.code, 'TIER_ORDER_CONFLICT');

    const empty = await ctx.request('PUT', '/api/tiers/10-C', {
      cookie: adminCookie,
      body: {},
    });
    assert.equal(empty.status, 400);
    assert.equal(empty.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('battle analysis and saved battles', () => {
  it('analyzes two characters publicly with a transparent formula', async () => {
    const response = await ctx.request('POST', '/api/battles/analyze', {
      body: { characterAId: characterId('Son Goku'), characterBId: characterId('Anos Voldigoad') },
    });
    assert.equal(response.status, 200);
    const analysis = response.body.analysis;
    assert.ok(['a', 'b', 'draw', 'insufficient'].includes(analysis.result));
    assert.equal(analysis.weights.length, 8);
    assert.equal(typeof analysis.scores.a, 'number');
    assert.equal(typeof analysis.scores.b, 'number');
    assert.match(analysis.notices.join(' '), /Tier labels are context only/);
    assert.match(analysis.disclaimer, /not an official power-scaling verdict/);
    assert.ok(analysis.stats.some((row) => row.key === 'ap' && typeof row.weight === 'number'));
    assert.equal(analysis.hax.a.index, characters['Son Goku'].stats.hax);
  });

  it('rejects identical fighters and unknown characters', async () => {
    const goku = characterId('Son Goku');
    const same = await ctx.request('POST', '/api/battles/analyze', {
      body: { characterAId: goku, characterBId: goku },
    });
    assert.equal(same.status, 400);
    assert.equal(same.body.error.code, 'SAME_CHARACTER');

    const missing = await ctx.request('POST', '/api/battles/analyze', {
      body: { characterAId: goku, characterBId: 999999 },
    });
    assert.equal(missing.status, 404);
  });

  it('reports insufficient data without inventing missing stats', async () => {
    const sparse = await ctx.request('POST', '/api/characters', {
      cookie: adminCookie,
      body: recipe({
        name: 'Statless Wanderer',
        tier: '10-C',
        ap: null,
        speed: null,
        durability: null,
        strength: null,
        intelligence: null,
        stamina: null,
        hax: null,
        range: null,
        combatSkill: null,
      }),
    });
    assert.equal(sparse.status, 201);
    const id = sparse.body.character.id;

    const response = await ctx.request('POST', '/api/battles/analyze', {
      body: { characterAId: characterId('Son Goku'), characterBId: id },
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.analysis.result, 'insufficient');
    assert.match(response.body.analysis.summary, /AP, Speed and Durability are required/);

    await ctx.request('DELETE', `/api/characters/${id}`, { cookie: adminCookie });
  });

  it('saves, lists and scopes battles to their owner', async () => {
    const unauthorized = await ctx.request('POST', '/api/battles', {
      body: { characterAId: characterId('Son Goku'), characterBId: characterId('Anos Voldigoad') },
    });
    assert.equal(unauthorized.status, 401);

    const saved = await ctx.request('POST', '/api/battles', {
      cookie: memberCookie,
      body: { characterAId: characterId('Son Goku'), characterBId: characterId('Anos Voldigoad') },
    });
    assert.equal(saved.status, 201);
    const battle = saved.body.battle;
    assert.equal(battle.analysis.result, battle.result);
    assert.equal(battle.analysis.characterA.name, 'Son Goku');

    const list = await ctx.request('GET', '/api/battles', { cookie: memberCookie });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].id, battle.id);

    const own = await ctx.request('GET', `/api/battles/${battle.id}`, { cookie: memberCookie });
    assert.equal(own.status, 200);

    const admin = await ctx.request('GET', `/api/battles/${battle.id}`, { cookie: adminCookie });
    assert.equal(admin.status, 404, 'Another account must not read this battle.');

    const outsider = await ctx.request('GET', `/api/battles/${battle.id}`, {
      cookie: outsiderCookie,
    });
    assert.equal(outsider.status, 404);

    const memberDashboard = await ctx.request('GET', '/api/dashboard/stats', {
      cookie: memberCookie,
    });
    assert.equal(memberDashboard.body.user.battles, 1);
    assert.equal(memberDashboard.body.recentBattles.length, 1);
  });
});

describe('per-account character favorites', () => {
  it('requires authentication and lists saved favorites', async () => {
    const anonymous = await ctx.request('GET', '/api/favorites');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error.code, 'AUTH_REQUIRED');

    const response = await ctx.request('GET', '/api/favorites', { cookie: memberCookie });
    assert.equal(response.status, 200);
    assert.equal(response.body.count, 4);
    assert.ok(response.body.data.every((item) => item.favoritedAt));
  });

  it('adds and removes favorites idempotently per user', async () => {
    const luffy = characterId('Monkey D. Luffy');
    const before = await ctx.request('GET', '/api/favorites/ids', { cookie: memberCookie });
    assert.equal(before.body.characterIds.includes(luffy), false);

    const added = await ctx.request('POST', '/api/favorites', {
      cookie: memberCookie,
      body: { characterId: luffy },
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.favorited, true);
    assert.equal(added.body.count, 5);

    const repeated = await ctx.request('POST', '/api/favorites', {
      cookie: memberCookie,
      body: { characterId: luffy },
    });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.count, 5);

    const adminIds = await ctx.request('GET', '/api/favorites/ids', { cookie: adminCookie });
    assert.equal(adminIds.body.characterIds.includes(luffy), false);

    const outsider = await ctx.request('GET', '/api/favorites', { cookie: outsiderCookie });
    assert.equal(outsider.body.count, 0);

    const removed = await ctx.request('DELETE', `/api/favorites/${luffy}`, {
      cookie: memberCookie,
    });
    assert.equal(removed.status, 204);

    const after = await ctx.request('GET', '/api/favorites/ids', { cookie: memberCookie });
    assert.equal(after.body.characterIds.includes(luffy), false);
  });

  it('searches favorites and validates character ids', async () => {
    const search = await ctx.request('GET', '/api/favorites?search=gojo', { cookie: memberCookie });
    assert.deepEqual(search.body.data.map((item) => item.name), ['Satoru Gojo']);

    const sorted = await ctx.request('GET', '/api/favorites?sort=name_asc', {
      cookie: memberCookie,
    });
    const names = sorted.body.data.map((item) => item.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));

    const missing = await ctx.request('POST', '/api/favorites', {
      cookie: memberCookie,
      body: { characterId: 999999 },
    });
    assert.equal(missing.status, 404);

    const invalid = await ctx.request('POST', '/api/favorites', {
      cookie: memberCookie,
      body: { characterId: 'nope' },
    });
    assert.equal(invalid.status, 400);
  });
});

describe('tier list maker', () => {
  let tierListId;

  const tiers = [
    { id: 's', name: 'S', color: '#ff8a5c' },
    { id: 'a', name: 'A', color: '#ffd166' },
  ];

  function board(overrides = {}) {
    return {
      title: 'Test Board',
      tiers,
      items: [
        { characterId: characterId('Son Goku'), tierId: 's' },
        { characterId: characterId('Satoru Gojo'), tierId: 'a' },
      ],
      ...overrides,
    };
  }

  it('protects tier lists behind authentication', async () => {
    const response = await ctx.request('GET', '/api/tier-lists');
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'AUTH_REQUIRED');
  });

  it('creates and persists a tier list with ordered placements', async () => {
    const created = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board(),
    });
    assert.equal(created.status, 201);
    tierListId = created.body.tierList.id;
    assert.equal(created.body.tierList.title, 'Test Board');
    assert.equal(created.body.tierList.tiers.length, 2);
    assert.equal(created.body.tierList.items.length, 2);
    assert.equal(created.body.tierList.items[0].character.name, 'Son Goku');

    const list = await ctx.request('GET', '/api/tier-lists', { cookie: memberCookie });
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].itemCount, 2);

    const fetched = await ctx.request('GET', `/api/tier-lists/${tierListId}`, {
      cookie: memberCookie,
    });
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body.tierList.items[1].tierId, 'a');
  });

  it('updates a tier list and keeps it scoped to the owner', async () => {
    const updated = await ctx.request('PUT', `/api/tier-lists/${tierListId}`, {
      cookie: memberCookie,
      body: board({
        title: 'Updated Board',
        items: [
          { characterId: characterId('Anos Voldigoad'), tierId: 's' },
          { characterId: characterId('Satoru Gojo'), tierId: 'a' },
        ],
      }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.tierList.title, 'Updated Board');
    assert.equal(updated.body.tierList.items[0].character.name, 'Anos Voldigoad');

    const outsiderRead = await ctx.request('GET', `/api/tier-lists/${tierListId}`, {
      cookie: outsiderCookie,
    });
    assert.equal(outsiderRead.status, 404);

    const outsiderWrite = await ctx.request('PUT', `/api/tier-lists/${tierListId}`, {
      cookie: outsiderCookie,
      body: board({ title: 'Hijacked' }),
    });
    assert.equal(outsiderWrite.status, 404);

    const outsiderList = await ctx.request('GET', '/api/tier-lists', {
      cookie: outsiderCookie,
    });
    assert.equal(outsiderList.body.data.length, 0);

    const adminList = await ctx.request('GET', '/api/tier-lists', { cookie: adminCookie });
    assert.equal(adminList.body.data.length, 1);
    assert.equal(adminList.body.data[0].title, 'ANIMEVERSE Starter Rankings');
  });

  it('rejects duplicate, foreign and invalid tier list references', async () => {
    const duplicateTiers = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board({
        tiers: [
          { id: 's', name: 'S', color: '#ff8a5c' },
          { id: 's', name: 'S again', color: '#ffd166' },
        ],
        items: [],
      }),
    });
    assert.equal(duplicateTiers.status, 400);
    assert.equal(duplicateTiers.body.error.code, 'DUPLICATE_TIER_ID');

    const duplicateItems = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board({
        items: [
          { characterId: characterId('Son Goku'), tierId: 's' },
          { characterId: characterId('Son Goku'), tierId: 'a' },
        ],
      }),
    });
    assert.equal(duplicateItems.status, 400);
    assert.equal(duplicateItems.body.error.code, 'DUPLICATE_ITEM');

    const foreignTier = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board({ items: [{ characterId: characterId('Son Goku'), tierId: 'z' }] }),
    });
    assert.equal(foreignTier.status, 400);
    assert.equal(foreignTier.body.error.code, 'INVALID_TIER_REF');

    const foreignCharacter = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board({ items: [{ characterId: 999999, tierId: 's' }] }),
    });
    assert.equal(foreignCharacter.status, 400);
    assert.equal(foreignCharacter.body.error.code, 'INVALID_CHARACTER_REF');

    const badColor = await ctx.request('POST', '/api/tier-lists', {
      cookie: memberCookie,
      body: board({ tiers: [{ id: 's', name: 'S', color: 'orange' }], items: [] }),
    });
    assert.equal(badColor.status, 400);
    assert.equal(badColor.body.error.code, 'VALIDATION_ERROR');
  });

  it('deletes a tier list', async () => {
    const removed = await ctx.request('DELETE', `/api/tier-lists/${tierListId}`, {
      cookie: memberCookie,
    });
    assert.equal(removed.status, 204);

    const gone = await ctx.request('GET', `/api/tier-lists/${tierListId}`, {
      cookie: memberCookie,
    });
    assert.equal(gone.status, 404);

    const outsiderDelete = await ctx.request('DELETE', `/api/tier-lists/${tierListId}`, {
      cookie: outsiderCookie,
    });
    assert.equal(outsiderDelete.status, 404);
  });
});

describe('gallery', () => {
  it('serves gallery items with attribution and filter metadata', async () => {
    const response = await ctx.request('GET', '/api/gallery');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 8);
    assert.deepEqual(response.body.meta.categories, [
      'Cinematic',
      'Action',
      'Landscape',
      'Character',
    ]);
    assert.ok(response.body.data.every((item) => item.attribution.includes('AI-generated')));
    assert.ok(response.body.data.every((item) => item.imageUrl.startsWith('/gallery/')));
    assert.ok(response.body.data.every((item) => item.imageUrl.endsWith('.jpg')));
    assert.equal(response.body.data[0].isFavorite, false);
    assert.equal(response.body.meta.note.length > 0, true);
  });

  it('filters and searches the gallery', async () => {
    const action = await ctx.request('GET', '/api/gallery?category=Action');
    assert.equal(action.body.data.length, 3);

    const search = await ctx.request('GET', '/api/gallery?search=saiyan');
    assert.deepEqual(search.body.data.map((item) => item.title), ['Saiyan Dawn']);

    const badCategory = await ctx.request('GET', '/api/gallery?category=Unknown');
    assert.equal(badCategory.status, 400);
  });

  it('keeps gallery favorites per account', async () => {
    const anonymous = await ctx.request('GET', '/api/gallery?favorites=true');
    assert.equal(anonymous.status, 401);
    assert.equal(anonymous.body.error.code, 'AUTH_REQUIRED');

    const item = (await ctx.request('GET', '/api/gallery')).body.data[0];
    const added = await ctx.request('POST', `/api/gallery/${item.id}/favorite`, {
      cookie: memberCookie,
    });
    assert.equal(added.status, 200);
    assert.equal(added.body.favorited, true);

    const favorites = await ctx.request('GET', '/api/gallery?favorites=true', {
      cookie: memberCookie,
    });
    assert.equal(favorites.body.data.length, 1);
    assert.equal(favorites.body.data[0].id, item.id);
    assert.equal(favorites.body.data[0].isFavorite, true);

    const adminView = await ctx.request('GET', '/api/gallery?favorites=true', {
      cookie: adminCookie,
    });
    assert.equal(adminView.body.data.length, 0);

    const removed = await ctx.request('DELETE', `/api/gallery/${item.id}/favorite`, {
      cookie: memberCookie,
    });
    assert.equal(removed.status, 204);

    const after = await ctx.request('GET', '/api/gallery?favorites=true', {
      cookie: memberCookie,
    });
    assert.equal(after.body.data.length, 0);

    const missing = await ctx.request('POST', '/api/gallery/999999/favorite', {
      cookie: memberCookie,
    });
    assert.equal(missing.status, 404);
  });
});

describe('error handling and request hardening', () => {
  it('returns a consistent JSON envelope for unknown API routes', async () => {
    const response = await ctx.request('GET', '/api/does-not-exist');
    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
    assert.match(response.body.error.message, /No API route matches/);
  });

  it('rejects malformed JSON with a clear error', async () => {
    const response = await ctx.request('POST', '/api/battles/analyze', {
      body: '{"characterAId": ',
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_JSON');
  });

  it('rejects untrusted origins on unsafe methods', async () => {
    const response = await ctx.request('POST', '/api/battles/analyze', {
      headers: { Origin: 'https://evil.example' },
      body: { characterAId: characterId('Son Goku'), characterBId: characterId('Anos Voldigoad') },
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'ORIGIN_REJECTED');
  });

  it('adds security headers and does not expose the Express fingerprint', async () => {
    const response = await ctx.request('GET', '/api/health');
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.ok(response.headers.get('content-security-policy'));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });

  it('marks demo seed content as community data', async () => {
    const response = await ctx.request('GET', '/api/characters?limit=100');
    assert.ok(response.body.data.length > 0);
    assert.ok(response.body.data.every((item) => ['community', 'demo', 'official'].includes(item.dataSource)));
    assert.ok(
      response.body.data.some((item) => item.dataSource === 'community'),
      'Seed characters should be labelled community interpretation.',
    );
  });
});
