import { useEffect, useId, useMemo, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { api, getApiError, getFieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import {
  DATA_SOURCE_META,
  DATA_SOURCES,
  SCALED_STATS,
  STATUSES,
  ALL_STATS,
  tierFamily,
} from '../../utils/constants.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input, Select, Textarea } from '../ui/Form.jsx';
import { CharacterAvatar } from './CharacterAvatar.jsx';

const blankStatFields = Object.fromEntries(ALL_STATS.map((stat) => [stat.key, '']));

function formFromCharacter(character, animeList, tiers) {
  if (!character) {
    return {
      name: '',
      alias: '',
      animeId: animeList[0]?.id ? String(animeList[0].id) : '',
      tier: tiers[0]?.key || '',
      description: '',
      imageUrl: '',
      firstAppearance: '',
      status: 'Alive',
      dataSource: 'community',
      haxNote: '',
      abilities: '',
      weaknesses: '',
      ...blankStatFields,
    };
  }

  return {
    name: character.name,
    alias: character.alias || '',
    animeId: String(character.animeId),
    tier: character.tier.key,
    description: character.description,
    imageUrl: character.imageUrl || '',
    firstAppearance: character.firstAppearance || '',
    status: character.status,
    dataSource: character.dataSource,
    haxNote: character.haxNote || '',
    abilities: (character.abilities || []).join(', '),
    weaknesses: character.weaknesses || '',
    ...Object.fromEntries(
      ALL_STATS.map((stat) => {
        const value = character.stats?.[stat.key];
        return [stat.key, typeof value === 'number' ? String(value) : ''];
      }),
    ),
  };
}

function toStat(value) {
  if (value === '' || value === null || value === undefined) return null;
  return Number(value);
}

export function CharacterFormModal({ character, animeList = [], tiers = [], onClose, onSaved }) {
  const isEdit = Boolean(character);
  const toast = useToast();
  const formId = useId();
  const [form, setForm] = useState(() => formFromCharacter(character, animeList, tiers));
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(formFromCharacter(character, animeList, tiers));
    setErrors({});
    setServerErrors({});
    setGeneralError('');
    // The modal is opened only after its option lists have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const selectedTier = useMemo(
    () => tiers.find((tier) => tier.key === form.tier),
    [tiers, form.tier],
  );

  const tierGroups = useMemo(() => {
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
  }, [tiers]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerErrors((current) => ({ ...current, [key]: undefined }));
    setGeneralError('');
  };

  const fieldError = (key) => errors[key] || serverErrors[key]?.[0];

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!form.animeId) next.animeId = 'Choose an anime.';
    if (!form.tier) next.tier = 'Choose a tier.';
    if (form.description.trim().length < 20) next.description = 'Use at least 20 characters.';
    if (form.weaknesses.trim().length < 10) next.weaknesses = 'Use at least 10 characters.';
    if (form.imageUrl.trim()) {
      const value = form.imageUrl.trim();
      if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) {
        next.imageUrl = 'Use an http(s) URL or a local path starting with /.';
      }
    }
    for (const stat of ALL_STATS) {
      const raw = form[stat.key];
      if (raw === '') continue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        next[stat.key] = 'Use a whole number from 0 to 100, or leave blank.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!validate()) {
      setGeneralError('Some fields need attention before saving.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      alias: form.alias.trim(),
      animeId: Number(form.animeId),
      tier: form.tier,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      firstAppearance: form.firstAppearance.trim(),
      status: form.status,
      dataSource: form.dataSource,
      haxNote: form.haxNote.trim(),
      abilities: form.abilities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      weaknesses: form.weaknesses.trim(),
      ...Object.fromEntries(ALL_STATS.map((stat) => [stat.key, toStat(form[stat.key])])),
    };

    setSaving(true);
    setGeneralError('');
    setServerErrors({});
    try {
      const response = isEdit
        ? await api.put(`/characters/${character.id}`, payload)
        : await api.post('/characters', payload);
      const saved = response.data.character;
      toast.success(
        isEdit ? `${saved.name} was updated.` : `${saved.name} joined the index.`,
        isEdit ? 'Character updated' : 'Character created',
      );
      onSaved?.(saved);
    } catch (error) {
      const apiError = getApiError(error);
      setServerErrors(getFieldErrors(error));
      setGeneralError(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit ${character.name}` : 'Add a character'}
      description={
        isEdit
          ? 'Update profile, source labels and the power parameters used by battle analysis.'
          : 'Create a new entry. Power stats are optional; battle analysis reports insufficient data when gaps are too large.'
      }
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            icon={Save}
            loading={saving}
          >
            {isEdit ? 'Save changes' : 'Create character'}
          </Button>
        </>
      }
    >
      <form id={formId} className="character-form" onSubmit={handleSubmit} noValidate>
        {generalError ? (
          <div className="form-alert" role="alert">
            {generalError}
          </div>
        ) : null}

        <section className="form-section">
          <div className="form-section-head">
            <h3>Identity</h3>
            <span>Who is this character and where do they belong?</span>
          </div>
          <div className="form-grid form-grid-2">
            <Field label="Character name" htmlFor="cf-name" error={fieldError('name')} required>
              <Input
                id="cf-name"
                value={form.name}
                maxLength={80}
                onChange={(event) => update('name', event.target.value)}
                placeholder="e.g. Satoru Gojo"
                aria-invalid={Boolean(fieldError('name'))}
                autoFocus
              />
            </Field>
            <Field label="Alias" htmlFor="cf-alias" error={fieldError('alias')}>
              <Input
                id="cf-alias"
                value={form.alias}
                maxLength={80}
                onChange={(event) => update('alias', event.target.value)}
                placeholder="e.g. The Strongest"
              />
            </Field>
            <Field label="Anime" htmlFor="cf-anime" error={fieldError('animeId')} required>
              <Select
                id="cf-anime"
                value={form.animeId}
                onChange={(event) => update('animeId', event.target.value)}
                aria-invalid={Boolean(fieldError('animeId'))}
              >
                <option value="">Choose an anime</option>
                {animeList.map((anime) => (
                  <option key={anime.id} value={anime.id}>
                    {anime.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Tier"
              htmlFor="cf-tier"
              error={fieldError('tier')}
              hint={selectedTier?.description}
              required
            >
              <Select
                id="cf-tier"
                value={form.tier}
                onChange={(event) => update('tier', event.target.value)}
                aria-invalid={Boolean(fieldError('tier'))}
              >
                <option value="">Choose a tier</option>
                {tierGroups.map((group) => (
                  <optgroup key={group.family} label={group.family}>
                    {group.items.map((tier) => (
                      <option key={tier.key} value={tier.key}>
                        {tier.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="cf-status">
              <Select
                id="cf-status"
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Data source"
              htmlFor="cf-source"
              hint={DATA_SOURCE_META[form.dataSource]?.description}
            >
              <Select
                id="cf-source"
                value={form.dataSource}
                onChange={(event) => update('dataSource', event.target.value)}
              >
                {DATA_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {DATA_SOURCE_META[source].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h3>Profile</h3>
            <span>Describe the character without inventing official sources.</span>
          </div>
          <div className="form-grid">
            <Field
              label="Description"
              htmlFor="cf-description"
              error={fieldError('description')}
              required
            >
              <Textarea
                id="cf-description"
                rows={3}
                maxLength={2500}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="A concise profile in your own words…"
                aria-invalid={Boolean(fieldError('description'))}
              />
            </Field>

            <div className="image-field-row">
              <Field
                label="Image URL (optional)"
                htmlFor="cf-image"
                error={fieldError('imageUrl')}
                hint="Use a URL you have permission to display, or leave blank for the generated placeholder."
                className="image-field-input"
              >
                <Input
                  id="cf-image"
                  value={form.imageUrl}
                  onChange={(event) => update('imageUrl', event.target.value)}
                  placeholder="https://… or /images/character.jpg"
                  aria-invalid={Boolean(fieldError('imageUrl'))}
                />
              </Field>
              <div className="image-field-preview">
                <CharacterAvatar
                  character={{
                    name: form.name || 'New character',
                    imageUrl: form.imageUrl.trim(),
                    anime: animeList.find((anime) => String(anime.id) === String(form.animeId)),
                  }}
                  size="md"
                />
                <small>Preview</small>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <Field label="First appearance" htmlFor="cf-first">
                <Input
                  id="cf-first"
                  value={form.firstAppearance}
                  maxLength={160}
                  onChange={(event) => update('firstAppearance', event.target.value)}
                  placeholder="e.g. Jujutsu Kaisen manga, Chapter 0"
                />
              </Field>
              <Field
                label="Abilities"
                htmlFor="cf-abilities"
                hint="Separate abilities with commas (max 12)."
              >
                <Input
                  id="cf-abilities"
                  value={form.abilities}
                  onChange={(event) => update('abilities', event.target.value)}
                  placeholder="Domain Expansion, Limitless, Six Eyes"
                />
              </Field>
            </div>

            <Field label="Hax note" htmlFor="cf-hax-note" hint="Shown separately in battle analysis; never scored numerically.">
              <Textarea
                id="cf-hax-note"
                rows={2}
                maxLength={600}
                value={form.haxNote}
                onChange={(event) => update('haxNote', event.target.value)}
                placeholder="Explain special abilities and their limits…"
              />
            </Field>

            <Field
              label="Weaknesses"
              htmlFor="cf-weaknesses"
              error={fieldError('weaknesses')}
              required
            >
              <Textarea
                id="cf-weaknesses"
                rows={2}
                maxLength={1200}
                value={form.weaknesses}
                onChange={(event) => update('weaknesses', event.target.value)}
                placeholder="Known limits, costs and vulnerabilities…"
                aria-invalid={Boolean(fieldError('weaknesses'))}
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-head">
            <h3>Power profile</h3>
            <span>
              0–100 parameters. Leave a field blank when the data is unknown. Hax is not part of the
              weighted battle score.
            </span>
          </div>
          <div className="stat-input-grid">
            {ALL_STATS.map((stat) => {
              const isHax = stat.key === 'hax';
              return (
                <Field
                  key={stat.key}
                  label={stat.label}
                  htmlFor={`cf-${stat.key}`}
                  error={fieldError(stat.key)}
                  hint={
                    isHax
                      ? 'Qualitative context only'
                      : stat.weight
                        ? `${stat.weight}% of the battle score`
                        : undefined
                  }
                >
                  <Input
                    id={`cf-${stat.key}`}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    inputMode="numeric"
                    value={form[stat.key]}
                    onChange={(event) => update(stat.key, event.target.value)}
                    placeholder="—"
                    aria-invalid={Boolean(fieldError(stat.key))}
                  />
                </Field>
              );
            })}
          </div>
          <div className="form-note">
            <Sparkles size={15} aria-hidden="true" />
            <p>
              Seeded values are community interpretations. New entries default to “Community
              interpretation” so the UI never presents them as official.
            </p>
          </div>
        </section>
      </form>
    </Modal>
  );
}
