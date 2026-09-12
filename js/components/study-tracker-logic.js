// Tracker "brain": state, persistence, and event handlers.
// No JSX/markup lives here — that's in study-tracker-view.js, which calls
// useTrackerState() and renders based on what it returns.

function uniqueCategoryNames(values) {
  const seen = new Set();
  const out = [];

  values.forEach((value) => {
    const trimmed = String(value || '').trim();

    if (!trimmed || seen.has(trimmed)) return;

    seen.add(trimmed);
    out.push(trimmed);
  });

  return out;
}

function curriculumStatus(tracks, categories) {
  const normalizedCategories = categories
    .map((c) => String(c || '').trim())
    .filter(Boolean);

  const categorySet = new Set(normalizedCategories);

  const hasDuplicateCategories =
    new Set(normalizedCategories).size !== normalizedCategories.length;

  const strayTracks = tracks.filter(
    (t) => !categorySet.has(String(t.category || '').trim())
  );

  return {
    valid:
      normalizedCategories.length > 0 &&
      !hasDuplicateCategories &&
      strayTracks.length === 0,
    strayTracks,
  };
}

function useTrackerState() {
  const todayStr = isoDate(new Date());

  const [history, setHistory] = useState({});
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState('tracker');
  const [curriculumValid, setCurriculumValid] = useState(true);
  const [curriculumDirty, setCurriculumDirty] = useState(false);

  // Plugin UI state. `enabledPlugins` (persisted) maps trackId -> [pluginId].
  const plugins = usePluginList();

  const [enabledPlugins, setEnabledPlugins] = useState({});
  const [openPanels, setOpenPanels] = useState(() => new Set());
  const [menuTrackId, setMenuTrackId] = useState(null);
  const [hoveredTrackId, setHoveredTrackId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [
          historyResult,
          tracksResult,
          categoriesResult,
          pluginEnabledResult,
        ] = await Promise.all([
          storage.get(STORAGE_KEY),
          storage.get(TRACKS_STORAGE_KEY),
          storage.get(CATEGORIES_STORAGE_KEY),
          storage.get(PLUGIN_ENABLED_KEY),
        ]);

        let parsedTracks = DEFAULT_TRACKS;

        if (tracksResult && tracksResult.value) {
          const candidate = JSON.parse(tracksResult.value);

          if (Array.isArray(candidate)) {
            parsedTracks = candidate;
          }
        }

        setTracks(parsedTracks);

        let parsedCategories;

        if (categoriesResult && categoriesResult.value) {
          const candidate = JSON.parse(categoriesResult.value);

          if (Array.isArray(candidate)) {
            parsedCategories = uniqueCategoryNames(candidate);
          }
        }

        if (!parsedCategories) {
          // Migration: preserve the legacy category names and any custom
          // labels already attached to tracks.
          parsedCategories = uniqueCategoryNames([
            ...DEFAULT_CATEGORIES,
            ...parsedTracks.map((t) => t.category),
          ]);

          await storage.set(
            CATEGORIES_STORAGE_KEY,
            JSON.stringify(parsedCategories)
          );
        }

        setCategories(parsedCategories);

        if (historyResult && historyResult.value) {
          setHistory(JSON.parse(historyResult.value));
        }

        if (pluginEnabledResult && pluginEnabledResult.value) {
          setEnabledPlugins(
            JSON.parse(pluginEnabledResult.value)
          );
        }
      } catch (e) {
        setHistory({});

        setCategories(
          uniqueCategoryNames([
            ...DEFAULT_CATEGORIES,
            ...DEFAULT_TRACKS.map((t) => t.category),
          ])
        );
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (key, value) => {
    setSaving(true);

    try {
      const result = await storage.set(
        key,
        JSON.stringify(value)
      );

      if (!result) {
        setErrorMsg(
          'Could not save — your last change may not persist.'
        );
      } else {
        setErrorMsg('');
      }

      return !!result;
    } catch (e) {
      setErrorMsg(
        'Could not save — your last change may not persist.'
      );

      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleDone = (dateStr, trackId) => {
    setHistory((prev) => {
      const day = {
        ...(prev[dateStr] || {}),
      };

      const entry = {
        ...(day[trackId] || {
          done: false,
          note: '',
        }),
      };

      entry.done = !entry.done;
      day[trackId] = entry;

      const next = {
        ...prev,
        [dateStr]: day,
      };

      persist(STORAGE_KEY, next);

      return next;
    });
  };

  const updateNote = (dateStr, trackId, note) => {
    setHistory((prev) => {
      const day = {
        ...(prev[dateStr] || {}),
      };

      const entry = {
        ...(day[trackId] || {
          done: false,
          note: '',
        }),
      };

      entry.note = note;
      day[trackId] = entry;

      const next = {
        ...prev,
        [dateStr]: day,
      };

      persist(STORAGE_KEY, next);

      return next;
    });
  };

  const saveCurriculum = async (
    nextTracks,
    nextCategories
  ) => {
    const normalizedCategories =
      uniqueCategoryNames(nextCategories);

    if (
      normalizedCategories.length !== nextCategories.length ||
      normalizedCategories.length === 0
    ) {
      setErrorMsg(
        normalizedCategories.length === 0
          ? 'Add at least one category before saving.'
          : 'Category names must be unique and non-empty.'
      );

      return false;
    }

    const status = curriculumStatus(
      nextTracks,
      normalizedCategories
    );

    if (!status.valid) {
      setErrorMsg(
        status.strayTracks.length
          ? 'Assign every stray task to a category before saving.'
          : 'Fix the category setup before saving.'
      );

      return false;
    }

    setSaving(true);

    try {
      const [
        trackResult,
        categoryResult,
      ] = await Promise.all([
        storage.set(
          TRACKS_STORAGE_KEY,
          JSON.stringify(nextTracks)
        ),
        storage.set(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(normalizedCategories)
        ),
      ]);

      if (!trackResult || !categoryResult) {
        throw new Error('save failed');
      }

      setTracks(nextTracks);
      setCategories(normalizedCategories);
      setCurriculumDirty(false);
      setCurriculumValid(true);
      setErrorMsg('');

      return true;
    } catch (e) {
      setErrorMsg(
        'Could not save curriculum — your last change may not persist.'
      );

      return false;
    } finally {
      setSaving(false);
    }
  };

  const setCurriculumDraftStatus = useCallback(
    (status) => {
      setCurriculumValid(!!status.valid);
      setCurriculumDirty(!!status.dirty);
    },
    []
  );

  const requestView = (nextView) => {
    if (view === 'manage' && nextView !== 'manage') {
      if (!curriculumValid) {
        setErrorMsg(
          'Finish category setup and assign every stray task before leaving Curriculum.'
        );

        return;
      }

      if (curriculumDirty) {
        setErrorMsg(
          'Save your Curriculum changes before leaving this tab.'
        );

        return;
      }
    }

    setErrorMsg('');
    setView(nextView);
  };

  const togglePluginForTrack = (
    trackId,
    pluginId
  ) => {
    setEnabledPlugins((prev) => {
      const current = prev[trackId] || [];

      const nextForTrack = current.includes(pluginId)
        ? current.filter((id) => id !== pluginId)
        : [...current, pluginId];

      const next = {
        ...prev,
        [trackId]: nextForTrack,
      };

      persist(PLUGIN_ENABLED_KEY, next);

      return next;
    });

    setOpenPanels((prev) => {
      const key = `${trackId}:${pluginId}`;

      if (!prev.has(key)) {
        return prev;
      }

      const next = new Set(prev);
      next.delete(key);

      return next;
    });
  };

  const togglePanelOpen = (
    trackId,
    pluginId
  ) => {
    setOpenPanels((prev) => {
      const key = `${trackId}:${pluginId}`;
      const next = new Set(prev);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const shiftSelectedDate = (delta) => {
    setSelectedDate((current) => {
      const d = parseLocal(current);
      d.setDate(d.getDate() + delta);

      const next = isoDate(d);

      return next > todayStr
        ? todayStr
        : next;
    });
  };

  const dates = getLastNDates(
    DAYS_SHOWN,
    selectedDate
  );

  const doneCountForSelected =
    tracks.filter(
      (t) =>
        history[selectedDate]?.[t.id]?.done
    ).length;

  return {
    todayStr,
    history,
    tracks,
    categories,
    loaded,
    selectedDate,
    saving,
    errorMsg,
    view,

    plugins,
    enabledPlugins,
    openPanels,
    menuTrackId,
    hoveredTrackId,

    dates,
    doneCountForSelected,

    curriculumValid,
    curriculumDirty,

    setView: requestView,

    setMenuTrackId,
    setHoveredTrackId,

    toggleDone,
    updateNote,

    saveCurriculum,
    setCurriculumDraftStatus,

    togglePluginForTrack,
    togglePanelOpen,
    shiftSelectedDate,
  };
}