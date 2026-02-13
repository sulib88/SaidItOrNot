# Said It Or Not — Monorepo

A fact-or-fiction game where players test their knowledge by guessing if quotes were really said by famous figures or AI-generated.

This repository contains two apps:
- **backend**: Express API serving quotes from JSON datasets and integrating OpenAI for AI-generated quotes
- **frontend**: Next.js game UI with professional UX, dark/light theme, stats tracking, and badge rewards

## Running Locally

**Backend** (Terminal 1):
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3001`

**Frontend** (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

Set `NEXT_PUBLIC_API_BASE=http://localhost:3001` if backend is on a different URL.

## Features

### Backend
- **GET /api/authors** — Returns list of authors (name, title, image URL)
- **POST /api/quote/random** — Returns a random quote (real or AI-generated) with request_id
- **POST /api/quote/verify** — Verifies player's guess (yes/no) and returns correctness

### Frontend
- **Welcome screen** — Player name input with polished typography
- **Author selection** — Card-based grid with author images and titles
- **Game screen** — Large, readable quote with Yes/No buttons
- **Real-time stats** — Correct count, wrong count, accuracy %, win/loss streaks
- **Badge rewards** — Automated badge awards for streak milestones (10, 15, 20 correct)
- **Theme support** — Light/dark mode toggle with persistent preference
- **Responsive design** — Mobile-first layout optimized for all screen sizes
- **Smooth animations** — Button hover effects, badge pop-ins, message fades

## Environment Variables

**Backend** (optional):
- `SION_OPENAI_API_KEY` — OpenAI API key for AI quote generation (without this, uses fallback text)
- `PORT` — Server port (default: 3001)

**Frontend** (optional):
- `NEXT_PUBLIC_API_BASE` — Backend API base URL (default: http://localhost:3001)

## Tech Stack

- **Frontend**: Next.js 13, React 18, SWR (data fetching), CSS (no framework)
- **Backend**: Express.js, Node.js
- **Design**: Custom CSS with CSS variables, responsive grid layout, Google Fonts (Inter, Playfair Display)
- **Data**: JSON files (authors.json, quotes.json)

## UI/UX Highlights

- Professional typography using Playfair Display (quotes) and Inter (body)
- CSS variables for theme switching (light/dark mode)
- Smooth transitions and animations throughout
- Accessible color contrast and focus states
- Mobile-responsive grid layouts
- Loading spinners and disabled button states
- Result message animations with emoji feedback

## Deployment

Ready to deploy on Vercel as a monorepo. Both apps will be automatically deployed:
- Frontend: Deployed as Next.js app
- Backend: Deployed as serverless functions (API routes)

