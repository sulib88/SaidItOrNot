import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const BADGE_THRESHOLDS = [5, 10, 15];

export default function Game() {
  const router = useRouter();
  const { author_id, player } = router.query;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

  const [quote, setQuote] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, streakCorrect: 0, streakWrong: 0, longestStreakCorrect: 0, longestStreakWrong: 0 });
  const [perAuthor, setPerAuthor] = useState({});
  const [badges, setBadges] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [newBadge, setNewBadge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');
  const [disabled, setDisabled] = useState(false);
  const [author, setAuthor] = useState(null);
  const [quotesExhausted, setQuotesExhausted] = useState(false);
  const [allAuthors, setAllAuthors] = useState([]);
  const [showAuthorModal, setShowAuthorModal] = useState(false);

  const storageKey = player ? `saidit:${player}` : null;

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    if (!author_id) return;
    // Fetch all authors for the modal
    fetch('/api/authors')
      .then(r => r.json())
      .then(authors => {
        setAllAuthors(authors);
        const found = authors.find(a => a.author_id === author_id);
        setAuthor(found);
      })
      .catch(err => console.error('Failed to fetch authors:', err));
    fetchQuote();
  }, [author_id]);

  useEffect(() => {
    if (!storageKey) return;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setStats(parsed.stats || { correct: 0, wrong: 0, streakCorrect: 0, streakWrong: 0, longestStreakCorrect: 0, longestStreakWrong: 0 });
        setPerAuthor(parsed.perAuthor || {});
        setBadges(parsed.badges || []);
      } catch (e) {
        console.warn('Failed to parse saved state', e);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    const payload = { stats, perAuthor, badges };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [storageKey, stats, perAuthor, badges]);

  const fetchQuote = () => {
    setLoading(true);
    setDisabled(true);
    fetch('/api/quote/random', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author_id }),
    })
      .then((r) => r.json())
      .then((j) => {
        setQuote(j.quote_text);
        setRequestId(j.request_id);
        setQuotesExhausted(j.allRealQuotesUsed || false);
        setLoading(false);
        setDisabled(false);
      })
      .catch(() => {
        setMessage('Failed to load quote');
        setMessageType('error');
        setLoading(false);
        setDisabled(false);
      });
  };

  const awardBadge = (badge) => {
    setBadges((b) => {
      if (b.find((x) => x.id === badge.id)) return b;
      const next = [...b, badge];
      setNewBadge(badge);
      setTimeout(() => setNewBadge(null), 5000);
      return next;
    });
  };

  const checkForBadges = (updatedStats, updatedPerAuthor) => {
    BADGE_THRESHOLDS.forEach((th) => {
      if (updatedStats.streakCorrect >= th) {
        awardBadge({
          id: `streak-${th}`,
          name: `🔥 Streak ${th}`,
          type: 'streak',
          threshold: th,
        });
      }
    });
    const authorStats = updatedPerAuthor[author_id] || { correct: 0, streakCorrect: 0 };
    if (authorStats.streakCorrect >= 10) {
      awardBadge({
        id: `fan-${author_id}-10`,
        name: `⭐ Fan Level 1`,
        type: 'author',
        author_id,
        threshold: 10,
      });
    }
  };

  const verify = (choice) => {
    if (!requestId || disabled) return;
    setDisabled(true);
    fetch('/api/quote/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, player_choice: choice }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.correct) {
          setStats((s) => {
            const newStreakCorrect = s.streakCorrect + 1;
            const updated = {
              ...s,
              correct: s.correct + 1,
              streakCorrect: newStreakCorrect,
              streakWrong: 0,
              longestStreakCorrect: Math.max(s.longestStreakCorrect, newStreakCorrect),
            };
            setPerAuthor((pa) => {
              const cur = pa[author_id] || { correct: 0, streakCorrect: 0 };
              const updatedAuthor = {
                correct: cur.correct + 1,
                streakCorrect: cur.streakCorrect + 1,
              };
              const next = { ...pa, [author_id]: updatedAuthor };
              checkForBadges(updated, next);
              return next;
            });
            return updated;
          });
          setMessage('✨ Correct! Well done!');
          setMessageType('success');
        } else {
          setStats((s) => {
            const newStreakWrong = s.streakWrong + 1;
            const updated = {
              ...s,
              wrong: s.wrong + 1,
              streakWrong: newStreakWrong,
              streakCorrect: 0,
              longestStreakWrong: Math.max(s.longestStreakWrong, newStreakWrong),
            };
            setPerAuthor((pa) => {
              const cur = pa[author_id] || { correct: 0, streakCorrect: 0 };
              const updatedAuthor = { ...cur, streakCorrect: 0 };
              const next = { ...pa, [author_id]: updatedAuthor };
              checkForBadges(updated, next);
              return next;
            });
            return updated;
          });
          setMessage('❌ Not this time. Keep trying!');
          setMessageType('error');
        }

        setTimeout(() => {
          setMessage('');
          fetchQuote();
        }, 1500);
      })
      .catch(() => {
        setMessage('Error verifying answer');
        setMessageType('error');
        setDisabled(false);
      });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const switchAuthor = (newAuthorId) => {
    setShowAuthorModal(false);
    setQuote(null);
    setRequestId(null);
    setQuotesExhausted(false);
    router.push({
      pathname: '/game',
      query: { author_id: newAuthorId, player }
    });
  };

  if (!author_id) return <p>Loading...</p>;

  const accuracy = stats.correct + stats.wrong > 0
    ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
    : 0;

  return (
    <>
      <div className="header">
        <button className="button button-secondary" onClick={() => setShowAuthorModal(true)}>📚 Change Author</button>
        <div className="header-title">{player}</div>
        <button className="theme-toggle" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
      </div>

      {newBadge && (
        <div className="badge-overlay">
          <div className="badge-notification">
            <p style={{ margin: 0, fontSize: '1.5rem' }}>🎖️ New Badge Earned!</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem' }}>{newBadge.name}</p>
          </div>
        </div>
      )}

      <div className="game-layout">
        <div className="game-main">
          <div className="container">
            {badges.length > 0 && (
              <div className="badges-bar">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {badges.map((b) => (
                    <span key={b.id} className="badge">
                      {b.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {author && (
              <div style={{ 
                background: 'var(--border)', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                marginBottom: '2rem',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'stretch'
              }}>
                <div style={{ flexShrink: 0 }}>
                  {author.image && (
                    <img 
                      src={`${apiBase}${author.image}`}
                      alt={author.name}
                      style={{
                        width: '160px',
                        height: '160px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        display: 'block',
                        border: '2px solid var(--accent)'
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '1.75rem', fontWeight: '700' }}>
                    {author.name}
                  </h2>
                  <p style={{ margin: '0', fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    {author.title}
                  </p>
                </div>
              </div>
            )}

            {quotesExhausted && (
              <div style={{
                background: 'rgba(251, 146, 60, 0.1)',
                border: '1px solid #fb923c',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                color: '#fb923c'
              }}>
                <p style={{ margin: 0, fontWeight: '600' }}>All quotes from this author explored!</p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  Try another author to discover more quotes.
                </p>
              </div>
            )}

            {loading && !quote ? (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div className="loader"></div>
                <p style={{ marginTop: '1rem' }}>Loading quote...</p>
              </div>
            ) : (
              <>
                <div className="quote">{quote || 'Loading...'}</div>

                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Did the author really say this?
                </p>

                <div className="controls">
                  <button
                    className="button button-primary"
                    onClick={() => verify('yes')}
                    disabled={disabled || !quote}
                  >
                    Yes 👍
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => verify('no')}
                    disabled={disabled || !quote}
                  >
                    No 👎
                  </button>
                </div>

                {message && (
                  <div className={`message ${messageType}`}>
                    <p style={{ margin: 0, fontSize: '1.125rem' }}>{message}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="game-sidebar">
          <div className="sidebar-stats">
            <h3>Stats</h3>
            <div className="stat-card">
              <div className="stat-value">{stats.correct}</div>
              <div className="stat-label">Correct</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ '--progress': `${accuracy}%` }}
                ></div>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Accuracy: {accuracy}%
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-value">{stats.wrong}</div>
              <div className="stat-label">Wrong</div>
            </div>

            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {stats.streakCorrect}
              </div>
              <div className="stat-label">Win Streak</div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Longest: {stats.longestStreakCorrect}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {stats.streakWrong}
              </div>
              <div className="stat-label">Loss Streak</div>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Longest: {stats.longestStreakWrong}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAuthorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'var(--bg)',
            borderRadius: '12px',
            padding: '2rem',
            width: '90vw',
            maxWidth: '1000px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--text)' }}>Select an Author</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              {allAuthors.map((a) => (
                <button
                  key={a.author_id}
                  onClick={() => switchAuthor(a.author_id)}
                  style={{
                    padding: '1rem',
                    background: a.author_id === author_id ? 'var(--accent)' : 'var(--border)',
                    color: a.author_id === author_id ? 'white' : 'var(--text)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'var(--transition)',
                    fontWeight: a.author_id === author_id ? '600' : '400',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (a.author_id !== author_id) {
                      e.target.style.background = 'var(--accent)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (a.author_id !== author_id) {
                      e.target.style.background = 'var(--border)';
                      e.target.style.color = 'var(--text)';
                    }
                  }}
                >
                  {a.image && (
                    <img
                      src={`${apiBase}${a.image}`}
                      alt={a.name}
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        border: '2px solid ' + (a.author_id === author_id ? 'white' : 'var(--border)')
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{a.name}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{a.title}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAuthorModal(false)}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--border)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--accent)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--border)'}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
