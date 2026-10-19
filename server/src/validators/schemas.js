import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')
  .regex(/[A-Za-z]/, 'Password must include a letter.')
  .regex(/[0-9]/, 'Password must include a number.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.').max(72),
});

const nullableStat = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') return null;
    return Number(value);
  },
  z.number().int().min(0).max(100).nullable(),
);

const imageUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
      'Use an http(s) URL or a local path starting with /.',
    )
    .nullable()
    .optional(),
);

const optionalText = (max) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const abilities = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (value === undefined || value === null) return [];
    return value;
  },
  z.array(z.string().trim().min(1).max(90)).max(12),
);

export const characterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  alias: optionalText(80),
  animeId: z.coerce.number().int().positive('Choose an anime.'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters.')
    .max(2500),
  imageUrl,
  tier: z.string().trim().min(1, 'Choose a tier.').max(12),
  ap: nullableStat,
  speed: nullableStat,
  durability: nullableStat,
  strength: nullableStat,
  intelligence: nullableStat,
  stamina: nullableStat,
  hax: nullableStat,
  range: nullableStat,
  combatSkill: nullableStat,
  haxNote: z.string().trim().max(600).default(''),
  abilities,
  weaknesses: z.string().trim().min(10, 'Weaknesses must be at least 10 characters.').max(1200),
  firstAppearance: optionalText(160),
  status: z.enum(['Alive', 'Deceased', 'Unknown', 'Sealed', 'Inactive']),
  dataSource: z.enum(['official', 'community', 'demo']).default('community'),
});

const animeYear = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? null : Number(value)),
  z.number().int().min(1900).max(2100).nullable(),
);

export const animeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(140),
  synopsis: z.string().trim().max(1500).default(''),
  year: animeYear,
  studio: optionalText(120),
});

export const tierListSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(80),
  tiers: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .regex(/^[a-z0-9][a-z0-9-]{0,23}$/i, 'Tier id must be a short slug.'),
        name: z.string().trim().min(1, 'Tier name is required.').max(30),
        color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour.'),
      }),
    )
    .min(1, 'Add at least one tier.')
    .max(14),
  items: z
    .array(
      z.object({
        characterId: z.coerce.number().int().positive(),
        tierId: z.string().trim().min(1).max(24),
        position: z.number().int().min(0).max(1000).optional(),
      }),
    )
    .max(300),
});

export const tierUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(20).optional(),
    description: z.string().trim().max(500).optional(),
    example: z.string().trim().max(180).optional(),
    orderIndex: z.number().int().min(0).max(999).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const battleSchema = z.object({
  characterAId: z.coerce.number().int().positive('Choose the first character.'),
  characterBId: z.coerce.number().int().positive('Choose the second character.'),
});

export const favoriteSchema = z.object({
  characterId: z.coerce.number().int().positive(),
});

const pageNumber = z.preprocess(
  (value) => (value === undefined || value === '' ? 1 : Number(value)),
  z.number().int().min(1).max(100000),
);

const pageSize = z.preprocess(
  (value) => (value === undefined || value === '' ? 12 : Number(value)),
  z.number().int().min(1).max(100),
);

const optionalAnimeId = z.preprocess(
  (value) => (value === undefined || value === '' ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const characterQuerySchema = z.object({
  page: pageNumber,
  limit: pageSize,
  search: z.string().trim().max(100).default(''),
  animeId: optionalAnimeId,
  tier: z.string().trim().max(12).optional(),
  status: z.enum(['Alive', 'Deceased', 'Unknown', 'Sealed', 'Inactive']).optional(),
  sort: z
    .enum(['name_asc', 'name_desc', 'newest', 'oldest', 'tier_asc', 'tier_desc', 'updated_desc'])
    .default('name_asc'),
});

export const favoritesQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  sort: z.enum(['recent', 'name_asc', 'name_desc']).default('recent'),
});

export const galleryQuerySchema = z.object({
  search: z.string().trim().max(100).default(''),
  category: z.enum(['Cinematic', 'Action', 'Landscape', 'Character']).optional(),
  animeId: optionalAnimeId,
  favorites: z.enum(['true', 'false']).optional(),
});
