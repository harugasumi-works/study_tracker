// ---------------------------------------------------------------------------
// Plugin system
//
// Generic, path-based plugin loading: this app doesn't know "blog" exists.
// It fetches /plugin/manifest.json, loads whatever files are listed there,
// transforms them with Babel (so plugins can use JSX), and executes them.
// Each plugin file registers itself against window.AppPlugins. Any track
// can then adopt any registered plugin — the loader itself has no idea
// which tracks a plugin is meant for.
// ---------------------------------------------------------------------------
window.AppPlugins = window.AppPlugins || {
  _registry: new Map(),
  // Plugin shape: { id, name, Panel, hasEntry? }
  //   id        — unique string
  //   name      — short display name for the enable-menu and toggle pill
  //   Panel     — React component, receives { track, date }
  //   hasEntry  — optional (track, date) => boolean, used to show a dot
  //               on the collapsed toggle pill when there's data logged
  register(def) {
    if (!def || !def.id || !def.Panel) {
      console.error('AppPlugins.register: invalid plugin definition', def);
      return;
    }
    this._registry.set(def.id, def);
    window.dispatchEvent(new CustomEvent('app-plugin-registered', { detail: def.id }));
  },
  list() {
    return Array.from(this._registry.values());
  },
  get(id) {
    return this._registry.get(id);
  },
};

const PLUGIN_MANIFEST_URL = 'plugin/manifest.json';

async function loadPlugins() {
  try {
    const manifestRes = await fetch(PLUGIN_MANIFEST_URL);
    if (!manifestRes.ok) return;
    const manifest = await manifestRes.json();
    if (!Array.isArray(manifest)) return;
    for (const entry of manifest) {
      const src = typeof entry === 'string' ? entry : entry && entry.src;
      if (!src) continue;
      try {
        const codeRes = await fetch(`plugin/${src}`);
        if (!codeRes.ok) { console.error(`Plugin fetch failed: ${src}`); continue; }
        const rawCode = await codeRes.text();
        const { code } = Babel.transform(rawCode, { presets: ['react'], filename: src });
        const scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        scriptEl.text = code;
        document.body.appendChild(scriptEl);
      } catch (err) {
        console.error(`Failed to load plugin "${src}":`, err);
      }
    }
  } catch (err) {
    // No manifest reachable (e.g. the app was opened straight from disk
    // instead of a server). The core tracker works fine with no plugins.
  }
}
loadPlugins();

function usePluginList() {
  const [plugins, setPlugins] = useState(() => window.AppPlugins.list());
  useEffect(() => {
    const handler = () => setPlugins(window.AppPlugins.list());
    window.addEventListener('app-plugin-registered', handler);
    return () => window.removeEventListener('app-plugin-registered', handler);
  }, []);
  return plugins;
}
