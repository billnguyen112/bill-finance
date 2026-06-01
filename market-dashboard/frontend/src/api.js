// Works in two modes:
//  - backend mode: a Flask server is running -> use /api/* (live refresh button)
//  - static mode (GitHub Pages): no server -> read the prebuilt snapshot.json /
//    history.json that the GitHub Action published next to index.html.

async function tryJson(paths) {
  let err;
  for (const p of paths) {
    try {
      const r = await fetch(p, { cache: "no-store" });
      if (r.ok) return await r.json();
      err = new Error(`${p} -> ${r.status}`);
    } catch (e) {
      err = e;
    }
  }
  throw err || new Error("no data source reachable");
}

// Relative paths (snapshot.json, history.json) resolve against the page URL,
// so they work under a GitHub Pages project subpath.
export const getSnapshot = () => tryJson(["/api/snapshot", "snapshot.json"]);
export const getHistory = () => tryJson(["/api/history", "history.json"]);
export const getSeries = (key) => tryJson([`/api/series/${key}`, `series/${key}.json`]);

export async function probeBackend() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    return r.ok;
  } catch {
    return false;
  }
}

export async function refresh() {
  const r = await fetch("/api/refresh", { method: "POST" });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || `refresh -> ${r.status}`);
  return data;
}

// On GitHub Pages, derive the repo's Actions URL so the "refresh" control can
// send the user to the manual "Run workflow" button.
export function actionsUrl() {
  const { hostname, pathname } = window.location;
  if (hostname.endsWith("github.io")) {
    const user = hostname.split(".")[0];
    const repo = pathname.split("/").filter(Boolean)[0];
    if (repo) return `https://github.com/${user}/${repo}/actions`;
  }
  return null;
}
