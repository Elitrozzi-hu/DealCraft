# DealCraft — AI Sales Intelligence Engine

Battle-ready deal preparation for Humand AEs. Select a HubSpot deal or enter a new prospect and get a full AE brief + sales deck content in seconds.

---

## Setup in 5 steps

### 1. Install dependencies

```bash
cd dealcraft-backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```
SUPABASE_URL=https://gohdesxtidzhfefpzicj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ANTHROPIC_API_KEY=sk-ant-...
LUSHA_API_KEY=your_lusha_key
PORT=3001
```

### 3. Add knowledge base files

Place these two files in `dealcraft-backend/`:
- `humand_solutions_map.json`
- `humand_sales_deck_prompt_EN.txt`

### 4. Start the backend

```bash
npm start
# or for hot reload:
npm run dev
```

The API runs on `http://localhost:3001`. Check `GET /health` to verify.

### 5. Open the frontend

Open `dealcraft-frontend/index.html` in your browser, or visit the GitHub Pages URL.

The frontend connects to `http://localhost:3001` by default.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check + env status |
| GET | `/api/deals` | List deals (`?search=`, `?limit=`) |
| GET | `/api/deals/:id` | Single deal |
| GET | `/api/deals/:id/contacts` | Deal contacts |
| POST | `/api/enrich` | Enrich company (Lusha + scrape) |
| POST | `/api/brief` | Generate AE Brief |
| POST | `/api/deck` | Generate deck content + write to Sheets |
| POST | `/api/generate` | Full pipeline (brief + optional deck) |
| GET | `/api/debug/tables` | Inspect Supabase table schemas |

### POST /api/brief

```json
{
  "deal_id": "123",
  "additional_context": "They mentioned retention issues in last call"
}
```

Or for a new prospect:

```json
{
  "deal_data": {
    "company_name": "Acme Logistics",
    "domain": "acmelogistics.com",
    "industry": "Transportation"
  },
  "additional_context": "~3,000 drivers, looking to replace WhatsApp groups"
}
```

### POST /api/deck

```json
{
  "brief": { ...ae_brief_json... },
  "deal_data": { "hubspot_deal_id": "456", "company_name": "Acme" },
  "apps_script_url": "https://script.google.com/.../exec"
}
```

---

## Deploy to production (Railway / Render)

1. Push `dealcraft-backend/` to a GitHub repo
2. Connect to Railway or Render
3. Set environment variables in the dashboard
4. Update the `API` constant in `index.html` from `localhost:3001` to your production URL

---

## Architecture

```
Frontend (GitHub Pages)
  └── index.html  ──────────────────────────► Backend (localhost:3001)
                                                ├── /api/deals  ←── Supabase
                                                ├── /api/enrich ←── Lusha API + cheerio scraper
                                                ├── /api/brief  ←── Claude claude-sonnet-4-20250514
                                                └── /api/deck   ←── Google Sheets API + Apps Script
```
