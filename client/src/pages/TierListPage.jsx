import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { toPng } from 'html-to-image';
import {
  Download,
  FilePlus2,
  GripVertical,
  ListOrdered,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api, getApiError } from '../api/client.js';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatDate } from '../utils/format.js';
import { DEFAULT_TIER_TEMPLATE } from '../utils/constants.js';
import { CharacterAvatar } from '../components/characters/CharacterAvatar.jsx';
import { AuthGate } from '../components/ui/AuthGate.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Field, Input, SearchField } from '../components/ui/Form.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ErrorState, PageLoader } from '../components/ui/StateViews.jsx';

const DEFAULT_TITLE = 'My ANIMEVERSE Rankings';
const TIER_COLORS = ['#ff8a5c', '#ffd166', '#4cd7b0', '#4fb7ff', '#b799ff', '#ff6b8a', '#8f9bb3'];

function cloneTemplate() {
  return DEFAULT_TIER_TEMPLATE.map((tier) => ({ ...tier }));
}

function signatureOf(title, tiers, placements) {
  return JSON.stringify({ title, tiers, placements });
}

function makeTierId(name, existingIds) {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 20) || 'tier';
  let id = base;
  let index = 2;
  while (existingIds.has(id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function CharacterChip({
  character,
  onRemove,
  overlay = false,
  isDragging = false,
}) {
  return (
    <div
      className={`tier-chip ${isDragging ? 'is-dragging' : ''} ${overlay ? 'is-overlay' : ''}`.trim()}
    >
      {!overlay ? (
        <span className="tier-chip-handle" aria-hidden="true">
          <GripVertical size={13} />
        </span>
      ) : null}
      <CharacterAvatar character={character} size="tiny" />
      <span className="tier-chip-name">{character.name}</span>
      {onRemove ? (
        <button
          type="button"
          className="tier-chip-remove"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Remove ${character.name} from this tier`}
          data-export-ignore="true"
        >
          <X size={12} />
        </button>
      ) : null}
    </div>
  );
}

function DraggableCharacter({ character, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `character-${character.id}`,
    data: { characterId: character.id },
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`tier-chip-shell ${isDragging ? 'is-placeholder' : ''}`.trim()}
      {...attributes}
      {...listeners}
    >
      <CharacterChip
        character={character}
        onRemove={onRemove}
        isDragging={isDragging}
      />
    </div>
  );
}

function TierRow({ tier, characters, onEdit, onDelete, onRemoveCharacter }) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-zone-${tier.id}` });

  return (
    <div
      className={`tier-row-board ${isOver ? 'is-over' : ''}`.trim()}
      style={{ '--tier-color': tier.color }}
    >
      <div className="tier-label-block">
        <span className="tier-label-name">{tier.name}</span>
        <span className="tier-label-count">{characters.length}</span>
        <div className="tier-label-actions" data-export-ignore="true">
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => onEdit(tier)}
            aria-label={`Edit ${tier.name} tier`}
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="icon-button icon-button-sm"
            onClick={() => onDelete(tier)}
            aria-label={`Delete ${tier.name} tier`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div ref={setNodeRef} className={`tier-dropzone ${isOver ? 'is-over' : ''}`.trim()}>
        {characters.length ? (
          characters.map((character) => (
            <DraggableCharacter
              key={character.id}
              character={character}
              onRemove={() => onRemoveCharacter(character.id)}
            />
          ))
        ) : (
          <span className="tier-dropzone-hint">Drag characters into this tier</span>
        )}
      </div>
    </div>
  );
}

function PoolZone({ characters, onRemoveCharacter }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool-zone' });
  return (
    <div
      ref={setNodeRef}
      className={`pool-zone ${isOver ? 'is-over' : ''}`.trim()}
    >
      {characters.length ? (
        characters.map((character) => (
          <DraggableCharacter
            key={character.id}
            character={character}
            onRemove={null}
          />
        ))
      ) : (
        <p className="pool-empty">Every character has been placed. Drop a chip here to unrank it.</p>
      )}
    </div>
  );
}

function TierEditorModal({ tier, mode, tiers, onClose, onSave }) {
  const [name, setName] = useState(tier?.name || '');
  const [color, setColor] = useState(tier?.color || TIER_COLORS[2]);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this tier a name.');
      return;
    }
    if (trimmed.length > 30) {
      setError('Tier names are limited to 30 characters.');
      return;
    }
    const duplicate = tiers.some(
      (item) => item.id !== tier?.id && item.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setError('Another tier already uses that name.');
      return;
    }
    const normalizedColor = color.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
      setError('Use a six-digit hex colour such as #4cd7b0.');
      return;
    }
    if (mode === 'create') {
      const id = makeTierId(trimmed, new Set(tiers.map((item) => item.id)));
      onSave({ id, name: trimmed, color: normalizedColor });
    } else {
      onSave({ ...tier, name: trimmed, color: normalizedColor });
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Add a tier' : `Edit ${tier.name} tier`}
      description={
        mode === 'create'
          ? 'New tiers appear immediately and are saved with the board.'
          : 'Rename the band or give it a new colour. Character placements stay intact.'
      }
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="tier-editor-form" icon={Plus}>
            {mode === 'create' ? 'Add tier' : 'Apply changes'}
          </Button>
        </>
      }
    >
      <form id="tier-editor-form" className="tier-editor-form" onSubmit={submit} noValidate>
        {error ? <div className="form-alert" role="alert">{error}</div> : null}
        <Field label="Tier name" htmlFor="tier-name" required>
          <Input
            id="tier-name"
            value={name}
            maxLength={30}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            placeholder="e.g. S+"
            autoFocus
          />
        </Field>
        <Field label="Tier colour" htmlFor="tier-color" hint="Used for the band accent and the PNG export.">
          <div className="color-field-row">
            <input
              id="tier-color"
              type="color"
              className="color-input"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
            <Input
              value={color}
              maxLength={7}
              onChange={(event) => setColor(event.target.value)}
              aria-label="Tier colour hex"
            />
          </div>
          <div className="color-swatches">
            {TIER_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`color-swatch ${color === preset ? 'is-active' : ''}`.trim()}
                style={{ '--swatch': preset }}
                onClick={() => setColor(preset)}
                aria-label={`Use colour ${preset}`}
              />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}

function TitleEditorModal({ title, onClose, onSave }) {
  const [value, setValue] = useState(title);
  const [error, setError] = useState('');
  return (
    <Modal
      title="Rename this board"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            form="board-title-form"
            icon={Save}
          >
            Save title
          </Button>
        </>
      }
    >
      <form
        id="board-title-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) {
            setError('The board needs a title.');
            return;
          }
          onSave(value.trim());
        }}
        noValidate
      >
        {error ? <div className="form-alert" role="alert">{error}</div> : null}
        <Field label="Board title" htmlFor="board-title" required>
          <Input
            id="board-title"
            value={value}
            maxLength={80}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
            autoFocus
          />
        </Field>
      </form>
    </Modal>
  );
}

function Workspace() {
  const { user } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [tiers, setTiers] = useState(cloneTemplate);
  const [placements, setPlacements] = useState({});
  const [activeListId, setActiveListId] = useState(null);
  const [savedSignature, setSavedSignature] = useState(() =>
    signatureOf(DEFAULT_TITLE, cloneTemplate(), {}),
  );
  const [poolSearch, setPoolSearch] = useState('');
  const [activeDrag, setActiveDrag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingListId, setLoadingListId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [tierModal, setTierModal] = useState(null);
  const [titleModal, setTitleModal] = useState(false);
  const boardRef = useRef(null);

  const rosterQuery = useApiQuery('/characters', { page: 1, limit: 100, sort: 'name_asc' });
  const savedQuery = useApiQuery('/tier-lists');
  const roster = rosterQuery.data?.data || [];
  const savedLists = savedQuery.data?.data || [];

  const charactersById = useMemo(
    () => new Map(roster.map((character) => [character.id, character])),
    [roster],
  );

  const placedIds = useMemo(
    () => new Set(Object.keys(placements).map((id) => Number(id))),
    [placements],
  );
  const pool = useMemo(() => {
    const query = poolSearch.trim().toLowerCase();
    return roster.filter((character) => {
      if (placedIds.has(character.id)) return false;
      if (!query) return true;
      return (
        character.name.toLowerCase().includes(query) ||
        (character.alias || '').toLowerCase().includes(query)
      );
    });
  }, [roster, placedIds, poolSearch]);

  const byTier = useMemo(() => {
    const map = new Map();
    for (const tier of tiers) map.set(tier.id, []);
    for (const [id, tierId] of Object.entries(placements)) {
      const character = charactersById.get(Number(id));
      if (character && map.has(tierId)) map.get(tierId).push(character);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [tiers, placements, charactersById]);

  const placedCount = placedIds.size;
  const dirty = signatureOf(title, tiers, placements) !== savedSignature;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const moveCharacter = (characterId, tierId) => {
    setPlacements((current) => {
      const next = { ...current };
      if (!tierId) delete next[characterId];
      else next[characterId] = tierId;
      return next;
    });
  };

  const handleDragStart = ({ active }) => {
    const id = active.data.current?.characterId;
    setActiveDrag(charactersById.get(id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveDrag(null);
    if (!over) return;
    const characterId = active.data.current?.characterId;
    if (!characterId) return;
    const overId = String(over.id);
    if (overId === 'pool-zone') {
      moveCharacter(characterId, null);
    } else if (overId.startsWith('tier-zone-')) {
      moveCharacter(characterId, overId.slice('tier-zone-'.length));
    }
  };

  const handleAddTier = (tier) => {
    if (tiers.length >= 14) {
      toast.error('A board can hold at most 14 tiers.', 'Tier limit reached');
      return;
    }
    setTiers((current) => [...current, tier]);
    setTierModal(null);
    toast.success(`${tier.name} tier added to the board.`, 'Tier added');
  };

  const handleEditTier = (updated) => {
    setTiers((current) => current.map((tier) => (tier.id === updated.id ? updated : tier)));
    setTierModal(null);
  };

  const requestDeleteTier = (tier) => {
    const count = byTier.get(tier.id)?.length || 0;
    if (tiers.length <= 1) {
      toast.error('A board needs at least one tier.', 'Cannot delete tier');
      return;
    }
    if (count > 0) {
      toast.info(
        `Move the ${count} character${count === 1 ? '' : 's'} out of ${tier.name} before deleting it.`,
        'Tier is not empty',
      );
      return;
    }
    setConfirm({
      title: `Delete the ${tier.name} tier?`,
      message: 'This removes the empty tier from the current board. Save the board to persist it.',
      confirmLabel: 'Delete tier',
      danger: true,
      action: () => {
        setTiers((current) => current.filter((item) => item.id !== tier.id));
        setConfirm(null);
      },
    });
  };

  const appendItems = (nextTiers, nextPlacements) => {
    const tierIds = new Set(nextTiers.map((tier) => tier.id));
    return Object.entries(nextPlacements)
      .filter(([, tierId]) => tierIds.has(tierId))
      .map(([characterId, tierId]) => ({ characterId: Number(characterId), tierId }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Give the board a title before saving.');
      return;
    }
    const payload = {
      title: title.trim(),
      tiers: tiers.map((tier) => ({ id: tier.id, name: tier.name, color: tier.color })),
      items: appendItems(tiers, placements),
    };
    setSaving(true);
    try {
      const response = activeListId
        ? await api.put(`/tier-lists/${activeListId}`, payload)
        : await api.post('/tier-lists', payload);
      const saved = response.data.tierList;
      setActiveListId(saved.id);
      setTitle(saved.title);
      setTiers(saved.tiers.map((tier) => ({ id: tier.id, name: tier.name, color: tier.color })));
      setSavedSignature(signatureOf(saved.title, saved.tiers, placements));
      savedQuery.refetch();
      toast.success(
        activeListId ? 'Your tier board was updated.' : 'Your tier board was saved.',
        activeListId ? 'Board updated' : 'Board saved',
      );
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const resetBoard = () => {
    const freshTiers = cloneTemplate();
    setTitle(DEFAULT_TITLE);
    setTiers(freshTiers);
    setPlacements({});
    setActiveListId(null);
    setSavedSignature(signatureOf(DEFAULT_TITLE, freshTiers, {}));
    setPoolSearch('');
  };

  const requestNew = () => {
    if (!dirty) {
      resetBoard();
      return;
    }
    setConfirm({
      title: 'Start a new board?',
      message: 'The current unsaved changes will be discarded. Saved boards stay in your archive.',
      confirmLabel: 'Start new',
      action: () => {
        resetBoard();
        setConfirm(null);
        toast.info('A fresh tier board is ready.', 'New board');
      },
    });
  };

  const handleLoad = async (id) => {
    if (loadingListId) return;
    if (dirty && activeListId !== id) {
      setConfirm({
        title: 'Load this saved board?',
        message: 'Your current unsaved changes will be replaced by the saved board.',
        confirmLabel: 'Load board',
        action: () => {
          setConfirm(null);
          void loadList(id);
        },
      });
      return;
    }
    await loadList(id);
  };

  const loadList = async (id) => {
    setLoadingListId(id);
    try {
      const response = await api.get(`/tier-lists/${id}`);
      const list = response.data.tierList;
      const nextTiers = list.tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        color: tier.color,
      }));
      const nextPlacements = {};
      for (const item of list.items) nextPlacements[item.characterId] = item.tierId;
      setTitle(list.title);
      setTiers(nextTiers);
      setPlacements(nextPlacements);
      setActiveListId(list.id);
      setSavedSignature(signatureOf(list.title, nextTiers, nextPlacements));
      toast.success(`“${list.title}” loaded.`, 'Board loaded');
    } catch (error) {
      toast.error(getApiError(error).message);
    } finally {
      setLoadingListId(null);
    }
  };

  const handleDeleteList = (list) => {
    setConfirm({
      title: `Delete “${list.title}”?`,
      message: 'This permanently removes the saved tier board from your account. This cannot be undone.',
      confirmLabel: 'Delete board',
      danger: true,
      action: async () => {
        try {
          await api.delete(`/tier-lists/${list.id}`);
          if (activeListId === list.id) resetBoard();
          savedQuery.refetch();
          toast.success('The saved board was deleted.', 'Board deleted');
        } catch (error) {
          toast.error(getApiError(error).message);
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const handleExport = async () => {
    if (!boardRef.current || exporting) return;
    if (!placedCount) {
      toast.info('Place at least one character before exporting.', 'Nothing to export');
      return;
    }
    setExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#070d18',
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const link = document.createElement('a');
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'animeverse-tier-list';
      link.download = `${slug}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('PNG exported to your downloads.', 'Export complete');
    } catch (error) {
      toast.error('The PNG export failed in this browser. Try again after scrolling to the top of the board.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="tierlist-toolbar glass">
        <div className="tierlist-meta">
          <span className="eyebrow">Board editor</span>
          <div className="tierlist-title-row">
            <h2>{title}</h2>
            <button
              type="button"
              className="icon-button icon-button-sm"
              onClick={() => setTitleModal(true)}
              aria-label="Rename tier board"
            >
              <Pencil size={14} />
            </button>
          </div>
          <div className="tierlist-status">
            <span className={`save-dot ${dirty ? 'is-dirty' : ''}`.trim()} aria-hidden="true" />
            {dirty ? 'Unsaved changes' : activeListId ? 'All changes saved' : 'New unsaved board'}
            <span className="meta-divider" aria-hidden="true">·</span>
            {placedCount} placed
            <span className="meta-divider" aria-hidden="true">·</span>
            {tiers.length} tiers
          </div>
        </div>
        <div className="tierlist-toolbar-actions">
          <Button variant="ghost" icon={FilePlus2} onClick={requestNew}>
            New board
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={handleExport}
            loading={exporting}
            disabled={!placedCount}
          >
            Export PNG
          </Button>
          <Button icon={Save} onClick={handleSave} loading={saving}>
            {activeListId ? 'Update board' : 'Save board'}
          </Button>
        </div>
      </div>

      <div className="tierlist-layout">
        <div className="tierlist-main">
          <div className="tierlist-board glass" ref={boardRef}>
            <div className="tierlist-board-head">
              <div>
                <span className="eyebrow">ANIMEVERSE tier list</span>
                <h2>{title}</h2>
              </div>
              <span className="tierlist-board-signature">
                Local board · {placedCount} characters · {formatDate(new Date())}
              </span>
            </div>

            {rosterQuery.loading ? (
              <div className="tierlist-loading">
                <Loader2 size={20} className="spin" aria-hidden="true" />
                Loading the roster…
              </div>
            ) : null}
            {rosterQuery.error ? (
              <ErrorState
                title="The roster could not load"
                error={rosterQuery.error}
                onRetry={rosterQuery.refetch}
              />
            ) : null}

            {!rosterQuery.loading && !rosterQuery.error
              ? tiers.map((tier) => (
                  <TierRow
                    key={tier.id}
                    tier={tier}
                    characters={byTier.get(tier.id) || []}
                    onEdit={(value) => setTierModal({ mode: 'edit', tier: value })}
                    onDelete={requestDeleteTier}
                    onRemoveCharacter={(id) => moveCharacter(id, null)}
                  />
                ))
              : null}

            <button
              type="button"
              className="add-tier-button"
              onClick={() => {
                if (tiers.length >= 14) {
                  toast.error('A board can hold at most 14 tiers.', 'Tier limit reached');
                  return;
                }
                setTierModal({ mode: 'create', tier: null });
              }}
              data-export-ignore="true"
            >
              <Plus size={15} aria-hidden="true" />
              Add tier
            </button>
          </div>

          <section className="pool-panel glass">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Unranked</span>
                <h2>Character pool</h2>
              </div>
              <span className="count-chip">{pool.length} available</span>
            </header>
            <div className="pool-tools">
              <SearchField
                value={poolSearch}
                onChange={setPoolSearch}
                placeholder="Find an unranked character…"
                label="Filter the unranked character pool"
                icon={Users}
              />
              <p>Drag a chip into any tier, or back here to unrank it.</p>
            </div>
            {!rosterQuery.loading && !rosterQuery.error ? (
              <PoolZone characters={pool} onRemoveCharacter={(id) => moveCharacter(id, null)} />
            ) : null}
          </section>
        </div>

        <aside className="tierlist-side">
          <section className="panel glass saved-boards">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Your archive</span>
                <h2>Saved boards</h2>
              </div>
              <ListOrdered size={18} aria-hidden="true" />
            </header>
            {savedQuery.loading ? <p className="panel-note">Loading saved boards…</p> : null}
            {savedQuery.error ? (
              <p className="panel-note">Saved boards could not load: {savedQuery.error.message}</p>
            ) : null}
            {!savedQuery.loading && !savedQuery.error && savedLists.length === 0 ? (
              <p className="panel-note">
                No saved boards yet. Arrange the roster and press “Save board”.
              </p>
            ) : null}
            <div className="saved-board-list">
              {savedLists.map((list) => (
                <article
                  key={list.id}
                  className={`saved-board-item ${activeListId === list.id ? 'is-active' : ''}`.trim()}
                >
                  <div className="saved-board-copy">
                    <strong>{list.title}</strong>
                    <small>
                      {list.itemCount} items · updated {formatDate(list.updatedAt)}
                    </small>
                  </div>
                  <div className="saved-board-actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleLoad(list.id)}
                      loading={loadingListId === list.id}
                    >
                      Load
                    </Button>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      onClick={() => handleDeleteList(list)}
                      aria-label={`Delete saved board ${list.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel glass tierlist-guide">
            <header className="panel-head">
              <div>
                <span className="eyebrow">How it works</span>
                <h2>Board guide</h2>
              </div>
              <Palette size={18} aria-hidden="true" />
            </header>
            <ul>
              <li>Drag a character chip into a tier, or between tiers.</li>
              <li>Drop a ranked chip into the pool to remove it from the board.</li>
              <li>Use the arrow keys while a chip is focused for keyboard drag; Enter drops.</li>
              <li>Rename tiers, change colours and add up to 14 bands.</li>
              <li>Saved boards belong to your account and persist in SQLite.</li>
              <li>PNG export captures the board only. Avatars rendered from placeholders are included.</li>
            </ul>
            <p className="tierlist-disclaimer">
              A tier board is a personal ranking, not an official statement about any series.
            </p>
            <Link to="/power-scaling" className="panel-link">
              Read the tier framework
            </Link>
          </section>

          <div className="tierlist-account-note">
            <span className="status-dot" aria-hidden="true" />
            Signed in as {user.name}
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? <CharacterChip character={activeDrag} overlay /> : null}
      </DragOverlay>

      {tierModal ? (
        <TierEditorModal
          mode={tierModal.mode}
          tier={tierModal.tier}
          tiers={tiers}
          onClose={() => setTierModal(null)}
          onSave={tierModal.mode === 'create' ? handleAddTier : handleEditTier}
        />
      ) : null}

      {titleModal ? (
        <TitleEditorModal
          title={title}
          onClose={() => setTitleModal(false)}
          onSave={(value) => {
            setTitle(value);
            setTitleModal(false);
          }}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </DndContext>
  );
}

export default function TierListPage() {
  useDocumentTitle('Tier List Maker');

  return (
    <div className="page tierlist-page">
      <PageHeader
        eyebrow="Curate the roster"
        icon={ListOrdered}
        title="Tier List Maker"
        description="Build your own ranking board with drag-and-drop tiers, custom colours and PNG export. Boards are saved to your account."
      />
      <AuthGate
        title="Sign in to build a tier list"
        description="Tier boards are private to each account and stored in the local database. Sign in to create, save and reload your boards."
      >
        <Workspace />
      </AuthGate>
    </div>
  );
}
