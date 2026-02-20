// ZamboniDevelopment - Website
// statistics-script.js
// copyright all contributors

const App = (() => {
    // MOST of dom content
    const DOM = {
        tabs: document.querySelectorAll(".tab-btn"),
        pageTitle: document.getElementById("pageTitle"),

        panels: {
            status: document.getElementById("tab-status"),
            games: document.getElementById("tab-games"),
            players: document.getElementById("tab-players"),
        },

        themeToggle: document.getElementById("themeToggle"),
        themeIcon: document.getElementById("themeIcon"),
        themeLabel: document.getElementById("themeLabel"),

        menuToggle: document.getElementById("menuToggle"),
        sidebar: document.getElementById("sidebar"),
        sidebarClose: document.getElementById("sidebarClose"),

        versionToggle: document.getElementById("versionToggle"),
        versionMenu: document.getElementById("versionMenu"),
        versionLabel: document.getElementById("versionLabel"),

        vsSoWrapper: document.getElementById("vsSoWrapper"),
        modeToggleBtn: document.getElementById("modeToggleBtn"),
        modeMenu: document.getElementById("modeMenu"),
        modeLabel: document.getElementById("modeLabel"),

        serverVersion: document.getElementById("serverVersion"),
        onlineUsersCount: document.getElementById("onlineUsersCount"),
        onlineUsersText: document.getElementById("onlineUsers"),
        queuedUsers: document.getElementById("queuedUsers"),
        activeGames: document.getElementById("activeGames"),
        statusRefresh: document.getElementById("statusRefresh"),

        gamesList: document.getElementById("gameReportsList"),
        gamesRefresh: document.getElementById("gameReportsRefresh"),

        playersList: document.getElementById("players"),
        searchInput: document.getElementById("searchInput"),
        refreshPlayers: document.getElementById("refreshBtn"),

        leaderboards: document.getElementById("leaderboards"),
        lbWindowButtons: document.querySelectorAll(".lb-window"),

        profileOverview: document.getElementById("profileOverview"),
        profileRaw: document.getElementById("profileRaw"),
        profileTabOverview: document.getElementById("profileTabOverview"),
        profileTabRaw: document.getElementById("profileTabRaw"),
        copyJsonBtn: document.getElementById("copyJsonBtn"),
    };

    // Website state
    const STATE = {
        apiVersion: "nhl10",
        mode: "VS",
        basePath: "https://zamboni.gg",
        cache: new Map(),
        cacheTTL: 8000,
        allPlayers: [],
        currentProfile: null,
        leaderboardRange: "day",
        activeTab: "status",
    };

    // Return endpoint base path
    const endpoint = (p) => `${STATE.basePath}/${STATE.apiVersion}${p}`;

    // cachekey
    const cacheKey = (url) => {
        // Multi mode games with modern apis
        if (STATE.apiVersion === "nhl14" || STATE.apiVersion === "nhllegacy" || STATE.apiVersion === "nhl11") {
            return `${url}?mode=${STATE.mode}`;
        }

        return url;
    };

    // Helper to make request to api
    const fetchJSON = async (url, {force = false, ttl = STATE.cacheTTL} = {}) => {
        const key = cacheKey(url);
        const now = Date.now();
        const cached = STATE.cache.get(key);

        // check if cached
        if (!force && cached && now - cached.time < ttl) {
            return cached.data;
        }

        // fetch the url
        const res = await fetch(url, {headers: {Accept: "application/json"}});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Get json of response
        let data;
        try {
            data = await res.json();
        } catch (err) {
            throw new Error(`Failed to parse JSON! | HTTP ${res.status}`);
        }

        // set cache
        STATE.cache.set(key, {time: now, data});

        return data;
    };

    // Escape html with converting symbols
    const escapeHtml = (s) =>
        String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");

    // Helper to get date
    const safeDate = (d) => (d ? new Date(d).toLocaleString() : "-");

    // handle selecting tabs
    const selectTab = (tab) => {
        STATE.activeTab = tab;

        // set aria based on status
        DOM.tabs.forEach((b) =>
            b.setAttribute("aria-selected", b.dataset.tab === tab)
        );

        // Toggle hidden based on selection
        Object.entries(DOM.panels).forEach(([k, v]) =>
            v.classList.toggle("hidden", k !== tab)
        );

        // Set pagetitle
        DOM.pageTitle.textContent = tab[0].toUpperCase() + tab.slice(1);

        // Handle selects of tabs
        if (tab === "status") loadStatus(true);
        if (tab === "games") loadGames(true);
        if (tab === "players") {
            loadPlayers(true);
            loadLeaderboards(true);
        }
    };

    // unused helper but aint gonna remove cause tf idk
    const currentGames = (data) => {
        if (STATE.apiVersion === "nhl10") return data || [];
        return data?.[STATE.mode] || [];
    };

    const loadStatus = async (force = false) => {
        try {
            // TODO (too lazy): Update APIService to inclue status and just do: const d = await fetchJSON(endpoint("/status"), { force });
            let d;
            if (STATE.apiVersion === "nhl14") {
                d = await fetchJSON(STATE.basePath + ":8082/" + STATE.apiVersion + "/status", {force});
            } else if (STATE.apiVersion === "nhllegacy") {
                d = await fetchJSON(STATE.basePath + ":8083/" + STATE.apiVersion + "/status", {force});
            } else {
                d = await fetchJSON(endpoint("/status"), {force});
            }

            DOM.serverVersion.textContent = d.serverVersion ?? "-";
            DOM.onlineUsersCount.textContent = d.onlineUsersCount ?? "0";
            DOM.onlineUsersText.textContent = d.onlineUsers ?? "-";
            DOM.queuedUsers.textContent = d.queuedUsers ?? "0";
            DOM.activeGames.textContent = d.activeGames ?? "0";

            if (DOM.uptimeBar) {
                const pct = 95 + Math.random() * 5;
                DOM.uptimeBar.style.width = `${pct}%`;
            }
        } catch (err) {
            console.error("Status load failed:", err);
            DOM.serverVersion.textContent = "Unreachable";
            DOM.onlineUsersCount.textContent = "-";
            DOM.onlineUsersText.textContent = "Unavailable";
            DOM.queuedUsers.textContent = "-";
            DOM.activeGames.textContent = "-";
            if (DOM.uptimeBar) DOM.uptimeBar.style.width = "0%";

            if (DOM.panels.status) {
                DOM.panels.status.querySelectorAll(".status-error").forEach(e => e.remove());

                const errBox = document.createElement("div");
                errBox.className =
                    "status-error rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 animate-pop";
                errBox.textContent =
                    "Failed to load server status. Server may be offline or unreachable.";

                DOM.panels.status.prepend(errBox);
            }
        }
    };

    const extractGames = (data) => {
        if (!data) return [];
        // Modern way for multi mode games (vs so top)
        // Support Games: NHL14 / Legacy / NHL11
        if (STATE.apiVersion === "nhl14" || STATE.apiVersion === "nhllegacy" || STATE.apiVersion === "nhl11") {
            const key = STATE.mode.toLowerCase()
            return Array.isArray(data[key]) ? data[key] : [];
        }
        // Legacy Way for simpler legacy simple mode games
        // NHL10
        return Array.isArray(data) ? data : [];
    };

    const loadGames = async (force = false) => {
        if (!DOM.gamesList) return;

        // temporary loading message
        DOM.gamesList.innerHTML = `
          <div class="text-xs text-slate-400 p-3 animate-fade">Loading games…</div>
        `;

        try {
            // fetch the games via api
            const data = await fetchJSON(endpoint("/api/games"), {
                force,
                ttl: 5000,
            });

            // external helper for how to group the games by modern or legacy data type
            const games = extractGames(data);

            // Filler message when empty array is returned via api
            if (!games.length) {
                DOM.gamesList.innerHTML = `
                <div class="text-xs text-slate-400 p-3 animate-fade">
                    No recent games found.
                </div>`;
                return;
            }

            DOM.gamesList.innerHTML = games
                .slice(0, 30)
                .map((g) => {
                    const teams = Array.isArray(g.teams) ? g.teams : [];
                    const home = teams[0] || {};
                    const away = teams[1] || null;

                    const homeScore = home.score ?? 0;
                    const awayScore = away?.score ?? 0;

                    const winner =
                        away &&
                        (homeScore > awayScore
                            ? home.gamertag
                            : awayScore > homeScore
                                ? away.gamertag
                                : null);

                    return `
                    <div class="rounded-xl border border-slate-800 bg-black/75 p-4 lift animate-pop">
            
                      <div class="flex items-center justify-between">
                        <div class="text-sm font-semibold text-slate-100">
                          Game #${g.game_id}
                        </div>
                        <div class="text-[11px] text-slate-400">
                          ${escapeHtml(g.status ?? "Unknown")}
                        </div>
                      </div>
            
                      <div class="mt-1 text-[11px] text-slate-500">
                        Played: ${safeDate(g.created_at)}
                      </div>
            
                      <div class="mt-3 text-sm font-semibold text-slate-100 grid grid-cols-3 items-center">
            
                        <div class="truncate">
                          ${escapeHtml(home.gamertag ?? "Unknown")}
                          <span class="text-slate-500 text-[11px]">
                            (${escapeHtml(home.team_name ?? "Unknown")})
                          </span>
                        </div>
            
                        <div class="text-base text-center">
                          ${homeScore}${away ? ` - ${awayScore}` : ""}
                        </div>
            
                        <div class="truncate text-right">
                          ${ away ? `${escapeHtml(away.gamertag)}
                                 <span class="text-slate-500 text-[11px]">
                                   (${escapeHtml(away.team_name)})
                                 </span>` : `<span class="text-slate-500 text-[11px]">Solo Game</span>`
                                }
                        </div>
            
                      </div>
            
                      <div class="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex justify-between">
                          <span>Goals</span>
                          <span class="text-slate-100 font-medium">${g.totalGoals ?? 0}</span>
                        </div>
                        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex justify-between">
                          <span>Avg FPS</span>
                          <span class="text-slate-100 font-medium">
                            ${g.avgFps != null ? Math.round(g.avgFps) : "-"}
                          </span>
                        </div>
                        <div class="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 flex justify-between">
                          <span>Latency</span>
                          <span class="text-slate-100 font-medium">
                            ${g.avgLatency != null ? Math.round(g.avgLatency) + " ms" : "-"}
                          </span>
                        </div>
                      </div>
            
                    </div>
                  `;
                })
                .join("");
        } catch (err) {
            // catch when api fails or shitty code on apihandler
            console.error("Games load failed:", err);
            DOM.gamesList.innerHTML = `
              <div class="rounded-lg border border-rose-500/40 bg-rose-500/10
                p-4 text-xs text-rose-200 animate-pop">
                Failed to load games. Please try again.
              </div>
            `;
        }
    };

    // small helper for avatars via name
    const avatar = (text, size = 48) => {
        const initials = String(text || "?").slice(0, 2).toUpperCase();
        return `
          <span class="inline-flex items-center justify-center rounded-full
            bg-gradient-to-br from-blue-500/25 to-indigo-500/25
            border border-white/10 text-sm"
            style="width:${size}px;height:${size}px">
            ${escapeHtml(initials)}
          </span>
        `;
    };

    // request player from api
    const loadPlayers = async (force = false) => {
        if (!force && STATE.allPlayers.length) return renderPlayers();
        STATE.allPlayers = await fetchJSON(endpoint("/api/players"), {
            force,
            ttl: 60000,
        });
        renderPlayers();
    };

    // render players list
    const renderPlayers = () => {
        const q = DOM.searchInput.value.toLowerCase();
        DOM.playersList.innerHTML = STATE.allPlayers
            .filter((p) => p.toLowerCase().includes(q))
            .map(
                (p) => `
              <button data-name="${escapeHtml(p)}"
                class="group flex w-full items-center justify-between rounded-lg
                border border-slate-800 bg-slate-950/70 px-3 py-2.5
                hover:bg-slate-950 lift animate-pop">
                <span class="flex items-center gap-2">
                  ${avatar(p, 32)}
                  <span class="truncate font-medium">${escapeHtml(p)}</span>
                </span>
                <span class="text-xs text-slate-500">View →</span>
              </button>
            `)
            .join("");
    };


    const loadProfile = async (name) => {
        try {
            STATE.currentProfile = name;

            // get profile details via ap
            const profile = await fetchJSON(
                endpoint(`/api/player/${encodeURIComponent(name)}`),
                {force: false, ttl: 30000}
            );

            // fetch history of user via api
            const historyRaw = await fetchJSON(
                endpoint(`/api/user/${profile.userId}/history`),
                {force: false, ttl: 15000}
            );

            // isModern is for games with both vs and otp modes
            const isModern =
                STATE.apiVersion === "nhl14" || STATE.apiVersion === "nhllegacy" || STATE.apiVersion === "nhl11";

            // isModernOTP for games with otp mode support
            const isModernOTP =
                STATE.apiVersion === "nhl11";

            const totalGames = profile.totalGames ?? 0;
            const totalGoals = profile.totalGoals ?? 0;
            const avgGoals =
                totalGames > 0 ? (totalGoals / totalGames).toFixed(2) : "0.00";

            const vs = profile.VS || {games: 0, goals: 0};
            const so = profile.SO || {games: 0, goals: 0};
            const otp = profile.OTP || {games: 0, goals: 0};

            let historyList = [];

            // in case of modern titles with multiple modes, filter by them to lists
            if (isModern) {
                const key = STATE.mode.toLowerCase();
                historyList = Array.isArray(historyRaw?.[key])
                    ? historyRaw[key]
                    : [];
            } else {
                historyList = Array.isArray(historyRaw) ? historyRaw : [];
            }

            // sort by latest to not so latest
            historyList = historyList
                .slice()
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            // amount of games to render
            const historyLimit = isModern ? 10 : 5;

            DOM.profileOverview.innerHTML = `
                <div class="space-y-4 text-xs animate-fade">
                
                  <div class="rounded-xl border border-slate-800
                    bg-gradient-to-br from-slate-900 to-black p-5 lift animate-pop">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        ${avatar(profile.playerName)}
                        <div>
                          <div class="text-lg font-semibold text-slate-100">
                            ${escapeHtml(profile.playerName)}
                          </div>
                          <div class="text-[11px] text-slate-500">
                            ${totalGames} games • ${totalGoals} goals
                          </div>
                          <div class="text-[10px] text-slate-600">
                            User ID: ${profile.userId}
                          </div>
                        </div>
                      </div>
                      <div class="flex gap-2">
                        <button
                          class="px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900/80"
                          onclick="navigator.clipboard.writeText('${profile.playerName}')">
                          Copy name
                        </button>
                        <button
                          class="px-2 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-900/80"
                          onclick="navigator.clipboard.writeText('${profile.userId}')">
                          Copy ID
                        </button>
                      </div>
                    </div>
                  </div>
               
                  <div class="grid ${ isModern ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3" } gap-3">
                    ${ isModern ? `
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">VS Games</div>
                      <div class="text-lg font-semibold text-slate-100">${vs.games}</div>
                      <div class="text-[11px] text-slate-500">${vs.goals} goals</div>
                    </div>
                
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">SO Games</div>
                      <div class="text-lg font-semibold text-slate-100">${so.games}</div>
                      <div class="text-[11px] text-slate-500">${so.goals} goals</div>
                    </div>
                    ` : "" }
                    
                    ${ isModernOTP ? `
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">OTP Games</div>
                      <div class="text-lg font-semibold text-slate-100">${otp.games}</div>
                      <div class="text-[11px] text-slate-500">${otp.goals} goals</div>
                    </div>
                    ` : "" }
                
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">Games Played</div>
                      <div class="text-lg font-semibold text-slate-100">${totalGames}</div>
                    </div>
                
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">Total Goals</div>
                      <div class="text-lg font-semibold text-slate-100">${totalGoals}</div>
                    </div>
                
                    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                      <div class="text-[11px] text-slate-500">Goals / Game</div>
                      <div class="text-lg font-semibold text-slate-100">${avgGoals}</div>
                    </div>
                  </div>
                
                  <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 lift animate-pop">
                    <div class="text-sm font-semibold mb-3 text-slate-100">
                      Recent Matches (${isModern ? STATE.mode : "All"})
                    </div>
                
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      ${
                                historyList.length
                                    ? historyList.slice(0, historyLimit).map(h => `
                        <div class="rounded-lg border border-slate-800 bg-black/70 p-3 animate-fade">
                          <div class="flex justify-between text-xs font-medium text-slate-200">
                            <span>${escapeHtml(profile.playerName)}</span>
                            <span>${escapeHtml(h.opponent ?? "Unknown")}</span>
                          </div>
                
                          <div class="text-center text-base font-semibold text-slate-100">
                            ${(h.scor ?? h.score ?? 0)} - ${(h.opponent_score ?? 0)}
                          </div>
                
                          <div class="flex justify-between text-[10px] text-slate-400">
                            <span>${escapeHtml(h.tnam ?? h.team_name ?? "-")}</span>
                            <span>${escapeHtml(h.opponent_team ?? "-")}</span>
                          </div>
                
                          <div class="mt-1 text-[10px] text-slate-500">
                            ${safeDate(h.created_at)}
                          </div>
                        </div>
                      `).join("")
                                    : `<div class="text-slate-500 text-xs">No matches found.</div>`
                            }
                    </div>
                  </div>
                
                </div>
                `;
            DOM.profileRaw.textContent = JSON.stringify(
                {profile, history: historyRaw},
                null,
                2
            );
        } catch (err) {
            // Catch incase server fails with playerdata
            console.error("Profile load failed:", err);
            DOM.profileOverview.innerHTML = `
              <div class="rounded-lg border border-rose-500/40 bg-rose-500/10
                p-4 text-xs text-rose-200 animate-pop">
                Failed to load player profile.
              </div>
            `;
        }
    };

    // Leaderboars logic
    const loadLeaderboards = async (force = false) => {
        // retrieve data via api
        const data = await fetchJSON(
            endpoint(`/api/leaderboard/${STATE.leaderboardRange}`),
            {force, ttl: 60000}
        );

        // make top5 of the data
        // TODO: add catches for nulls or empty objects to fix shitty 11 db problems
        const top5 = data.slice(0, 5);

        // Simple category sort
        // TODO: More indepth way to generate these to backend as this is not perfect
        const categories = [
            {label: "Total Goals", value: (p) => p.totalGoals},
            {
                label: "Goals / Game",
                value: (p) => (p.totalGoals / p.gamesPlayed).toFixed(2),
            },
            {label: "Games Played", value: (p) => p.gamesPlayed},
        ];

        // render
        DOM.leaderboards.innerHTML = categories.map(cat => `
          <div class="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 animate-pop">
            <div class="mb-1 text-[11px] font-medium text-slate-200">
              ${cat.label}
            </div>
            <div class="space-y-1 text-[11px]">
              ${top5.map((p, i) => `
                <div class="flex justify-between">
                  <span>${i + 1}. ${escapeHtml(p.gamertag)}</span>
                  <span>${cat.value(p)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("");
    };

    // Game version menu
    const setupVersionMenu = () => {
        // hide after click
        DOM.versionToggle.onclick = () =>
            DOM.versionMenu.classList.toggle("hidden");

        // reset all and refresh on change
        DOM.versionMenu.querySelectorAll("[data-value]").forEach((i) => {
            i.onclick = () => {
                STATE.apiVersion = i.dataset.value;
                DOM.versionLabel.textContent = i.textContent.trim();
                STATE.cache.clear();
                STATE.allPlayers = [];
                STATE.currentProfile = null;
                STATE.mode = "VS";
                DOM.modeLabel.textContent = "VS";
                if (DOM.profileOverview) {
                    DOM.profileOverview.innerHTML =
                        '<div class="text-xs text-slate-500">Select a player…</div>';
                }
                if (DOM.profileRaw) DOM.profileRaw.textContent = "";
                const isModern =
                    STATE.apiVersion === "nhl14" || STATE.apiVersion === "nhllegacy" || STATE.apiVersion === "nhl11";
                DOM.vsSoWrapper.classList.toggle("hidden", !isModern);
                if (STATE.activeTab === "status") loadStatus(true);
                if (STATE.activeTab === "games") loadGames(true);
                if (STATE.activeTab === "players") {
                    loadPlayers(true);
                    loadLeaderboards(true);
                }
            };
        });
    };

    // mode menu for changing game mode type on selected games
    const setupModeMenu = () => {
        DOM.modeToggleBtn.onclick = () =>
            DOM.modeMenu.classList.toggle("hidden");

        DOM.modeMenu.querySelectorAll("[data-mode]").forEach((i) => {
            i.onclick = () => {
                STATE.mode = i.dataset.mode;
                STATE.cache.clear();
                DOM.modeLabel.textContent = STATE.mode;
                DOM.modeMenu.classList.add("hidden");
                if (STATE.activeTab === "games") loadGames(true);
                if (STATE.activeTab === "players") {
                    loadLeaderboards(true);
                    if (STATE.currentProfile) loadProfile(STATE.currentProfile);
                }
            };
        });
    };

    // load theme on load from localstorage
    const loadTheme = () => {
        // NOTE: z_theme as local tests can have "theme" theoretically on other things/projects
        const saved = localStorage.getItem("z_theme") || "dark";
        applyTheme(saved);
    };

    // Applying theme
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

    /// Toggle theme and save to local storage
    const toggleTheme = () => {
        const isLight = document.body.classList.contains("theme-light");
        const next = isLight ? "dark" : "light";
        applyTheme(next);
        // NOTE: z_theme as local tests can have "theme" theoretically on other things/projects
        localStorage.setItem("z_theme", next);
    };

    const addEvents = () => {
        // handle tab selects
        DOM.tabs.forEach((b) =>
            b.addEventListener("click", () => selectTab(b.dataset.tab))
        );

        // handle sidebar
        DOM.menuToggle?.addEventListener("click", () => {
            if (!DOM.sidebar) return;
            DOM.sidebar.classList.remove("-translate-x-full");
        });

        // mobile sidebar
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

        // sidebar closing
        DOM.sidebarClose?.addEventListener("click", (e) => {
            e.stopPropagation();
            DOM.sidebar.classList.add("-translate-x-full");
        });

        // refresh buttons
        DOM.statusRefresh.onclick = () => loadStatus(true);
        DOM.gamesRefresh.onclick = () => loadGames(true);
        DOM.refreshPlayers.onclick = () => loadPlayers(true);
        DOM.searchInput.oninput = renderPlayers;

        // load player on player click
        DOM.playersList.onclick = (e) => {
            const btn = e.target.closest("button[data-name]");
            if (btn) loadProfile(btn.dataset.name);
        };

        // handle prove
        DOM.profileTabOverview.onclick = () => {
            DOM.profileOverview.classList.remove("hidden");
            DOM.profileRaw.classList.add("hidden");
        };

        // handle theme toggle
        DOM.themeToggle?.addEventListener("click", toggleTheme);

        // handle raw tab
        DOM.profileTabRaw.onclick = () => {
            DOM.profileOverview.classList.add("hidden");
            DOM.profileRaw.classList.remove("hidden");
        };

        // handle copy json
        DOM.copyJsonBtn.onclick = () =>
            navigator.clipboard.writeText(DOM.profileRaw.textContent);

        // handle leaderboard range changes
        DOM.lbWindowButtons.forEach((btn) =>
            btn.addEventListener("click", () => {
                STATE.leaderboardRange = btn.dataset.window;
                loadLeaderboards(true);
            })
        );
    };

    // init on page load
    const init = () => {
        loadTheme();
        setupVersionMenu();
        setupModeMenu();
        addEvents();
        selectTab(STATE.activeTab);
    };

    return {init};
})();

//Init ZamboniWebsite
App.init();
