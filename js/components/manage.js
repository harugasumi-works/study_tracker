const labelStyle = {
  display: 'block',
  fontSize: 11,
  opacity: 0.5,
  marginBottom: 6,
};

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

function Manage({
  tracks,
  categories,
  onSave,
  saving,
  onStatusChange,
}) {
  const [draftTracks, setDraftTracks] =
    useState(tracks);

  const [draftCategories, setDraftCategories] =
    useState(categories);

  const [newCategory, setNewCategory] =
    useState('');

  const [newTaskName, setNewTaskName] =
    useState('');

  const [newTaskCategory, setNewTaskCategory] =
    useState(categories[0] || '');

  const [newTaskColor, setNewTaskColor] =
    useState(
      TRACK_COLOR_PALETTE[
        tracks.length % TRACK_COLOR_PALETTE.length
      ]
    );

  const [newTaskMin, setNewTaskMin] =
    useState(0);

  const [confirmRemoveId, setConfirmRemoveId] =
    useState(null);

  const [confirmDeleteCategory, setConfirmDeleteCategory] =
    useState(null);

  useEffect(() => {
    setDraftTracks(tracks);
    setDraftCategories(categories);
  }, [tracks, categories]);

  const status = (() => {
    const trimmed = draftCategories.map(
      (c) => c.trim()
    );

    const validNames =
      trimmed.length > 0 &&
      trimmed.every(Boolean) &&
      new Set(trimmed).size === trimmed.length;

    const categorySet = new Set(trimmed);

    const strayTracks = draftTracks.filter(
      (t) =>
        !categorySet.has(
          String(t.category || '').trim()
        )
    );

    return {
      valid:
        validNames &&
        strayTracks.length === 0,

      strayTracks,
      validNames,
    };
  })();

  useEffect(() => {
    const dirty =
      JSON.stringify(draftTracks) !==
        JSON.stringify(tracks) ||
      JSON.stringify(draftCategories) !==
        JSON.stringify(categories);

    onStatusChange({
      valid: status.valid,
      dirty,
    });
  }, [
    draftTracks,
    draftCategories,
    tracks,
    categories,
    status.valid,
    onStatusChange,
  ]);

  const renameCategory = (
    oldName,
    value
  ) => {
    setDraftCategories((prev) =>
      prev.map((c) =>
        c === oldName
          ? value
          : c
      )
    );

    setDraftTracks((prev) =>
      prev.map((t) =>
        t.category === oldName
          ? {
              ...t,
              category: value,
            }
          : t
      )
    );
  };

  const deleteCategory = (category) => {
    setDraftCategories((prev) =>
      prev.filter(
        (c) => c !== category
      )
    );

    // Deliberately leave task.category untouched.
    // These tasks become strays until reassigned.
    setConfirmDeleteCategory(null);
  };

  const addCategory = (e) => {
    e.preventDefault();

    const trimmed =
      newCategory.trim();

    if (
      !trimmed ||
      draftCategories.includes(trimmed)
    ) {
      return;
    }

    setDraftCategories((prev) => [
      ...prev,
      trimmed,
    ]);

    setNewCategory('');

    if (!newTaskCategory) {
      setNewTaskCategory(trimmed);
    }
  };

  const assignTrack = (
    trackId,
    category
  ) => {
    setDraftTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              category,
            }
          : t
      )
    );
  };

  const addTask = (e) => {
    e.preventDefault();

    const trimmed =
      newTaskName.trim();

    if (!trimmed) return;

    const category =
      draftCategories.includes(
        newTaskCategory
      )
        ? newTaskCategory
        : '';

    setDraftTracks((prev) => [
      ...prev,
      {
        id: uniqueTrackId(
          trimmed,
          prev
        ),
        name: trimmed,
        category,
        color: newTaskColor,
        minPerWeek:
          newTaskMin || 0,
      },
    ]);

    setNewTaskName('');
    setNewTaskMin(0);

    setNewTaskColor(
      TRACK_COLOR_PALETTE[
        (draftTracks.length + 1) %
          TRACK_COLOR_PALETTE.length
      ]
    );

    setNewTaskCategory(
      draftCategories[0] || ''
    );
  };

  const removeTask = (trackId) => {
    setDraftTracks((prev) =>
      prev.filter(
        (t) => t.id !== trackId
      )
    );

    setConfirmRemoveId(null);
  };

  const updateMin = (
    trackId,
    minPerWeek
  ) => {
    setDraftTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? {
              ...t,
              minPerWeek,
            }
          : t
      )
    );
  };

  const clampMin = (v) =>
    Math.max(
      0,
      Math.min(
        7,
        Number.isFinite(v)
          ? v
          : 0
      )
    );

  const categoryCounts =
    Object.fromEntries(
      draftCategories.map((c) => [
        c,
        0,
      ])
    );

  draftTracks.forEach((t) => {
    if (
      categoryCounts[t.category] !==
      undefined
    ) {
      categoryCounts[t.category] += 1;
    }
  });

  return (
    <div style={{ maxWidth: 640 }}>
      <h2
        style={{
          fontSize: 14,
          opacity: 0.6,
          marginBottom: 16,
          fontWeight: 400,
        }}
      >
        Curriculum
      </h2>

      <div
        style={{
          borderRadius: 6,
          border:
            '1px solid #E1E4EA',
          background: '#FFFFFF',
          marginBottom: 24,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding:
              '12px 16px',
            borderBottom:
              '1px solid #EDEFF2',
            fontSize: 12,
            opacity: 0.6,
          }}
        >
          Categories
        </div>

        {draftCategories.map(
          (cat) => (
            <div
              key={cat}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding:
                  '10px 16px',
                borderTop:
                  '1px solid #EDEFF2',
              }}
            >
              <input
                value={cat}
                onChange={(e) =>
                  renameCategory(
                    cat,
                    e.target.value
                  )
                }
                style={{
                  ...inputStyle,
                  flex: 1,
                }}
                aria-label={`Rename category ${cat}`}
              />

              <span
                style={{
                  fontSize: 11,
                  opacity: 0.45,
                  whiteSpace:
                    'nowrap',
                }}
              >
                {categoryCounts[
                  cat
                ]}{' '}
                tasks
              </span>

              {confirmDeleteCategory ===
              cat ? (
                <span
                  style={{
                    fontSize: 12,
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  <button
                    onClick={() =>
                      deleteCategory(cat)
                    }
                    style={linkBtnStyle(
                      '#B3261E'
                    )}
                  >
                    Delete
                  </button>

                  {' · '}

                  <button
                    onClick={() =>
                      setConfirmDeleteCategory(
                        null
                      )
                    }
                    style={linkBtnStyle(
                      'inherit',
                      0.6
                    )}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() =>
                    setConfirmDeleteCategory(
                      cat
                    )
                  }
                  style={linkBtnStyle(
                    '#B3261E',
                    0.65
                  )}
                >
                  Delete
                </button>
              )}
            </div>
          )
        )}

        {draftCategories.length ===
          0 && (
          <div
            style={{
              padding: 16,
              fontSize: 12,
              color:
                '#B3261E',
            }}
          >
            All categories have been deleted.
            Add a category before you can leave
            Curriculum.
          </div>
        )}

        <form
          onSubmit={addCategory}
          style={{
            padding: 12,
            borderTop:
              '1px solid #EDEFF2',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            value={newCategory}
            onChange={(e) =>
              setNewCategory(
                e.target.value
              )
            }
            placeholder="New category name"
            style={{
              ...inputStyle,
              flex: 1,
            }}
          />

          <button
            type="submit"
            disabled={
              !newCategory.trim() ||
              draftCategories.includes(
                newCategory.trim()
              )
            }
            style={{
              ...linkBtnStyle(
                '#1B1F2A'
              ),
              fontWeight: 600,
            }}
          >
            Add
          </button>
        </form>
      </div>

      <div
        style={{
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'baseline',
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              opacity: 0.6,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Tasks
          </h2>

          {status.strayTracks
            .length > 0 && (
            <span
              style={{
                fontSize: 11,
                color:
                  '#B3261E',
              }}
            >
              {
                status
                  .strayTracks
                  .length
              }{' '}
              stray task
              {status.strayTracks
                .length === 1
                ? ''
                : 's'}
            </span>
          )}
        </div>

        <div
          style={{
            borderRadius: 6,
            overflow: 'hidden',
            border:
              '1px solid #E1E4EA',
            background:
              '#FFFFFF',
          }}
        >
          {draftTracks.length ===
            0 && (
            <div
              style={{
                padding: 16,
                fontSize: 13,
                opacity: 0.5,
              }}
            >
              No curriculum items yet — add
              one below.
            </div>
          )}

          {draftTracks.map(
            (t) => {
              const stray =
                !draftCategories.includes(
                  t.category
                );

              return (
                <div
                  key={t.id}
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      '1fr 160px auto',
                    alignItems:
                      'center',
                    gap: 10,
                    padding:
                      '12px 16px',
                    borderTop:
                      '1px solid #EDEFF2',
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontFamily:
                          'Newsreader, serif',
                      }}
                    >
                      {t.name}
                    </div>

                    {stray && (
                      <div
                        style={{
                          fontSize: 10,
                          color:
                            '#B3261E',
                          marginTop: 3,
                        }}
                      >
                        stray — category “
                        {t.category ||
                          'none'}
                        ” no longer exists
                      </div>
                    )}
                  </div>

                  <select
                    value={
                      draftCategories.includes(
                        t.category
                      )
                        ? t.category
                        : ''
                    }
                    onChange={(e) =>
                      assignTrack(
                        t.id,
                        e.target
                          .value
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="">
                      {draftCategories.length
                        ? 'Assign category…'
                        : 'No categories'}
                    </option>

                    {draftCategories.map(
                      (c) => (
                        <option
                          key={c}
                          value={c}
                        >
                          {c}
                        </option>
                      )
                    )}
                  </select>

                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        opacity:
                          0.5,
                      }}
                    >
                      min/wk
                    </span>

                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={
                        t.minPerWeek ||
                        0
                      }
                      onChange={(e) =>
                        updateMin(
                          t.id,
                          clampMin(
                            parseInt(
                              e.target
                                .value,
                              10
                            )
                          )
                        )
                      }
                      style={{
                        width: 44,
                        ...inputStyle,
                        padding:
                          '5px 6px',
                      }}
                    />

                    {confirmRemoveId ===
                    t.id ? (
                      <span
                        style={{
                          fontSize: 12,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        <button
                          onClick={() =>
                            removeTask(
                              t.id
                            )
                          }
                          style={linkBtnStyle(
                            '#B3261E'
                          )}
                        >
                          Remove
                        </button>

                        {' · '}

                        <button
                          onClick={() =>
                            setConfirmRemoveId(
                              null
                            )
                          }
                          style={linkBtnStyle(
                            'inherit',
                            0.6
                          )}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmRemoveId(
                            t.id
                          )
                        }
                        style={linkBtnStyle(
                          'inherit',
                          0.4
                        )}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      <form
        onSubmit={addTask}
        style={{
          border:
            '1px solid #E1E4EA',
          borderRadius: 6,
          padding: 16,
          background:
            '#FFFFFF',
          marginBottom: 20,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            opacity: 0.6,
            margin:
              '0 0 14px',
            fontWeight: 400,
          }}
        >
          Add task
        </h3>

        <div
          style={{
            marginBottom: 14,
          }}
        >
          <label
            style={labelStyle}
          >
            Name
          </label>

          <input
            type="text"
            value={newTaskName}
            onChange={(e) =>
              setNewTaskName(
                e.target.value
              )
            }
            placeholder="e.g. Piano practice"
            style={inputStyle}
          />
        </div>

        <div
          style={{
            display:
              'grid',
            gridTemplateColumns:
              '1fr 100px',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label
              style={labelStyle}
            >
              Category
            </label>

            <select
              value={newTaskCategory}
              onChange={(e) =>
                setNewTaskCategory(
                  e.target.value
                )
              }
              style={inputStyle}
            >
              <option value="">
                No category
              </option>

              {draftCategories.map(
                (c) => (
                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              style={labelStyle}
            >
              Min / wk
            </label>

            <input
              type="number"
              min={0}
              max={7}
              value={newTaskMin}
              onChange={(e) =>
                setNewTaskMin(
                  clampMin(
                    parseInt(
                      e.target
                        .value,
                      10
                    )
                  )
                )
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
          }}
        >
          <label
            style={labelStyle}
          >
            Color
          </label>

          <div
            style={{
              display:
                'flex',
              gap: 8,
              flexWrap:
                'wrap',
            }}
          >
            {TRACK_COLOR_PALETTE.map(
              (c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() =>
                    setNewTaskColor(
                      c
                    )
                  }
                  aria-label={`Choose color ${c}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius:
                      '50%',
                    background: c,
                    border:
                      newTaskColor ===
                      c
                        ? '2px solid #1B1F2A'
                        : '2px solid transparent',
                    boxShadow:
                      newTaskColor ===
                      c
                        ? '0 0 0 2px #fff inset'
                        : 'none',
                    cursor:
                      'pointer',
                    padding: 0,
                  }}
                />
              )
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={
            !newTaskName.trim()
          }
          style={{
            fontFamily:
              'IBM Plex Mono, monospace',
            fontSize: 12,
            padding:
              '8px 16px',
            borderRadius: 4,
            border:
              '1px solid #1B1F2A',
            background:
              newTaskName.trim()
                ? '#1B1F2A'
                : '#E1E4EA',
            color:
              newTaskName.trim()
                ? '#F5F6F8'
                : '#9199A6',
            cursor:
              newTaskName.trim()
                ? 'pointer'
                : 'default',
          }}
        >
          Add task
        </button>
      </form>

      <div
        style={{
          borderTop:
            '1px solid #E1E4EA',
          paddingTop: 16,
          display:
            'flex',
          alignItems:
            'center',
          justifyContent:
            'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color:
              status.valid
                ? '#2F7D5C'
                : '#B3261E',
          }}
        >
          {status.valid
            ? 'Ready to save and leave Curriculum.'
            : status.strayTracks
                .length
            ? 'Assign every stray task to a category.'
            : 'Create at least one category and use unique, non-empty names.'}
        </div>

        <button
          type="button"
          onClick={() =>
            onSave(
              draftTracks,
              draftCategories
            )
          }
          disabled={
            !status.valid ||
            saving
          }
          style={{
            fontFamily:
              'IBM Plex Mono, monospace',
            fontSize: 12,
            padding:
              '8px 18px',
            borderRadius: 4,
            border:
              '1px solid #1B1F2A',
            background:
              status.valid &&
              !saving
                ? '#1B1F2A'
                : '#E1E4EA',
            color:
              status.valid &&
              !saving
                ? '#F5F6F8'
                : '#9199A6',
            cursor:
              status.valid &&
              !saving
                ? 'pointer'
                : 'default',
          }}
        >
          {saving
            ? 'Saving…'
            : 'Save curriculum'}
        </button>
      </div>
    </div>
  );
}