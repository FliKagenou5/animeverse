CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS anime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  synopsis TEXT NOT NULL DEFAULT '',
  year INTEGER,
  studio TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tiers (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  order_index INTEGER NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  example TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  alias TEXT,
  anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  image_url TEXT,
  tier TEXT NOT NULL REFERENCES tiers(key) ON UPDATE CASCADE,
  ap INTEGER CHECK (ap IS NULL OR (ap BETWEEN 0 AND 100)),
  speed INTEGER CHECK (speed IS NULL OR (speed BETWEEN 0 AND 100)),
  durability INTEGER CHECK (durability IS NULL OR (durability BETWEEN 0 AND 100)),
  strength INTEGER CHECK (strength IS NULL OR (strength BETWEEN 0 AND 100)),
  intelligence INTEGER CHECK (intelligence IS NULL OR (intelligence BETWEEN 0 AND 100)),
  stamina INTEGER CHECK (stamina IS NULL OR (stamina BETWEEN 0 AND 100)),
  hax INTEGER CHECK (hax IS NULL OR (hax BETWEEN 0 AND 100)),
  range_stat INTEGER CHECK (range_stat IS NULL OR (range_stat BETWEEN 0 AND 100)),
  combat_skill INTEGER CHECK (combat_skill IS NULL OR (combat_skill BETWEEN 0 AND 100)),
  hax_note TEXT NOT NULL DEFAULT '',
  abilities TEXT NOT NULL DEFAULT '[]',
  weaknesses TEXT NOT NULL DEFAULT '',
  first_appearance TEXT,
  status TEXT NOT NULL DEFAULT 'Unknown' CHECK (status IN ('Alive', 'Deceased', 'Unknown', 'Sealed', 'Inactive')),
  data_source TEXT NOT NULL DEFAULT 'demo' CHECK (data_source IN ('official', 'community', 'demo')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (name, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_characters_anime ON characters(anime_id);
CREATE INDEX IF NOT EXISTS idx_characters_tier ON characters(tier);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);

CREATE TABLE IF NOT EXISTS tier_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tiers_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tier_lists_user ON tier_lists(user_id);

CREATE TABLE IF NOT EXISTS tier_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_list_id INTEGER NOT NULL REFERENCES tier_lists(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  tier_key TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (tier_list_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_list_items_list ON tier_list_items(tier_list_id);

CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  character_a_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  character_b_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  result TEXT NOT NULL CHECK (result IN ('a', 'b', 'draw', 'insufficient')),
  summary TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_battles_user ON battles(user_id);
CREATE INDEX IF NOT EXISTS idx_battles_created ON battles(created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_character ON favorites(character_id);

CREATE TABLE IF NOT EXISTS gallery_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  anime_id INTEGER REFERENCES anime(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Cinematic', 'Action', 'Landscape', 'Character')),
  image_url TEXT NOT NULL UNIQUE,
  source_url TEXT,
  attribution TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery_items(category);
CREATE INDEX IF NOT EXISTS idx_gallery_anime ON gallery_items(anime_id);

CREATE TABLE IF NOT EXISTS gallery_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gallery_item_id INTEGER NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, gallery_item_id)
);
