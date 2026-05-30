// API client. In dev, Vite proxies /api -> Flask; in prod Flask serves both.
async function jget(path) {
  const r = await fetch(path);
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || `${path} -> ${r.status}`);
  }
  return r.json();
}

export const getSnapshot = () => jget("/api/snapshot");
export const getHistory = () => jget("/api/history");

export async function refresh() {
  const r = await fetch("/api/refresh", { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `refresh -> ${r.status}`);
  return data;
}
