const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = (...a) => import("node-fetch").then(({ default: f }) => f(...a));

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "landing-page.html"));
});

app.get("/statistics", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "statistics-page.html"));
});

app.get("/faq", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "faq-page.html"));
});

// proxy due to cors on zamboni.gg
const isLocal = process.argv.includes("--local");
if (isLocal) {
    const proxyHandler = async (req, res) => {
        const target = `https://zamboni.gg${req.originalUrl}`;
        const start = Date.now();
        console.log(`🔄 Proxying -> [${req.method}] ${target}`);
        try {
            const r = await fetch(target);
            const data = await r.text();
            const ms = Date.now() - start;

            console.log(
                `Response <- ${r.status} (${ms}ms)\n` +
                `Content-Type: ${r.headers.get("content-type")}\n` +
                `Short Preview: ${data.substring(0, 25)}\n`
                + "-----------------------------------------"
            );
            res.set("content-type", r.headers.get("content-type") || "text/plain");
            res.send(data);
        } catch (e) {
            const ms = Date.now() - start;
            console.log(
                `FAILED ← (${ms}ms)\n` +
                `Error: ${e.message}\n` +
                "-----------------------------------------"
            );
            res.status(500).send(`Proxy failed: ${e.message}`);
        }
    };
    app.use(
        [
            /^\/nhl10\/.*/,
            /^\/nhl11\/.*/,
            /^\/legacy\/.*/,
            /^\/api\/.*/
        ],
        proxyHandler
    );
}

app.listen(port, () => console.log(`→ http://localhost:${port} (${isLocal ? "PROXY" : "PRODUCTION"})`));
