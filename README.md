# CardPal

CardPal is a mobile-first MVP that helps collectors decide whether to **BUY**, **NEGOTIATE**, or **WALK** when buying Pokemon cards at shows.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Server-side API routes for Pokemon TCG API proxying

## Environment Variables

Create a `.env.local` file:

```bash
POKEMON_TCG_API_KEY=your_api_key_here
```

CardPal reads `POKEMON_TCG_API_KEY` (and falls back to `POKEMON_API_KEY` if needed).

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Routes

- `GET /api/cards/search?q=`: search cards and return normalized list
- `GET /api/cards/[id]`: fetch normalized card detail + tcgplayer variants
- `POST /api/evaluate`: evaluate asking price based on condition and mode

### Evaluate payload

```json
{
  "cardId": "base1-4",
  "askingPrice": 150,
  "condition": "LP",
  "mode": "standard"
}
```
