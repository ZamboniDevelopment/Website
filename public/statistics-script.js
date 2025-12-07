const App = (() => {

    const DOM = {
        tabs: document.querySelectorAll(".tab-btn"),
        pageTitle: document.getElementById("pageTitle"),

        panels: {
            status: document.getElementById("tab-status"),
            games: document.getElementById("tab-games"),
            players: document.getElementById("tab-players"),
        },

        versionToggle: document.getElementById("versionToggle"),
        versionMenu: document.getElementById("versionMenu"),
        versionLabel: document.getElementById("versionLabel"),
        menuToggle: document.getElementById("menuToggle"),
        sidebar: document.getElementById("sidebar"),
        themeToggle: document.getElementById("themeToggle"),
        themeIcon: document.getElementById("themeIcon"),
        themeLabel: document.getElementById("themeLabel"),

        serverVersion: document.getElementById("serverVersion"),
        onlineUsersCount: document.getElementById("onlineUsersCount"),
        onlineUsersText: document.getElementById("onlineUsers"),
        queuedUsers: document.getElementById("queuedUsers"),
        activeGames: document.getElementById("activeGames"),
        onlineUsersPill: document.getElementById("onlineUsersPill"),
        uptimeBar: document.getElementById("uptimeBar"),
        statusRefresh: document.getElementById("statusRefresh"),

        autoRefreshToggle: document.getElementById("autoRefreshToggle"),
        autoRefreshInterval: document.getElementById("autoRefreshInterval"),
        autoStatus: document.getElementById("autoStatus"),
        autoGames: document.getElementById("autoGames"),
        autoPlayers: document.getElementById("autoPlayers"),

        gamesList: document.getElementById("gameReportsList"),
        gamesRefresh: document.getElementById("gameReportsRefresh"),

        playersList: document.getElementById("players"),
        searchInput: document.getElementById("searchInput"),
        refreshPlayers: document.getElementById("refreshBtn"),
        leaderboards: document.getElementById("leaderboards"),
        lbWindowButtons: document.querySelectorAll(".lb-window"),

        profileOverview: document.getElementById("profileOverview"),
        profileRaw: document.getElementById("profileRaw"),
        copyJsonBtn: document.getElementById("copyJsonBtn"),
        profileTabOverview: document.getElementById("profileTabOverview"),
        profileTabRaw: document.getElementById("profileTabRaw"),

        sidebarClose: document.getElementById("sidebarClose"),
    };

    const STATE = {
        apiVersion: "nhl10",

        basePath: "https://zamboni.gg/",
        cacheTTL: 8000,
        cache: new Map(),

        auto: {
            enabled: false,
            interval: 15000,
            targets: {
                status: true,
                games: false,
                players: false,
            },
            timerId: null,
        },

        allPlayers: [],
        leaderboardRange: "day",
    };

    const endpoint = (path) => {

        return `${STATE.basePath}/${STATE.apiVersion}${path}`;
    };

    const fetchJSON = async (url, { force = false, ttl = STATE.cacheTTL } = {}) => {
        const now = Date.now();
        const cached = STATE.cache.get(url);
        if (!force && cached && now - cached.time < ttl) {
            return cached.data;
        }

        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`HTTP ${res.status} ${text ? `- ${text}` : ""}`);
        }
        const data = await res.json();
        STATE.cache.set(url, { time: now, data });
        return data;
    };

    const setText = (el, value) => {
        if (!el) return;
        el.textContent = value;
    };

    const safeDate = (val) => {
        if (!val) return "—";
        try {
            const d = new Date(val);
            if (Number.isNaN(d.getTime())) return String(val);
            return d.toLocaleString();
        } catch {
            return String(val);
        }
    };

    const escapeHtml = (s) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const escapeAttr = (s) =>
        String(s ?? "")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const skeleton = (rows = 3, height = 10) =>
        `<div class="space-y-2 animate-fade">${Array.from({ length: rows })
            .map(() => `<div class="h-${height} rounded-lg skeleton"></div>`)
            .join("")}</div>`;

    const avatar = (text, size = 32) => {
        const initials = String(text || "?")
            .trim()
            .slice(0, 2)
            .toUpperCase();
        return `<span
      class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/25 to-indigo-500/25 border border-white/10 text-xs animate-pop"
      style="height:${size}px;width:${size}px">
      ${escapeHtml(initials)}
    </span>`;
    };

    const toast = (message) => {
        const t = document.createElement("div");
        t.textContent = message;
        t.className =
            "fixed inset-x-0 top-3 z-50 mx-auto w-max rounded-xl bg-slate-900/95 px-4 py-1.5 text-[11px] text-slate-100 shadow-card animate-pop";
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 1500);
    };
    window.toast = toast;

    const animateNumber = (el, target, duration = 200) => {
        if (!el) return;
        const from = Number(el.dataset.prev || 0);
        const to = Number(target || 0);
        const start = performance.now();

        const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const val = Math.round(from + (to - from) * t);
            el.textContent = String(val);
            if (t < 1) requestAnimationFrame(step);
            else el.dataset.prev = String(to);
        };
        requestAnimationFrame(step);
    };

    const field = (obj, keys, fallback = undefined) => {
        if (!obj) return fallback;
        for (const k of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                return obj[k];
            }
        }
        return fallback;
    };

    const replayAnimation = (el, classes) => {
        if (!el || !classes || !classes.length) return;
        el.classList.remove(...classes);

        el.offsetWidth;
        el.classList.add(...classes);
    };

    const selectTab = (tab) => {
        DOM.tabs.forEach((btn) => {
            const selected = btn.dataset.tab === tab;
            btn.setAttribute("aria-selected", String(selected));
        });

        Object.entries(DOM.panels).forEach(([name, panel]) => {
            if (!panel) return;
            const isActive = name === tab;
            panel.classList.toggle("hidden", !isActive);
            if (isActive) {
                replayAnimation(panel, ["animate-slideup"]);
            }
        });

        DOM.pageTitle.textContent = tab[0].toUpperCase() + tab.slice(1);

        if (tab === "status") loadStatus();
        if (tab === "games") loadGames();
        if (tab === "players") {
            loadPlayers();
            loadLeaderboards(STATE.leaderboardRange);
        }

        const url = new URL(location.href);
        url.searchParams.set("tab", tab);
        history.replaceState(null, "", url.toString());
    };

    const loadStatus = async (force = false) => {
        try {
            const data = await fetchJSON(endpoint("/status"), { force });

            const version = field(data, ["serverVersion", "ServerVersion"], "—");
            const online = field(data, ["onlineUsersCount", "OnlineUsersCount"], 0);
            const queued = field(data, ["queuedUsers", "QueuedUsers"], 0);
            const games = field(data, ["activeGames", "ActiveGames"], 0);
            const onlineList = field(data, ["onlineUsers", "OnlineUsers"], "—");

            setText(DOM.serverVersion, version);
            animateNumber(DOM.onlineUsersCount, online);
            animateNumber(DOM.queuedUsers, queued);
            animateNumber(DOM.activeGames, games);
            setText(DOM.onlineUsersText, onlineList);

            const pill = DOM.onlineUsersPill;
            if (pill) {
                pill.textContent = online > 0 ? "LIVE" : "IDLE";
                pill.className =
                    "rounded-full border px-2 py-0.5 text-[10px] animate-pop " +
                    (online > 0
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                        : "bg-slate-500/15 text-slate-300 border-slate-500/25");
            }

            if (DOM.uptimeBar) {
                const pct = 95 + Math.random() * 5;
                DOM.uptimeBar.style.width = `${pct}%`;
            }
        } catch (err) {
            console.error(err);
            DOM.panels.status.innerHTML = `
        <div class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-100 animate-pop">
          Failed to load server status: ${escapeHtml(err.message)}
        </div>`;
        }
    };

    const loadGames = async (force = false) => {
        if (!DOM.gamesList) return;
        DOM.gamesList.innerHTML = skeleton(4, 10);

        try {

            const [gamesRaw, reportsRaw] = await Promise.all([
                fetchJSON(endpoint("/api/raw/games"), { force }),
                fetchJSON(endpoint("/api/raw/reports"), { force }),
            ]);

            const games = Array.isArray(gamesRaw) ? gamesRaw : [];
            const reports = Array.isArray(reportsRaw) ? reportsRaw : [];

            if (!reports.length) {
                DOM.gamesList.innerHTML =
                    `<div class="text-xs text-slate-400 p-3 animate-fade">No recent games found.</div>`;
                return;
            }

            const gamesMap = new Map(
                games.map((g) => [g.game_id, g])
            );

            const grouped = new Map();
            for (const r of reports) {
                const gid = r.game_id;
                if (gid == null) continue;
                if (!grouped.has(gid)) grouped.set(gid, []);
                grouped.get(gid).push(r);
            }

            const combined = [];

            for (const [gid, reps] of grouped.entries()) {
                if (!reps.length) continue;

                const g = gamesMap.get(gid);
                const playedAt = g?.created_at || reps[0]?.created_at;

                const teamScores = new Map();
                for (const r of reps) {
                    const tname = r.team_name || "Unknown";
                    const score = Number(r.score || 0);
                    teamScores.set(tname, (teamScores.get(tname) || 0) + score);
                }

                let homeTeam = null;
                let awayTeam = null;

                const homeCandidate = reps.find(
                    (r) => r.home === 1 || r.home === true
                );
                const awayCandidate = reps.find((r) => r.home === 0);

                if (homeCandidate) homeTeam = homeCandidate.team_name || null;
                if (awayCandidate) awayTeam = awayCandidate.team_name || null;

                const teamNames = [...teamScores.keys()];

                if (!homeTeam && teamNames.length > 0) homeTeam = teamNames[0];
                if (!awayTeam && teamNames.length > 1) {
                    awayTeam =
                        teamNames.find((n) => n !== homeTeam) ||
                        teamNames[1] ||
                        homeTeam;
                }

                const homeScore = homeTeam ? teamScores.get(homeTeam) || 0 : 0;
                const awayScore = awayTeam ? teamScores.get(awayTeam) || 0 : 0;

                let homePlayers = reps.filter(r => r.home === 1 || r.home === true);
                let awayPlayers = reps.filter(r => r.home === 0);

                const pickBestPlayer = (arr) => {
                    if (!arr || !arr.length) return null;
                    return arr.sort((a, b) => {
                        const scoreDiff = (b.score || 0) - (a.score || 0);
                        if (scoreDiff !== 0) return scoreDiff;
                        return (b.shots || 0) - (a.shots || 0);
                    })[0];
                };

                const homePlayer = pickBestPlayer(homePlayers);
                const awayPlayer = pickBestPlayer(awayPlayers);

                const homePlayerName = homePlayer?.gamertag || "Unknown";
                const awayPlayerName = awayPlayer?.gamertag || "Unknown";

                const homeTeamName = homeTeam || "Unknown";
                const awayTeamName = awayTeam || "Unknown";

                combined.push({
                    gameId: gid,
                    playedAt,

                    homePlayerName,
                    awayPlayerName,

                    homeTeam: homeTeamName,
                    awayTeam: awayTeamName,

                    homeScore,
                    awayScore,

                    rawHomePlayer: homePlayer || null,
                    rawAwayPlayer: awayPlayer || null,
                });

            }

            combined.sort(
                (a, b) =>
                    new Date(b.playedAt || 0) - new Date(a.playedAt || 0)
            );

            DOM.gamesList.innerHTML = combined
                .slice(0, 30)
                .map(renderGameCard)
                .join("");
        } catch (err) {
            console.error(err);
            DOM.gamesList.innerHTML = `
        <div class="text-xs text-rose-300 p-3 animate-pop">
          Failed to load games: ${escapeHtml(err.message)}
        </div>`;
        }
    };

    const renderGameCard = (g) => {
        const id = field(g, ["gameId", "game_id"], "?");
        const playedAt = field(g, ["playedAt", "created_at"]);

        const homePlayer = escapeHtml(g.homePlayerName || "Unknown");
        const awayPlayer = escapeHtml(g.awayPlayerName || "Unknown");

        const homeTeam = escapeHtml(g.homeTeam || "Unknown");
        const awayTeam = escapeHtml(g.awayTeam || "Unknown");

        const homeScore = Number(g.homeScore || 0);
        const awayScore = Number(g.awayScore || 0);

        const winner =
            homeScore > awayScore
                ? homePlayer
                : awayScore > homeScore
                    ? awayPlayer
                    : null;

        const totalGoals = homeScore + awayScore;

        return `
    <div class="rounded-xl border border-slate-800 bg-black/75 p-4 lift animate-pop">

      <!-- HEADER -->
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-slate-100">
          Game #${escapeHtml(String(id))}
        </div>

        <div class="text-[11px] text-slate-400">
          ${
            winner
                ? `Winner: <span class="text-slate-100">${winner}</span>`
                : "Draw"
        }
        </div>
      </div>

      <div class="mt-1 text-[11px] text-slate-500">
        Played: ${escapeHtml(safeDate(playedAt))}
      </div>

      <!-- PLAYER NAMES + TEAM NAMES -->
      <div class="mt-3 text-sm font-semibold text-slate-100 grid grid-cols-3 items-center">

        <div class="truncate max-w-[95%]">
          ${homePlayer}
          <span class="text-slate-500 text-[11px]">(${homeTeam})</span>
        </div>

        <div class="text-base text-center">
          ${homeScore} - ${awayScore}
        </div>

        <div class="truncate max-w-[95%] text-right">
          ${awayPlayer}
          <span class="text-slate-500 text-[11px]">(${awayTeam})</span>
        </div>

      </div>

      <!-- KPIs -->
      <div class="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex items-center justify-between">
          <span>Goals</span>
          <span class="text-slate-100 font-medium">${totalGoals}</span>
        </div>
        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex items-center justify-between">
          <span>Home</span>
          <span class="text-slate-100 font-medium">${homeScore}</span>
        </div>
        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex items-center justify-between">
          <span>Away</span>
          <span class="text-slate-100 font-medium">${awayScore}</span>
        </div>
      </div>

    </div>
  `;
    };

    const loadPlayers = async (force = false) => {
        if (!DOM.playersList) return;

        if (!force && STATE.allPlayers.length) {
            renderPlayers(STATE.allPlayers);
            return;
        }

        DOM.playersList.innerHTML = skeleton(8, 9);

        try {
            const players = await fetchJSON(endpoint("/api/players"), { force });
            STATE.allPlayers = Array.isArray(players) ? players : [];
            renderPlayers(STATE.allPlayers);
        } catch (err) {
            console.error(err);
            DOM.playersList.innerHTML = `
        <div class="p-3 text-xs text-rose-300 animate-pop">
          Failed to load players: ${escapeHtml(err.message)}
        </div>`;
        }
    };

    const renderPlayers = (list) => {
        const term = DOM.searchInput?.value.trim().toLowerCase() || "";

        const filtered = term
            ? list.filter((p) => String(p).toLowerCase().includes(term))
            : [...list];

        filtered.sort((a, b) => String(a).localeCompare(String(b)));

        if (!filtered.length) {
            DOM.playersList.innerHTML =
                `<div class="p-3 text-xs text-slate-400 animate-fade">No players found.</div>`;
            return;
        }

        DOM.playersList.innerHTML = filtered
            .map(
                (name) => `
      <button
        type="button"
        class="group flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-left text-sm hover:bg-slate-950 focus-ring lift player-item animate-pop hover:animate-float transition-all duration-300"
        data-name="${escapeAttr(name)}"
      >
        <span class="truncate font-medium flex items-center gap-2">
          ${avatar(name)}
          <span>${escapeHtml(name)}</span>
        </span>
        <span class="text-xs text-slate-500 md:opacity-0 md:group-hover:opacity-100">
          View →
        </span>
      </button>
    `
            )
            .join("");
    };

    const loadProfile = async (gamertag) => {
        if (!DOM.profileOverview || !DOM.profileRaw) return;

        DOM.profileOverview.innerHTML =
            '<div class="h-24 rounded-lg skeleton animate-fade"></div>';
        DOM.profileRaw.textContent = "Loading…";

        try {

            const [profile, gamesRaw, reportsRaw] = await Promise.all([
                fetchJSON(endpoint(`/api/player/${encodeURIComponent(gamertag)}`), {
                    force: true,
                }),
                fetchJSON(endpoint("/api/raw/games"), { force: true }),
                fetchJSON(endpoint("/api/raw/reports"), { force: true }),
            ]);

            const games = Array.isArray(gamesRaw) ? gamesRaw : [];
            const reports = Array.isArray(reportsRaw) ? reportsRaw : [];
            const gamesMap = new Map(games.map((g) => [g.game_id, g]));

            const playerReports = reports.filter(
                (r) => r.gamertag === gamertag
            );

            const history = buildHistoryFromRaw(
                gamertag,
                playerReports,
                reports,
                gamesMap
            );

            const combined = {
                profile,
                history,
            };

            renderProfileOverview(gamertag, combined);
            DOM.profileRaw.textContent = JSON.stringify(combined, null, 2);

            const url = new URL(location.href);
            url.searchParams.set("player", gamertag);
            historyReplace(url);
        } catch (err) {
            console.error(err);
            DOM.profileOverview.innerHTML = `
        <div class="p-3 text-xs text-rose-300 animate-pop">
          Failed to load profile: ${escapeHtml(err.message)}
        </div>`;
            DOM.profileRaw.textContent = JSON.stringify(
                { error: "Failed to load profile", details: String(err) },
                null,
                2
            );
        }
    };

    const buildHistoryFromRaw = (
        gamertag,
        playerReports,
        allReports,
        gamesMap
    ) => {
        if (!Array.isArray(playerReports) || !playerReports.length) return [];

        const sorted = [...playerReports].sort(
            (a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );

        const history = [];

        for (const r of sorted) {
            const gid = r.game_id;
            if (gid == null) continue;

            const gameReports = allReports.filter(
                (x) => x.game_id === gid
            );
            if (!gameReports.length) continue;

            const game = gamesMap.get(gid);
            const playedAt = game?.created_at || r.created_at;

            const teamScores = new Map();
            for (const gr of gameReports) {
                const tname = gr.team_name || "Unknown";
                const score = Number(gr.score || 0);
                teamScores.set(tname, (teamScores.get(tname) || 0) + score);
            }

            let homeTeam = null;
            let awayTeam = null;

            const homeCandidate = gameReports.find(
                (gr) => gr.home === 1 || gr.home === true
            );
            const awayCandidate = gameReports.find((gr) => gr.home === 0);

            if (homeCandidate) homeTeam = homeCandidate.team_name || null;
            if (awayCandidate) awayTeam = awayCandidate.team_name || null;

            const teamNames = [...teamScores.keys()];
            if (!homeTeam && teamNames.length > 0) homeTeam = teamNames[0];
            if (!awayTeam && teamNames.length > 1) {
                awayTeam =
                    teamNames.find((n) => n !== homeTeam) ||
                    teamNames[1] ||
                    homeTeam;
            }

            const homeScore = homeTeam ? teamScores.get(homeTeam) || 0 : 0;
            const awayScore = awayTeam ? teamScores.get(awayTeam) || 0 : 0;

            history.push({
                game_id: gid,
                played_at: playedAt,

                team_name: r.team_name,
                home_team: homeTeam,
                away_team: awayTeam,
                home_score: homeScore,
                away_score: awayScore,
                score: r.score,

                myPlayer: r.gamertag || "Unknown",

                opponentPlayer:
                    gameReports.find(x => x.gamertag !== r.gamertag)?.gamertag || "Unknown",

                opponentTeam:
                    gameReports.find(x => x.gamertag !== r.gamertag)?.team_name || "Unknown",
            });
        }

        return history;
    };

    const buildRecentMatchesFromHistory = (gamertag, history) => {
        if (!Array.isArray(history)) return [];

        return history
            .map(row => {
                const gameId = row.game_id;
                const playedAt = row.played_at;

                const myTeam = row.team_name;
                const oppTeam = row.opponentTeam;

                const myPlayer = row.myPlayer;
                const oppPlayer = row.opponentPlayer;

                const homeScore = Number(row.home_score || 0);
                const awayScore = Number(row.away_score || 0);

                const myScore =
                    row.team_name === row.home_team ? homeScore : awayScore;

                const oppScore =
                    row.team_name === row.home_team ? awayScore : homeScore;

                let result = "Draw";
                if (myScore > oppScore) result = "Win";
                else if (myScore < oppScore) result = "Loss";

                return {
                    gameId,
                    playedAt,

                    myTeam,
                    oppTeam,
                    myPlayer,
                    oppPlayer,

                    myScore,
                    oppScore,
                    result,
                };
            })
            .sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
            .slice(0, 10);
    };

    const renderProfileOverview = (gamertag, { profile, history }) => {
        const totalGames = field(profile, ["totalGames", "TotalGames"], 0);
        const totalGoals = field(profile, ["totalGoals", "TotalGoals"], 0);
        const userId = field(profile, ["userId", "UserId"]);

        const recentMatches = buildRecentMatchesFromHistory(
            gamertag,
            history
        );

        const root = document.createElement("div");
        root.className = "space-y-4 text-xs animate-fade";

        const header = document.createElement("div");
        header.className =
            "rounded-xl border border-slate-800 bg-slate-950/70 p-4 lift animate-pop";
        header.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          ${avatar(gamertag, 48)}
          <div>
            <div class="text-lg font-semibold text-slate-100">${escapeHtml(
            gamertag
        )}</div>
            <div class="text-[11px] text-slate-500">
              ${totalGames} games • ${totalGoals} goals
            </div>
            ${
            userId != null
                ? `<div class="text-[10px] text-slate-600">User ID: <span class="text-slate-300">${escapeHtml(
                    String(userId)
                )}</span></div>`
                : ""
        }
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-2 py-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-900 animate-pop"
            onclick="navigator.clipboard.writeText('${escapeAttr(
            gamertag
        )}'); toast('Gamertag copied');"
          >
            Copy name
          </button>
          ${
            userId != null
                ? `<button
                    type="button"
                    class="px-2 py-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-900 animate-pop"
                    onclick="navigator.clipboard.writeText('${escapeAttr(
                    String(userId)
                )}'); toast('User ID copied');"
                  >
                    Copy ID
                  </button>`
                : ""
        }
        </div>
      </div>
    `;
        root.appendChild(header);

        const avgGoals = totalGames ? (totalGoals / totalGames).toFixed(2) : "0.00";

        const stats = document.createElement("div");
        stats.className = "grid grid-cols-2 sm:grid-cols-3 gap-3";

        const statItems = [
            { label: "Games played", value: totalGames },
            { label: "Total goals", value: totalGoals },
            { label: "Goals / game", value: avgGoals },
        ];

        stats.innerHTML = statItems
            .map(
                (s) => `
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 lift animate-pop">
          <div class="text-[11px] text-slate-500 uppercase tracking-wide">
            ${escapeHtml(s.label)}
          </div>
          <div class="mt-1 text-lg font-semibold text-slate-100">
            ${escapeHtml(String(s.value))}
          </div>
        </div>
      `
            )
            .join("");
        root.appendChild(stats);

        if (recentMatches.length) {
            const box = document.createElement("div");
            box.className =
                "rounded-xl border border-slate-800 bg-slate-950/70 p-4 lift animate-pop";

            box.innerHTML = `
        <div class="text-sm font-semibold mb-3 text-slate-100">
          Recent Matches
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">

          ${recentMatches
                .map(
                    (m) => `
            <div class="rounded-lg border border-slate-800 bg-black/70 p-3 animate-fade flex flex-col gap-2">

              <!-- Top row: players -->
              <div class="flex justify-between text-xs font-medium text-slate-200 leading-tight">
                <div class="max-w-[48%] truncate text-left">
                  ${escapeHtml(m.myPlayer)}<br>
                  <span class="text-[10px] text-slate-500 truncate">${escapeHtml(m.myTeam)}</span>
                </div>

                <div class="max-w-[48%] truncate text-right">
                  ${escapeHtml(m.oppPlayer)}<br>
                  <span class="text-[10px] text-slate-500 truncate">${escapeHtml(m.oppTeam)}</span>
                </div>
              </div>

              <!-- Score -->
              <div class="text-center text-base font-semibold text-slate-100">
                ${m.myScore} - ${m.oppScore}
              </div>

              <!-- Bottom row date + result -->
              <div class="flex justify-between text-[10px] text-slate-400">
                <span>${escapeHtml(safeDate(m.playedAt))}</span>
                <span class="${
                        m.result === "Win"
                            ? "text-emerald-400"
                            : m.result === "Loss"
                                ? "text-rose-400"
                                : "text-slate-300"
                    } font-medium">${escapeHtml(m.result)}</span>
              </div>
            </div>
          `
                )
                .join("")}

        </div>
      `;
            root.appendChild(box);
        }

        DOM.profileOverview.replaceChildren(root);
        DOM.profileOverview.classList.remove("hidden");
        DOM.profileRaw.classList.add("hidden");
        DOM.profileTabOverview.setAttribute("aria-selected", "true");
        DOM.profileTabRaw.removeAttribute("aria-selected");
    };

    const loadLeaderboards = async (range = "day") => {
        if (!DOM.leaderboards) return;

        DOM.leaderboards.innerHTML = skeleton(4, 8);

        try {

            const [reportsRaw, gamesRaw] = await Promise.all([
                fetchJSON(endpoint("/api/raw/reports"), { force: true }),
                fetchJSON(endpoint("/api/raw/games"), { force: true }),
            ]);

            const reports = Array.isArray(reportsRaw) ? reportsRaw : [];

            const now = Date.now();
            const minDate = {
                day: now - 86400000,
                weekly: now - 86400000 * 7,
                monthly: now - 86400000 * 30,
                "all time": 0,
            }[range] ?? 0;

            const filtered = reports.filter(r => {
                const ts = new Date(r.created_at).getTime();
                return ts >= minDate;
            });

            const players = new Map();

            for (const r of filtered) {
                if (!players.has(r.gamertag)) {
                    players.set(r.gamertag, {
                        gamertag: r.gamertag,
                        gamesPlayed: 0,
                        goalsFor: 0,
                        goalsAgainst: 0,
                        wins: 0,
                        losses: 0,
                        shots: 0,
                        faceoffs: 0,
                        penmin: 0,
                        games: new Map(),
                    });
                }

                const p = players.get(r.gamertag);

                if (!p.games.has(r.game_id)) {
                    p.games.set(r.game_id, []);
                }
                p.games.get(r.game_id).push(r);
            }

            for (const p of players.values()) {
                for (const [gameId, reps] of p.games) {
                    const my = reps[0];

                    const all = filtered.filter(x => x.game_id === gameId);

                    const myTeam = my.team_name;
                    const myScore = my.score;
                    const oppScore = all
                        .filter(x => x.team_name !== myTeam)
                        .reduce((a, b) => a + b.score, 0);

                    p.goalsFor += myScore;
                    p.goalsAgainst += oppScore;
                    p.shots += my.shots || 0;
                    p.faceoffs += my.faceoff || 0;
                    p.penmin += my.penmin || 0;

                    p.gamesPlayed++;

                    if (myScore > oppScore) p.wins++;
                    else if (myScore < oppScore) p.losses++;
                }

                p.goalDiff = p.goalsFor - p.goalsAgainst;
                p.goalsPerGame = p.gamesPlayed ? p.goalsFor / p.gamesPlayed : 0;
                p.winrate = p.gamesPlayed ? (p.wins / p.gamesPlayed) * 100 : 0;
            }

            const leaderboard = [...players.values()];

            const categories = [
                {
                    label: "Total Goals",
                    rows: leaderboard.sort((a, b) => b.goalsFor - a.goalsFor).slice(0, 5),
                    format: p => p.goalsFor,
                },
                {
                    label: "Goals / Game",
                    rows: leaderboard.sort((a, b) => b.goalsPerGame - a.goalsPerGame).slice(0, 5),
                    format: p => p.goalsPerGame.toFixed(2),
                },
                {
                    label: "Winrate %",
                    rows: leaderboard.sort((a, b) => b.winrate - a.winrate).slice(0, 5),
                    format: p => p.winrate.toFixed(1) + "%",
                },
                {
                    label: "Wins",
                    rows: leaderboard.sort((a, b) => b.wins - a.wins).slice(0, 5),
                    format: p => p.wins,
                },
                {
                    label: "Goal Differential",
                    rows: leaderboard.sort((a, b) => b.goalDiff - a.goalDiff).slice(0, 5),
                    format: p => (p.goalDiff > 0 ? "+" : "") + p.goalDiff,
                },
                {
                    label: "Games Played",
                    rows: leaderboard.sort((a, b) => b.gamesPlayed - a.gamesPlayed).slice(0, 5),
                    format: p => p.gamesPlayed,
                },
            ];

            DOM.leaderboards.innerHTML = categories.map(cat => renderLeaderboardCategory(cat)).join("");

        } catch (err) {
            console.error(err);
            DOM.leaderboards.innerHTML = `
        <div class="text-[11px] text-rose-300 animate-pop">
          Failed to load leaderboard: ${escapeHtml(err.message)}
        </div>`;
        }
    };

    const renderLeaderboardCategory = (cat) => {
        const rows = cat.rows
            .map(
                (p, i) => `
      <div class="flex items-center justify-between">
        <span class="truncate flex items-center gap-1">
          <span class="text-[10px] text-slate-500">${i + 1}.</span>
          <span class="truncate text-slate-200">${escapeHtml(
                    p.gamertag || "Unknown"
                )}</span>
        </span>
        <span class="text-[10px] text-slate-400 ml-2">${escapeHtml(
                    cat.format(p)
                )}</span>
      </div>
    `
            )
            .join("");

        return `
      <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 animate-pop">
        <div class="mb-1 text-[11px] font-medium text-slate-200">
          ${escapeHtml(cat.label)}
        </div>
        <div class="space-y-1 text-[11px]">
          ${
            rows ||
            '<span class="text-slate-500 text-[11px]">No data</span>'
        }
        </div>
      </div>
    `;
    };

    const loadAutoSettings = () => {
        try {
            const raw = localStorage.getItem("z_auto");
            if (!raw) return;
            const v = JSON.parse(raw);

            STATE.auto.enabled = !!v.enabled;
            STATE.auto.interval = Number(v.interval || 15000);
            STATE.auto.targets.status = !!v.status;
            STATE.auto.targets.games = !!v.games;
            STATE.auto.targets.players = !!v.players;
        } catch {

        }
    };

    const saveAutoSettings = () => {
        const v = {
            enabled: STATE.auto.enabled,
            interval: STATE.auto.interval,
            status: STATE.auto.targets.status,
            games: STATE.auto.targets.games,
            players: STATE.auto.targets.players,
        };
        localStorage.setItem("z_auto", JSON.stringify(v));
    };

    const applyAutoUI = () => {
        if (DOM.autoRefreshToggle)
            DOM.autoRefreshToggle.checked = STATE.auto.enabled;
        if (DOM.autoRefreshInterval)
            DOM.autoRefreshInterval.value = String(STATE.auto.interval);
        if (DOM.autoStatus) DOM.autoStatus.checked = STATE.auto.targets.status;
        if (DOM.autoGames) DOM.autoGames.checked = STATE.auto.targets.games;
        if (DOM.autoPlayers) DOM.autoPlayers.checked = STATE.auto.targets.players;
    };

    const scheduleAutoRefresh = () => {
        if (STATE.auto.timerId) {
            clearInterval(STATE.auto.timerId);
            STATE.auto.timerId = null;
        }
        if (!STATE.auto.enabled) return;

        STATE.auto.timerId = setInterval(() => {
            const activeTab =
                document.querySelector('.tab-btn[aria-selected="true"]')?.dataset
                    .tab || "status";

            if (STATE.auto.targets.status && activeTab === "status") {
                loadStatus(true);
            }
            if (STATE.auto.targets.games && activeTab === "games") {
                loadGames(true);
            }
            if (STATE.auto.targets.players && activeTab === "players") {
                loadPlayers(true);
                loadLeaderboards(STATE.leaderboardRange);
            }
        }, STATE.auto.interval);
    };

    const applyTheme = (theme) => {
        const body = document.body;
        if (theme === "light") {
            body.classList.add("theme-light");
            if (DOM.themeIcon) DOM.themeIcon.textContent = "☀️";
            if (DOM.themeLabel) DOM.themeLabel.textContent = "Light";
        } else {
            body.classList.remove("theme-light");
            if (DOM.themeIcon) DOM.themeIcon.textContent = "🌙";
            if (DOM.themeLabel) DOM.themeLabel.textContent = "Dark";
        }
    };

    const loadTheme = () => {
        const saved = localStorage.getItem("z_theme") || "dark";
        applyTheme(saved);
    };

    const toggleTheme = () => {
        const isLight = document.body.classList.contains("theme-light");
        const next = isLight ? "dark" : "light";
        applyTheme(next);
        localStorage.setItem("z_theme", next);
    };

    const historyReplace = (url) => {
        history.replaceState(null, "", url.toString());
    };

    const setupVersionMenu = () => {
        if (!DOM.versionToggle || !DOM.versionMenu) return;

        DOM.versionToggle.addEventListener("click", () => {
            DOM.versionMenu.classList.toggle("hidden");
        });

        DOM.versionMenu.querySelectorAll("[data-value]").forEach((item) => {
            item.addEventListener("click", async () => {
                const value = item.dataset.value;
                if (!value) return;
                STATE.apiVersion = value;

                DOM.versionLabel.textContent = item.textContent.trim();
                DOM.versionMenu.classList.add("hidden");

                STATE.cache.clear();
                STATE.allPlayers = [];

                if (DOM.profileOverview)
                    DOM.profileOverview.textContent = "Click a player…";
                if (DOM.profileRaw) DOM.profileRaw.textContent = "Click a player…";

                const url = new URL(location.href);
                url.searchParams.delete("player");
                historyReplace(url);

                const activeTab =
                    document.querySelector('.tab-btn[aria-selected="true"]')?.dataset
                        .tab || "status";
                if (activeTab === "status") loadStatus(true);
                if (activeTab === "games") loadGames(true);
                if (activeTab === "players") {
                    loadPlayers(true);
                    loadLeaderboards(STATE.leaderboardRange);
                }
            });
        });

        document.addEventListener("click", (e) => {
            if (
                !DOM.versionMenu.contains(e.target) &&
                !DOM.versionToggle.contains(e.target) &&
                e.target.id !== "sidebarClose"
            ) {
                DOM.versionMenu.classList.add("hidden");
            }
        });
    };

    const addEvents = () => {
        DOM.tabs.forEach((btn) =>
            btn.addEventListener("click", () => selectTab(btn.dataset.tab))
        );
        DOM.sidebarClose?.addEventListener("click", (e) => {
            e.stopPropagation();
            DOM.sidebar.classList.add("-translate-x-full");
        });
        DOM.statusRefresh?.addEventListener("click", () => loadStatus(true));

        DOM.gamesRefresh?.addEventListener("click", () => loadGames(true));

        DOM.refreshPlayers?.addEventListener("click", () => loadPlayers(true));
        DOM.searchInput?.addEventListener("input", () =>
            renderPlayers(STATE.allPlayers)
        );

        DOM.playersList?.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-name]");
            if (!btn) return;
            const name = btn.dataset.name;
            if (name) loadProfile(name);
        });

        DOM.menuToggle?.addEventListener("click", () => {
            if (!DOM.sidebar) return;
            DOM.sidebar.classList.remove("-translate-x-full");
        });

        DOM.sidebarClose?.addEventListener("click", () => {
            if (!DOM.sidebar) return;
            DOM.sidebar.classList.add("-translate-x-full");
        });

        document.addEventListener("click", (e) => {
            if (
                window.innerWidth < 768 &&
                DOM.sidebar &&
                !DOM.sidebar.contains(e.target) &&
                !DOM.menuToggle.contains(e.target) &&
                e.target.id !== "sidebarClose"
            ) {
                DOM.sidebar.classList.add("-translate-x-full");
            }
        });

        DOM.profileTabOverview?.addEventListener("click", () => {
            DOM.profileOverview.classList.remove("hidden");
            DOM.profileRaw.classList.add("hidden");
            DOM.profileTabOverview.setAttribute("aria-selected", "true");
            DOM.profileTabRaw.removeAttribute("aria-selected");
            replayAnimation(DOM.profileOverview, ["animate-fade"]);
        });

        DOM.profileTabRaw?.addEventListener("click", () => {
            DOM.profileOverview.classList.add("hidden");
            DOM.profileRaw.classList.remove("hidden");
            DOM.profileTabRaw.setAttribute("aria-selected", "true");
            DOM.profileTabOverview.removeAttribute("aria-selected");
            replayAnimation(DOM.profileRaw, ["animate-fade"]);
        });

        DOM.copyJsonBtn?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(
                    DOM.profileRaw.textContent.trim()
                );
                toast("Copied JSON");
            } catch {
                toast("Copy failed");
            }
        });

        DOM.themeToggle?.addEventListener("click", toggleTheme);
        DOM.themeToggle?.addEventListener("click", toggleTheme);

        DOM.autoRefreshToggle?.addEventListener("change", () => {
            STATE.auto.enabled = DOM.autoRefreshToggle.checked;
            saveAutoSettings();
            applyAutoUI();
            scheduleAutoRefresh();
        });
        DOM.autoRefreshInterval?.addEventListener("change", () => {
            STATE.auto.interval = Number(DOM.autoRefreshInterval.value || 15000);
            saveAutoSettings();
            scheduleAutoRefresh();
        });
        DOM.autoStatus?.addEventListener("change", () => {
            STATE.auto.targets.status = DOM.autoStatus.checked;
            saveAutoSettings();
        });
        DOM.autoGames?.addEventListener("change", () => {
            STATE.auto.targets.games = DOM.autoGames.checked;
            saveAutoSettings();
        });
        DOM.autoPlayers?.addEventListener("change", () => {
            STATE.auto.targets.players = DOM.autoPlayers.checked;
            saveAutoSettings();
        });

        DOM.lbWindowButtons?.forEach((btn) =>
            btn.addEventListener("click", () => {
                DOM.lbWindowButtons.forEach((b) => {
                    b.classList.remove("border-slate-700", "text-slate-100");
                    b.classList.add("border-slate-800", "text-slate-300");
                });
                btn.classList.remove("border-slate-800", "text-slate-300");
                btn.classList.add("border-slate-700", "text-slate-100");
                const windowKey = btn.dataset.window || "day";
                loadLeaderboards(windowKey);
            })
        );
    };

    const init = () => {
        loadTheme();
        loadAutoSettings();
        applyAutoUI();
        setupVersionMenu();
        addEvents();

        const url = new URL(location.href);
        const tab = url.searchParams.get("tab") || "status";
        const player = url.searchParams.get("player");

        if (!["status", "games", "players"].includes(tab)) {
            selectTab("status");
        } else {
            selectTab(tab);
        }

        if (player && tab === "players") {
            loadProfile(player);
        }

        scheduleAutoRefresh();
    };

    return { init };
})();

App.init();