import { useEffect, useMemo, useState } from 'react';
import { avatarGradient, initials } from '../../utils/format.js';

export function CharacterAvatar({
  character,
  size = 'md',
  className = '',
  loading = 'lazy',
}) {
  const [failed, setFailed] = useState(false);
  const name = character?.name || 'Unknown';
  const imageUrl = character?.imageUrl;
  const gradient = useMemo(
    () => avatarGradient(`${name}-${character?.anime?.title || character?.anime || ''}`),
    [name, character?.anime],
  );

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={`character-avatar avatar-${size} ${className}`.trim()}
      style={{ '--avatar-gradient': gradient }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={`${name} portrait`}
          loading={loading}
          onError={() => setFailed(true)}
          className="avatar-image"
        />
      ) : (
        <div
          className="avatar-fallback"
          role="img"
          aria-label={`${name} placeholder portrait`}
        >
          <span className="avatar-orbit" aria-hidden="true" />
          <span className="avatar-initials" aria-hidden="true">
            {initials(name)}
          </span>
        </div>
      )}
    </div>
  );
}
