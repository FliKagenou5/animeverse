import { Link } from 'react-router-dom';
import { CharacterAvatar } from './CharacterAvatar.jsx';
import { FavoriteButton } from './FavoriteButton.jsx';
import { TierBadge } from './TierBadge.jsx';
import { DataSourceBadge, StatusBadge } from '../ui/Badge.jsx';
import { clamp } from '../../utils/format.js';

const MINI_STATS = [
  { key: 'ap', label: 'AP' },
  { key: 'speed', label: 'Speed' },
  { key: 'durability', label: 'Durability' },
];

export function CharacterCard({ character }) {
  return (
    <article className="char-card">
      <div className="char-card-glow" aria-hidden="true" />
      <Link
        to={`/characters/${character.id}`}
        className="char-card-link"
        aria-label={`Open ${character.name}`}
      >
        <div className="char-card-head">
          <CharacterAvatar character={character} size="md" />
          <div className="char-card-identity">
            <span className="char-card-anime">{character.anime.title}</span>
            <h3>{character.name}</h3>
            <span className="char-card-alias">{character.alias || 'No alias listed'}</span>
          </div>
        </div>
        <div className="char-card-meta">
          <TierBadge tier={character.tier} />
          <DataSourceBadge source={character.dataSource} compact />
          <StatusBadge status={character.status} />
        </div>
        <div className="char-mini-stats">
          {MINI_STATS.map((stat) => {
            const value = character.stats[stat.key];
            return (
              <div className="mini-stat" key={stat.key}>
                <span>{stat.label}</span>
                <b>{value ?? '—'}</b>
                <div className="mini-track" aria-hidden="true">
                  <i
                    style={{
                      width: `${typeof value === 'number' ? clamp(value, 0, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Link>
      <FavoriteButton characterId={character.id} className="char-card-fav" />
    </article>
  );
}
