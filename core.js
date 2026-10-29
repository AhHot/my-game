// ==========================================
// 公共數據核心：負責數據的讀寫與持久化 (徹底隔離版)
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
  { id: 'item_exp_pill', name: '小还丹', category: 'consumable', icon: '💊', desc: '使用后获得1000点经验', maxStack: 99, useEffect: 'AddExp', useValue: 1000, useStatKey: '' },
  { id: 'item_breakthrough_pill', name: '突破丹', category: 'material', icon: '🧪', desc: '人物到达30、45、60级突破時必需的珍貴丹藥', maxStack: 9999, useEffect: 'None', useValue: 0 },
  { id: 'item_skill_book_low', name: '初级秘籍', category: 'material', icon: '📘', desc: '用于提升技能等级 (2-4级)', maxStack: 9999, useEffect: 'None', useValue: 0 },
  { id: 'item_skill_book_mid', name: '中级秘籍', category: 'material', icon: '📗', desc: '用于提升技能等级 (5-7级)', maxStack: 9999, useEffect: 'None', useValue: 0 },
  { id: 'item_skill_book_high', name: '高级秘籍', category: 'material', icon: '📙', desc: '用于提升技能等级 (8-10级)', maxStack: 9999, useEffect: 'None', useValue: 0 },
  { id: 'item_tian_shu', name: '无字天书', category: 'material', icon: '📜', desc: '技能突破10级满级时不可或缺的神書', maxStack: 99, useEffect: 'None', useValue: 0 }
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
  currency: { copper: 50000, sycee: 100 },
  shops: [
    {
      id: 'shop_daily',
      name: '日常坊市',
      bgUrl: '',
      items: [
        { itemId: 'item_breakthrough_pill', price: 500, stock: 99 },
        { itemId: 'item_skill_book_low', price: 200, stock: 50 },
        { itemId: 'item_skill_book_mid', price: 600, stock: 30 }
      ]
    }
  ],
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

// --- 全局變數與 Window 顯式掛載 ---
let gameChars, gameSkills, gameStatuses, gameItems, gameLevels, inventory, globalData;
let editingElementIds = new Set();

// 判斷當前是否在編輯器環境（非常重要，防止數據互相污染）
const IS_EDITOR = window.location.pathname.includes('editor.html') || window.location.href.includes('editor.html');

function loadAllData() {
  try {
    if (IS_EDITOR) {
      // 編輯器：永遠只讀取【初始配置】，絕對不讀取玩家進度
      gameChars = JSON.parse(localStorage.getItem('my_game_data_v22')) || JSON.parse(JSON.stringify(DEFAULT_CHARS));
    } else {
      // 遊戲環境：讀取【初始配置】，並用【玩家進度】進行覆蓋
      let base = JSON.parse(localStorage.getItem('my_game_data_v22')) || JSON.parse(JSON.stringify(DEFAULT_CHARS));
      
      const playerSaveStr = localStorage.getItem('my_game_characters');
      if (playerSaveStr) {
        try {
          const pChars = JSON.parse(playerSaveStr);
          if (Array.isArray(pChars)) {
            pChars.forEach(pc => {
              let bc = base.find(c => c.id === pc.id);
              if (bc) {
                // 只合併玩家的進度字段，保留系統配置的最新改動
                bc.level = pc.level !== undefined ? pc.level : bc.level;
                bc.exp = pc.exp !== undefined ? pc.exp : bc.exp;
                bc.freePoints = pc.freePoints !== undefined ? pc.freePoints : bc.freePoints;
                bc.skillLevels = pc.skillLevels || bc.skillLevels || {};
                bc.breakthroughStage = pc.breakthroughStage !== undefined ? pc.breakthroughStage : (bc.breakthroughStage || 0);
                bc.equipment = pc.equipment || bc.equipment || {};
                bc.allocatedStats = pc.allocatedStats || bc.allocatedStats || {};
                bc.stats = pc.stats || bc.stats; // 保留玩家可能修改的基礎屬性
              }
            });
          }
        } catch(e) { console.warn('合併玩家存檔失敗', e); }
      }
      gameChars = base;
    }
  } catch(e) {
    gameChars = JSON.parse(JSON.stringify(DEFAULT_CHARS));
  }

  try { gameSkills = JSON.parse(localStorage.getItem('my_game_skills_v22')) || JSON.parse(JSON.stringify(DEFAULT_SKILLS)); } catch(e) { gameSkills = JSON.parse(JSON.stringify(DEFAULT_SKILLS)); }
  try { gameStatuses = JSON.parse(localStorage.getItem('my_game_statuses_v22')) || JSON.parse(JSON.stringify(DEFAULT_STATUS)); } catch(e) { gameStatuses = JSON.parse(JSON.stringify(DEFAULT_STATUS)); }
  try { gameItems = JSON.parse(localStorage.getItem('my_game_items_v22')) || JSON.parse(JSON.stringify(DEFAULT_ITEMS)); } catch(e) { gameItems = JSON.parse(JSON.stringify(DEFAULT_ITEMS)); }
  try { gameLevels = JSON.parse(localStorage.getItem('my_game_levels_v22')) || JSON.parse(JSON.stringify(DEFAULT_LEVELS)); } catch(e) { gameLevels = JSON.parse(JSON.stringify(DEFAULT_LEVELS)); }

  // inventory 同理
  try {
    if (IS_EDITOR) {
      inventory = JSON.parse(localStorage.getItem('my_game_inventory_v22')) || [];
    } else {
      let invSave = localStorage.getItem('my_game_inventory_sync');
      inventory = invSave ? JSON.parse(invSave) : (JSON.parse(localStorage.getItem('my_game_inventory_v22')) || []);
    }
  } catch(e) { inventory = []; }

  try { globalData = JSON.parse(localStorage.getItem('my_game_config')) || JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG)); } catch(e) { globalData = JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG)); }

  if (!globalData.config) globalData.config = { ...DEFAULT_GLOBAL_CONFIG.config };
  Object.keys(DEFAULT_GLOBAL_CONFIG.config).forEach(k => {
    if (globalData.config[k] === undefined) globalData.config[k] = DEFAULT_GLOBAL_CONFIG.config[k];
  });
  if (!globalData.growthModels || globalData.growthModels.length === 0) globalData.growthModels = JSON.parse(JSON.stringify(DEFAULT_GROWTH_MODELS));
  if (!globalData.expTable || globalData.expTable.length === 0) globalData.expTable = JSON.parse(JSON.stringify(DEFAULT_EXP_TABLE));
  if (!globalData.dropRates) globalData.dropRates = JSON.parse(JSON.stringify(DEFAULT_DROP_RATES));
  if (!globalData.affixPools) globalData.affixPools = JSON.parse(JSON.stringify(DEFAULT_AFFIX_POOLS));
  if (!globalData.currency) globalData.currency = { copper: 50000, sycee: 100 };
  if (!globalData.shops) globalData.shops = JSON.parse(JSON.stringify(DEFAULT_GLOBAL_CONFIG.shops));
  if (!globalData.elements) globalData.elements = [ ...DEFAULT_GLOBAL_CONFIG.elements ];
  if (!globalData.elementMatrix) globalData.elementMatrix = { ...DEFAULT_GLOBAL_CONFIG.elementMatrix };

  if (!globalData.affixValues) globalData.affixValues = {};
  Object.keys(DEFAULT_AFFIX_VALUES).forEach(k => {
    if (!globalData.affixValues[k] || typeof globalData.affixValues[k].min === 'undefined') {
      globalData.affixValues[k] = JSON.parse(JSON.stringify(DEFAULT_AFFIX_VALUES[k]));
    }
  });

  gameChars.forEach(c => {
    if (!c.stats) c.stats = { fengRui: 0, hunHou: 0, lingDong: 0, jianRen: 0, guiMi: 0, jueQing: 0 };
    if (!c.equipment) c.equipment = { weapon: '', head: '', body: '', legs: '', ring: '', necklace: '' };
    if (!c.skillLevels) c.skillLevels = {};
    if (c.level === undefined) c.level = 1;
    if (c.exp === undefined) c.exp = 0;
    if (c.freePoints === undefined) c.freePoints = 0;
    if (!c.growthModel) c.growthModel = 'm1';
    if (c.breakthroughStage === undefined) c.breakthroughStage = 0;
  });
  gameLevels.forEach(lv => { if (!lv.enemyList) lv.enemyList = []; });

  window.gameChars = gameChars;
  window.gameSkills = gameSkills;
  window.gameStatuses = gameStatuses;
  window.gameItems = gameItems;
  window.gameLevels = gameLevels;
  window.inventory = inventory;
  window.globalData = globalData;
  window.CONFIG = globalData.config;

  window.CHARACTERS = gameChars;
  window.INVENTORY = inventory;
  window.ITEMS = {};
  gameItems.forEach(it => { window.ITEMS[it.id] = it; });
  window.SKILLS = {};
  gameSkills.forEach(sk => { window.SKILLS[sk.id] = sk; });
  window.STATUSES = {};
  gameStatuses.forEach(st => { window.STATUSES[st.id] = st; });

  saveData(); 
}

function saveData() {
  if (IS_EDITOR) {
    // 編輯器：只存初始配置
    localStorage.setItem('my_game_data_v22', JSON.stringify(gameChars));
    localStorage.setItem('my_game_skills_v22', JSON.stringify(gameSkills));
    localStorage.setItem('my_game_statuses_v22', JSON.stringify(gameStatuses));
    localStorage.setItem('my_game_items_v22', JSON.stringify(gameItems));
    localStorage.setItem('my_game_levels_v22', JSON.stringify(gameLevels));
    localStorage.setItem('my_game_inventory_v22', JSON.stringify(inventory));
    localStorage.setItem('my_game_config', JSON.stringify(globalData));
  } else {
    // 遊戲環境：只存玩家進度
    localStorage.setItem('my_game_characters', JSON.stringify(gameChars));
    localStorage.setItem('my_game_inventory_sync', JSON.stringify(inventory));
  }

  // 同步更新 window 映射
  window.gameChars = gameChars;
  window.gameSkills = gameSkills;
  window.gameStatuses = gameStatuses;
  window.gameItems = gameItems;
  window.gameLevels = gameLevels;
  window.inventory = inventory;
  window.globalData = globalData;

  window.CHARACTERS = gameChars;
  window.INVENTORY = inventory;
  window.ITEMS = {};
  gameItems.forEach(it => { window.ITEMS[it.id] = it; });
  window.SKILLS = {};
  gameSkills.forEach(sk => { window.SKILLS[sk.id] = sk; });
  window.STATUSES = {};
  gameStatuses.forEach(st => { window.STATUSES[st.id] = st; });
}

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
  
  let allowedRates = globalData.dropRates || DEFAULT_DROP_RATES;
  
  if (template.qualityMin || template.qualityMax) {
    const qualityOrder = ['white', 'green', 'blue', 'purple', 'orange', 'red'];
    let minIdx = qualityOrder.indexOf(template.qualityMin || 'white');
    let maxIdx = qualityOrder.indexOf(template.qualityMax || 'red');
    
    if (minIdx === -1) minIdx = 0;
    if (maxIdx === -1) maxIdx = qualityOrder.length - 1;
    if (minIdx > maxIdx) { let temp = minIdx; minIdx = maxIdx; maxIdx = temp; }

    allowedRates = allowedRates.filter(d => {
      let qIdx = qualityOrder.indexOf(d.q);
      return qIdx >= minIdx && qIdx <= maxIdx;
    });
  }

  if (allowedRates.length === 0) allowedRates = globalData.dropRates || DEFAULT_DROP_RATES;

  let totalWeight = allowedRates.reduce((sum, d) => sum + (d.max - d.min), 0);
  let r = Math.random() * totalWeight;
  
  let currentSum = 0;
  let config = allowedRates[0];
  for (let cfg of allowedRates) {
    let weight = cfg.max - cfg.min;
    if (r >= currentSum && r < currentSum + weight) {
      config = cfg;
      break;
    }
    currentSum += weight;
  }

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

loadAllData();
