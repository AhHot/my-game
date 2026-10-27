// ============================================================
// 全局配置：預設值 + 持久化讀取
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
  { id: 'wind',  name: '風', icon: '🌪️', color: '#4caf50' },
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
    console.warn('讀取全域配置失敗，使用預設值', e);
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
// 確保戰鬥與UI能安全讀取的資料對應與快取同步
// ============================================================
window.SKILLS = window.SKILLS || {};
window.STATUSES = window.STATUSES || {};
window.CHARACTERS = window.CHARACTERS || [];
window.ITEMS = window.ITEMS || {};
window.INVENTORY = window.INVENTORY || [];
window.EQUIPS = window.EQUIPS || {};
window.LEVELS = window.LEVELS || [];
window.OWNED_EQUIPS = window.OWNED_EQUIPS || [];

// 從 localStorage 同步載入數據，防止進戰鬥時為空導致黑屏
try {
  const savedChars = localStorage.getItem('my_game_characters') || localStorage.getItem('my_game_data_v22');
  if (savedChars) {
    const parsed = JSON.parse(savedChars);
    if (Array.isArray(parsed) && parsed.length > 0) {
      window.CHARACTERS.length = 0;
      window.CHARACTERS.push(...parsed);
    }
  }

  const savedSkills = localStorage.getItem('my_game_skills_sync') || localStorage.getItem('my_game_skills_v22');
  if (savedSkills) {
    const parsed = JSON.parse(savedSkills);
    if (Array.isArray(parsed)) {
      parsed.forEach(sk => { if (sk && sk.id) window.SKILLS[sk.id] = sk; });
    }
  }

  const savedLevels = localStorage.getItem('my_game_levels_sync') || localStorage.getItem('my_game_levels_v22');
  if (savedLevels) {
    const parsed = JSON.parse(savedLevels);
    if (Array.isArray(parsed)) {
      window.LEVELS.length = 0;
      window.LEVELS.push(...parsed);
    }
  }

  const savedStatuses = localStorage.getItem('my_game_statuses_sync') || localStorage.getItem('my_game_statuses_v22');
  if (savedStatuses) {
    const parsed = JSON.parse(savedStatuses);
    if (Array.isArray(parsed)) {
      parsed.forEach(st => { if (st && st.id) window.STATUSES[st.id] = st; });
    }
  }
} catch (e) {
  console.error("同步讀取遊戲暫存數據出錯：", e);
}
