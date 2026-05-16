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
    };
    const STATE = {
        tab:         "status",
        gamesVer:   "nhl10",
        gamesMode:  "VS",
        gamesSort:  "date_desc",
        gamesSearch:"",
        gamesRaw:   [],
        playersVer: "nhl10",
        playersMode:"VS",
        lbVer:      "nhl10",
        lbRange:    "day",
        players:    [],
        profileName:null,
        profileJson:null,
        cache:      new Map(),
    };



    const TTL = { status: 10000, games: 5000, players: 60000, profile: 30000, history: 15000, lb: 60000 };
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

    // todo(dt): more sorting ways? or just new way to make advanced filters as the data that could be filtered from the db via api is so much
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
        STATE.profileJson = null;
        renderPlayers();

        const showOverview = () => {
            $("profileOverview").style.display = "";
            $("profileRaw").style.display      = "none";
        };

        $("ptabOverview").classList.add("active");
        $("ptabRaw").classList.remove("active");
        showOverview();

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

        $("profileRaw").textContent = "";

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
                            ${stats.avgLatency != null ? statTile("Avg Ping", stats.avgLatency + " ms") : ""}
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
                                ${statTile("PP%", vsStats.ppPct != null ? vsStats.ppPct + "%" : "—")}
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

            STATE.profileJson = JSON.stringify({ profile, history: historyRaw }, null, 2);
            $("profileRaw").textContent = STATE.profileJson;

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

        $("ptabOverview")?.addEventListener("click", () => {
            $("profileOverview").style.display = "";
            $("profileRaw").style.display      = "none";
            $("ptabOverview").classList.add("active");
            $("ptabRaw").classList.remove("active");
        });

        $("ptabRaw")?.addEventListener("click", () => {
            $("profileOverview").style.display = "none";
            $("profileRaw").style.display      = "";
            $("ptabRaw").classList.add("active");
            $("ptabOverview").classList.remove("active");
        });

        $("copyJsonBtn")?.addEventListener("click", () => {
            const text = STATE.profileJson;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const btn = $("copyJsonBtn");
                const orig = btn.textContent;
                btn.textContent = "Copied!";
                setTimeout(() => { btn.textContent = orig; }, 1500);
            }).catch(() => {});
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
            STATE.profileJson = null;
            $("playersVersionLabel").textContent = label;
            $("profileOverview").innerHTML = `<div class="empty-state" style="height:100%;"><span class="empty-icon">👆</span>Select a player from the list<span class="empty-hint">Their stats and recent matches will appear here</span></div>`;
            $("profileRaw").textContent = "";
            $("profileRaw").style.display = "none";
            $("profileOverview").style.display = "";
            $("ptabOverview").classList.add("active");
            $("ptabRaw").classList.remove("active");
            loadPlayers(true);
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