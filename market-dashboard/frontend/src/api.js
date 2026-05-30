// API client. Paths are relative: in dev, Vite proxies /api -> Flask;
// in production Flask serves both the static build and the API.

async function jget(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export const getIndex = () => jget("/api/index");
export const getTrends = () => jget("/api/trends");
export const getVideo = (id) => jget(`/api/video/${id}`);

export async function refresh(body = {}) {
  const r = await fetch("/api/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `refresh -> ${r.status}`);
  return data;
}
