// ============================================================
// 全局配置：默认值 + 持久化读取
// ============================================================
const CONFIG_STORAGE_KEY = 'my_game_config';

const DEFAULT_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  MAX_ROUNDS: 50,
  ACTION_DELAY: 900,
  GRID_SIZE: 4,
  CELL_SIZE: 110,
  START_MP_RATIO: 0.3,
  MP_REGEN_PER_ROUND: 0.1,
  DEF_CONSTANT: 1000,
  MIN_DAMAGE_RATIO: 0.1,
  CRIT_RATE_CAP: 1.0,
  HIT_RATE_MIN: 0.2,
  HIT_RATE_MAX: 1.0,

  // ===== 新增：6大意境转化系数与上限 =====
  fengRuiToAtk: 3.0,       
  hunHouToHp: 20.0,        
  lingDongToSpd: 1.5,      
  lingDongToEva: 0.1,      
  maxEvaFromStats: 20.0,   
  jianRenToDef: 2.0,       
  jianRenToRes: 0.1,       
  guiMiToHit: 0.15,        
  guiMiToCritDmg: 1.0,     
  jueQingToCrit: 0.2,      
  maxCritFromStats: 30.0   
};

const DEFAULT_ELEMENTS = [
  { id: 'fire',  name: '火', icon: '🔥', color: '#ff5722' },
  { id: 'water', name: '水', icon: '💧', color: '#2196f3' },
  { id: 'wind',  name: '风', icon: '🌪️', color: '#4caf50' },
  { id: 'light', name: '光', icon: '✨', color: '#ffc107' },
  { id: 'dark',  name: '暗', icon: '🌑', color: '#9c27b0' }
];

const DEFAULT_ELEMENT_MATRIX = {
  fire:  { wind: 1.5, water: 0.7 },
  water: { fire: 1.5, wind: 0.7 },
  wind:  { water: 1.5, fire: 0.7 },
  light: { dark: 1.5 },
  dark:  { light: 1.5 }
};

function loadGameConfig() {
  let user = {};
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    console.warn('读取全局配置失败，使用默认值', e);
  }

  const config = { ...DEFAULT_CONFIG, ...(user.config || {}) };
  Object.keys(DEFAULT_CONFIG).forEach(key => {
    if (typeof config[key] !== 'number' || isNaN(config[key])) {
      config[key] = DEFAULT_CONFIG[key];
    }
  });

  const elements = Array.isArray(user.elements) ? user.elements : DEFAULT_ELEMENTS.map(e => ({ ...e }));
  const elementMatrix = (user.elementMatrix && typeof user.elementMatrix === 'object') ? user.elementMatrix : JSON.parse(JSON.stringify(DEFAULT_ELEMENT_MATRIX));

  return { config, elements, elementMatrix };
}

const { config: CONFIG, elements: ELEMENTS, elementMatrix: ELEMENT_MATRIX } = loadGameConfig();

function getElementInfo(id) {
  return ELEMENTS.find(e => e.id === id) || { id, name: id || '未知', icon: '❓', color: '#888888' };
}

function getElementMultiplier(attackerEl, defenderEl) {
  if (!attackerEl || !defenderEl) return 1.0;
  if (!ELEMENTS.some(e => e.id === attackerEl)) return 1.0;
  if (!ELEMENTS.some(e => e.id === defenderEl)) return 1.0;
  const row = ELEMENT_MATRIX[attackerEl];
  if (!row) return 1.0;
  const v = row[defenderEl];
  return typeof v === 'number' ? v : 1.0;
}

// ============================================================
// 兜底数据
// ============================================================
const SKILLS = {};
const STATUSES = {};
const CHARACTERS = [];
const ITEMS = {};
const INVENTORY = [];
const EQUIPS = {};
const LEVELS = [];
const OWNED_EQUIPS = [];
