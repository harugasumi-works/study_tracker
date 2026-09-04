// Diary tab — a read-only, auto-generated daily journal. It holds no data
// of its own: each day's "entry" is compiled on the fly from that day's
// per-track notes in `history` (the same notes typed under the Tracker
// nav, at history[date][track.id].note). Tracker notes are the source of
// truth; nothing is ever written back from here.

function compileDayEntries(history, tracks, dateStr) {
  return tracks
    .map((track) => ({ track, note: (history[dateStr]?.[track.id]?.note || '').trim() }))
    .filter((entry) => entry.note.length > 0);
}

function Diary({ history, tracks, todayStr }) {
  // getLastNDates(4, todayStr) → [3 days ago, 2 days ago, yesterday, today].
  // Drop today, then reverse so the dropdown reads yesterday → 3 days ago.
  const pastDates = getLastNDates(4, todayStr).slice(0, -1).reverse();
  const [selectedPastDate, setSelectedPastDate] = useState(pastDates[0]);
  const yesterdayStr = pastDates[0];

  const todayEntries = compileDayEntries(history, tracks, todayStr);
  const pastEntries = compileDayEntries(history, tracks, selectedPastDate);

  const renderEntries = (entries, emptyLabel) => {
    if (entries.length === 0) {
      return (
        <div style={{ fontSize: 13, opacity: 0.4 }}>{emptyLabel}</div>
      );
    }
    return entries.map(({ track, note }) => (
      <div key={track.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid #EDEFF2' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: track.color, flexShrink: 0, marginTop: 5 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 2 }}>{track.name}</div>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{note}</div>
        </div>
      </div>
    ));
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 4, fontWeight: 400 }}>Diary</h2>
      <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 24 }}>
        auto-generated from the notes logged per track under Tracker
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Newsreader, serif', fontSize: 18, marginBottom: 8 }}>
          {formatFullDate(todayStr)} · Today so far
        </div>
        <div style={{ border: '1px solid #E1E4EA', borderRadius: 6, background: '#FFFFFF', padding: '14px 16px', minHeight: 60 }}>
          {renderEntries(todayEntries, "No notes logged yet today — add one under Tracker.")}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, opacity: 0.6, fontWeight: 400, margin: 0 }}>Past entries</h2>
          <select
            value={selectedPastDate}
            onChange={(e) => setSelectedPastDate(e.target.value)}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              padding: '6px 8px',
              border: '1px solid #E1E4EA',
              borderRadius: 4,
              background: '#FDFDFE',
              color: 'inherit',
              outline: 'none',
            }}
          >
            {pastDates.map((d) => (
              <option key={d} value={d}>
                {d === yesterdayStr ? `Yesterday · ${formatFullDate(d)}` : formatFullDate(d)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ border: '1px solid #E1E4EA', borderRadius: 6, background: '#FFFFFF', padding: '14px 16px', minHeight: 60 }}>
          {renderEntries(pastEntries, "No notes were logged for this day.")}
        </div>
      </div>
    </div>
  );
}
