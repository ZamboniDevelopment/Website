const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_BASE = "https://zamboni.gg";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/statistics", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "statistics-page.html"));
});

// LEGACY: THIS WILL GET REMOVED LATER BUT KEPT NOW TO WORK WITH LEGACY ROUTELINKS
app.get("/faq", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Temp server side status proxy fetches http game server endpoints and serves them ovr https to avoid mixed content browser errors
const TEMP_STATUS_TARGETS = {
    nhl10:     "https://zamboni.gg/nhl10/status",
    nhl11:     "http://zamboni.gg:8081/nhl11/status",
    nhl14:     "http://zamboni.gg:8082/nhl14/status",
    nhllegacy: "http://zamboni.gg:8083/nhllegacy/status",
};

app.get("/temp/status/:version", async (req, res) => {
    const target = TEMP_STATUS_TARGETS[req.params.version];

    if (!target) {
        return res.status(404).json({ error: "Unknown version" });
    }

    const start = Date.now();
    console.log(`-> [temp/status] ${req.params.version} → ${target}`);

    try {
        const response = await fetch(target, {
            headers: { Accept: "application/json" },
            //self-signed / http without redirect to https
            redirect: "follow",
        });

        if (!response.ok) {
            throw new Error(`Upstream HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`<- [temp/status] ${req.params.version} OK (${Date.now() - start}ms)`);

        res.setHeader("Cache-Control", "no-store");
        res.json(data);

    } catch (err) {
        console.error(`X [temp/status] ${req.params.version} failed (${Date.now() - start}ms):`, err.message);
        res.status(502).json({ error: "Upstream unreachable", message: err.message });
    }
});

// Proxy due to cors on development server. USE IF RUNNING LOCAL OR REMOTE FROM SERVBER
const isLocal = process.argv.includes("--local");
if (isLocal) {
    const proxyPaths = [
        /^\/nhl10\/.*/,
        /^\/nhl11\/.*/,
        /^\/nhl14\/.*/,
        /^\/nhllegacy\/.*/,
        /^\/api\/.*/,
        /^\/status\/.*/
    ];

    app.use(proxyPaths, async (req, res) => {
        const targetUrl = TARGET_BASE + req.originalUrl;
        const start = Date.now();

        console.log(`-> Proxying [${req.method}] ${targetUrl}`);

        try {
            const response = await fetch(targetUrl, {
                method: req.method,
                headers: {
                    ...req.headers,
                    host: undefined
                },
                body: ["GET", "HEAD"].includes(req.method)
                    ? undefined
                    : JSON.stringify(req.body)
            });

            const contentType = response.headers.get("content-type") || "";

            res.status(response.status);

            response.headers.forEach((value, key) => {
                if (key.toLowerCase() !== "transfer-encoding") {
                    res.setHeader(key, value);
                }
            });

            if (contentType.includes("application/json")) {
                const data = await response.json();
                res.json(data);
            } else if (contentType.includes("text")) {
                const text = await response.text();
                res.send(text);
            } else {
                const buffer = Buffer.from(await response.arrayBuffer());
                res.send(buffer);
            }

            console.log(`<- ${response.status} (${Date.now() - start}ms)`);

        } catch (err) {
            console.error(`X - Proxy failed (${Date.now() - start}ms):`, err.message);
            res.status(500).json({
                error: "Proxy failed",
                message: err.message
            });
        }
    });
}

app.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT} (${isLocal ? "PROXY MODE" : "PRODUCTION MODE"})`
    );
});