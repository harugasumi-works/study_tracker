// Blog plugin
// ---------------------------------------------------------------------------
// Tracks *effort*, not post identity: "which pipeline stage(s) did I touch
// today," not "where is post X in its lifecycle." That's a deliberate
// simplification — it only works because there's ever one blog post in
// flight at a time (across the two blog tracks), so there's nothing to
// disambiguate between multiple posts progressing in parallel.
//
// Multi-select because a single day can span more than one stage (e.g.
// finishing a draft and starting the edit pass in the same sitting).
//
// This file is loaded and JSX-transformed by the host at runtime — it has
// no build step of its own. It registers itself against window.AppPlugins;
// the host has no built-in knowledge of "blog" anywhere in its code.
(function () {
  const { useState, useCallback } = React;

  const STAGES = [
    { id: 'blog_idea', label: 'Idea' },
    { id: 'blog_draft', label: 'Draft' },
    { id: 'blog_edit', label: 'Edit' },
    { id: 'blog_publish', label: 'Publish' },
  ];

  const DATA_KEY = 'tracker-plugin-blog-data';

  // Self-contained storage, same shape as the host's drop-in (get/set
  // against localStorage) — kept local so this file has no dependency on
  // host internals beyond the global AppPlugins registration point.
  const blogStorage = {
    get: async (key) => {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : { key, value: raw };
    },
    set: async (key, value) => {
      window.localStorage.setItem(key, value);
      return { key, value };
    },
  };

  function loadAll() {
    try {
      const raw = window.localStorage.getItem(DATA_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function BlogPanel({ track, date }) {
    const [allData, setAllData] = useState(loadAll);
    const [saving, setSaving] = useState(false);

    const selected = (allData[date] && allData[date][track.id]) || [];

    const toggleStage = useCallback((stageId) => {
      setAllData((prev) => {
        const dayEntry = { ...(prev[date] || {}) };
        const current = dayEntry[track.id] || [];
        const nextStages = current.includes(stageId)
          ? current.filter((s) => s !== stageId)
          : [...current, stageId];
        dayEntry[track.id] = nextStages;
        const merged = { ...prev, [date]: dayEntry };
        setSaving(true);
        blogStorage.set(DATA_KEY, JSON.stringify(merged)).finally(() => setSaving(false));
        return merged;
      });
    }, [date, track.id]);

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {STAGES.map((stage) => {
          const active = selected.includes(stage.id);
          return (
            <button
              key={stage.id}
              onClick={() => toggleStage(stage.id)}
              aria-pressed={active}
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 11,
                padding: '5px 10px',
                borderRadius: 12,
                border: `1px solid ${active ? track.color : '#E1E4EA'}`,
                background: active ? track.color : 'transparent',
                color: active ? '#FFFFFF' : 'inherit',
                opacity: active ? 1 : 0.65,
                cursor: 'pointer',
              }}
            >
              {stage.label}
            </button>
          );
        })}
        {saving && <span style={{ fontSize: 10, opacity: 0.4 }}>saving…</span>}
        {selected.length === 0 && !saving && (
          <span style={{ fontSize: 10, opacity: 0.4 }}>no stage logged for this day</span>
        )}
      </div>
    );
  }

  window.AppPlugins.register({
    id: 'blog',
    name: 'Blog',
    Panel: BlogPanel,
    // Lets the host show a small dot on the collapsed toggle pill when
    // there's already something logged for this track/date.
    hasEntry: (track, date) => {
      const all = loadAll();
      const sel = (all[date] && all[date][track.id]) || [];
      return sel.length > 0;
    },
  });
})();
