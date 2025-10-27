// if you run on local reverse proxy set to empty
const base = "";

const tabs = ["status", "games", "players", "api"];
const btns = document.querySelectorAll(".tab-btn");
const panels = {};

btns.forEach((btn) =>
    btn.addEventListener("click", () => selectTab(btn.dataset.tab))
);
tabs.forEach((t) => (panels[t] = document.getElementById(`tab-${t}`)));

// Selecting tabs
function selectTab(name) {
    btns.forEach((b) =>
        b.setAttribute("aria-selected", String(b.dataset.tab === name))
    );
    for (const t of tabs) {
        const el = panels[t];
        if (!el) continue;
        if (t === name) {
            el.classList.remove("hidden");
            el.animate(
                [
                    { opacity: 0, transform: "translateY(6px)" },
                    { opacity: 1, transform: "translateY(0)" },
                ],
                { duration: 220, easing: "ease-out" }
            );
        } else el.classList.add("hidden");
    }

    // Set spesific tabs title and load the page
    document.getElementById("pageTitle").textContent =
        name.charAt(0).toUpperCase() + name.slice(1);
    if (name === "games") loadCombinedReports();
    if (name === "players" && !allPlayers.length) loadPlayers();
    if (name === "status") loadStatus();
    const u = new URL(location.href);
    u.searchParams.set("tab", name);
    history.replaceState(null, "", u.toString());
}


// Status page
document
    .getElementById("statusRefresh")
    .addEventListener("click", loadStatus);
async function loadStatus() {
    try {
        // fetch data
        const res = await fetch(`${base}/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();

        // update the texts
        setText("serverVersion", d.serverVersion ?? "—");
        setText("onlineUsersCount", d.onlineUsersCount ?? "—");
        setText("onlineUsers", d.onlineUsers ?? "—");
        setText("queuedUsers", d.queuedUsers ?? "—");
        setText("activeGames", d.activeGames ?? "—");

        // live/idle on online players depending if anyones online
        const pill = document.getElementById("onlineUsersPill");
        const count = Number(d.onlineUsersCount || 0);
        pill.textContent = count > 0 ? "LIVE" : "IDLE";
        pill.className = `text-[10px] rounded-full px-2 py-0.5 border ${count > 0
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                : "bg-slate-500/15 text-slate-300 border-slate-500/20"
            }`;

        // uptime bar for future if we want it to show some uptime or smth
        // todo(Kaap0): server side logic
        document.getElementById("uptimeBar").style.width =
            Math.min(100, Number(d.uptimePct ?? 100)) + "%";
    } catch (e) {
        document.getElementById("statusBox").innerHTML = errorCard(e.message);
    }
}


// Games tab
document
    .getElementById("gameReportsRefresh")
    .addEventListener("click", loadCombinedReports);
async function loadCombinedReports() {
    const list = document.getElementById("gameReportsList");
    list.innerHTML = skeleton(5);
    try {
        // fect the games and reports
        const [gamesRes, reportsRes] = await Promise.all([
            fetch(`${base}/api/raw/games`),
            fetch(`${base}/api/raw/reports`),
        ]);
        if (!gamesRes.ok) throw new Error(`Games HTTP ${gamesRes.status}`);
        if (!reportsRes.ok)
            throw new Error(`Reports HTTP ${reportsRes.status}`);

        // make arrays of them
        const [games, reports] = await Promise.all([
            gamesRes.json(),
            reportsRes.json(),
        ]);
        const gamesMap = new Map();
        (Array.isArray(games) ? games : []).forEach((g) =>
            gamesMap.set(g.game_id, g)
        );
        const grouped = {};
        (Array.isArray(reports) ? reports : []).forEach((r) => {
            const gid = r.game_id;
            if (!grouped[gid]) grouped[gid] = [];
            grouped[gid].push(r);
        });
        const combined = [];

        // set the data for each entry
        for (const [gid, reps] of Object.entries(grouped)) {
            const g = gamesMap.get(Number(gid));
            combined.push({
                game_id: gid,
                fnsh: g?.fnsh,
                gtyp: g?.gtyp,
                venue: g?.venue,
                created_at: g?.created_at || reps[0]?.created_at,
                players: reps.length,
                totalGoals: reps.reduce((a, r) => a + (r.score || 0), 0),
                avgFps: (
                    reps.reduce((a, r) => a + (r.fpsavg || 0), 0) / reps.length
                ).toFixed(1),
                avgLatency: (
                    reps.reduce((a, r) => a + (r.lateavgnet || 0), 0) / reps.length
                ).toFixed(1),
                teams: reps.map((r) => ({
                    team_name: r.team_name,
                    score: r.score,
                    shots: r.shots,
                    hits: r.hits,
                    gamertag: r.gamertag,
                })),
                status: g?.fnsh ? "Finished" : "In Progress",
            });
        }

        // sort the list by date
        combined.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // populate the games to the site
        list.innerHTML = combined
            .slice(0, 30)
            .map(
                (g) => `
          <div class='rounded-xl border border-white/10 bg-white/5 p-4 lift'>
            <div class='flex items-center justify-between'>
              <div class='text-sm font-semibold'>Game #${g.game_id}</div>
              <span class='text-xs ${g.status === "Finished" ? "text-emerald-300" : "text-amber-300"
                    }'>${g.status}</span>
            </div>
            <div class='mt-1 text-xs text-slate-400'>Venue: ${val(
                        g.venue
                    )} • Type: ${val(g.gtyp)} • Players: ${val(g.players)}</div>
            <div class='mt-1 text-xs text-slate-500'>Created: ${safeDate(
                        g.created_at
                    )}</div>
            <div class='mt-3 grid grid-cols-2 gap-2 text-xs'>
              ${g.teams
                        .map(
                            (t) =>
                                `<div class='rounded-lg border border-white/10 bg-slate-900/50 p-2'><div class='font-semibold text-slate-100 truncate'>${escapeHtml(
                                    t.team_name || "—"
                                )}</div><div class='text-slate-400 text-[11px]'>${escapeHtml(
                                    t.gamertag
                                )} | Score:${t.score} | Shots:${t.shots} | Hits:${t.hits
                                }</div></div>`
                        )
                        .join("")}
            </div>
            <div class='mt-3 grid grid-cols-3 gap-2 text-[11px]'>${miniKpi(
                            "Total Goals",
                            g.totalGoals
                        )}${miniKpi("Avg FPS", g.avgFps)}${miniKpi(
                            "Avg Latency",
                            g.avgLatency + "ms"
                        )}</div>
          </div>`
            )
            .join("");
    } catch (e) {
        list.innerHTML = errorCard(e.message);
    }
}

// Players tab
let allPlayers = [];
document
    .getElementById("refreshBtn")
    .addEventListener("click", () => loadPlayers(true));
document
    .getElementById("copyJsonBtn")
    .addEventListener("click", copyProfile);
document
    .getElementById("searchInput")
    .addEventListener("input", () => renderPlayers(allPlayers));

const profileTabOverview = document.getElementById("profileTabOverview");
const profileTabRaw = document.getElementById("profileTabRaw");
const profileOverview = document.getElementById("profileOverview");
const profileRaw = document.getElementById("profileRaw");

profileTabOverview.addEventListener("click", () => {
    profileTabOverview.setAttribute("aria-selected", "true");
    profileTabRaw.removeAttribute("aria-selected");
    profileRaw.classList.add("hidden");
    profileOverview.classList.remove("hidden");
});
profileTabRaw.addEventListener("click", () => {
    profileTabRaw.setAttribute("aria-selected", "true");
    profileTabOverview.removeAttribute("aria-selected");
    profileOverview.classList.add("hidden");
    profileRaw.classList.remove("hidden");
});

async function loadPlayers(force = false) {
    // render the playerlist
    const list = document.getElementById("players");
    if (!force && allPlayers.length) {
        renderPlayers(allPlayers);
        return;
    }
    list.innerHTML = skeleton(6);
    try {
        // fetch players
        const res = await fetch(`${base}/api/players`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allPlayers = Array.isArray(data) ? data : [];

        // render playerlist
        renderPlayers(allPlayers);
        const u = new URL(location.href);
        const p = u.searchParams.get("player");
        if (p) loadProfile(p);
    } catch (e) {
        list.innerHTML = errorCard(e.message);
    }
}

function renderPlayers(list) {
    // is search being used if yes filter the list
    const term = document
        .getElementById("searchInput")
        .value?.trim()
        .toLowerCase();
    const filtered = term
        ? list.filter((n) => String(n).toLowerCase().includes(term))
        : list.slice();
    filtered.sort((a, b) => String(a).localeCompare(String(b)));

    // show the filtered players
    const html = filtered
        .map(
            (name) => `
        <button class='group flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm hover:bg-white/10 focus-ring lift' onclick='loadProfile("${escapeAttr(
                name
            )}")'>
          <span class='truncate font-medium flex items-center gap-2'>${avatar(
                escapeHtml(name)
            )}<span>${escapeHtml(name)}</span></span>
          <span class='text-xs text-slate-400 opacity-0 group-hover:opacity-100'>View →</span>
        </button>`
        )
        .join("");
    document.getElementById("players").innerHTML =
        html || emptyState("No players found.");
}

async function loadProfile(gamertag) {
    profileOverview.innerHTML = `<div class='text-sm text-slate-400 skeleton h-24 rounded-lg bg-white/5'></div>`;
    profileRaw.textContent = "Loading…";
    try {
        // fetch the profile data
        const res = await fetch(
            `${base}/api/player/${encodeURIComponent(gamertag)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // render profile
        renderProfileOverview(gamertag, data);
        profileRaw.textContent = JSON.stringify(data, null, 2);

        // set the player data to url href
        selectTab("players");
        const u = new URL(location.href);
        u.searchParams.set("player", gamertag);
        history.replaceState(null, "", u.toString());
    } catch (e) {
        profileOverview.innerHTML = errorCard(e.message);
        profileRaw.textContent = JSON.stringify(
            { error: "Couldn't load profile", details: String(e.message || e) },
            null,
            2
        );
    }
}

// func to render profile overview and data
function renderProfileOverview(name, data) {
    const flat = flattenObject(data || {});
    const title = escapeHtml(name);
    const main = document.createElement("div");
    main.className = "space-y-4";

    const rank = pick(flat, ["rank", "elo", "mmr", "level"]);
    const team = pick(flat, ["team", "team_name", "clan"]);
    const id = pick(flat, ["id", "uuid", "player_id", "steam_id"]);

    // render with the data passed to the function
    const header = document.createElement("div");
    header.className =
        "rounded-xl border border-white/10 bg-slate-900/60 p-4 lift";
    header.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            ${avatar(title, 48)}
            <div>
              <div class="text-lg font-semibold">${title}</div>
              <div class="text-xs text-slate-400">${team ? "Team: " + escapeHtml(team) : "No Team"
        }</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${id
            ? `<button class='px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-white/10' onclick="navigator.clipboard.writeText('${escapeAttr(
                String(id)
            )}').then(()=>toast('ID copied'))">Copy ID</button>`
            : ""
        }
            <button class='px-2 py-1 text-xs rounded-lg border border-white/10 bg-white/5 hover:bg-white/10' onclick="navigator.clipboard.writeText('${escapeAttr(
            title
        )}').then(()=>toast('Name copied'))">Copy Name</button>
          </div>
        </div>`;
    main.appendChild(header);

    const kpiWrap = document.createElement("div");
    kpiWrap.className = "grid grid-cols-2 sm:grid-cols-3 gap-3";
    const numericKeys = Object.keys(flat)
        .filter((k) => typeof flat[k] === "number")
        .slice(0, 9);
    if (numericKeys.length) {
        numericKeys.forEach((k) => {
            const v = flat[k];
            const card = document.createElement("div");
            card.className =
                "rounded-xl border border-white/10 bg-white/5 p-3 lift";
            card.innerHTML = `<div class='text-[11px] text-slate-400 uppercase tracking-wide'>${escapeHtml(
                prettyKey(k)
            )}</div>
                            <div class='mt-1 text-lg font-semibold'>${formatValue(
                v
            )}</div>
                            <div class='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
                              <div class='h-full w-[${barWidth(
                v
            )}%] bg-gradient-to-r from-blue-400 to-indigo-500'></div>
                            </div>`;
            kpiWrap.appendChild(card);
        });
        main.appendChild(kpiWrap);
    }

    const detailEntries = Object.entries(flat).filter(
        ([k, v]) => typeof v !== "object" && !String(k).startsWith("_")
    );
    if (detailEntries.length) {
        const details = document.createElement("div");
        details.className =
            "rounded-xl border border-white/10 bg-white/5 p-4 lift";
        details.innerHTML =
            `<div class='text-sm font-semibold mb-2'>Details</div>` +
            `<dl class='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm'>` +
            detailEntries
                .slice(0, 24)
                .map(
                    ([k, v]) => `
            <div class='flex items-center justify-between border-b border-white/5 pb-1'>
              <dt class='text-slate-400'>${escapeHtml(prettyKey(k))}</dt>
              <dd class='text-slate-100'>${escapeHtml(formatValue(v))}</dd>
            </div>`
                )
                .join("") +
            `</dl>`;
        main.appendChild(details);
    }

    const matches = data?.matches || data?.history || data?.recent || [];
    if (Array.isArray(matches) && matches.length) {
        const box = document.createElement("div");
        box.className =
            "rounded-xl border border-white/10 bg-white/5 p-4 lift";
        box.innerHTML =
            `<div class='text-sm font-semibold mb-2'>Recent Matches</div>` +
            `<div class='grid gap-2'>` +
            matches
                .slice(0, 10)
                .map(
                    (m, i) => `
            <div class='rounded-lg border border-white/10 bg-slate-900/50 p-3 flex items-center justify-between'>
              <div class='text-xs text-slate-300'>${escapeHtml(
                        m.map ? m.map : m.mode || "Match"
                    )} <span class='text-slate-500'>•</span> ${safeDate(
                        m.time || m.date || m.created_at
                    )}</div>
              <div class='text-xs ${Number(m.win) > 0 || m.result === "W"
                            ? "text-emerald-300"
                            : "text-rose-300"
                        }'>${m.result || (m.win ? "Win" : "Loss")}</div>
            </div>`
                )
                .join("") +
            `</div>`;
        main.appendChild(box);
    }

    profileOverview.replaceChildren(main);
    profileTabOverview.click();
}

// copy raw json to clipboard
async function copyProfile() {
    try {
        await navigator.clipboard.writeText(
            document.getElementById("profileRaw").textContent.trim()
        );
        toast("Copied JSON");
    } catch {
        toast("Copy failed");
    }
}

function skeleton(n = 3) {
    return `<div class='space-y-2'>${Array.from({ length: n })
        .map(() => `<div class="h-10 rounded-lg bg-white/5 skeleton"></div>`)
        .join("")}</div>`;
}
function emptyState(msg) {
    return `<div class='rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-400'>${msg}</div>`;
}
function errorCard(msg) {
    return `<div class='rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200'>${escapeHtml(
        msg
    )}</div>`;
}

// return a date fron passed argument
function safeDate(s) {
    try {
        const d = new Date(s);
        if (isNaN(d)) return s ?? "—";
        return d.toLocaleString();
    } catch {
        return s ?? "—";
    }
}
function val(x) {
    return x === null || x === undefined || x === "" ? "—" : x;
}

// fix symbols
function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
    return String(s).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// message
function toast(m) {
    const t = document.createElement("div");
    t.textContent = m;
    t.className =
        "fixed inset-x-0 top-3 z-50 mx-auto w-max rounded-xl bg-slate-900/90 px-4 py-2 text-sm text-slate-100 shadow-glow";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1500);
}

// set text content to V in element id ID
function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
}

// create a bad profile picture from initials
function avatar(text, size = 32) {
    const initials = String(text).trim().slice(0, 2).toUpperCase();
    return `<span class='inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-white/10 text-xs' style='height:${size}px;width:${size}px'>${initials}</span>`;
}
function statChip(label, value) {
    return `<div class='rounded-lg border border-white/10 bg-slate-900/50 p-2'><div class='text-[10px] uppercase tracking-wide text-slate-400'>${label}</div><div class='text-sm font-semibold'>${value}</div></div>`;
}
function miniKpi(label, value) {
    return `<div class='rounded-md border border-white/10 bg-white/5 px-2 py-1 flex items-center justify-between'><span class='text-slate-400'>${label}</span><span class='font-medium'>${value}</span></div>`;
}
function flattenObject(obj, prefix = "", out = {}) {
    Object.entries(obj || {}).forEach(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v))
            flattenObject(v, key, out);
        else out[key] = v;
    });
    return out;
}
function prettyKey(k) {
    return String(k)
        .split(".")
        .slice(-1)[0]
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
function pick(obj, keys) {
    for (const k of keys) {
        if (obj[k] != null) return obj[k];
    }
    return null;
}
function formatValue(v) {
    if (typeof v === "number") {
        return Number.isInteger(v) ? v : v.toFixed(2);
    }
    return String(v);
}
function barWidth(v) {
    if (typeof v !== "number") return 60;
    const x = Math.abs(v);
    return Math.max(8, Math.min(100, Math.round(x % 100)));
}

// called on start
(function init() {
    const u = new URL(location.href);
    const t = u.searchParams.get("tab");

    // navigate to default tab or if alreaysd uri passed one exists to that
    selectTab(tabs.includes(t) ? t : "status");
    loadStatus();
})();
