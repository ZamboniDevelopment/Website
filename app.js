const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_BASE = "https://zamboni.gg";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes for pages
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "landing-page.html"));
});

app.get("/statistics", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "statistics-page.html"));
});

app.get("/faq", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "faq-page.html"));
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

            // headers
            response.headers.forEach((value, key) => {
                if (key.toLowerCase() !== "transfer-encoding") {
                    res.setHeader(key, value);
                }
            });

            // resptypes
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