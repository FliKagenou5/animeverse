import { useCallback, useEffect, useState } from 'react';
import { api, getApiError } from '../api/client.js';

export function useApiQuery(url, params = {}, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && url));
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (!enabled || !url) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .get(url, { params, signal: controller.signal })
      .then((response) => {
        setData(response.data);
        setLoading(false);
      })
      .catch((requestError) => {
        if (requestError.code === 'ERR_CANCELED' || requestError.name === 'CanceledError') return;
        setError(getApiError(requestError));
        setLoading(false);
      });

    return () => controller.abort();
    // params are serialised so callers can pass an inline object safely
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, enabled, nonce]);

  return { data, loading, error, refetch, setData };
}
