function Analysis({ history, todayStr, tracks }) {
  const [rangeDays, setRangeDays] = useState(30);
  const dates = getLastNDates(rangeDays, todayStr);
  const { perTrack, total, possible } = rangeStats(history, dates, tracks);
  const catStats = categoryStats(history, dates, tracks);
  const weeks = heatmapWeeks(history, todayStr, HEATMAP_WEEKS, tracks);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 28, fontStyle: 'italic' }}>
            {total} <span style={{ fontSize: 16, fontStyle: 'normal', opacity: 0.5 }}>of {possible} sessions</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>
            completed in the last {rangeDays} days
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRangeDays(opt.id)}
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 4,
                border: `1px solid ${rangeDays === opt.id ? '#1B1F2A' : '#E1E4EA'}`,
                background: rangeDays === opt.id ? '#1B1F2A' : 'transparent',
                color: rangeDays === opt.id ? '#F5F6F8' : 'inherit',
                opacity: rangeDays === opt.id ? 1 : 0.6,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>By track</h2>
        {tracks.map((t) => {
          const count = perTrack[t.id];
          const pct = dates.length ? Math.round((count / dates.length) * 100) : 0;
          const barPct = pct;
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 13, fontFamily: 'Newsreader, serif' }}>
                {t.name}
              </div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#EDEFF2', overflow: 'hidden' }}>
                <div style={{ width: `${barPct}%`, height: '100%', background: t.color, opacity: 0.85 }} />
              </div>
              <div style={{ width: 84, flexShrink: 0, textAlign: 'right', fontSize: 11, opacity: 0.55 }}>
                {count}/{dates.length} · {pct}%
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 36, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {CATEGORIES.map((cat) => {
          const s = catStats[cat];
          const pct = s.possible ? Math.round((s.done / s.possible) * 100) : 0;
          return (
            <div key={cat} style={{ flex: '1 1 140px', border: '1px solid #E1E4EA', borderRadius: 6, padding: '14px 16px', background: '#FFFFFF' }}>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>{cat}</div>
              <div style={{ fontFamily: 'Newsreader, serif', fontSize: 22 }}>{pct}%</div>
              <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>{s.done} of {s.possible}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>Activity, last {HEATMAP_WEEKS} weeks</h2>
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
          {weeks.map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {col.map((cell) => (
                <div
                  key={cell.dateStr}
                  title={cell.count === null ? '' : `${cell.dateStr}: ${cell.count}/${tracks.length}`}
                  style={{ width: 11, height: 11, borderRadius: 2, background: heatColor(cell.count, tracks.length) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>Current streaks</h2>
        {tracks.slice()
          .sort((a, b) => computeStreak(history, b.id, todayStr) - computeStreak(history, a.id, todayStr))
          .map((t) => {
            const streak = computeStreak(history, t.id, todayStr);
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #EDEFF2', fontSize: 13 }}>
                <span>{t.name}</span>
                <span style={{ color: t.color, opacity: streak > 0 ? 0.9 : 0.3, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
                  {streak > 0 ? `${streak} days` : '—'}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}