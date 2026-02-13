const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname);
const authors = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'authors.json'), 'utf8'));
const quotes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quotes.json'), 'utf8'));

// In-memory session store: request_id -> { quote_id|null, quote_text }
const sessions = new Map();
// Track generated fake quotes to avoid repeating them
const generatedFakeQuotes = new Set();

function pickRealQuoteForAuthor(author_id, usedQuoteIds = new Set()) {
  const pool = quotes.filter(q => q.author_id === author_id && !usedQuoteIds.has(q.quote_id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function generateAiQuote(author, authorQuotes = []) {
  const key = process.env.SION_OPENAI_API_KEY;
  if (!key) {
    return `"${author.name}" (AI-style): This is a playful AI-generated quote in the style of ${author.name}.`;
  }

  try {
    // Get 3-5 sample real quotes from the author
    const sampleQuotes = authorQuotes.slice(0, 5).map(q => `- "${q.text}"`).join('\n');
    
    const prompt = `Write a single-sentence quote that sounds like something ${author.name} (${author.title}) might say, similar in style to their actual quotes:

${sampleQuotes}

Keep it short, witty or thoughtful, and do NOT attribute to any real source.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 1.1
      })
    });
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content;
    return text ? text.trim() : `AI-generated quote in the style of ${author.name}.`;
  } catch (err) {
    console.error('OpenAI call failed:', err);
    return `AI-generated quote in the style of ${author.name}.`;
  }
}

app.get('/api/authors', (req, res) => {
  res.json(authors);
});

app.post('/api/quote/random', async (req, res) => {
  const { author_id } = req.body || {};
  if (!author_id) return res.status(400).json({ error: 'author_id required' });

  const author = authors.find(a => a.author_id === author_id);
  if (!author) return res.status(404).json({ error: 'author not found' });

  const biasReal = 0.6;
  const usedQuoteIds = new Set();
  sessions.forEach(v => { if (v.quote_id) usedQuoteIds.add(v.quote_id); });

  const authorQuotes = quotes.filter(q => q.author_id === author_id);
  const availableRealQuotes = authorQuotes.filter(q => !usedQuoteIds.has(q.quote_id));
  const allRealQuotesUsed = availableRealQuotes.length === 0;

  let chosen = null;
  if (Math.random() < biasReal && !allRealQuotesUsed) {
    const real = pickRealQuoteForAuthor(author_id, usedQuoteIds);
    if (real) chosen = { quote_id: real.quote_id, quote_text: real.text };
  }

  if (!chosen) {
    const aiText = await generateAiQuote(author, authorQuotes);
    chosen = { quote_id: null, quote_text: aiText };
    generatedFakeQuotes.add(aiText);
  }

  const request_id = crypto.randomUUID();
  sessions.set(request_id, { quote_id: chosen.quote_id, quote_text: chosen.quote_text, author_id });

  res.json({ request_id, quote_text: chosen.quote_text, allRealQuotesUsed });
});

app.post('/api/quote/verify', (req, res) => {
  const { request_id, player_choice } = req.body || {};
  if (!request_id || typeof player_choice === 'undefined') return res.status(400).json({ error: 'request_id and player_choice required' });

  const session = sessions.get(request_id);
  if (!session) return res.status(404).json({ error: 'request not found' });

  const isReal = !!session.quote_id;
  const playerSaysReal = (String(player_choice).toLowerCase() === 'yes' || player_choice === true);
  const correct = (isReal && playerSaysReal) || (!isReal && !playerSaysReal);

  res.json({ correct, actual: isReal ? 'real' : 'ai' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
