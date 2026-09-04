// App-wide constants. Pure data — no logic lives here.

const DEFAULT_TRACKS = [
  { id: 'it_passport', name: 'IT Passport', category: 'Core study', color: '#3B4C9E' },
  { id: 'coding', name: 'Coding', category: 'Core study', color: '#2F7D5C' },
  { id: 'jp_book', name: 'Japanese book reading', category: 'Sub study', color: '#9C3D54' },
  { id: 'kanken', name: 'Kanken', category: 'Sub study', color: '#C08A2E' },
  { id: 'schoo', name: 'Schoo.jp', category: 'Sub study', color: '#3E7C86' },
  { id: 'coding_blog', name: 'Coding blog (Markdown)', category: 'Output', color: '#C1613B' },
  { id: 'jp_blog', name: 'Japanese essay blog (朝刊太郎)', category: 'Output', color: '#6B4A8A' },
];

const TRACK_COLOR_PALETTE = [
  '#3B4C9E', '#2F7D5C', '#9C3D54', '#C08A2E', '#3E7C86', '#C1613B', '#6B4A8A',
  '#4E7A3D', '#8A4A6B', '#3A6B8A', '#8A5A2E', '#5A5A8A',
];

const CATEGORIES = ['Core study', 'Sub study', 'Output'];
const DAYS_SHOWN = 14;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// localStorage keys
const STORAGE_KEY = 'tracker-history';
const TRACKS_STORAGE_KEY = 'tracker-tracks';
const PLUGIN_ENABLED_KEY = 'tracker-plugin-enabled';

// Analysis tab
const RANGE_OPTIONS = [
  { id: 14, label: '2 weeks' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
];
const HEATMAP_WEEKS = 12;
