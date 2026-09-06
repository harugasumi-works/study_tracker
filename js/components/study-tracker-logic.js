// Tracker "brain": state, persistence, and event handlers.
// No JSX/markup lives here — that's in study-tracker-view.js, which calls
// useTrackerState() and renders based on what it returns. Keeping this
// split means you can change how something LOOKS without touching how it
// WORKS, and vice versa.

function useTrackerState() {
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

  const addTrack = (name, category, color, minPerWeek) => {
    setTracks((prev) => {
      const id = uniqueTrackId(name, prev);
      const next = [...prev, { id, name, category, color, minPerWeek: minPerWeek || 0 }];
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

  const updateTrackMinPerWeek = (trackId, minPerWeek) => {
    setTracks((prev) => {
      const next = prev.map((t) => (t.id === trackId ? { ...t, minPerWeek } : t));
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

  return {
    // read-only values the view renders
    todayStr, history, tracks, loaded, selectedDate, saving, errorMsg, view,
    plugins, enabledPlugins, openPanels, menuTrackId, hoveredTrackId,
    dates, doneCountForSelected,
    // setters the view wires directly to onClick/onChange
    setView, setMenuTrackId, setHoveredTrackId,
    // action handlers
    toggleDone, updateNote, addTrack, removeTrack, updateTrackMinPerWeek,
    togglePluginForTrack, togglePanelOpen, shiftSelectedDate,
  };
}