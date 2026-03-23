# BridgeIQ

**AI-powered decision support for evaluating creator–legacy media partnerships.**

Drop in a creator URL. Select a legacy media partner. Get an instant bridge score, risk analysis, deal structure recommendation, and executive memo.

Built on the [Creator-Legacy Media Framework](https://github.com/your-username/bridgeiq), which argues that creator-legacy partnerships fail due to structural incentive misalignment — not cultural incompatibility.

## How It Works

1. **Paste a creator URL** — YouTube, TikTok, Instagram, X, podcast
2. **Select a legacy partner** — ESPN, Netflix, Disney, Amazon MGM, or define custom
3. **Get the bridge assessment** — 10-dimension score (100pt), archetype classification, risk flags, and a ready-to-forward executive memo

Under the hood, BridgeIQ runs three sequential AI calls:
- **Research** — Web search to build a creator intelligence profile
- **Score** — 26 sub-questions across 10 weighted dimensions
- **Memo** — Strategic analysis and executive-ready output

## Scoring Model

| Dimension | Weight |
|-----------|--------|
| Strategic Complementarity | 18 |
| Incentive Alignment | 16 |
| Creator Autonomy Preservation | 14 |
| Durability of Value Creation | 12 |
| Business Model Fit | 10 |
| Studio Unlock Value | 8 |
| Creator Distinctiveness & Trust | 8 |
| Operational Feasibility | 6 |
| Audience / IP Relevance | 5 |
| Reach / Visibility Utility | 3 |

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create bridgeiq --public --push
```

### 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `bridgeiq` repository
3. Vercel auto-detects Vite — no config changes needed
4. Add your environment variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your API key from [console.anthropic.com](https://console.anthropic.com/)
5. Click **Deploy**

Your app will be live at `bridgeiq.vercel.app` (or similar) within ~60 seconds.

### 3. Custom domain (optional)

In Vercel dashboard → Settings → Domains, add a custom domain if desired.

## Local Development

```bash
npm install
cp .env.example .env        # Add your API key
npm run dev                  # Runs on http://localhost:5173
```

Note: In local dev, API calls proxy through Vite to the serverless function. You'll need to run the Vercel dev server for full functionality:

```bash
npx vercel dev              # Runs both frontend + serverless functions
```

## Tech Stack

- React 18 + Vite
- Recharts (radar + bar charts)
- Lucide React (icons)
- Vercel Serverless Functions (API proxy)
- Anthropic Claude API (Sonnet 4)

## Architecture

```
bridgeiq/
├── api/
│   └── bridge.js          # Serverless proxy — adds API key, forwards to Anthropic
├── src/
│   ├── main.jsx           # React entry
│   └── BridgeIQ.jsx       # Full app — engine, UI, prompts
├── vercel.json            # Vercel routing config
├── vite.config.js         # Vite + dev proxy
└── package.json
```

The API key never touches the browser. All Anthropic calls route through `/api/bridge`, which injects the key server-side.
