import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Spinner } from './Spinner.jsx';

export function ArtImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  loading = 'lazy',
}) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  useEffect(() => {
    setStatus(src ? 'loading' : 'error');
  }, [src]);

  return (
    <div className={`art-image ${className}`.trim()}>
      {status !== 'error' && src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          className={`art-image-img ${imageClassName}`.trim()}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      ) : null}
      {status === 'loading' ? (
        <span className="art-image-state" aria-hidden="true">
          <Spinner size={20} />
        </span>
      ) : null}
      {status === 'error' ? (
        <span className="art-image-fallback" role="img" aria-label={`${alt} — artwork unavailable`}>
          <ImageOff size={22} aria-hidden="true" />
          <small>Artwork unavailable</small>
        </span>
      ) : null}
    </div>
  );
}
