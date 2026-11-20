import { useEffect, useState } from "react";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    fetch(`/api${path}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json()).error ?? r.statusText))))
      .then((d) => live && setData(d as T))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [path]);
  return { data, error };
}
