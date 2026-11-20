import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Called on any 401 so the app can show the sign-in page. */
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") onUnauthorized();
    const issue = Array.isArray(data.issues) && data.issues[0] ? `: ${data.issues[0].path?.join(".")} ${data.issues[0].message}` : "";
    throw new ApiError(res.status, (data.error ?? res.statusText) + issue);
  }
  return data as T;
}

/** Load data for a page. `path` null means "not yet". `reload` fetches again. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setError(null);
    api<T>(path)
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [path, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, reload };
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-";

export const toDateInput = (d: string | null | undefined) => (d ? d.slice(0, 10) : "");

export const customerName = (c: { isCompany?: boolean; companyName?: string | null; firstName?: string | null; surname?: string | null }) =>
  c.companyName || [c.firstName, c.surname].filter(Boolean).join(" ") || "(no name)";
