const express = require("express");
const cors = require("cors");
const path = require("path");
const { createProxyMiddleware, responseInterceptor } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_BASE = "https://zamboni.gg";

// rinkside proxy
const RINKSIDE_TARGET = "https://nhllegacy.duckdns.org";
const RINKSIDE_TARGET_HOST = "nhllegacy.duckdns.org";
const RINKSIDE_PREFIX = "/rinkside";
function rinksideIsDownload(p) {
    return typeof p === "string" && p.includes("/download/");
}
function rinksideHasPrefix(p) {
    return p === RINKSIDE_PREFIX || p.startsWith(RINKSIDE_PREFIX + "/") ||
        p.startsWith(RINKSIDE_PREFIX + "?") || p.startsWith(RINKSIDE_PREFIX + "#");
}
function rinksideMapPath(p) {
    if (typeof p !== "string" || !p.startsWith("/") || p.startsWith("//")) return p;
    if (rinksideIsDownload(p)) return RINKSIDE_TARGET + p;
    if (rinksideHasPrefix(p)) return p;
    return RINKSIDE_PREFIX + p;
}
function rinksideRewriteLocation(loc) {
    for (const origin of [`https://${RINKSIDE_TARGET_HOST}`, `http://${RINKSIDE_TARGET_HOST}`]) {
        if (loc.startsWith(origin)) {
            const rest = loc.slice(origin.length) || "/";
            return rinksideIsDownload(rest) ? loc : rinksideMapPath(rest);
        }
    }
    return rinksideMapPath(loc);
}
const RINKSIDE_ORIGIN_RE = new RegExp(
    `(?:https?:)?//${RINKSIDE_TARGET_HOST.replace(/\./g, "\\.")}(/[^\\s"'<>)\`\\\\]*)?`,
    "g"
);
function rinksideReplaceOrigin(text) {
    return text.replace(RINKSIDE_ORIGIN_RE, (match, p) => {
        const p2 = p || "/";
        return rinksideIsDownload(p2) ? match : RINKSIDE_PREFIX + p2;
    });
}
function rinksidePatchPathname(text) {
    return text.replace(
        /(?<![\w$.])(?:(?:window|document|self|globalThis)\.)?location\.pathname\b(?!\s*=(?!=))/g,
        '(typeof __rsPath==="function"?__rsPath():location.pathname)'
    );
}
function rinksideRewriteMarkup(text) {
    return rinksideReplaceOrigin(text)
        .replace(
            /(\s(?:href|src|action|poster|data-src|formaction)\s*=\s*["'])(\/(?!\/)[^"']*)/gi,
            (m, attr, p) => attr + rinksideMapPath(p)
        )
        .replace(
            /(content\s*=\s*["']\s*\d+\s*;\s*url\s*=\s*)(\/(?!\/)[^"']*)/gi,
            (m, pre, p) => pre + rinksideMapPath(p)
        )
        .replace(
            /url\(\s*(['"]?)(\/(?!\/)[^'")]*)/gi,
            (m, q, p) => `url(${q}${rinksideMapPath(p)}`
        );
}

// injection to keep fetch, XHR, history etc working
const RINKSIDE_CLIENT_PATCH = `<script>(function(){
var P=${JSON.stringify(RINKSIDE_PREFIX)},O=location.origin,H=${JSON.stringify(RINKSIDE_TARGET_HOST)},T="https://"+H;
function isDl(u){return u.indexOf("/download/")!==-1;}
function hasP(u){return u===P||u.indexOf(P+"/")===0||u.indexOf(P+"?")===0||u.indexOf(P+"#")===0;}
function fix(u){
  if(typeof u!=="string")return u;
  var o=["https://"+H,"http://"+H,"//"+H];
  for(var i=0;i<o.length;i++){if(u.indexOf(o[i])===0){var r=u.slice(o[i].length)||"/";return isDl(r)?u:fix(r);}}
  if(u.indexOf(O+"/")===0||u===O)u=u.slice(O.length)||"/";
  if(u.charAt(0)==="/"&&u.charAt(1)!=="/"){
    if(isDl(u))return T+u;
    if(!hasP(u))return P+u;
  }
  return u;
}
window.__rsFix=fix;
window.__rsPath=function(){var p=location.pathname;return hasP(p)?(p.slice(P.length)||"/"):p;};

var f=window.fetch;
if(f){window.fetch=function(i,o){
  if(typeof i==="string")i=fix(i);
  else if(i instanceof URL)i=fix(i.href);
  else if(i&&i.url){var n=fix(i.url);if(n!==i.url)i=new Request(n,i);}
  return f.call(this,i,o);
};}
var xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){arguments[1]=fix(u instanceof URL?u.href:u);return xo.apply(this,arguments);};
["pushState","replaceState"].forEach(function(k){var h=history[k];history[k]=function(s,t,u){return h.call(this,s,t,u==null?u:fix(String(u)));};});
["assign","replace"].forEach(function(k){try{var h=Location.prototype[k];Location.prototype[k]=function(u){return h.call(this,fix(String(u)));};}catch(e){}});
var wo=window.open;window.open=function(u){if(u!=null)arguments[0]=fix(String(u));return wo.apply(this,arguments);};
var ATTRS=["href","src","action","formaction","poster"];
function fixEl(el){
  if(!el||el.nodeType!==1)return;
  for(var i=0;i<ATTRS.length;i++){var a=ATTRS[i],v=el.getAttribute&&el.getAttribute(a);if(v){var n=fix(v);if(n!==v)el.setAttribute(a,n);}}
}
function fixTree(root){fixEl(root);if(root.querySelectorAll){var l=root.querySelectorAll("[href],[src],[action],[formaction],[poster]");for(var i=0;i<l.length;i++)fixEl(l[i]);}}
new MutationObserver(function(ms){ms.forEach(function(m){
  if(m.type==="attributes")fixEl(m.target);
  else for(var i=0;i<m.addedNodes.length;i++)fixTree(m.addedNodes[i]);
});}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:ATTRS});
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(a)fixEl(a);},true);
document.addEventListener("submit",function(e){fixEl(e.target);},true);
if(window.navigation&&navigation.addEventListener){
  navigation.addEventListener("navigate",function(e){
    try{
      var d=new URL(e.destination.url);
      if(d.origin===O&&!hasP(d.pathname)&&!e.hashChange&&!e.downloadRequest){
        e.preventDefault();location.assign(fix(d.pathname+d.search+d.hash));
      }
    }catch(_){}
  });
}
})();</script>`;
app.get(RINKSIDE_PREFIX, (req, res) => {
    const qs = req.originalUrl.slice(RINKSIDE_PREFIX.length);
    res.redirect(301, RINKSIDE_PREFIX + "/" + qs);
});
app.use((req, res, next) => {
    if (rinksideHasPrefix(req.path) && rinksideIsDownload(req.originalUrl)) {
        return res.redirect(302, RINKSIDE_TARGET + req.originalUrl.slice(RINKSIDE_PREFIX.length));
    }
    next();
});

const rinksideProxy = createProxyMiddleware({
    target: RINKSIDE_TARGET,
    changeOrigin: true,
    secure: true,
    ws: true,
    pathFilter: (p) => p === RINKSIDE_PREFIX || p.startsWith(RINKSIDE_PREFIX + "/"),
    pathRewrite: { [`^${RINKSIDE_PREFIX}`]: "" },
    cookieDomainRewrite: "",
    cookiePathRewrite: { "*": RINKSIDE_PREFIX },
    selfHandleResponse: true,
    on: {
        proxyReq: (proxyReq, req) => {
            // fake origin
            if (req.headers.origin) proxyReq.setHeader("origin", RINKSIDE_TARGET);
            if (req.headers.referer) {
                try {
                    const ref = new URL(req.headers.referer);
                    const refPath = rinksideHasPrefix(ref.pathname)
                        ? ref.pathname.slice(RINKSIDE_PREFIX.length) || "/"
                        : ref.pathname;
                    proxyReq.setHeader("referer", RINKSIDE_TARGET + refPath + ref.search);
                } catch (_) {}
            }
        },
        proxyRes: responseInterceptor(async (buffer, proxyRes, req, res) => {
            if (proxyRes.headers.location) {
                res.setHeader("location", rinksideRewriteLocation(proxyRes.headers.location));
            }

            // bypass csp
            res.removeHeader("content-security-policy");
            res.removeHeader("content-security-policy-report-only");
            res.setHeader("referrer-policy", "same-origin");

            const type = (proxyRes.headers["content-type"] || "").toLowerCase();

            if (type.includes("text/html")) {
                let html = rinksidePatchPathname(rinksideRewriteMarkup(buffer.toString("utf8")));
                html = html.replace(/<meta[^>]+name\s*=\s*["']referrer["'][^>]*>/gi, "");
                html = /<head[^>]*>/i.test(html)
                    ? html.replace(/<head[^>]*>/i, (m) => m + RINKSIDE_CLIENT_PATCH)
                    : RINKSIDE_CLIENT_PATCH + html;
                return html;
            }
            if (type.includes("text/css")) {
                return rinksideRewriteMarkup(buffer.toString("utf8"));
            }
            if (type.includes("javascript")) {
                return rinksidePatchPathname(rinksideReplaceOrigin(buffer.toString("utf8")));
            }
            if (type.includes("application/json")) {
                return rinksideReplaceOrigin(buffer.toString("utf8"));
            }
            return buffer;
        }),
        error: (err, req, res) => {
            console.error(`X [rinkside] ${req.url}:`, err.message);
            if (res.writeHead && !res.headersSent) {
                res.writeHead(502, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Rinkside unreachable", message: err.message }));
            }
        }
    }
});
app.use(rinksideProxy);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.disable("x-powered-by");

app.get("/llms.txt", (req, res) => {
    res.type("text/plain");

    const llmsTxtContent = `# Zamboni
                                > Community-run private servers for classic NHL games on RPCS3.

                                ## Core Pages

                                - [/](https://zamboni.gg): The main landing page for Zamboni private servers, including setup requirements and project information.
                                - [/statistics](https://zamboni.gg/statistics): Real-time server diagnostics, player counts, and network matchmaking statistics across all supported NHL iterations.

                                ## Supported Titles

                                - **NHL 10**
                                - **NHL 11**
                                - **NHL 12**
                                - **NHL 13**
                                - **NHL 14**
                                - **NHL 15**
                                - **NHL Legacy Edition**`;
    res.send(llmsTxtContent);
});

app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nAllow: /\nSitemap: https://zamboni.gg");
});

app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    const today = new Date().toISOString().split("T")[0];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
                            <urlset xmlns="http://sitemaps.org">
                                <url>
                                    <loc>https://zamboni.gg</loc>
                                    <lastmod>${today}</lastmod>
                                    <changefreq>daily</changefreq>
                                    <priority>1.0</priority>
                                </url>
                                <url>
                                    <loc>https://zamboni.gg/statistics</loc>
                                    <lastmod>${today}</lastmod>
                                    <changefreq>hourly</changefreq>
                                    <priority>0.8</priority>
                                </url>
                            </urlset>`;
    res.send(sitemap);
});

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
    nhl12:     "http://zamboni.gg:8085/nhl12/status",
    nhl13:     "http://zamboni.gg:8086/nhl13/status",
    nhl14:     "http://zamboni.gg:8082/nhl14/status",
    nhl15:     "http://zamboni.gg:8087/nhl15/status",
    nhllegacy: "http://zamboni.gg:8083/nhllegacy/status"
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
        /^\/nhl12\/.*/,
        /^\/nhl13\/.*/,
        /^\/nhl14\/.*/,
        /^\/nhl15\/.*/,
        /^\/nhllegacy\/.*/,
        /^\/hut12\/.*/,
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

// rinkiside patch
app.use((req, res, next) => {
    let ref;
    try { ref = new URL(req.headers.referer || ""); } catch (_) { return next(); }
    if (ref.host !== req.headers.host || !rinksideHasPrefix(ref.pathname)) return next();

    const target = rinksideMapPath(req.originalUrl);
    if (target === req.originalUrl) return next();
    res.redirect(["GET", "HEAD"].includes(req.method) ? 302 : 307, target);
});

const server = app.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT} (${isLocal ? "PROXY MODE" : "PRODUCTION MODE"})`
    );
});
server.on("upgrade", rinksideProxy.upgrade);