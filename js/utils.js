// Pure helper functions used across components — dates, track-id slugs,
// streak/stat computations, and the storage drop-in. Nothing here holds
// React state or renders anything.

function slugifyTrackName(name) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return base || 'track';
}
function uniqueTrackId(name, existingTracks) {
  const base = slugifyTrackName(name);
  let id = base;
  let n = 2;
  while (existingTracks.some((t) => t.id === id)) {
    id = `${base}_${n}`;
    n++;
  }
  return id;
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parseLocal(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}
function getLastNDates(n, endDateStr) {
  const end = parseLocal(endDateStr);
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(isoDate(d));
  }
  return dates;
}
function dayLabel(dateStr, isFirst) {
  const d = parseLocal(dateStr);
  const day = d.getDate();
  if (isFirst || day === 1) return `${MONTHS[d.getMonth()]} ${day}`;
  return String(day);
}
function formatFullDate(dateStr) {
  const d = parseLocal(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
function computeStreak(history, trackId, todayStr) {
  let streak = 0;
  let cursor = parseLocal(todayStr);
  while (true) {
    const key = isoDate(cursor);
    if (history[key] && history[key][trackId] && history[key][trackId].done) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

// Drop-in replacement for the Claude artifact storage API, backed by localStorage.
const storage = {
  get: async (key) => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : { key, value: raw };
  },
  set: async (key, value) => {
    window.localStorage.setItem(key, value);
    return { key, value };
  },
};

function rangeStats(history, dates, tracks) {
  const perTrack = {};
  tracks.forEach((t) => { perTrack[t.id] = 0; });
  let total = 0;
  dates.forEach((d) => {
    tracks.forEach((t) => {
      if (history[d]?.[t.id]?.done) {
        perTrack[t.id] += 1;
        total += 1;
      }
    });
  });
  return { perTrack, total, possible: dates.length * tracks.length };
}

function categoryStats(history, dates, tracks) {
  const stats = {};
  CATEGORIES.forEach((cat) => {
    const catTracks = tracks.filter((t) => t.category === cat);
    let done = 0;
    dates.forEach((d) => {
      catTracks.forEach((t) => {
        if (history[d]?.[t.id]?.done) done += 1;
      });
    });
    stats[cat] = { done, possible: dates.length * catTracks.length };
  });
  return stats;
}

function heatmapWeeks(history, todayStr, weeks, tracks) {
  const end = parseLocal(todayStr);
  const endDay = end.getDay();
  const gridEnd = new Date(end);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDay));
  const totalDays = weeks * 7;
  const cells = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(gridEnd);
    d.setDate(d.getDate() - i);
    const dateStr = isoDate(d);
    const inRange = dateStr <= todayStr;
    const count = inRange ? tracks.filter((t) => history[dateStr]?.[t.id]?.done).length : null;
    cells.push({ dateStr, count });
  }
  const columns = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}

function heatColor(count, totalTracks) {
  if (count === null) return 'transparent';
  if (count === 0) return '#E9EBEF';
  const alpha = 0.28 + (count / Math.max(1, totalTracks)) * 0.72;
  return `rgba(27, 31, 42, ${alpha.toFixed(2)})`;
}
