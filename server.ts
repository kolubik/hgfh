import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";
import zlib from "zlib";

const app = express();
const PORT = 3000;

app.use(express.json());

// Cache memory
let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL = 300000; // 5 minutes

function fetchSkinportData(): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.skinport.com',
            port: 443,
            path: '/v1/items?app_id=730&currency=USD',
            method: 'GET',
            headers: {
                'Accept-Encoding': 'br',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        };

        const req = https.request(options, (res) => {
            let chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                
                if (res.statusCode !== 200) {
                   return reject(new Error(`Skinport returned ${res.statusCode}`));
                }

                if (res.headers['content-encoding'] === 'br') {
                    zlib.brotliDecompress(buffer, (err, decoded) => {
                        if (err) return reject(err);
                        try {
                            resolve(JSON.parse(decoded.toString()));
                        } catch (e) {
                            reject(e);
                        }
                    });
                } else if (res.headers['content-encoding'] === 'gzip') {
                    zlib.gunzip(buffer, (err, decoded) => {
                        if (err) return reject(err);
                        try {
                            resolve(JSON.parse(decoded.toString()));
                        } catch (e) {
                            reject(e);
                        }
                    });
                } else {
                    try {
                        resolve(JSON.parse(buffer.toString()));
                    } catch (e) {
                        reject(new Error("Invalid JSON from Skinport"));
                    }
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

// API Routes
app.all("/api/market/live", async (req, res) => {
    try {
        const keys = req.body?.keys || {};
        
        // TODO: In the future, we can add logic to fetch from CSFloat, DMarket, Buff163
        // if keys.csfloatKey, keys.dmarketPubKey, etc. are provided.
        // For now, we rely on the Skinport open API.

        const now = Date.now();
        if (cachedData && (now - lastFetchTime < CACHE_TTL)) {
            return res.json({ source: 'cache', data: cachedData });
        }

        const data = await fetchSkinportData();
        cachedData = data;
        lastFetchTime = now;
        res.json({ source: 'live', data: cachedData });
    } catch (error) {
        console.error("API Error:", error);
        // If we have stale cache, serve it to prevent UI crash
        if (cachedData) {
            return res.json({ source: 'stale_cache', data: cachedData });
        }
        res.status(500).json({ error: error.message || "Failed to fetch live market data." });
    }
});

async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        // Note: use get('*') for express 4
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
}

startServer();
