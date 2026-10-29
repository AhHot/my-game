// ==========================================
// 公共数据核心：负责数据的读写与持久化
// ==========================================

const FOLLOWUP_TAGS = [
  { val: '', label: '无 (不产生/不响应)' },
  { val: 'po_shi', label: '【破势】' },
  { val: 'zhen_chan', label: '【震颤】' },
  { val: 'zhi_qi', label: '【滞气】' },
  { val: 'feng_hou', label: '【封喉】' },
  { val: 'te_shu', label: '【特殊】' }
];

const DEFAULT_GROWTH_MODELS = [
  { id: 'm1', name: '1. 均衡全能', fengRui: 1, hunHou: 1, lingDong: 1, jianRen: 1, guiMi: 0.5, jueQing: 0.5 },
  { id: 'm2', name: '2. 物理狂战', fengRui: 2, hunHou: 1.5, lingDong: 0, jianRen: 1, guiMi: 0, jueQing: 0.5 },
  { id: 'm3', name: '3. 轻灵刺客', fengRui: 1, hunHou: 0.5, lingDong: 2, jianRen: 0, guiMi: 1, jueQing: 0.5 },
  { id: 'm4', name: '4. 金刚铁壁', fengRui: 0, hunHou: 2, lingDong: 0.5, jianRen: 2, guiMi: 0.5, jueQing: 0 },
  { id: 'm5', name: '5. 百步穿杨', fengRui: 1, hunHou: 0.5, lingDong: 1, jianRen: 0.5, guiMi: 1.5, jueQing: 0.5 },
  { id: 'm6', name: '6. 气宗内家', fengRui: 0.5, hunHou: 1, lingDong: 0.5, jianRen: 0.5, guiMi: 2, jueQing: 0.5 },
  { id: 'm7', name: '7. 快剑游侠', fengRui: 1, hunHou: 0.5, lingDong: 1.5, jianRen: 0.5, guiMi: 1, jueQing: 0.5 },
  { id: 'm8', name: '8. 极致爆发', fengRui: 1.5, hunHou: 0, lingDong: 0.5, jianRen: 0, guiMi: 0.5, jueQing: 2.5 },
  { id: 'm9', name: '9. 不倒战象', fengRui: 0.5, hunHou: 2.5, lingDong: 0, jianRen: 1.5, guiMi: 0.5, jueQing: 0 },
  { id: 'm10', name: '10. 奇门遁甲', fengRui: 0.5, hunHou: 0.5, lingDong: 1, jianRen: 1, guiMi: 1, jueQing: 1 }
];

const DEFAULT_EXP_TABLE = [];
for (let i = 1; i <= 60; i++) {
  let req = 100;
  if (i <= 30) req = 100 + (i-1)*50;
  else if (i <= 50) req = 1500 + (i-31)*500;
  else req = 15000 + (i-51)*3000;
  DEFAULT_EXP_TABLE.push(req);
}

const DEFAULT_CHARS = [
  { id: 'p_warrior', name: '战士', side: 'player', level: 1, exp: 0, freePoints: 0, growthModel: 'm1', emoji: '⚔️', element: 'fire', maxHp: 1000, atk: 100, def: 50, speed: 8, sizeX: 1, sizeY: 1, critRate: 0.05, critDmg: 1.5, hitRate: 0, dodgeRate: 0, critResist: 0, lifesteal: 0, stats: { fengRui: 10, hunHou: 10, lingDong: 10, jianRen: 10, guiMi: 10, jueQing: 10 }, skillSlots: { normal: 'skill_slash', skill: 'skill_fireball', ultimate: '', followup: 'skill_follow_1', learned: '' }, equipment: { weapon: '', head: '', body: '', legs: '', ring: '', necklace: '' } },
  { id: 'e_skeleton', name: '骷髅兵', side: 'enemy', level: 1, exp: 0, freePoints: 0, growthModel: 'm1', emoji: '💀', element: 'dark', maxHp: 1000, atk: 100, def: 50, speed: 7, sizeX: 1, sizeY: 1, critRate: 0.05, critDmg: 1.4, hitRate: 0, dodgeRate: 0.05, critResist: 0, lifesteal: 0, stats: { fengRui: 0, hunHou: 0, lingDong: 0, jianRen: 0, guiMi: 0, jueQing: 0 }, skillSlots: { normal: 'skill_slash', skill: '', ultimate: '', followup: '', learned: '' }, equipment: { weapon: '', head: '', body: '', legs: '', ring: '', necklace: '' } }
];

const DEFAULT_SKILLS = [
  { id: 'skill_slash', name: '斩击', type: 'normal', element: 'fire', targetSide: 'enemy', targetRule: 'frontRow', multiplier: 1.0, healMultiplier: 0, shieldMultiplier: 0, mpCost: 0, cooldown: 0, comboTagOut: '', comboTagIn: '', maxTriggers: 1, effects: [] },
  { id: 'skill_fireball', name: '火球术', type: 'skill', element: 'fire', targetSide: 'enemy', targetRule: 'frontRow', multiplier: 3.0, healMultiplier: 0, shieldMultiplier: 0, mpCost: 20, cooldown: 2, comboTagOut: 'po_shi', comboTagIn: '', maxTriggers: 1, effects: [ { type: 'status', value: 'status_burn', chance: 1.0, targetSide: 'enemy', targetRule: 'sameAsMain' } ] },
  { id: 'skill_heal', name: '圣光术', type: 'skill', element: 'light', targetSide: 'player', targetRule: 'lowestHp', multiplier: 0, healMultiplier: 2.5, shieldMultiplier: 0, mpCost: 20, cooldown: 1, comboTagOut: '', comboTagIn: '', maxTriggers: 1, effects: [] },
  { id: 'skill_follow_1', name: '追打·烈焰斩', type: 'followup', element: 'fire', targetSide: 'enemy', targetRule: 'lowestHp', multiplier: 2.0, healMultiplier: 0, shieldMultiplier: 0, mpCost: 0, cooldown: 0, comboTagOut: '', comboTagIn: 'po_shi', maxTriggers: 1, effects: [] }
];

const DEFAULT_STATUS = [ 
  { id: 'status_burn', name: '灼烧', type: 'debuff', duration: 3, statMod: 'none', statValue: 0, isDot: true, dotValue: 200, isStun: false },
  { id: 'status_stun', name: '眩晕', type: 'control', duration: 1, statMod: 'none', statValue: 0, isDot: false, dotValue: 0, isStun: true }
];

const DEFAULT_ITEMS = [ 
  { id: 'item_sword', name: '铁剑', category: 'weapon', equipSlot: 'weapon', icon: '🗡️', desc: '', maxStack: 1, atkMin: 50, atkMax: 100, defMin: 0, defMax: 0, hpMin: 0, hpMax: 0, atkPercent: 0, defPercent: 0, hpPercent: 0, critRate: 0, critDmg: 0, lifesteal: 0, hitRate: 0, dodgeRate: 0, critResist: 0, speed: 0 }, 
  { id: 'item_exp_pill', name: '小还丹', category: 'consumable', icon: '💊', desc: '使用后获得1000点经验', maxStack: 99, useEffect: 'AddExp', useValue: 1000, useStatKey: '' } 
];

const DEFAULT_LEVELS = [ { id: 'lv_1', name: '第 1 关', enemyList: [], rewardItemId: '', rewardExp: 100 } ];

const DEFAULT_DROP_RATES = [
  { q: 'white', min: 0, max: 30, m: 1.0, n: 0, tier: 1 },
  { q: 'green', min: 30, max: 60, m: 1.05, n: 1, tier: 1 },
  { q: 'blue', min: 60, max: 85, m: 1.15, n: 2, tier: 2 },
  { q: 'purple', min: 85, max: 95, m: 1.3, n: 3, tier: 2 },
  { q: 'orange', min: 95, max: 99, m: 1.5, n: 4, tier: 3 },
  { q: 'red', min: 99, max: 100, m: 1.8, n: 5, tier: 3 }
];

const DEFAULT_AFFIX_POOLS = {
  weapon: ['atkFlat', 'atkPercent', 'critRate', 'critDmg', 'lifesteal', 'hitRate', 'speed'],
  armor: ['hpFlat', 'defFlat', 'hpPercent', 'defPercent', 'critResist', 'dodgeRate', 'speed'],
  accessory: ['atkFlat', 'defFlat', 'hpFlat', 'atkPercent', 'defPercent', 'hpPercent', 'critRate', 'critDmg', 'critResist', 'dodgeRate', 'hitRate', 'lifesteal', 'speed']
};

const DEFAULT_AFFIX_VALUES = {
  atkFlat: { min: 10, max: 50 }, defFlat: { min: 10, max: 30 }, hpFlat: { min: 100, max: 500 },
  atkPercent: { min: 4.0, max: 8.0 }, defPercent: { min: 4.0, max: 8.0 }, hpPercent: { min: 4.0, max: 8.0 },
  critRate: { min: 4.0, max: 8.0 }, critDmg: { min: 15.0, max: 25.0 }, critResist: { min: 4.0, max: 8.0 },
  dodgeRate: { min: 4.0, max: 8.0 }, hitRate: { min: 5.0, max: 10.0 }, lifesteal: { min: 1.0, max: 4.0 },
  speed: { min: 1, max: 4 }
};

const AFFIX_NAMES = {
  atkFlat: '攻击力(固定)', defFlat: '防御力(固定)', hpFlat: '生命值(固定)',
  atkPercent: '攻击力(%)', defPercent: '防御力(%)', hpPercent: '生命值(%)',
  critRate: '暴击率(%)', critDmg: '暴击伤害(%)', critResist: '抗暴率(%)',
  dodgeRate: '闪避率(%)', hitRate: '命中率(%)', lifesteal: '吸血(%)', speed: '速度(固定)'
};

const DEFAULT_GLOBAL_CONFIG = {
  config: {
    WIDTH: 1280, HEIGHT: 720, MAX_ROUNDS: 50, ACTION_DELAY: 900, GRID_SIZE: 4, CELL_SIZE: 110,
    START_MP_RATIO: 0.3, MP_REGEN_PER_ROUND: 0.1, DEF_CONSTANT: 1000,
    MIN_DAMAGE_RATIO: 0.1, CRIT_RATE_CAP: 1.0, HIT_RATE_MIN: 0.2, HIT_RATE_MAX: 1.0,
    fengRuiToAtk: 3.0, hunHouToHp: 20.0, lingDongToSpd: 1.5, lingDongToEva: 0.1, maxEvaFromStats: 20.0,
    jianRenToDef: 2.0, jianRenToRes: 0.1, guiMiToHit: 0.15, guiMiToCritDmg: 1.0, jueQingToCrit: 0.2, maxCritFromStats: 30.0
  },
  growthModels: JSON.parse(JSON.stringify(DEFAULT_GROWTH_MODELS)),
  expTable: JSON.parse(JSON.stringify(DEFAULT_EXP_TABLE)),
  dropRates: JSON.parse(JSON.stringify(DEFAULT_DROP_RATES)),
  affixPools: JSON.parse(JSON.stringify(DEFAULT_AFFIX_POOLS)),
  affixValues: JSON.parse(JSON.stringify(DEFAULT_AFFIX_VALUES)),
  elements: [
    { id: 'fire', name: '火', icon: '🔥', color: '#ff5722' },
    { id: 'water', name: '水', icon: '💧', color: '#2196f3' },
    { id: 'wind', name: '风', icon: '🌪️', color: '#4caf50' },
    { id: 'light', name: '光', icon: '✨', color: '#ffc107' },
    { id: 'dark', name: '暗', icon: '🌑', color: '#9c27b0' }
  ],
  elementMatrix: {
    fire: { wind: 1.5, water: 0.7 },
    water: { fire: 1.5, wind: 0.7 },
    wind: { water: 1.5, fire: 0.7 },
    light: { dark: 1.5 },
    dark: { light: 1.5 }
  }
};

// --- 全局数据变量 ---
let gameChars, gameSkills, gameStatuses, gameItems, gameLevels, inventory, globalData;
let editingElementIds = new Set();

function loadAllData() {
  try { gameChars = JSON.parse(localStorage.getItem('my_game_data_v22')) || JSON.parse(JSON.stringify(DEFAULT_CHARS)); } catch(e) { gameChars = JSON.parse(JSON.stringify(DEFAULT_CHARS)); }
  try { gameSkills = JSON.parse(localStorage.getItem('my_game_skills_v22')) || JSON.parse(JSON.stringify(DEFAULT_SKILLS)); } catch(e) { gameSkills = JSON.parse(JSON.stringify(DEFAULT_SKILLS)); }
  try { gameStatuses = JSON.parse(localStorage.getItem('my_game_statuses_v22')) || JSON.parse(JSON.stringify(DEFAULT_STATUS)); } catch(e) { gameStatuses = JSON.parse(JSON.stringify(DEFAULT_STATUS)); }
  try { gameItems = JSON.parse(localStorage.getItem('my_game_items_v22')) || JSON.parse(JSON.stringify(DEFAULT_ITEMS)); } catch(e) { gameItems = JSON.parse(JSON.stringify(DEFAULT_ITEMS)); }
  try { gameLevels = JSON.parse(localStorage.getItem('my_game_levels_v22')) || JSON.parse(JSON.stringify(DEFAULT_LEVELS)); } catch(e) { gameLevels = JSON.parse(JSON.stringify(DEFAULT_LEVELS)); }
  try { inventory = JSON.parse(localStorage.getItem('my_game_inventory_v22')) || []; } catch(e) { inventory = []; }
  try { globalData = JSON.parse(localStorage.getItem('my_game_config')) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG)); } catch(e) { globalData = JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG)); }

  // 🛡️ 終極守門員：確保後台的所有配置都完整存在，絕不讓數據漏掉
  if (!globalData.config) globalData.config = { ...DEFAULT_GLOBAL_CONFIG.config };
  Object.keys(DEFAULT_GLOBAL_CONFIG.config).forEach(k => {
    if (globalData.config[k] === undefined) globalData.config[k] = DEFAULT_GLOBAL_CONFIG.config[k];
  });
  if (!globalData.growthModels || globalData.growthModels.length === 0) globalData.growthModels = JSON.parse(JSON.stringify(DEFAULT_GROWTH_MODELS));
  if (!globalData.expTable || globalData.expTable.length === 0) globalData.expTable = JSON.parse(JSON.stringify(DEFAULT_EXP_TABLE));
  if (!globalData.dropRates) globalData.dropRates = JSON.parse(JSON.stringify(DEFAULT_DROP_RATES));
  if (!globalData.affixPools) globalData.affixPools = JSON.parse(JSON.stringify(DEFAULT_AFFIX_POOLS));
  if (!globalData.elements) globalData.elements = [ ...DEFAULT_GLOBAL_CONFIG.elements ];
  if (!globalData.elementMatrix) globalData.elementMatrix = { ...DEFAULT_GLOBAL_CONFIG.elementMatrix };

  // 🛡️ 核心修復：逐一檢查「詞條數值池」，只要缺了任何一條，自動補齊！
  if (!globalData.affixValues) globalData.affixValues = {};
  Object.keys(DEFAULT_AFFIX_VALUES).forEach(k => {
    if (!globalData.affixValues[k] || typeof globalData.affixValues[k].min === 'undefined') {
      globalData.affixValues[k] = JSON.parse(JSON.stringify(DEFAULT_AFFIX_VALUES[k]));
    }
  });

  // 兼容旧数据
  gameChars.forEach(c => {
    if (!c.stats) c.stats = { fengRui: 0, hunHou: 0, lingDong: 0, jianRen: 0, guiMi: 0, jueQing: 0 };
    if (!c.equipment) c.equipment = { weapon: '', head: '', body: '', legs: '', ring: '', necklace: '' };
    if (c.level === undefined) c.level = 1;
    if (c.exp === undefined) c.exp = 0;
    if (c.freePoints === undefined) c.freePoints = 0;
    if (!c.growthModel) c.growthModel = 'm1';
  });
  gameLevels.forEach(lv => { if (!lv.enemyList) lv.enemyList = []; });

  // 🛡️ 加載完畢後，強制保存一次，確保剛剛補齊的數值立刻寫進瀏覽器！
  saveData(); 
}

function saveData() {
  localStorage.setItem('my_game_data_v22', JSON.stringify(gameChars));
  localStorage.setItem('my_game_skills_v22', JSON.stringify(gameSkills));
  localStorage.setItem('my_game_statuses_v22', JSON.stringify(gameStatuses));
  localStorage.setItem('my_game_items_v22', JSON.stringify(gameItems));
  localStorage.setItem('my_game_levels_v22', JSON.stringify(gameLevels));
  localStorage.setItem('my_game_inventory_v22', JSON.stringify(inventory));
  localStorage.setItem('my_game_config', JSON.stringify(globalData));

  localStorage.setItem('my_game_characters', JSON.stringify(gameChars));
  localStorage.setItem('my_game_skills_sync', JSON.stringify(gameSkills));
  localStorage.setItem('my_game_statuses_sync', JSON.stringify(gameStatuses));
  localStorage.setItem('my_game_items_sync', JSON.stringify(gameItems));
  localStorage.setItem('my_game_levels_sync', JSON.stringify(gameLevels));
  localStorage.setItem('my_game_inventory_sync', JSON.stringify(inventory));
}

// 提供公共的工具函数
function getElementOptions(selectedId) {
  let html = '';
  globalData.elements.forEach(el => {
    html += `<option value="${el.id}" ${selectedId === el.id ? 'selected' : ''}>${el.icon || ''} ${el.name || el.id}</option>`;
  });
  return html;
}

function getSkillOptions(selectedId) {
  let html = `<option value="">(空)</option>`;
  gameSkills.forEach(sk => { html += `<option value="${sk.id}" ${selectedId === sk.id ? 'selected' : ''}>[${sk.type}] ${sk.name}</option>`; });
  return html;
}

function genUid() { return 'u_' + Date.now() + Math.floor(Math.random()*1000); }

function generateRandomInstance(templateId) {
  const template = gameItems.find(t => t.id === templateId);
  if (!template) return null;
  
  const r = Math.random() * 100;
  const config = globalData.dropRates.find(d => r >= d.min && r < d.max) || globalData.dropRates[0];
  const quality = config.q;
  const qMult = config.m;
  const extraCount = config.n;

  const baseAtk = Math.floor((Math.floor(Math.random() * ((template.atkMax||0) - (template.atkMin||0) + 1)) + (template.atkMin||0)) * qMult);
  const baseDef = Math.floor((Math.floor(Math.random() * ((template.defMax||0) - (template.defMin||0) + 1)) + (template.defMin||0)) * qMult);
  const baseHp = Math.floor((Math.floor(Math.random() * ((template.hpMax||0) - (template.hpMin||0) + 1)) + (template.hpMin||0)) * qMult);

  let pool = template.category === 'armor' ? [...globalData.affixPools.armor] : (template.category === 'weapon' ? [...globalData.affixPools.weapon] : [...globalData.affixPools.accessory]);
  const extras = [];
  const intTypes = ['speed', 'atkFlat', 'defFlat', 'hpFlat'];

  for (let i = 0; i < extraCount; i++) {
    if(pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const stat = pool.splice(idx, 1)[0];
    const cfg = globalData.affixValues[stat] || { min: 0, max: 0 };
    let val = 0;
    if (cfg.max >= cfg.min) val = Math.random() * (cfg.max - cfg.min) + cfg.min;
    else val = cfg.min;
    if (intTypes.includes(stat)) val = Math.round(val);
    else val = Math.round((val / 100) * 100) / 100;
    extras.push({ stat, value: val });
  }

  const extraKeys = ['atkPercent', 'defPercent', 'hpPercent', 'critRate', 'critDmg', 'lifesteal', 'hitRate', 'dodgeRate', 'critResist', 'speed'];
  extraKeys.forEach(k => { 
    if (template[k] && template[k] !== 0) {
      const exIdx = extras.findIndex(e => e.stat === k);
      if (exIdx !== -1) extras.splice(exIdx, 1);
      extras.push({ stat: k, value: template[k] / 100 }); 
    }
  });

  return { uid: 'inst_' + Date.now() + Math.floor(Math.random()*1000), itemId: template.id, quality, baseAtk, baseDef, baseHp, extras: extras, equippedBy: '', count: 1 };
}

// 启动时加载数据
loadAllData();
