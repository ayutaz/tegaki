import { useState } from 'react';
import { TegakiRenderer } from 'tegaki';
import kana from 'tegaki/fonts/ja-kana';

const PHRASES = ['ありがとう', 'こんにちは', 'さようなら', 'おはよう', 'カタカナ', 'ほんじつはせいてんなり'];

export function App() {
  const [text, setText] = useState(PHRASES[0]!);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);

  return (
    <main style={{ padding: 48, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Tegaki — 日本語 (ja-kana) demo</h1>
      <p style={{ opacity: 0.7 }}>
        Kana rendered with KanjiVG stroke order + Plamondon Sigma-Lognormal rhythm. Switch phrases, tune speed, or toggle the loop.
      </p>

      <section style={{ background: '#1b1b1b', borderRadius: 12, padding: 48, minHeight: 220 }}>
        <TegakiRenderer
          font={kana}
          time={{ mode: 'uncontrolled', speed, loop }}
          style={{ fontSize: 96, color: '#fafafa', lineHeight: 1.2 }}
        >
          {text}
        </TegakiRenderer>
      </section>

      <fieldset style={{ marginTop: 24, padding: 16, border: '1px solid #333', borderRadius: 8 }}>
        <legend>Controls</legend>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {PHRASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setText(p)}
              style={{
                padding: '6px 12px',
                background: p === text ? '#fafafa' : '#222',
                color: p === text ? '#111' : '#fafafa',
                border: '1px solid #444',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Speed {speed.toFixed(2)}×
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: 240, marginLeft: 12 }}
          />
        </label>
        <label>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
        </label>
      </fieldset>
    </main>
  );
}
