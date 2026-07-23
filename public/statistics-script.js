// ZamboniDevelopment - Website
// copyright all contributors

const App = (() => {
    const $ = id => document.getElementById(id);
    const CFG = {
        base: "https://zamboni.gg",
        servers: {
            nhl10:     { label: "NHL 10",     url: () => `/temp/status/nhl10` },
            nhl11:     { label: "NHL 11",     url: () => `/temp/status/nhl11` },
            nhl12:     { label: "NHL 12",     url: () => `/temp/status/nhl12` },
            nhl13:     { label: "NHL 13",     url: () => `/temp/status/nhl13` },
            nhl14:     { label: "NHL 14",     url: () => `/temp/status/nhl14` },
            nhl15:     { label: "NHL 15",     url: () => `/temp/status/nhl15` },
            nhllegacy: { label: "NHL Legacy", url: () => `/temp/status/nhllegacy` },
        },
        modes: {
            nhl10:     [],
            nhl11:     ["VS", "SO", "OTP"],
            nhl12:     ["VS", "SO"],
            nhl13:     ["VS", "SO"],
            nhl14:     ["VS", "SO"],
            nhl15:     ["VS", "SO"],
            nhllegacy: ["VS", "SO"],
        },
        hut: "hut12",
    };
    const STATE = {
        tab:         "status",
        gamesVer:   "nhllegacy",
        gamesMode:  "VS",
        gamesSort:  "date_desc",
        gamesSearch:"",
        gamesRaw:   [],
        playersVer: "nhllegacy",
        playersMode:"VS",
        lbVer:      "nhllegacy",
        lbRange:    "day",
        players:    [],
        profileName:null,
        hutView:    "overview",
        hutMgrScreen: "grid",
        hutMgrSort: "pucks_desc",
        hutManagers:[],
        hutManagerId:null,
        hutCards:   [],
        hutCardSort:"rating_desc",
        hutNameMap: new Map(),
        hutNamesReady:false,
        hutNamesLoading:false,
        hutMarket:  { state: "1", sort: "newest", trades: [], offset: 0, done: false, loading: false },
        cache:      new Map(),
    };



    const TTL = { status: 10000, games: 5000, players: 60000, profile: 30000, history: 15000, lb: 60000, hut: 30000, hutManagers: 60000, hutBoards: 60000, hutNames: 300000, hutMarket: 15000 };
    const str  = v => (typeof v === "string" && v.trim()) ? v.trim() : "-";
    const num  = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
    const esc  = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    const date = d => { try { return d ? new Date(d).toLocaleString() : "-"; } catch { return "-"; } };
    const arr  = v => Array.isArray(v) ? v.filter(x => x != null) : [];
    const obj  = v => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    const endpoint = (ver, path) => `${CFG.base}/${ver}${path}`;
    const fetchJSON = async (url, ttl = 8000) => {
        const hit = STATE.cache.get(url);
        if (hit && Date.now() - hit.t < ttl) return hit.d;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        STATE.cache.set(url, { t: Date.now(), d });
        return d;
    };
    const bust = url => { STATE.cache.delete(url); };
    const skelBlock = (h, w = "100%") =>
        `<span class="skel" style="display:block;height:${h}px;width:${w};border-radius:6px;"></span>`;
    const errBox = msg =>
        `<div class="err-box"><span>⚠</span><span>${esc(msg)}</span></div>`;
    const emptyState = (icon, text, hint = "") =>
        `<div class="empty-state"><span class="empty-icon">${icon}</span>${esc(text)}${hint ? `<span class="empty-hint">${esc(hint)}</span>` : ""}</div>`;
    const av = (name, size = 28) => {
        const init = String(name ?? "?").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
        return `<div class="player-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.36)}px;">${esc(init)}</div>`;
    };
    const statTile = (label, value, sub = "") =>
        `<div class="stat-tile"><div class="stat-label">${label}</div><div class="stat-val">${esc(String(value))}</div>${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ""}</div>`;

    const loadStatus = async (force = false) => {
        const grid = $("serverGrid");
        grid.innerHTML = Object.entries(CFG.servers).map(([k]) =>
            `<div class="server-card" id="sc-${k}">
                <div class="server-card-head">
                    <span class="server-name">${CFG.servers[k].label}</span>
                    ${skelBlock(20, "60px")}
                </div>
                <div class="server-stat-grid">
                    ${[1,2,3,4].map(() => `<div class="server-stat">${skelBlock(20)} </div>`).join("")}
                </div>
            </div>`
        ).join("");

        await Promise.allSettled(
            Object.entries(CFG.servers).map(async ([k, s]) => {
                const url = s.url(CFG.base);
                if (force) bust(url);
                const el = $(`sc-${k}`);
                try {
                    const d = await fetchJSON(url, TTL.status);
                    const players = typeof d.onlineUsers === "string" && d.onlineUsers.trim()
                        ? d.onlineUsers.split(",").map(p => p.trim()).filter(Boolean)
                        : [];
                    const playerChips = players.length
                        ? players.map(p => `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:5px;font-size:10px;color:var(--text-2);white-space:nowrap;"><span style="width:5px;height:5px;border-radius:50%;background:var(--green);box-shadow:0 0 4px rgba(34,197,94,.5);flex-shrink:0;display:inline-block;"></span>${esc(p)}</span>`).join("")
                        : `<span style="font-size:10px;color:var(--text-3);">No players online</span>`;
                    el.innerHTML = `
                        <div class="server-card-head">
                            <span class="server-name">${s.label}</span>
                            <span class="badge badge-on"><span class="dot dot-on"></span> Online</span>
                        </div>
                        <div class="server-stat-grid">
                            <div class="server-stat">
                                <div class="server-stat-label">Online</div>
                                <div class="server-stat-val">${num(d.onlineUsersCount)}</div>
                            </div>
                            <div class="server-stat">
                                <div class="server-stat-label">Active Games</div>
                                <div class="server-stat-val">${num(d.activeGames)}</div>
                            </div>
                            <div class="server-stat">
                                <div class="server-stat-label">Queued</div>
                                <div class="server-stat-val">${num(d.queuedUsers)}</div>
                            </div>
                            <div class="server-stat">
                                <div class="server-stat-label">Version</div>
                                <div class="server-stat-val" style="font-size:13px;padding-top:2px;">${esc(str(d.serverVersion))}</div>
                            </div>
                        </div>
                        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
                            <div style="font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Players Online</div>
                            <div style="display:flex;flex-wrap:wrap;gap:4px;">${playerChips}</div>
                        </div>`;
                } catch (e) {
                    el.innerHTML = `
                        <div class="server-card-head">
                            <span class="server-name">${s.label}</span>
                            <span class="badge badge-off"><span class="dot dot-off"></span> Unreachable/Offline</span>
                        </div>
                        <div style="padding-top:8px;font-size:11px;color:var(--text-3);">Server is unreachable. Please note not all server statuses work currently!</div>`;
                }
            })
        );
    };

    const extractGames = (data, ver, mode) => {
        const modes = CFG.modes[ver] || [];
        if (!modes.length) return arr(data);
        return arr(data?.[mode.toLowerCase()]);
    };

    // todo: more sorting ways? or just new way to make advanced filters as the data that could be filtered from the db via api is so much
    const sortGames = (games, sort) => {
        const g = games.slice();
        switch (sort) {
            case "date_asc":     return g.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case "goals_desc":   return g.sort((a, b) => num(b.totalGoals) - num(a.totalGoals));
            case "goals_asc":    return g.sort((a, b) => num(a.totalGoals) - num(b.totalGoals));
            case "score_desc":   return g.sort((a, b) => {
                const ts = x => arr(x.teams).reduce((s, t) => s + num(t.score), 0);
                return ts(b) - ts(a);
            });
            case "latency_asc":  return g.sort((a, b) => num(a.avgLatency) - num(b.avgLatency));
            case "latency_desc": return g.sort((a, b) => num(b.avgLatency) - num(a.avgLatency));
            case "fps_desc":     return g.sort((a, b) => num(b.avgFps) - num(a.avgFps));
            case "id_asc":       return g.sort((a, b) => num(a.game_id) - num(b.game_id));
            case "id_desc":      return g.sort((a, b) => num(b.game_id) - num(a.game_id));
            default:             return g.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    };

    const filterGames = (games, query) => {
        if (!query) return games;
        const q = query.toLowerCase();
        return games.filter(g => {
            if (String(g.game_id ?? "").includes(q)) return true;
            return arr(g.teams).some(t =>
                String(t.gamertag ?? "").toLowerCase().includes(q) ||
                String(t.team_name ?? "").toLowerCase().includes(q)
            );
        });
    };

    const renderGames = () => {
        const sorted   = sortGames(STATE.gamesRaw, STATE.gamesSort);
        const filtered = filterGames(sorted, STATE.gamesSearch);

        if (!filtered.length) {
            $("gamesList").innerHTML = emptyState("🔍", "No games match.", STATE.gamesSearch ? 'No results for "' + STATE.gamesSearch + '"' : "No recent games found.");
            return;
        }

        $("gamesList").innerHTML = '<div class="game-list">' + filtered.slice(0, 50).map(g => {
            const teams     = arr(g?.teams);
            const home      = obj(teams[0]);
            const away      = obj(teams[1]);
            const homeScore = num(home.score);
            const awayScore = num(away.score);
            const hasAway   = typeof away.gamertag === "string" && away.gamertag.trim();

            const shotsChip = home.shots != null
                ? '<div class="game-chip"><span>Shots</span><b>' + num(home.shots) + (hasAway ? " / " + num(away.shots) : "") + '</b></div>'
                : "";
            const hitsChip = home.hits != null
                ? '<div class="game-chip"><span>Hits</span><b>' + num(home.hits) + (hasAway ? " / " + num(away.hits) : "") + '</b></div>'
                : "";
            const awayBlock = hasAway
                ? '<div class="game-team">' + esc(str(away.gamertag)) + '</div><div class="game-team-sub">' + esc(str(away.team_name)) + '</div>'
                : '<div style="font-size:11px;color:var(--text-3);">Solo</div>';

            return '<div class="game-card fade-in">'
                + '<div class="game-top">'
                + '<span class="game-id">Game #' + esc(String(g.game_id ?? "?")) + '</span>'
                + '<div style="display:flex;align-items:center;gap:6px;">'
                + '<span style="font-size:10px;color:var(--text-3);">' + date(g.created_at) + '</span>'
                + '<span class="badge badge-b">' + esc(str(g.status)) + '</span>'
                + '</div></div>'
                + '<div class="game-score-row">'
                + '<div><div class="game-team">' + esc(str(home.gamertag)) + '</div><div class="game-team-sub">' + esc(str(home.team_name)) + '</div></div>'
                + '<div class="game-score">' + homeScore + (hasAway ? " - " + awayScore : "") + '</div>'
                + '<div class="game-team-r">' + awayBlock + '</div>'
                + '</div>'
                + '<div class="game-meta">'
                + '<div class="game-chip"><span>Goals</span><b>' + num(g.totalGoals) + '</b></div>'
                + '<div class="game-chip"><span>Avg FPS</span><b>' + (g.avgFps != null ? Math.round(num(g.avgFps)) : "-") + '</b></div>'
                + '<div class="game-chip"><span>Latency</span><b>' + (g.avgLatency != null ? Math.round(num(g.avgLatency)) + " ms" : "-") + '</b></div>'
                + shotsChip + hitsChip
                + '</div></div>';
        }).join("") + '</div>';
    };

    const loadGames = async (force = false) => {
        const ver  = STATE.gamesVer;
        const mode = STATE.gamesMode;
        const url  = endpoint(ver, "/api/games");
        if (force) bust(url);

        $("gamesList").innerHTML = emptyState("🏒", "Loading games...");

        try {
            const data  = await fetchJSON(url, TTL.games);
            STATE.gamesRaw = extractGames(data, ver, mode);

            if (!STATE.gamesRaw.length) {
                $("gamesList").innerHTML = emptyState("🏒", "No recent games found.", "Check back later or try a different mode.");
                return;
            }

            renderGames();

        } catch (e) {
            $("gamesList").innerHTML = errBox("Failed to load games. " + e.message);
        }
    };

    const loadPlayers = async (force = false) => {
        const ver = STATE.playersVer;
        const url = endpoint(ver, "/api/players");
        if (force) bust(url);

        if (!force && STATE.players.length) { renderPlayers(); return; }

        $("playerList").innerHTML = emptyState("👤", "Loading players...");

        try {
            const raw = await fetchJSON(url, TTL.players);
            STATE.players = arr(raw).filter(p => typeof p === "string" && p.trim());
            renderPlayers();
        } catch (e) {
            $("playerList").innerHTML = errBox(`Failed to load players. ${e.message}`);
        }
    };

    const renderPlayers = () => {
        const q    = ($("playerSearch")?.value ?? "").toLowerCase();
        const list = STATE.players.filter(p => p.toLowerCase().includes(q));

        if (!list.length) {
            $("playerList").innerHTML = emptyState("🔍", "No players found.", q ? `No results for "${q}"` : "");
            return;
        }

        $("playerList").innerHTML = list.map(p =>
            `<button class="player-btn ${STATE.profileName === p ? "active" : ""}" data-name="${esc(p)}">
                ${av(p)}
                <span class="player-name">${esc(p)}</span>
                <span class="player-arr">›</span>
            </button>`
        ).join("");
    };

    const loadProfile = async name => {
        STATE.profileName = name;
        renderPlayers();

        $("profileOverview").innerHTML = `
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    ${av(name, 46)}
                    <div>
                        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;">${esc(name)}</div>
                        ${skelBlock(12, "140px")}
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                    ${[1,2,3].map(() => skelBlock(58)).join("")}
                </div>
            </div>`;

        const ver = STATE.playersVer;

        try {
            const profileUrl = endpoint(ver, `/api/player/${encodeURIComponent(name)}`);
            const profile    = await fetchJSON(profileUrl, TTL.profile);

            if (!profile || typeof profile !== "object") throw new Error("Invalid profile response");

            const userId = profile.userId ?? profile.user_id ?? null;
            let historyRaw = null;

            if (userId != null) {
                const histUrl = endpoint(ver, `/api/user/${encodeURIComponent(userId)}/history`);
                historyRaw = await fetchJSON(histUrl, TTL.history).catch(() => null);
            }

            // todo: maybe some other stats later too??
            const modes      = CFG.modes[ver] || [];
            const isModern   = modes.length > 0;
            const hasOTP     = modes.includes("OTP");
            const totalGames = num(profile.totalGames);
            const totalGoals = num(profile.totalGoals);
            const avgGoals   = totalGames > 0 ? (totalGoals / totalGames).toFixed(2) : "0.00";

            const vs  = obj(profile?.VS);
            const so  = obj(profile?.SO);
            const otp = obj(profile?.OTP);

            const computeModeStats = (modeHistory) => {
                const h = arr(modeHistory);
                let wins = 0, losses = 0, draws = 0;
                let totalShots = 0, totalHits = 0, totalLatency = 0, latencyCount = 0;
                let ppGoals = 0, ppOpps = 0;
                h.forEach(r => {
                    const ps = num(r.scor ?? r.score);
                    const os = num(r.opponent_score);
                    if (ps > os) wins++;
                    else if (ps < os) losses++;
                    else draws++;
                    totalShots += num(r.shts ?? r.shots);
                    totalHits  += num(r.hits);
                    const lat = num(r.lateavgnet ?? r.latency);
                    if (lat > 0) { totalLatency += lat; latencyCount++; }
                    ppGoals += num(r.ppg);
                    ppOpps  += num(r.ppo);
                });
                const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : null;
                const ppPct = ppOpps > 0 ? ((ppGoals / ppOpps) * 100).toFixed(1) : null;
                return { wins, losses, draws, totalShots, totalHits, avgLatency, games: h.length, ppPct };
            };

            const vsHistory  = arr(historyRaw?.vs ?? historyRaw?.VS);
            const soHistory  = arr(historyRaw?.so ?? historyRaw?.SO);
            const otpHistory = arr(historyRaw?.otp ?? historyRaw?.OTP);

            const vsStats  = computeModeStats(vsHistory);
            const soStats  = computeModeStats(soHistory);
            const otpStats = computeModeStats(otpHistory);

            const modeBlock = (label, modeData, stats) => {
                if (!modeData || (!num(modeData.games) && !stats.games)) return "";
                const games = num(modeData.games) || stats.games;
                const goals = num(modeData.goals);
                const wlPct = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
                return `
                    <div style="background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">
                        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px;">${label}</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;">
                            ${statTile("Games", games)}
                            ${statTile("Goals", goals)}
                            ${stats.games > 0 ? statTile("W / L / D", `${stats.wins}/${stats.losses}/${stats.draws}`, `${wlPct}% win`) : ""}
                            ${stats.totalShots > 0 ? statTile("Shots", stats.totalShots) : ""}
                            ${stats.totalHits > 0 ? statTile("Hits", stats.totalHits) : ""}
                        </div>
                    </div>`;
            };

            const modeTiles = isModern ? `
                ${modeBlock("VS", vs, vsStats)}
                ${modeBlock("SO", so, soStats)}
                ${hasOTP ? modeBlock("OTP", otp, otpStats) : ""}
            ` : "";

            const mode = STATE.playersMode;
            let history = [];
            if (isModern && historyRaw) {
                history = arr(historyRaw?.[mode.toLowerCase()] ?? historyRaw?.[mode]);
            } else if (historyRaw) {
                history = arr(historyRaw);
            }
            history = history.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const matchCards = history.slice(0, 10).map(h => {
                const ps  = num(h.scor ?? h.score);
                const os  = num(h.opponent_score);
                const won = ps > os;
                const lost = ps < os;
                const color = won ? "#4ade80" : lost ? "#f87171" : "#fff";
                return `<div class="match-card">
                    <div class="match-score-row">
                        <div>
                            <div class="match-player">${esc(str(profile.playerName))}</div>
                            <div class="match-team">${esc(str(h.tnam ?? h.team_name))}</div>
                        </div>
                        <div class="match-score" style="color:${color};">${ps} - ${os}</div>
                        <div style="text-align:right;">
                            <div class="match-player match-player-r">${esc(str(h.opponent))}</div>
                            <div class="match-team">${esc(str(h.opponent_team))}</div>
                        </div>
                    </div>
                    <div class="match-date">${date(h.created_at)}</div>
                </div>`;
            }).join("");

            $("profileOverview").innerHTML = `
                <div style="display:flex;flex-direction:column;">
                    <div class="profile-header">
                        <div class="profile-av" style="width:46px;height:46px;font-size:16px;">${esc(String(str(profile.playerName)).slice(0,2).toUpperCase())}</div>
                        <div style="flex:1;min-width:0;">
                            <div class="profile-name">${esc(str(profile.playerName))}</div>
                            <div class="profile-meta">${totalGames} games - ${totalGoals} goals${userId != null ? ` - ID: ${esc(String(userId))}` : ""}</div>
                        </div>
                        <div style="display:flex;gap:5px;flex-shrink:0;">
                            <button class="btn" onclick="navigator.clipboard.writeText(${JSON.stringify(str(profile.playerName))})">Copy Name</button>
                            ${userId != null ? `<button class="btn" onclick="navigator.clipboard.writeText(${JSON.stringify(String(userId))})">Copy ID</button>` : ""}
                        </div>
                    </div>
                    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px;">
                        <div>
                            <div class="section-title">Stats</div>
                            ${isModern ? `<div style="display:flex;flex-direction:column;gap:8px;">${modeTiles}</div>` : ""}
                            <div class="stat-grid" style="${isModern ? "margin-top:10px;" : ""}">
                                ${statTile("Games Played", totalGames)}
                                ${statTile("Total Goals", totalGoals)}
                                ${statTile("Goals / Game", avgGoals)}
                                ${statTile("PP%", vsStats.ppPct != null ? vsStats.ppPct + "%" : "-")}
                            </div>
                        </div>
                        <div>
                            <div class="section-title">Recent Matches${isModern ? ` - ${mode}` : ""}</div>
                            ${history.length
                ? `<div class="match-list">${matchCards}</div>`
                : emptyState("📭", "No match history found.", "Play some games to see history here.")
            }
                        </div>
                    </div>
                </div>`;

        } catch (e) {
            console.error("[Profile]", e);
            $("profileOverview").innerHTML = errBox(`Could not load profile for "${name}". ${e.message}`);
        }
    };

    // todo: full rework coming at some point in the backend
    // todo: more real anfd acurate method to calculate these
    const loadLeaderboards = async (force = false) => {
        const ver   = STATE.lbVer;
        const range = STATE.lbRange;
        const url   = endpoint(ver, `/api/leaderboard/${range}`);
        if (force) bust(url);

        $("lbBody").innerHTML = `<div class="lb-grid">${[1,2,3].map(() => skelBlock(180)).join("")}</div>`;

        try {
            const raw  = await fetchJSON(url, TTL.lb);
            const data = arr(raw);
            const top5 = data.slice(0, 5);

            const rankClass = i => ["r1","r2","r3","",""][i] ?? "";

            const categories = [
                { label: "Total Goals",  val: p => num(p?.totalGoals) },
                { label: "Goals / Game", val: p => { const g = num(p?.gamesPlayed), gl = num(p?.totalGoals); return g > 0 ? (gl / g).toFixed(2) : "0.00"; } },
                { label: "Games Played", val: p => num(p?.gamesPlayed) },
            ];

            $("lbBody").innerHTML = `<div class="lb-grid">` + categories.map(cat =>
                `<div class="lb-card fade-in">
                    <div class="lb-head">${cat.label}</div>
                    ${top5.length
                    ? top5.map((p, i) => {
                        const tag = (p && typeof p === "object" && typeof p.gamertag === "string" && p.gamertag.trim()) ? p.gamertag : "-";
                        return `<div class="lb-row">
                                <span class="lb-rank ${rankClass(i)}">${i + 1}</span>
                                <span class="lb-name">${esc(tag)}</span>
                                <span class="lb-val">${cat.val(p)}</span>
                            </div>`;
                    }).join("")
                    : `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">No data available</div>`
                }
                </div>`
            ).join("") + `</div>`;

        } catch (e) {
            $("lbBody").innerHTML = errBox(`Failed to load leaderboards. ${e.message}`);
        }
    };

    const hutEndpoint = path => endpoint(CFG.hut, path);
    const hutNum = v => num(v).toLocaleString();
    const hutPct = v => `${(num(v) * 100).toFixed(1)}%`;
    const hutStr = v => (typeof v === "string" && v.trim()) ? v.trim() : "";
    const hutManagerName = m => str(m?.team_name ?? m?.teamName);
    const hutManagerAbbr = m => hutStr(m?.team_abbreviation ?? m?.teamAbbreviation).toUpperCase();
    const hutGamertag = userId => STATE.hutNameMap.get(String(userId)) ?? "";

    const hutManagerStatsUrl = hutEndpoint("/api/hut/stats/managers?sort=pucks&limit=500");

    const hutWilson = (wins, games) => {
        if (!games) return 0;
        const z = 1.96;
        const p = wins / games;
        return (p + (z * z) / (2 * games) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * games)) / games)) / (1 + (z * z) / games);
    };

    // todo: more reliable way as resolving HUT user ids to gamertags is lwk scuffed
    const hutNameVersions = ["nhl12", "nhl13", "nhl14", "nhl15", "nhllegacy", "nhl11", "nhl10"];

    const loadHutNames = async () => {
        if (STATE.hutNamesReady || STATE.hutNamesLoading) return;
        STATE.hutNamesLoading = true;

        try {
            const results = await Promise.allSettled(hutNameVersions.map(ver =>
                fetchJSON(endpoint(ver, "/api/reports/latest?limit=500"), TTL.hutNames)
            ));

            results.forEach(res => {
                if (res.status !== "fulfilled") return;
                arr(res.value).forEach(r => {
                    const row = obj(r);
                    const tag = hutStr(row.gamertag);
                    if (row.user_id != null && tag && !STATE.hutNameMap.has(String(row.user_id)))
                        STATE.hutNameMap.set(String(row.user_id), tag);
                });
            });

            STATE.hutNamesReady = true;
            applyHutNames();
        } catch (e) {
            console.error("[HUT Names]", e);
        } finally {
            STATE.hutNamesLoading = false;
        }
    };

    const hutNoTagHtml = () =>
        `no linked gamertag <span class="hut-help" tabindex="0" data-tip="Gamertags are read from the game report databases. Play at least one regular (non-HUT) online game in any NHL title on Zamboni and the gamertag links to this manager automatically. This is an beta thing and might not work perfectly.">?</span>`;

    const applyHutNames = () => {
        if (STATE.tab !== "hut-stats") return;
        if (STATE.hutView === "overview") loadHutOverview();
        if (STATE.hutView === "boards")   loadHutBoards();
        if (STATE.hutView === "managers" && STATE.hutMgrScreen === "grid") renderHutManagers();
        if (STATE.hutView === "market" && STATE.hutMarket.trades.length) renderHutMarket();
        const gamerEl = $("hutDetailGamer");
        if (gamerEl && STATE.hutManagerId != null) {
            const tag = hutGamertag(STATE.hutManagerId);
            gamerEl.innerHTML = tag ? `🎮 ${esc(tag)}` : hutNoTagHtml();
        }
    };

    const loadHutOverview = async (force = false) => {
        const el = $("hutViewOverview");
        const statusUrl     = hutEndpoint("/api/hut/status");
        const economyUrl    = hutEndpoint("/api/hut/stats/economy");
        const chemistryUrl = hutEndpoint("/api/hut/stats/squads/top?sort=chemistry&limit=5");
        if (force) { bust(statusUrl); bust(economyUrl); bust(formationsUrl); bust(hutManagerStatsUrl); }

        el.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div class="hut-hero-grid">${[1,2,3,4].map(() => skelBlock(72)).join("")}</div>
                <div class="hut-ov-grid">${[1,2].map(() => skelBlock(140)).join("")}</div>
                <div class="lb-grid">${[1,2,3].map(() => skelBlock(180)).join("")}</div>
            </div>`;

        try {
            const [status, economy, mgrStats, chemistry] = await Promise.all([
                fetchJSON(statusUrl, TTL.hut),
                fetchJSON(economyUrl, TTL.hut).catch(() => null),
                fetchJSON(hutManagerStatsUrl, TTL.hutBoards).catch(() => []),
                fetchJSON(chemistryUrl, TTL.hutBoards).catch(() => []),
            ]);

            const s = obj(status);
            const e = obj(economy);

            const hero = (icon, label, value, goto = "") => `
                <div class="hut-hero fade-in${goto ? " hut-hero-link" : ""}"${goto ? ` data-hut-goto="${goto}" title="Open ${goto}"` : ""}>
                    <div class="hut-hero-icon">${icon}</div>
                    <div style="min-width:0;">
                        <div class="hut-hero-val">${esc(String(value))}</div>
                        <div class="hut-hero-label">${esc(label)}</div>
                    </div>
                </div>`;

            const rankClass = i => ["r1","r2","r3","",""][i] ?? "";
            const miniBoard = (label, rows, goto) => `
                <div class="lb-card fade-in">
                    <div class="lb-head" style="display:flex;align-items:center;">${label}
                        <button class="btn" data-hut-goto="${goto}" style="margin-left:auto;font-size:10px;padding:3px 8px;">View all</button>
                    </div>
                    ${rows.length
                ? rows.map((r, i) => `<div class="lb-row">
                            <span class="lb-rank ${rankClass(i)}">${i + 1}</span>
                            <span class="lb-name">${esc(r.name)}${r.sub ? `<span class="lb-sub" style="display:block;">${esc(r.sub)}</span>` : ""}</span>
                            <span class="lb-val">${esc(r.val)}</span>
                        </div>`).join("")
                : `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">No data available</div>`
            }
                </div>`;

            const mgrs = arr(mgrStats).map(obj);
            const topPucks = mgrs.slice().sort((a, b) => num(b.pucks) - num(a.pucks)).slice(0, 5)
                .map(m => ({ name: str(m.teamName), sub: hutGamertag(m.userId) || hutStr(m.teamAbbreviation), val: hutNum(m.pucks) }));
            const topWins = mgrs.slice().sort((a, b) => num(b.wins) - num(a.wins)).filter(m => num(m.gamesPlayed) > 0).slice(0, 5)
                .map(m => ({ name: str(m.teamName), sub: `${num(m.wins)}-${num(m.losses)}-${num(m.otl)}`, val: hutNum(m.wins) }));
            const topChemistry = arr(chemistry).map(obj).slice(0, 5)
                .map(s => ({ name: str(s.squad_name), sub: `${hutStr(s.team_name)} • ★ ${num(s.star_rating)}`, val: `${hutNum(s.chemistry)} chem` }));

            el.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div class="hut-hero-grid">
                        ${hero("👥", "Managers", hutNum(s.managers), "managers")}
                        ${hero("🃏", "Owned Cards", hutNum(s.cards))}
                        ${hero("🪙", "Pucks in Circulation", hutNum(e.totalPucks))}
                        ${hero("🔨", "Open Trades", hutNum(s.openTrades), "market")}
                    </div>
                    <div class="hut-ov-grid">
                        <div class="card fade-in">
                            <div class="card-head"><span class="card-title">Database</span></div>
                            <div style="padding:12px 14px;">
                                <div class="stat-grid">
                                    ${statTile("Squads", hutNum(s.squads), `${hutNum(s.activeSquads)} active`)}
                                    ${statTile("Offers", hutNum(s.offers))}
                                    ${statTile("Tournaments", hutNum(s.tournaments))}
                                    ${statTile("Catalog Players", hutNum(s.catalogPlayers))}
                                </div>
                            </div>
                        </div>
                        <div class="card fade-in">
                            <div class="card-head"><span class="card-title">Economy</span></div>
                            <div style="padding:12px 14px;">
                                <div class="stat-grid">
                                    ${statTile("Avg Pucks", hutNum(e.avgPucks), "per manager")}
                                    ${statTile("Max Pucks", hutNum(e.maxPucks), "richest manager")}
                                    ${statTile("Active Listings", hutNum(e.activeListings), `${hutNum(e.totalListings)} all time`)}
                                    ${statTile("Avg Start Price", hutNum(e.avgStartingPrice))}
                                    ${statTile("Avg High Bid", hutNum(e.avgHighestBid))}
                                    ${statTile("Buyout Total", hutNum(e.sumBuyout), "active listings")}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="lb-grid">
                        ${miniBoard("Top Pucks", topPucks, "boards")}
                        ${miniBoard("Most Wins", topWins, "boards")}
                        ${miniBoard("Top Chemistry", topChemistry, "boards")}
                    </div>
                </div>`;

            loadHutNames();
        } catch (err) {
            el.innerHTML = errBox(`Failed to load HUT overview. ${err.message}`);
        }
    };

    const loadHutManagers = async (force = false) => {
        const url = hutEndpoint("/api/hut/managers");
        if (force) { bust(url); bust(hutManagerStatsUrl); }

        if (!force && STATE.hutManagers.length) { renderHutManagers(); loadHutNames(); return; }

        $("hutManagerGrid").innerHTML = `${[1,2,3,4,5,6].map(() => skelBlock(120)).join("")}`;
        $("hutMgrCount").textContent = "";

        try {
            const [rawList, rawStats] = await Promise.all([
                fetchJSON(url, TTL.hutManagers),
                fetchJSON(hutManagerStatsUrl, TTL.hutBoards).catch(() => []),
            ]);

            const recordMap = new Map(arr(rawStats).map(obj).map(r => [String(r.userId), r]));

            STATE.hutManagers = arr(rawList).filter(m => m && typeof m === "object").map(m => {
                const rec = obj(recordMap.get(String(m.user_id)));
                return {
                    userId: m.user_id,
                    teamName: hutManagerName(m),
                    abbr: hutManagerAbbr(m),
                    pucks: num(m.pucks),
                    wins: num(rec.wins),
                    losses: num(rec.losses),
                    otl: num(rec.otl),
                    games: num(rec.gamesPlayed),
                    points: num(rec.points),
                    winPct: num(rec.winPct),
                };
            });

            renderHutManagers();
            loadHutNames();
        } catch (e) {
            $("hutManagerGrid").innerHTML = `<div style="grid-column:1/-1;">${errBox(`Failed to load managers. ${e.message}`)}</div>`;
        }
    };

    const sortHutManagers = (list, sort) => {
        const l = list.slice();
        switch (sort) {
            case "pucks_asc":   return l.sort((a, b) => a.pucks - b.pucks);
            case "wins_desc":   return l.sort((a, b) => b.wins - a.wins || b.games - a.games);
            case "winpct_desc": return l.sort((a, b) => hutWilson(b.wins, b.games) - hutWilson(a.wins, a.games));
            case "games_desc":  return l.sort((a, b) => b.games - a.games);
            case "name_asc":    return l.sort((a, b) => a.teamName.localeCompare(b.teamName));
            case "id_asc":      return l.sort((a, b) => num(a.userId) - num(b.userId));
            case "id_desc":     return l.sort((a, b) => num(b.userId) - num(a.userId));
            default:            return l.sort((a, b) => b.pucks - a.pucks);
        }
    };

    const renderHutManagers = () => {
        const q = ($("hutManagerSearch")?.value ?? "").trim().toLowerCase();
        let list = STATE.hutManagers;

        if (q) {
            list = list.filter(m =>
                m.teamName.toLowerCase().includes(q) ||
                m.abbr.toLowerCase().includes(q) ||
                hutGamertag(m.userId).toLowerCase().includes(q) ||
                String(m.userId ?? "").includes(q)
            );
        }

        list = sortHutManagers(list, STATE.hutMgrSort);
        $("hutMgrCount").textContent = `${list.length} manager${list.length === 1 ? "" : "s"}`;

        if (!list.length) {
            $("hutManagerGrid").innerHTML = `<div style="grid-column:1/-1;">${emptyState("🔍", "No managers found.", q ? `No results for "${q}"` : "")}</div>`;
            return;
        }

        $("hutManagerGrid").innerHTML = list.map(m => {
            const tag = hutGamertag(m.userId);
            const winLabel = m.games > 0 ? hutPct(m.winPct) : "-";
            const gamerLine = tag
                ? `🎮 ${esc(tag)}`
                : `ID ${esc(String(m.userId))}${STATE.hutNamesReady ? " - no gamertag" : ""}`;
            return `<button class="hut-mgr-card fade-in" data-hut-user="${esc(String(m.userId))}">
                <div class="hut-mgr-top">
                    ${av(m.teamName, 38)}
                    <div style="flex:1;min-width:0;">
                        <div class="hut-mgr-name">${esc(m.teamName)}${m.abbr ? ` <span style="font-size:11px;color:var(--text-3);">${esc(m.abbr)}</span>` : ""}</div>
                        <div class="hut-mgr-gamer">${gamerLine}</div>
                    </div>
                    <span class="hut-mgr-arr">›</span>
                </div>
                <div class="hut-mgr-stats">
                    <div class="hut-mgr-stat"><span>Pucks</span><b>${hutNum(m.pucks)}</b></div>
                    <div class="hut-mgr-stat"><span>Record</span><b>${m.games > 0 ? `${m.wins}-${m.losses}-${m.otl}` : "-"}</b></div>
                    <div class="hut-mgr-stat"><span>Win %</span><b>${winLabel}</b></div>
                </div>
            </button>`;
        }).join("");
    };

    const showHutMgrGrid = () => {
        STATE.hutMgrScreen = "grid";
        STATE.hutManagerId = null;
        $("hutMgrToolbar").style.display = "";
        $("hutMgrGridWrap").style.display = "";
        $("hutManagerDetail").style.display = "none";
        $("hutManagerDetail").innerHTML = "";
    };

    const sortHutCards = (cards, sort) => {
        const c = cards.slice();
        switch (sort) {
            case "rating_asc": return c.sort((a, b) => num(a.rating) - num(b.rating));
            case "gp_desc":    return c.sort((a, b) => num(b.gamesPlayed) - num(a.gamesPlayed));
            case "uses_desc":  return c.sort((a, b) => num(b.usesRemaining) - num(a.usesRemaining));
            case "newest":     return c.sort((a, b) => new Date(b.dateIssued) - new Date(a.dateIssued));
            case "name_asc":   return c.sort((a, b) => (hutStr(a.name) || "zz").localeCompare(hutStr(b.name) || "zz"));
            case "salary_desc":return c.sort((a, b) => num(b.salaryCap) - num(a.salaryCap));
            default:           return c.sort((a, b) => num(b.rating) - num(a.rating));
        }
    };

    const renderHutCards = () => {
        const el = $("hutCardList");
        if (!el) return;

        const q = ($("hutCardSearch")?.value ?? "").trim().toLowerCase();
        let cards = STATE.hutCards;

        if (q) {
            cards = cards.filter(c =>
                (hutStr(c.name) || `Card #${c.dbId ?? ""}`).toLowerCase().includes(q) ||
                hutStr(c.position).toLowerCase() === q ||
                hutStr(c.deck).toLowerCase().includes(q) ||
                hutStr(c.state).toLowerCase().includes(q)
            );
        }

        cards = sortHutCards(cards, STATE.hutCardSort);
        const shown = cards.slice(0, 100);

        const countEl = $("hutCardCount");
        if (countEl) countEl.textContent = cards.length > shown.length ? `showing ${shown.length} of ${cards.length}` : `${cards.length} card${cards.length === 1 ? "" : "s"}`;

        if (!shown.length) {
            el.innerHTML = emptyState("🃏", "No cards match.", q ? `No results for "${q}"` : "This manager has no cards yet.");
            return;
        }

        el.innerHTML = shown.map(c => {
            const nm   = hutStr(c.name) || `Card #${c.dbId ?? "?"}`;
            const bits = [hutStr(c.position), hutStr(c.deck), hutStr(c.state)].filter(Boolean).join(" - ");
            const tags = [`<span class="hut-tag">${hutNum(c.gamesPlayed)} GP</span>`];
            if (c.usesRemaining != null) tags.push(`<span class="hut-tag">${hutNum(c.usesRemaining)} uses</span>`);
            if (c.rare === true || num(c.rare) > 0) tags.push(`<span class="hut-tag good">Rare</span>`);
            if (c.retired) tags.push(`<span class="hut-tag warn">Retired</span>`);
            if (num(c.injuryGames) > 0) tags.push(`<span class="hut-tag warn">Injured ${num(c.injuryGames)}g</span>`);
            return `<div class="hut-card-row">
                <div class="hut-rating ${num(c.rating) >= 85 ? "gold" : ""}">${num(c.rating) || "-"}</div>
                <div style="flex:1;min-width:0;">
                    <div class="hut-card-name">${esc(nm)}</div>
                    <div class="hut-card-sub">${esc(bits)}</div>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">${tags.join("")}</div>
            </div>`;
        }).join("");
    };

    const loadHutManager = async (userId, force = false) => {
        STATE.hutManagerId = String(userId);
        STATE.hutMgrScreen = "detail";
        STATE.hutCards     = [];
        STATE.hutCardSort  = "rating_desc";

        const profileUrl  = hutEndpoint(`/api/hut/manager/${encodeURIComponent(userId)}`);
        const cardsUrl    = hutEndpoint(`/api/hut/manager/${encodeURIComponent(userId)}/cards?limit=4000`); // 4k might not be enough dont know.
        const offersUrl   = hutEndpoint(`/api/hut/manager/${encodeURIComponent(userId)}/offers`);
        const watchingUrl = hutEndpoint(`/api/hut/manager/${encodeURIComponent(userId)}/watching`);
        if (force) [profileUrl, cardsUrl, offersUrl, watchingUrl].forEach(bust);

        $("hutMgrToolbar").style.display = "none";
        $("hutMgrGridWrap").style.display = "none";
        const detail = $("hutManagerDetail");
        detail.style.display = "";

        detail.innerHTML = `
            <button class="hut-back" data-hut-back>‹ All Managers</button>
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${skelBlock(78)}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;">
                    ${[1,2,3,4,5,6].map(() => skelBlock(58)).join("")}
                </div>
                ${skelBlock(120)}
            </div>`;

        try {
            const [profile, cardsRaw, offersRaw, watchingRaw] = await Promise.all([
                fetchJSON(profileUrl, TTL.hut),
                fetchJSON(cardsUrl, TTL.hut).catch(() => []),
                fetchJSON(offersUrl, TTL.hut).catch(() => []),
                fetchJSON(watchingUrl, TTL.hut).catch(() => []),
            ]);

            if (!profile || typeof profile !== "object") throw new Error("Invalid manager response");
            if (STATE.hutManagerId !== String(userId) || STATE.hutMgrScreen !== "detail") return;

            const gamer   = obj(profile.gamerInfo);
            const general = obj(profile.general);
            const record  = obj(profile.record);
            const squads  = arr(profile.squads);
            const cards   = arr(cardsRaw);
            const offers  = arr(offersRaw);
            const watching = arr(watchingRaw);

            STATE.hutCards = cards;

            const name  = str(gamer.team_name);
            const abbr  = hutStr(gamer.team_abbreviation).toUpperCase();
            const tag   = hutGamertag(userId);
            const pucks = general.pucks ?? gamer.pucks;
            const winPctLabel = `${(num(record.winPct) * 100).toFixed(1)}%`;

            const rated      = cards.filter(c => num(c.rating) > 0);
            const avgRating  = rated.length ? (rated.reduce((s, c) => s + num(c.rating), 0) / rated.length).toFixed(1) : "-";
            const bestCard   = rated.slice().sort((a, b) => num(b.rating) - num(a.rating))[0];
            const rareCount  = cards.filter(c => c.rare === true || num(c.rare) > 0).length;
            const listedCount = cards.filter(c => hutStr(c.state) === "InCardSell" || hutStr(c.state) === "ImprovedSale").length;
            const retiredCount = cards.filter(c => c.retired).length;
            const cardGames  = cards.reduce((s, c) => s + num(c.gamesPlayed), 0);
            const activeOffers = offers.filter(o => hutStr(o.state) === "Active").length;

            const squadRows = squads.map(s => `
                <div class="hut-squad-row">
                    <div class="hut-squad-name">${esc(str(s.squad_name))}</div>
                    <span class="hut-squad-stat">★ <b>${num(s.star_rating)}</b></span>
                    <span class="hut-squad-stat">OFF <b>${num(s.rating_off)}</b></span>
                    <span class="hut-squad-stat">DEF <b>${num(s.rating_def)}</b></span>
                    <span class="hut-squad-stat">GK <b>${num(s.rating_gk)}</b></span>
                    <span class="hut-squad-stat">CHEM <b>${num(s.chemistry)}</b></span>
                    ${s.active ? `<span class="hut-tag good">Active</span>` : ""}
                </div>`).join("");

            detail.innerHTML = `
                <button class="hut-back" data-hut-back>‹ All Managers</button>
                <div style="display:flex;flex-direction:column;gap:14px;">
                    <div class="hut-detail-head fade-in">
                        <div class="profile-av" style="width:52px;height:52px;font-size:18px;">${esc(String(name).replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?")}</div>
                        <div style="flex:1;min-width:0;">
                            <div class="profile-name">${esc(name)}${abbr ? ` <span style="font-size:12px;color:var(--text-2);">${esc(abbr)}</span>` : ""}</div>
                            <div class="profile-meta" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span class="hut-tag blue" id="hutDetailGamer" style="overflow:visible;">${tag ? `🎮 ${esc(tag)}` : (STATE.hutNamesReady ? hutNoTagHtml() : "resolving gamertag...")}</span>
                                <span>ID: ${esc(String(userId))}</span>
                            </div>
                        </div>
                        <div style="display:flex;gap:5px;flex-shrink:0;">
                            <button class="btn" onclick="navigator.clipboard.writeText(${JSON.stringify(String(userId))})">Copy ID</button>
                        </div>
                    </div>
                    <div class="fade-in">
                        <div class="section-title">Record</div>
                        <div class="stat-grid">
                            ${statTile("Pucks", hutNum(pucks))}
                            ${statTile("W / L / OTL", `${num(record.wins)}/${num(record.losses)}/${num(record.otl)}`, `${winPctLabel} win`)}
                            ${statTile("Games Played", hutNum(record.gamesPlayed))}
                            ${statTile("Points", hutNum(record.points))}
                            ${statTile("Squads", squads.length, `${squads.filter(s => s.active).length} active`)}
                        </div>
                    </div>
                    <div class="fade-in">
                        <div class="section-title">Collection & Market</div>
                        <div class="stat-grid">
                            ${statTile("Cards Owned", hutNum(profile.cardCount))}
                            ${statTile("Avg Card Rating", avgRating)}
                            ${bestCard ? statTile("Best Card", num(bestCard.rating), hutStr(bestCard.name) || `Card #${bestCard.dbId ?? "?"}`) : ""}
                            ${statTile("Rare Cards", hutNum(rareCount))}
                            ${statTile("Card Games", hutNum(cardGames), "total GP")}
                            ${statTile("Retired Cards", hutNum(retiredCount))}
                            ${statTile("Listed For Sale", hutNum(listedCount))}
                            ${statTile("Auction Offers", hutNum(offers.length), `${hutNum(activeOffers)} active`)}
                            ${statTile("Watching Trades", hutNum(watching.length))}
                        </div>
                    </div>
                    <div class="fade-in">
                        <div class="hut-section-row">
                            <div class="section-title">Squads</div>
                        </div>
                        ${squads.length
                ? `<div style="display:flex;flex-direction:column;gap:6px;">${squadRows}</div>`
                : emptyState("🧊", "No squads found.")
            }
                    </div>
                    <div class="fade-in">
                        <div class="hut-section-row">
                            <div class="section-title">Cards</div>
                            <span id="hutCardCount" style="font-size:11px;color:var(--text-3);"></span>
                            <input class="search" id="hutCardSearch" type="text" placeholder="Filter cards..." style="width:150px;">
                            <div class="dd">
                                <button class="dd-btn" id="hutCardSortBtn"><span id="hutCardSortLabel">Rating ↓</span><span class="dd-chevron">▼</span></button>
                                <div class="dd-menu" id="hutCardSortMenu">
                                    <div class="dd-item active" data-sort="rating_desc">Rating ↓</div>
                                    <div class="dd-item" data-sort="rating_asc">Rating ↑</div>
                                    <div class="dd-item" data-sort="gp_desc">Most Played</div>
                                    <div class="dd-item" data-sort="uses_desc">Most Uses Left</div>
                                    <div class="dd-item" data-sort="newest">Newest</div>
                                    <div class="dd-item" data-sort="name_asc">Name A-Z</div>
                                    <div class="dd-item" data-sort="salary_desc">Salary ↓</div>
                                </div>
                            </div>
                        </div>
                        <div id="hutCardList" style="display:flex;flex-direction:column;gap:6px;"></div>
                    </div>
                </div>`;

            setupDd("hutCardSortBtn", "hutCardSortMenu", (sort, label) => {
                STATE.hutCardSort = sort;
                $("hutCardSortLabel").textContent = label;
                renderHutCards();
            });
            $("hutCardSearch")?.addEventListener("input", renderHutCards);

            renderHutCards();
            loadHutNames();

        } catch (e) {
            console.error("[HUT Manager]", e);
            detail.innerHTML = `
                <button class="hut-back" data-hut-back>‹ All Managers</button>
                ${errBox(`Could not load manager ${userId}. ${e.message}`)}`;
        }
    };

    const loadHutBoards = async (force = false) => {
        const el = $("hutViewBoards");

        const ownedUrl      = hutEndpoint("/api/hut/stats/cards/most-owned?limit=10");
        const playedUrl     = hutEndpoint("/api/hut/stats/cards/most-played?limit=10");
        const squadsStarUrl = hutEndpoint("/api/hut/stats/squads/top?sort=star&limit=10");
        const squadsChemUrl = hutEndpoint("/api/hut/stats/squads/top?sort=chemistry&limit=10");
        const formationsUrl = hutEndpoint("/api/hut/stats/squads/formations");

        if (force) [hutManagerStatsUrl, ownedUrl, playedUrl, squadsStarUrl, squadsChemUrl, formationsUrl].forEach(bust);

        el.innerHTML = `<div class="lb-grid">${[1,2,3,4,5,6,7,8,9].map(() => skelBlock(180)).join("")}</div>`;

        const [mgrRes, ownedRes, playedRes, starRes, chemRes, formRes] = await Promise.allSettled([
            fetchJSON(hutManagerStatsUrl, TTL.hutBoards),
            fetchJSON(ownedUrl, TTL.hutBoards),
            fetchJSON(playedUrl, TTL.hutBoards),
            fetchJSON(squadsStarUrl, TTL.hutBoards),
            fetchJSON(squadsChemUrl, TTL.hutBoards),
            fetchJSON(formationsUrl, TTL.hutBoards),
        ]);

        const ok   = res => res.status === "fulfilled" ? arr(res.value).map(obj) : null;
        const mgrs = ok(mgrRes);
        const mgrSub = m => {
            const tag = hutGamertag(m.userId);
            const rec = num(m.gamesPlayed) > 0 ? `${num(m.wins)}-${num(m.losses)}-${num(m.otl)} - ${num(m.gamesPlayed)} games` : "no games";
            return tag ? `${tag} - ${rec}` : rec;
        };

        const mgrBoard = (sortFn, filterFn, valFn) => mgrs
            ? mgrs.filter(filterFn).sort(sortFn).slice(0, 10).map(m => ({ name: str(m.teamName), sub: mgrSub(m), val: valFn(m) }))
            : null;

        const boards = [
            { group: "Managers", label: "Top Pucks",
                rows: mgrBoard((a, b) => num(b.pucks) - num(a.pucks), () => true, m => hutNum(m.pucks)) },
            { group: "Managers", label: "Most Wins",
                rows: mgrBoard((a, b) => num(b.wins) - num(a.wins), m => num(m.gamesPlayed) > 0, m => hutNum(m.wins)) },
            { group: "Managers", label: "Best Win % (weighted)",
                rows: mgrBoard((a, b) => hutWilson(num(b.wins), num(b.gamesPlayed)) - hutWilson(num(a.wins), num(a.gamesPlayed)), m => num(m.gamesPlayed) > 0, m => hutPct(m.winPct)) },
            { group: "Managers", label: "Most Points",
                rows: mgrBoard((a, b) => num(b.points) - num(a.points), m => num(m.gamesPlayed) > 0, m => hutNum(m.points)) },
            { group: "Managers", label: "Most Games",
                rows: mgrBoard((a, b) => num(b.gamesPlayed) - num(a.gamesPlayed), m => num(m.gamesPlayed) > 0, m => hutNum(m.gamesPlayed)) },
            { group: "Cards", label: "Most Owned",
                rows: ok(ownedRes)?.map(r => ({ name: str(r.name), sub: `${num(r.rating)} OVR ${hutStr(r.position)} - ${num(r.owners)} owners`, val: `${hutNum(r.copies)}x` })) },
            { group: "Cards", label: "Most Played",
                rows: ok(playedRes)?.map(r => ({ name: str(r.name), sub: `${num(r.rating)} OVR - ${num(r.copies)} copies`, val: `${hutNum(r.totalGamesPlayed)} GP` })) },
            { group: "Squads", label: "Top Squads",
                rows: ok(starRes)?.map(r => ({ name: str(r.squad_name), sub: `${hutStr(r.team_name)}${r.active ? " - active" : ""}`, val: `★ ${num(r.star_rating)}` })) },
            { group: "Squads", label: "Best Chemistry",
                rows: ok(chemRes)?.map(r => ({ name: str(r.squad_name), sub: `${hutStr(r.team_name)} - ★ ${num(r.star_rating)}`, val: hutNum(r.chemistry) })) },
            { group: "Squads", label: "Popular Formations",
                rows: ok(formRes)?.map(r => ({ name: `Formation ${num(r.formation_id)}`, sub: `★ ${num(r.avg_star_rating)} avg - ${num(r.avg_chemistry)} chem`, val: `${hutNum(r.squads)} squads` })) },
        ];

        const rankClass = i => ["r1","r2","r3","",""][i] ?? "";
        const boardCard = b => {
            let body;
            if (b.rows === null || b.rows === undefined) {
                body = `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">Failed to load</div>`;
            } else if (!b.rows.length) {
                body = `<div style="padding:20px;text-align:center;color:var(--text-3);font-size:12px;">No data available</div>`;
            } else {
                body = b.rows.slice(0, 10).map((d, i) => `<div class="lb-row">
                    <span class="lb-rank ${rankClass(i)}">${i + 1}</span>
                    <span class="lb-name">${esc(d.name)}${d.sub ? `<span class="lb-sub" style="display:block;">${esc(d.sub)}</span>` : ""}</span>
                    <span class="lb-val">${esc(d.val)}</span>
                </div>`).join("");
            }
            return `<div class="lb-card fade-in"><div class="lb-head">${b.label}</div>${body}</div>`;
        };

        const groups = ["Managers", "Cards", "Squads"];
        el.innerHTML = groups.map(g => `
            <div class="section-title" style="margin-top:${g === groups[0] ? "0" : "14px"};">${g}</div>
            <div class="lb-grid">${boards.filter(b => b.group === g).map(boardCard).join("")}</div>
        `).join("");

        loadHutNames();
    };

    const HUT_MKT_PAGE = 50;

    const hutTradeEndsIn = t => {
        if (!num(t.durationSeconds)) return "";
        const end = (num(t.createdAtSeconds) + num(t.durationSeconds)) * 1000;
        const diff = end - Date.now();
        if (diff <= 0) return "ended";
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `ends in ${h}h ${m}m` : `ends in ${m}m`;
    };

    const hutTradeDate = s => {
        const d = new Date(num(s) * 1000);
        return isNaN(d.getTime()) || !num(s) ? "" : d.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    };

    const hutMarketUrl = offset => hutEndpoint(`/api/hut/market/trades?state=${STATE.hutMarket.state}&limit=${HUT_MKT_PAGE}&offset=${offset}`);

    const loadHutMarket = async (force = false) => {
        const mkt = STATE.hutMarket;
        if (mkt.loading) return;

        if (force || !mkt.trades.length) {
            mkt.trades = [];
            mkt.offset = 0;
            mkt.done   = false;
            if (force) {
                for (const k of [...STATE.cache.keys()]) {
                    if (k.includes("/api/hut/market/")) STATE.cache.delete(k);
                }
            }
            $("hutMarketList").innerHTML = `${[1,2,3,4,5].map(() => skelBlock(52)).join("")}`;
            $("hutMarketMore").style.display = "none";
            await fetchHutMarketPage();
        } else {
            renderHutMarket();
        }
    };

    const fetchHutMarketPage = async () => {
        const mkt = STATE.hutMarket;
        mkt.loading = true;
        $("hutMarketMore").textContent = "Loading...";

        try {
            const rows = arr(await fetchJSON(hutMarketUrl(mkt.offset), TTL.hutMarket)).map(obj);
            mkt.trades = mkt.trades.concat(rows);
            mkt.offset += rows.length;
            if (rows.length < HUT_MKT_PAGE) mkt.done = true;
            renderHutMarket();
            loadHutNames();
        } catch (e) {
            $("hutMarketList").innerHTML = errBox(`Failed to load market. ${e.message}`);
            $("hutMarketMore").style.display = "none";
        } finally {
            mkt.loading = false;
            $("hutMarketMore").textContent = "Load more";
        }
    };

    const sortHutTrades = (trades, sort) => {
        const t = trades.slice();
        const endsAt = x => num(x.createdAtSeconds) + num(x.durationSeconds);
        switch (sort) {
            case "ending":      return t.sort((a, b) => endsAt(a) - endsAt(b));
            case "bid_desc":    return t.sort((a, b) => num(b.highestBid) - num(a.highestBid));
            case "buyout_desc": return t.sort((a, b) => num(b.buyOutPrice) - num(a.buyOutPrice));
            case "rating_desc": return t.sort((a, b) => num(b.rating) - num(a.rating));
            default:            return t.sort((a, b) => num(b.tradeId) - num(a.tradeId));
        }
    };

    const renderHutMarket = () => {
        const mkt = STATE.hutMarket;
        const q = ($("hutMktSearch")?.value ?? "").trim().toLowerCase();

        let trades = mkt.trades;
        if (q) {
            trades = trades.filter(t =>
                hutStr(t.player).toLowerCase().includes(q) ||
                hutStr(t.sellerName).toLowerCase().includes(q) ||
                hutGamertag(t.sellerId).toLowerCase().includes(q)
            );
        }
        trades = sortHutTrades(trades, mkt.sort);

        $("hutMktCount").textContent = `${trades.length} trade${trades.length === 1 ? "" : "s"}${mkt.done ? "" : " loaded"}`;
        $("hutMarketMore").style.display = mkt.done ? "none" : "";

        if (!trades.length) {
            $("hutMarketList").innerHTML = emptyState("🔨", "No trades found.", q ? `No results for "${q}"` : "The auction house is quiet right now. New listings show up here automatically.");
            return;
        }

        const stateTag = s => {
            const name = hutStr(s) || "Unknown";
            const cls = name === "Active" ? "good" : (name === "Canceled" || name === "Expired") ? "warn" : "blue";
            return `<span class="hut-tag ${cls}">${esc(name)}</span>`;
        };

        $("hutMarketList").innerHTML = trades.map(t => {
            const player = hutStr(t.player) || `Card #${t.cardId ?? "?"}`;
            const seller = hutStr(t.sellerName) || hutGamertag(t.sellerId) || `User ${t.sellerId ?? "?"}`;
            const listed = hutTradeDate(t.createdAtSeconds);
            const ends   = hutStr(t.state) === "Active" ? hutTradeEndsIn(t) : "";
            return `<div class="hut-trade fade-in">
                <div class="hut-trade-row" data-trade="${esc(String(t.tradeId))}">
                    <div class="hut-rating ${num(t.rating) >= 85 ? "gold" : ""}">${num(t.rating) || "-"}</div>
                    <div style="flex:1;min-width:120px;">
                        <div class="hut-card-name">${esc(player)}${hutStr(t.position) ? ` <span style="color:var(--text-3);font-size:10px;">${esc(hutStr(t.position))}</span>` : ""}</div>
                        <div class="hut-card-sub">Seller: ${esc(seller)}${listed ? ` - listed ${esc(listed)}` : ""}</div>
                    </div>
                    <div class="hut-trade-prices">
                        <span class="hut-price">Start <b>${hutNum(t.startingPrice)}</b></span>
                        <span class="hut-price">Bid <b>${num(t.highestBid) > 0 ? hutNum(t.highestBid) : "-"}</b></span>
                        <span class="hut-price">Buyout <b>${num(t.buyOutPrice) > 0 ? hutNum(t.buyOutPrice) : "-"}</b></span>
                    </div>
                    ${ends ? `<span class="hut-trade-ends">${esc(ends)}</span>` : ""}
                    ${stateTag(t.state)}
                    <span class="hut-mgr-arr" style="align-self:center;">›</span>
                </div>
                <div class="hut-trade-detail" id="hutTradeDetail-${esc(String(t.tradeId))}" style="display:none;"></div>
            </div>`;
        }).join("");
    };

    const toggleHutTrade = async tradeId => {
        const box = $(`hutTradeDetail-${tradeId}`);
        if (!box) return;

        if (box.style.display !== "none") { box.style.display = "none"; return; }
        box.style.display = "";
        if (box.dataset.loaded) return;

        box.innerHTML = skelBlock(56);

        try {
            const d = obj(await fetchJSON(hutEndpoint(`/api/hut/market/trade/${encodeURIComponent(tradeId)}`), TTL.hutMarket));
            const offers = arr(d.offers).map(obj);

            const offerRows = offers.map(o => {
                const bidder = hutGamertag(o.bidderId) || `User ${o.bidderId ?? "?"}`;
                const cardCount = Array.isArray(o.cardIds) ? o.cardIds.length : 0;
                const when = hutTradeDate(o.createdAtSeconds);
                return `<div class="hut-offer-row">
                    <span style="flex:1;min-width:90px;">${esc(bidder)}</span>
                    <b>${hutNum(o.credits)} pucks</b>
                    ${cardCount ? `<span class="hut-tag">+${cardCount} card${cardCount === 1 ? "" : "s"}</span>` : ""}
                    <span class="hut-tag ${hutStr(o.state) === "WinningBid" || hutStr(o.state) === "Accepted" ? "good" : hutStr(o.state) === "Active" ? "blue" : ""}">${esc(hutStr(o.state) || "Unknown")}</span>
                    ${when ? `<span style="font-size:10px;color:var(--text-3);">${esc(when)}</span>` : ""}
                </div>`;
            }).join("");

            box.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:${offers.length ? "8px" : "0"};">
                    <span class="hut-tag">👁 ${hutNum(d.watchers)} watching</span>
                    <span class="hut-tag">${hutNum(offers.length)} bid${offers.length === 1 ? "" : "s"}</span>
                </div>
                ${offers.length ? `<div style="display:flex;flex-direction:column;gap:5px;">${offerRows}</div>` : `<div style="font-size:11px;color:var(--text-3);">No bids on this trade yet.</div>`}`;
            box.dataset.loaded = "1";
        } catch (e) {
            box.innerHTML = errBox(`Could not load trade ${tradeId}. ${e.message}`);
        }
    };

    const loadHutTab = (force = false) => {
        if (STATE.hutView === "overview") loadHutOverview(force);
        if (STATE.hutView === "managers") loadHutManagers(force);
        if (STATE.hutView === "market")   loadHutMarket(force);
        if (STATE.hutView === "boards")   loadHutBoards(force);
    };

    const selectHutView = view => {
        STATE.hutView = view;
        $("hutViewGroup").querySelectorAll(".btn-seg").forEach(b => b.classList.toggle("active", b.dataset.hutView === view));
        $("hutViewOverview").classList.toggle("active", view === "overview");
        $("hutViewManagers").classList.toggle("active", view === "managers");
        $("hutViewMarket").classList.toggle("active", view === "market");
        $("hutViewBoards").classList.toggle("active", view === "boards");
        loadHutTab();
    };

    const selectTab = tab => {
        STATE.tab = tab;
        document.querySelectorAll(".nav-btn[data-tab]").forEach(b =>
            b.classList.toggle("active", b.dataset.tab === tab)
        );
        document.querySelectorAll(".mob-nav-btn[data-tab]").forEach(b =>
            b.classList.toggle("active", b.dataset.tab === tab)
        );
        document.querySelectorAll(".panel").forEach(p =>
            p.classList.toggle("active", p.id === `panel-${tab}`)
        );

        if (tab === "status")       loadStatus();
        if (tab === "games")        loadGames();
        if (tab === "players")      loadPlayers();
        if (tab === "leaderboards") loadLeaderboards();
        if (tab === "hut-stats")    loadHutTab();
    };

    const setupDd = (btnId, menuId, onSelect) => {
        const btn  = $(btnId);
        const menu = $(menuId);
        if (!btn || !menu) return;

        btn.addEventListener("click", e => {
            e.stopPropagation();
            const open = menu.classList.contains("open");
            closeAllDd();
            if (!open) { menu.classList.add("open"); btn.classList.add("open"); }
        });

        menu.querySelectorAll("[data-value],[data-mode],[data-sort]").forEach(item => {
            item.addEventListener("click", () => {
                menu.querySelectorAll(".dd-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                closeAllDd();
                onSelect(item.dataset.value ?? item.dataset.mode ?? item.dataset.sort, item.textContent.trim());
            });
        });
    };

    const closeAllDd = () => {
        document.querySelectorAll(".dd-menu.open").forEach(m => m.classList.remove("open"));
        document.querySelectorAll(".dd-btn.open").forEach(b => b.classList.remove("open"));
    };

    const updateModeVisibility = (ver, sectionId, btnId, labelId, menuId) => {
        const modes   = CFG.modes[ver] || [];
        const section = $(sectionId);
        if (!section) return;

        if (modes.length) {
            section.style.display = "";
            const menu = $(menuId);
            if (menu) {
                menu.querySelectorAll("[data-mode]").forEach(item => {
                    item.hidden = !modes.includes(item.dataset.mode);
                });
                const first = modes[0];
                const label = $(labelId);
                if (label) label.textContent = first;
                menu.querySelectorAll(".dd-item").forEach(i => i.classList.toggle("active", i.dataset.mode === first));
            }
        } else {
            section.style.display = "none";
        }
    };

    const openSidebar  = () => { $("sidebar").classList.add("mob-open"); $("overlay").classList.add("show"); };
    const closeSidebar = () => { $("sidebar").classList.remove("mob-open"); $("overlay").classList.remove("show"); };

    const init = () => {

        document.addEventListener("click", closeAllDd);

        $("mobMenuBtn")?.addEventListener("click", e => { e.stopPropagation(); openSidebar(); });
        $("overlay")?.addEventListener("click", closeSidebar);

        document.querySelectorAll(".nav-btn[data-tab]").forEach(b =>
            b.addEventListener("click", () => { selectTab(b.dataset.tab); closeSidebar(); })
        );

        document.querySelectorAll(".mob-nav-btn[data-tab]").forEach(b =>
            b.addEventListener("click", () => selectTab(b.dataset.tab))
        );

        $("statusRefresh")?.addEventListener("click", () => loadStatus(true));
        $("gamesRefresh")?.addEventListener("click",  () => loadGames(true));
        $("playersRefresh")?.addEventListener("click", () => { STATE.players = []; loadPlayers(true); });

        $("playerSearch")?.addEventListener("input", renderPlayers);

        $("playerList")?.addEventListener("click", e => {
            const btn = e.target.closest("[data-name]");
            if (btn) loadProfile(btn.dataset.name);
        });

        setupDd("gamesVersionBtn", "gamesVersionMenu", (val, label) => {
            STATE.gamesVer  = val;
            STATE.gamesMode = "VS";
            $("gamesVersionLabel").textContent = label;
            updateModeVisibility(val, "gamesModeSection", "gamesModeBtn", "gamesModeLabel", "gamesModeMenu");
            STATE.cache.delete(endpoint(val, "/api/games"));
            loadGames(true);
        });

        setupDd("gamesModeBtn", "gamesModeMenu", (mode) => {
            STATE.gamesMode = mode;
            $("gamesModeLabel").textContent = mode;
            loadGames(true);
        });

        setupDd("gamesSortBtn", "gamesSortMenu", (sort, label) => {
            STATE.gamesSort = sort;
            $("gamesSortLabel").textContent = label;
            renderGames();
        });

        $("gamesSearch")?.addEventListener("input", e => {
            STATE.gamesSearch = e.target.value.trim();
            renderGames();
        });

        setupDd("playersVersionBtn", "playersVersionMenu", (val, label) => {
            STATE.playersVer  = val;
            STATE.playersMode = "VS";
            STATE.players     = [];
            STATE.profileName = null;
            $("playersVersionLabel").textContent = label;
            $("profileOverview").innerHTML = `<div class="empty-state" style="height:100%;"><span class="empty-icon">👆</span>Select a player from the list<span class="empty-hint">Their stats and recent matches will appear here</span></div>`;
            loadPlayers(true);
        });

        $("hutRefresh")?.addEventListener("click", () => {
            if (STATE.hutView === "managers" && STATE.hutMgrScreen === "detail") { loadHutManager(STATE.hutManagerId, true); return; }
            if (STATE.hutView === "managers") STATE.hutManagers = [];
            loadHutTab(true);
        });

        $("hutViewGroup")?.querySelectorAll("[data-hut-view]").forEach(btn =>
            btn.addEventListener("click", () => selectHutView(btn.dataset.hutView))
        );

        $("hutManagerSearch")?.addEventListener("input", renderHutManagers);

        setupDd("hutMgrSortBtn", "hutMgrSortMenu", (sort, label) => {
            STATE.hutMgrSort = sort;
            $("hutMgrSortLabel").textContent = label;
            renderHutManagers();
        });

        $("hutManagerGrid")?.addEventListener("click", e => {
            const btn = e.target.closest("[data-hut-user]");
            if (btn) loadHutManager(btn.dataset.hutUser);
        });

        $("hutManagerDetail")?.addEventListener("click", e => {
            if (e.target.closest("[data-hut-back]")) showHutMgrGrid();
        });

        $("hutViewOverview")?.addEventListener("click", e => {
            const btn = e.target.closest("[data-hut-goto]");
            if (btn) selectHutView(btn.dataset.hutGoto);
        });

        setupDd("hutMktStateBtn", "hutMktStateMenu", (val, label) => {
            STATE.hutMarket.state = val;
            $("hutMktStateLabel").textContent = label;
            loadHutMarket(true);
        });

        setupDd("hutMktSortBtn", "hutMktSortMenu", (sort, label) => {
            STATE.hutMarket.sort = sort;
            $("hutMktSortLabel").textContent = label;
            if (!STATE.hutMarket.loading) renderHutMarket();
        });

        $("hutMktSearch")?.addEventListener("input", () => {
            if (!STATE.hutMarket.loading) renderHutMarket();
        });

        $("hutMarketMore")?.addEventListener("click", () => {
            if (!STATE.hutMarket.loading && !STATE.hutMarket.done) fetchHutMarketPage();
        });

        $("hutMarketList")?.addEventListener("click", e => {
            const row = e.target.closest("[data-trade]");
            if (row) toggleHutTrade(row.dataset.trade);
        });

        setupDd("lbVersionBtn", "lbVersionMenu", (val, label) => {
            STATE.lbVer = val;
            $("lbVersionLabel").textContent = label;
            loadLeaderboards(true);
        });

        $("lbRangeGroup")?.querySelectorAll("[data-window]").forEach(btn => {
            btn.addEventListener("click", () => {
                STATE.lbRange = btn.dataset.window;
                $("lbRangeGroup").querySelectorAll(".btn-seg").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                loadLeaderboards(true);
            });
        });

        selectTab("status");
    };

    return { init };
})();

App.init();