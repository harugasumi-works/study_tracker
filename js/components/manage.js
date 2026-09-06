const labelStyle = { display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 6 };
const inputStyle = {
  width: '100%',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 13,
  padding: '8px 10px',
  border: '1px solid #E1E4EA',
  borderRadius: 4,
  background: '#FDFDFE',
  color: 'inherit',
  outline: 'none',
};
function linkBtnStyle(color, opacity) {
  return {
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color,
    opacity: opacity === undefined ? 1 : opacity,
    font: 'inherit',
    padding: 0,
    fontSize: 12,
  };
}

function Manage({ tracks, categories, onAdd, onRemove, onUpdateMinPerWeek }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [color, setColor] = useState(TRACK_COLOR_PALETTE[tracks.length % TRACK_COLOR_PALETTE.length]);
  const [minPerWeek, setMinPerWeek] = useState(0);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, category, color, minPerWeek);
    setName('');
    setMinPerWeek(0);
    setColor(TRACK_COLOR_PALETTE[(tracks.length + 1) % TRACK_COLOR_PALETTE.length]);
  };

  const clampMin = (v) => Math.max(0, Math.min(7, Number.isFinite(v) ? v : 0));

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>Curriculum</h2>

      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #E1E4EA', background: '#FFFFFF', marginBottom: 32 }}>
        {tracks.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, opacity: 0.5 }}>
            No curriculum items yet — add one below.
          </div>
        )}
        {categories.map((cat) => {
          const catTracks = tracks.filter((t) => t.category === cat);
          if (!catTracks.length) return null;
          return (
            <div key={cat}>
              <div style={{ padding: '8px 16px', fontSize: 12, opacity: 0.5, background: '#EFF1F4' }}>
                {cat}
              </div>
              {catTracks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid #EDEFF2' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontFamily: 'Newsreader, serif' }}>{t.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, fontSize: 11, opacity: 0.6 }}>
                    <span>min/wk</span>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={t.minPerWeek || 0}
                      onChange={(e) => onUpdateMinPerWeek(t.id, clampMin(parseInt(e.target.value, 10)))}
                      style={{ width: 40, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, padding: '3px 4px', border: '1px solid #E1E4EA', borderRadius: 4, background: '#FDFDFE', color: 'inherit', outline: 'none' }}
                    />
                  </div>
                  {confirmRemoveId === t.id ? (
                    <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <button onClick={() => { onRemove(t.id); setConfirmRemoveId(null); }} style={linkBtnStyle('#B3261E')}>
                        Remove
                      </button>
                      {' · '}
                      <button onClick={() => setConfirmRemoveId(null)} style={linkBtnStyle('inherit', 0.6)}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmRemoveId(t.id)} style={linkBtnStyle('inherit', 0.4)}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>Add new</h2>
      <form onSubmit={handleAdd} style={{ border: '1px solid #E1E4EA', borderRadius: 6, padding: 16, background: '#FFFFFF' }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Piano practice"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Min per week</label>
          <input
            type="number"
            min={0}
            max={7}
            value={minPerWeek}
            onChange={(e) => setMinPerWeek(clampMin(parseInt(e.target.value, 10)))}
            style={{ ...inputStyle, width: 80 }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TRACK_COLOR_PALETTE.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Choose color ${c}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #1B1F2A' : '2px solid transparent',
                  boxShadow: color === c ? '0 0 0 2px #fff inset' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12,
            padding: '8px 16px',
            borderRadius: 4,
            border: '1px solid #1B1F2A',
            background: name.trim() ? '#1B1F2A' : '#E1E4EA',
            color: name.trim() ? '#F5F6F8' : '#9199A6',
            cursor: name.trim() ? 'pointer' : 'default',
          }}
        >
          Add to curriculum
        </button>
      </form>
    </div>
  );
}