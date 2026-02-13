import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(r => r.json());

const generateAvatarDataURL = (name) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = ['6366f1', '8b5cf6', 'ec4899', 'f43f5e', 'f97316'];
  const hashCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = colors[hashCode % colors.length];
  
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#5b21b6;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect fill="url(#grad)" width="100" height="100"/>
    <text x="50" y="50" text-anchor="middle" dy=".3em" font-size="48" fill="white" font-weight="bold" font-family="system-ui, sans-serif">${initials}</text>
  </svg>`);
  
  return `data:image/svg+xml,${svg}`;
};

const loadImageWithFallback = (src, name) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => {
      console.warn(`Failed to load image from ${src}, using avatar for ${name}`);
      resolve(generateAvatarDataURL(name));
    };
    img.src = src;
    setTimeout(() => resolve(generateAvatarDataURL(name)), 5000);
  });
};

export default function Home() {
  const [name, setName] = useState('');
  const [player, setPlayer] = useState(null);
  const [theme, setTheme] = useState('light');
  const [imageUrls, setImageUrls] = useState({});
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
  const { data: authors } = useSWR(`${apiBase}/api/authors`, fetcher);

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    if (!authors) return;
    authors.forEach(async (author) => {
      const imageUrl = await loadImageWithFallback(`${apiBase}${author.image}`, author.name);
      setImageUrls((prev) => ({ ...prev, [author.author_id]: imageUrl }));
    });
  }, [authors, apiBase]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!player) {
    return (
      <>
        <div className="header">
          <div className="header-title">Said It Or Not?</div>
          <button className="theme-toggle" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
        </div>
        <div className="container">
          <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
            <h1>Welcome to the Game</h1>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
              Test your knowledge. Can you tell if famous quotes are real or AI-generated?
            </p>
            <div className="input-group">
              <label htmlFor="name">What's your name?</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                onKeyPress={(e) => e.key === 'Enter' && name.trim() && setPlayer({ name: name.trim() })}
              />
            </div>
            <button
              className="button button-primary button-large"
              onClick={() => name.trim() && setPlayer({ name: name.trim() })}
              disabled={!name.trim()}
            >
              Start Game
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="header">
        <div className="header-title">Said It Or Not?</div>
        <button className="theme-toggle" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
      </div>
      <div className="container">
        <h1>Welcome, {player.name}! 👋</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>Pick an author and let's see if you can spot the fakes.</p>
        
        <h2>Choose Your Challenge</h2>
        {!authors && <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader"></div></div>}
        
        {authors && (
          <div className="authors-grid">
            {authors.map((a) => (
              <div
                key={a.author_id}
                className="card author-card"
                onClick={() => window.location.href = `/game?author_id=${a.author_id}&player=${encodeURIComponent(player.name)}`}
              >
                <img
                  src={imageUrls[a.author_id] || `${apiBase}${a.image}`}
                  alt={a.name}
                  className="author-image"
                  crossOrigin="anonymous"
                />
                <div className="author-info">
                  <h3>{a.name}</h3>
                  <p>{a.title}</p>
                  <button className="button button-primary" style={{ marginTop: '1rem' }}>Play</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
