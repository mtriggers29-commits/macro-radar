// ─────────────────────────────────────────────────────────────────────────────
// Macro Radar — Local API Proxy  v1.0
// Forwards browser requests to api.anthropic.com (bypasses CORS on localhost)
//
// SETUP (one-time):
//   npm install express http-proxy-middleware
//
// RUN:
//   ANTHROPIC_API_KEY=sk-ant-... node proxy.js
//
// Then open: http://localhost:8080
// The dashboard will automatically use this proxy when on localhost.
//
// SECURITY: Never expose this proxy to the internet. Local use only.
// ─────────────────────────────────────────────────────────────────────────────

const express    = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path       = require("path");
const fs         = require("fs");

const PORT       = 8080;
const API_KEY    = process.env.ANTHROPIC_API_KEY || "";
const DIST_DIR   = __dirname; // serves index.html from same folder

if (!API_KEY) {
  console.error("⚠  Set ANTHROPIC_API_KEY environment variable before starting.");
  console.error("   Example: ANTHROPIC_API_KEY=sk-ant-... node proxy.js");
  process.exit(1);
}

const app = express();

// ── 1. Proxy /api/anthropic → https://api.anthropic.com ──────────────────────
// Injects the API key so the browser never needs to hold it.
app.use(
  "/api/anthropic",
  createProxyMiddleware({
    target: "https://api.anthropic.com",
    changeOrigin: true,
    pathRewrite: { "^/api/anthropic": "" },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("x-api-key",         API_KEY);
        proxyReq.setHeader("anthropic-version",  "2023-06-01");
        proxyReq.setHeader("content-type",       "application/json");
        // Remove origin so Anthropic doesn't see localhost
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
      },
      error: (err, req, res) => {
        console.error("Proxy error:", err.message);
        res.status(502).json({ error: { message: "Proxy error: " + err.message } });
      },
    },
    logger: console,
  })
);

// ── 2. Serve static files (index.html etc.) ───────────────────────────────────
app.use(express.static(DIST_DIR));

// ── 3. Fallback to index.html for SPA routing ─────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✓  Macro Radar proxy running at http://localhost:${PORT}`);
  console.log(`   API key: ${API_KEY.slice(0,12)}...${API_KEY.slice(-4)}`);
  console.log(`   Press Ctrl+C to stop\n`);
});
