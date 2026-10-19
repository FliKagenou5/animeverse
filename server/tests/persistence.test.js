import assert from 'node:assert/strict';
import { after, it } from 'node:test';
import {
  databasePath,
  migrate,
  openDatabase,
  removeDatabaseFiles,
  startTestServer,
} from './helpers.js';

let ctx;

after(async () => {
  if (ctx) {
    await ctx.stop();
  } else {
    removeDatabaseFiles();
  }
});

it('persists characters, tier lists and battles after the database is reopened', async () => {
  ctx = await startTestServer();
  const adminCookie = await ctx.login('admin@animeverse.dev', 'Admin#1234');
  const memberCookie = await ctx.login('explorer@animeverse.dev', 'Explore#1234');

  const anime = (await ctx.request('GET', '/api/anime')).body.data.find(
    (item) => item.title === 'Bleach',
  );
  const seedCharacters = (await ctx.request('GET', '/api/characters?limit=100')).body.data;
  const goku = seedCharacters.find((item) => item.name === 'Son Goku');
  const gojo = seedCharacters.find((item) => item.name === 'Satoru Gojo');

  const created = await ctx.request('POST', '/api/characters', {
    cookie: adminCookie,
    body: {
      name: 'Persisted Test Character',
      animeId: anime.id,
      description: 'A character created specifically to verify durable database writes.',
      tier: '4-A',
      ap: 72,
      speed: 71,
      durability: 70,
      status: 'Alive',
      dataSource: 'demo',
      weaknesses: 'Purely fictional persistence-check weaknesses.',
    },
  });
  assert.equal(created.status, 201);
  const characterId = created.body.character.id;

  const tierList = await ctx.request('POST', '/api/tier-lists', {
    cookie: memberCookie,
    body: {
      title: 'Persistence Board',
      tiers: [{ id: 's', name: 'S', color: '#ff8a5c' }],
      items: [{ characterId: gojo.id, tierId: 's' }],
    },
  });
  assert.equal(tierList.status, 201);
  const tierListId = tierList.body.tierList.id;

  const savedBattle = await ctx.request('POST', '/api/battles', {
    cookie: memberCookie,
    body: { characterAId: goku.id, characterBId: gojo.id },
  });
  assert.equal(savedBattle.status, 201);
  const battleId = savedBattle.body.battle.id;

  await ctx.stop({ removeDatabase: false });
  ctx = null;

  const reopened = openDatabase(databasePath);
  migrate(reopened);
  try {
    assert.equal(reopened.prepare('PRAGMA user_version').get().user_version, 1);

    const character = reopened
      .prepare('SELECT name, data_source FROM characters WHERE id = ?')
      .get(characterId);
    assert.equal(character.name, 'Persisted Test Character');
    assert.equal(character.data_source, 'demo');

    const board = reopened
      .prepare('SELECT title FROM tier_lists WHERE id = ?')
      .get(tierListId);
    assert.equal(board.title, 'Persistence Board');

    const placement = reopened
      .prepare(
        `SELECT i.tier_key, c.name FROM tier_list_items i
         JOIN characters c ON c.id = i.character_id
         WHERE i.tier_list_id = ?`,
      )
      .get(tierListId);
    assert.equal(placement.tier_key, 's');
    assert.equal(placement.name, 'Satoru Gojo');

    const battle = reopened
      .prepare('SELECT result, snapshot_json FROM battles WHERE id = ?')
      .get(battleId);
    assert.ok(['a', 'b', 'draw', 'insufficient'].includes(battle.result));
    const snapshot = JSON.parse(battle.snapshot_json);
    assert.equal(snapshot.characterA.name, 'Son Goku');
    assert.equal(snapshot.characterB.name, 'Satoru Gojo');

    const sessionCount = reopened
      .prepare('SELECT COUNT(*) AS count FROM sessions')
      .get().count;
    assert.ok(sessionCount >= 2, 'Sessions should be stored hashed in the database.');
  } finally {
    reopened.close();
    removeDatabaseFiles();
  }
});
