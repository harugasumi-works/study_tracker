// Main app component: tracker view (rows, day panel), tab switching, and
// the plugin enable-menu / pull-down panel wiring around each track row.
// This is the largest file in the app — if it keeps growing, pull the
// per-track row and the per-day panel out into their own components.

function StudyTracker() {
  const todayStr = isoDate(new Date());
  const [history, setHistory] = useState({});
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState('tracker');

  // Plugin UI state. `enabledPlugins` (persisted) maps trackId -> [pluginId].
  // `openPanels` (session-only) tracks which pull-down panels are currently
  // expanded, keyed by `${trackId}:${pluginId}`. `menuTrackId` is which
  // track's hover "+" enable-menu is currently open.
  const plugins = usePluginList();
  const [enabledPlugins, setEnabledPlugins] = useState({});
  const [openPanels, setOpenPanels] = useState(() => new Set());
  const [menuTrackId, setMenuTrackId] = useState(null);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [historyResult, tracksResult, pluginEnabledResult] = await Promise.all([
          storage.get(STORAGE_KEY),
          storage.get(TRACKS_STORAGE_KEY),
          storage.get(PLUGIN_ENABLED_KEY),
        ]);
        if (historyResult && historyResult.value) setHistory(JSON.parse(historyResult.value));
        if (tracksResult && tracksResult.value) {
          const parsedTracks = JSON.parse(tracksResult.value);
          if (Array.isArray(parsedTracks) && parsedTracks.length) setTracks(parsedTracks);
        }
        if (pluginEnabledResult && pluginEnabledResult.value) {
          setEnabledPlugins(JSON.parse(pluginEnabledResult.value));
        }
      } catch (e) {
        setHistory({});
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (key, value) => {
    setSaving(true);
    try {
      const result = await storage.set(key, JSON.stringify(value));
      if (!result) setErrorMsg('Could not save — your last change may not persist.');
      else setErrorMsg('');
    } catch (e) {
      setErrorMsg('Could not save — your last change may not persist.');
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleDone = (dateStr, trackId) => {
    setHistory((prev) => {
      const day = { ...(prev[dateStr] || {}) };
      const entry = { ...(day[trackId] || { done: false, note: '' }) };
      entry.done = !entry.done;
      day[trackId] = entry;
      const next = { ...prev, [dateStr]: day };
      persist(STORAGE_KEY, next);
      return next;
    });
  };

  const updateNote = (dateStr, trackId, note) => {
    setHistory((prev) => {
      const day = { ...(prev[dateStr] || {}) };
      const entry = { ...(day[trackId] || { done: false, note: '' }) };
      entry.note = note;
      day[trackId] = entry;
      const next = { ...prev, [dateStr]: day };
      persist(STORAGE_KEY, next);
      return next;
    });
  };


  const addTrack = (name, category, color) => {
    setTracks((prev) => {
      const id = uniqueTrackId(name, prev);
      const next = [...prev, { id, name, category, color }];
      persist(TRACKS_STORAGE_KEY, next);
      return next;
    });
  };

  const removeTrack = (trackId) => {
    setTracks((prev) => {
      const next = prev.filter((t) => t.id !== trackId);
      persist(TRACKS_STORAGE_KEY, next);
      return next;
    });
  };

  const togglePluginForTrack = (trackId, pluginId) => {
    setEnabledPlugins((prev) => {
      const current = prev[trackId] || [];
      const nextForTrack = current.includes(pluginId)
        ? current.filter((id) => id !== pluginId)
        : [...current, pluginId];
      const next = { ...prev, [trackId]: nextForTrack };
      persist(PLUGIN_ENABLED_KEY, next);
      return next;
    });
    // Collapse the panel if the plugin was just disabled.
    setOpenPanels((prev) => {
      const key = `${trackId}:${pluginId}`;
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const togglePanelOpen = (trackId, pluginId) => {
    const key = `${trackId}:${pluginId}`;
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const shiftSelectedDate = (delta) => {
    setSelectedDate((prev) => {
      const d = parseLocal(prev);
      d.setDate(d.getDate() + delta);
      const next = isoDate(d);
      return next <= todayStr ? next : prev;
    });
  };

  const dates = getLastNDates(DAYS_SHOWN, todayStr);
  const doneCountForSelected = tracks.filter((t) => history[selectedDate]?.[t.id]?.done).length;

  if (!loaded) {
    return (
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', background: '#F5F6F8', minHeight: '100vh', padding: 32, fontSize: 14, opacity: 0.5 }}>
        Loading your tracker…
      </div>
    );
  }

  return (
    <div style={{ background: '#F5F6F8', minHeight: '100vh', fontFamily: 'IBM Plex Mono, monospace', color: '#1B1F2A', padding: '24px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 32, margin: '0 0 4px' }}>
          Progress Line
        </h1>
        <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>
          {formatFullDate(todayStr)} · tap any day to mark it done — the line grows as you go
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid #E1E4EA' }}>
        {[
          { id: 'tracker', label: 'Tracker' },
          { id: 'diary', label: 'Diary' },
          { id: 'analysis', label: 'Analysis' },
          { id: 'manage', label: 'Curriculum' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 10px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
              color: 'inherit',
              opacity: view === tab.id ? 0.95 : 0.4,
              borderBottom: view === tab.id ? '2px solid #1B1F2A' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'tracker' && (
      <>
      {CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 14, opacity: 0.6, marginBottom: 16, fontWeight: 400 }}>{cat}</h2>
          {tracks.filter((t) => t.category === cat).map((track) => {
            const streak = computeStreak(history, track.id, todayStr);
            const gridCols = `repeat(${dates.length}, 24px) 20px`;
            const trackEnabledPlugins = (enabledPlugins[track.id] || [])
              .map((id) => window.AppPlugins.get(id))
              .filter(Boolean);
            const isHovered = hoveredTrackId === track.id;
            const isMenuOpen = menuTrackId === track.id;
            return (
              <div key={track.id} style={{ marginBottom: 24 }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}
                onMouseEnter={() => setHoveredTrackId(track.id)}
                onMouseLeave={() => setHoveredTrackId((prev) => (prev === track.id ? null : prev))}
              >
                <div style={{ width: 150, flexShrink: 0, paddingTop: 4, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontFamily: 'Newsreader, serif', fontSize: 15, lineHeight: 1.3 }}>
                      {track.name}
                    </div>
                    <button
                      onClick={() => setMenuTrackId((prev) => (prev === track.id ? null : track.id))}
                      aria-label={`Manage plugins for ${track.name}`}
                      title="Plugins"
                      style={{
                        width: 15,
                        height: 15,
                        borderRadius: '50%',
                        border: '1px solid #C7CBD4',
                        background: '#FFFFFF',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        opacity: isHovered || isMenuOpen ? 1 : 0,
                        transition: 'opacity 0.12s ease',
                      }}
                    >
                      <PlusIcon size={9} />
                    </button>
                  </div>
                  <div style={{ fontSize: 10, marginTop: 2, color: track.color, opacity: 0.85 }}>
                    {streak > 0 ? `${streak}-day streak` : '—'}
                  </div>
                  {trackEnabledPlugins.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {trackEnabledPlugins.map((plugin) => {
                        const key = `${track.id}:${plugin.id}`;
                        const open = openPanels.has(key);
                        const hasEntry = typeof plugin.hasEntry === 'function'
                          ? plugin.hasEntry(track, selectedDate)
                          : false;
                        return (
                          <button
                            key={plugin.id}
                            onClick={() => togglePanelOpen(track.id, plugin.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 10,
                              border: `1px solid ${open ? track.color : '#E1E4EA'}`,
                              background: open ? `${track.color}14` : 'transparent',
                              color: 'inherit',
                              opacity: 0.85,
                              cursor: 'pointer',
                            }}
                          >
                            {hasEntry && (
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: track.color, display: 'inline-block' }} />
                            )}
                            {plugin.name}
                            <ChevronDown size={9} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {isMenuOpen && (
                    <div
                      onClick={() => setMenuTrackId(null)}
                      style={{ position: 'fixed', inset: 0, zIndex: 4 }}
                    />
                  )}
                  {isMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 4,
                        zIndex: 5,
                        width: 180,
                        background: '#FFFFFF',
                        border: '1px solid #E1E4EA',
                        borderRadius: 6,
                        boxShadow: '0 4px 14px rgba(27,31,42,0.12)',
                        padding: 8,
                      }}
                    >
                      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6, padding: '0 4px' }}>
                        Plugins
                      </div>
                      {plugins.length === 0 && (
                        <div style={{ fontSize: 11, opacity: 0.4, padding: '4px 4px' }}>
                          None available
                        </div>
                      )}
                      {plugins.map((plugin) => {
                        const active = (enabledPlugins[track.id] || []).includes(plugin.id);
                        return (
                          <label
                            key={plugin.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 4px', cursor: 'pointer' }}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => togglePluginForTrack(track.id, plugin.id)}
                              style={{ margin: 0, cursor: 'pointer' }}
                            />
                            {plugin.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', position: 'relative', height: 28 }}>
                    <div style={{ position: 'absolute', left: 12, right: 8, top: '50%', height: 3, background: track.color, opacity: 0.22, transform: 'translateY(-50%)' }} />
                    {dates.map((d) => {
                      const done = !!history[d]?.[track.id]?.done;
                      const isToday = d === todayStr;
                      return (
                        <div key={d} style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                          <button
                            onClick={() => toggleDone(d, track.id)}
                            aria-label={`${track.name} on ${d}${done ? ', done' : ', not done'}`}
                            style={{
                              width: isToday ? 15 : 11,
                              height: isToday ? 15 : 11,
                              borderRadius: '50%',
                              background: done ? track.color : '#FFFFFF',
                              border: `2px solid ${done ? track.color : '#C7CBD4'}`,
                              boxShadow: isToday ? `0 0 0 3px ${track.color}22` : 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          />
                        </div>
                      );
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: '5px solid transparent',
                          borderBottom: '5px solid transparent',
                          borderLeft: `9px solid ${track.color}66`,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: gridCols }}>
                    {dates.map((d, i) => (
                      <div
                        key={d}
                        style={{
                          textAlign: 'center',
                          fontSize: 9,
                          opacity: d === todayStr ? 0.9 : 0.35,
                          fontWeight: d === todayStr ? 600 : 400,
                        }}
                      >
                        {dayLabel(d, i === 0)}
                      </div>
                    ))}
                    <div />
                  </div>
                </div>
              </div>
              {trackEnabledPlugins.map((plugin) => {
                const key = `${track.id}:${plugin.id}`;
                if (!openPanels.has(key)) return null;
                return (
                  <div
                    key={plugin.id}
                    style={{
                      marginTop: 8,
                      marginLeft: 166,
                      border: '1px solid #E1E4EA',
                      borderRadius: 6,
                      background: '#FFFFFF',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>
                        {plugin.name} · {selectedDate === todayStr ? 'Today' : formatFullDate(selectedDate)}
                      </div>
                      <button
                        onClick={() => togglePanelOpen(track.id, plugin.id)}
                        aria-label={`Collapse ${plugin.name} panel`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.4, padding: 0 }}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <plugin.Panel track={track} date={selectedDate} />
                  </div>
                );
              })}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 16, maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => shiftSelectedDate(-1)} style={{ padding: 4, opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} aria-label="Previous day">
            <ChevronLeft size={18} />
          </button>
          <div style={{ fontFamily: 'Newsreader, serif', fontSize: 20, textAlign: 'center' }}>
            {selectedDate === todayStr ? 'Today' : formatFullDate(selectedDate)}
          </div>
          <button
            onClick={() => shiftSelectedDate(1)}
            disabled={selectedDate === todayStr}
            style={{ padding: 4, opacity: selectedDate === todayStr ? 0.2 : 0.6, background: 'none', border: 'none', cursor: selectedDate === todayStr ? 'default' : 'pointer', color: 'inherit' }}
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #E1E4EA', background: '#FFFFFF' }}>
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <div style={{ padding: '8px 16px', fontSize: 12, opacity: 0.5, background: '#EFF1F4' }}>
                {cat}
              </div>
              {tracks.filter((t) => t.category === cat).map((track) => {
                const entry = history[selectedDate]?.[track.id] || { done: false, note: '' };
                return (
                  <div key={track.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid #EDEFF2' }}>
                    <button
                      onClick={() => toggleDone(selectedDate, track.id)}
                      aria-label={`Mark ${track.name} ${entry.done ? 'not done' : 'done'}`}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        flexShrink: 0,
                        background: entry.done ? track.color : '#fff',
                        border: `2px solid ${entry.done ? track.color : '#C7CBD4'}`,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, textDecoration: entry.done ? 'line-through' : 'none', opacity: entry.done ? 0.5 : 1 }}>
                        {track.name}
                      </div>
                      <input
                        type="text"
                        value={entry.note}
                        onChange={(e) => updateNote(selectedDate, track.id, e.target.value)}
                        placeholder="add a note…"
                        style={{ width: '100%', fontSize: 12, background: 'transparent', outline: 'none', marginTop: 2, border: 'none', color: '#6B7280', fontFamily: 'IBM Plex Mono, monospace' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, opacity: 0.4, marginTop: 12 }}>
          {doneCountForSelected} of {tracks.length} done{saving ? ' · saving…' : ''}
        </div>
        {errorMsg && (
          <div style={{ fontSize: 12, marginTop: 8, color: '#B3261E' }}>
            {errorMsg}
          </div>
        )}
      </div>
      </>
      )}

      {view === 'diary' && <Diary history={history} tracks={tracks} todayStr={todayStr} />}

      {view === 'analysis' && <Analysis history={history} todayStr={todayStr} tracks={tracks} />}

      {view === 'manage' && (
        <Manage tracks={tracks} categories={CATEGORIES} onAdd={addTrack} onRemove={removeTrack} />
      )}
      </div>
    </div>
  );
}