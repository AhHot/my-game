// ==========================================
// 底层地基：游戏核心配置（请勿随意删除）
// ==========================================
const CONFIG = {
  WIDTH: 720, HEIGHT: 1280, MAX_ROUNDS: 50, ACTION_DELAY: 900,
  GRID_SIZE: 4, CELL_SIZE: 110, ADVANTAGE_MULT: 1.5, DISADVANTAGE_MULT: 0.7, START_MP_RATIO: 0.3,
};

const ELEMENTS = {
  fire:  { name: '火', color: 0xE74C3C, beats: 'wind',  weak: 'water' },
  water: { name: '水', color: 0x3498DB, beats: 'fire',  weak: 'wind'  },
  wind:  { name: '风', color: 0x2ECC71, beats: 'water', weak: 'fire'  },
  light: { name: '光', color: 0xF1C40F, beats: 'dark',  weak: 'dark'  },
  dark:  { name: '暗', color: 0x9B59B6, beats: 'light', weak: 'light' },
};

// ==========================================
// 动态数据区：由编辑器生成 (角色、技能、状态)
// ==========================================
const SKILLS = {
  "skill_slash": { "id": "skill_slash", "name": "斩击", "type": "normal", "element": "fire", "multiplier": 1, "mpCost": 0, "cooldown": 0, "targetRule": "frontRow", "statusId": "", "statusChance": 0, "cost": { "mp": 0, "rage": 0 } },
  "skill_fireball": { "id": "skill_fireball", "name": "火球术", "type": "skill", "element": "fire", "multiplier": 1.8, "mpCost": 20, "cooldown": 2, "targetRule": "frontRow", "statusId": "status_burn", "statusChance": 100, "cost": { "mp": 20, "rage": 0 } },
  "skill_frost_arrow": { "id": "skill_frost_arrow", "name": "霜冻箭", "type": "skill", "element": "water", "multiplier": 1.8, "mpCost": 15, "cooldown": 1, "targetRule": "lowestHp", "statusId": "status_slow", "statusChance": 100, "cost": { "mp": 15, "rage": 0 } },
  "skill_dark_claw": { "id": "skill_dark_claw", "name": "暗影爪", "type": "normal", "element": "dark", "multiplier": 1, "mpCost": 0, "cooldown": 0, "targetRule": "random", "statusId": "", "statusChance": 0, "cost": { "mp": 0, "rage": 0 } }
};

const STATUSES = {
  "status_burn": { "id": "status_burn", "name": "灼烧", "type": "debuff", "duration": 3, "statMod": "none", "statValue": 0, "isDot": true, "dotValue": 20 },
  "status_slow": { "id": "status_slow", "name": "冰缓", "type": "debuff", "duration": 2, "statMod": "speed", "statValue": -5, "isDot": false, "dotValue": 0 }
};

const CHARACTERS = [
  { "id": "p_warrior", "name": "战士", "side": "player", "emoji": "⚔️", "element": "fire", "maxHp": 300, "atk": 32, "def": 18, "speed": 8, "critRate": 0.15, "critDmg": 1.5, "maxMp": 60, "mpPerAttack": 15, "gridX": -1, "gridY": -1, "skillSlots": { "normal": "skill_slash", "skill": "skill_fireball", "ultimate": "", "learned": "" } },
  { "id": "p_mage", "name": "法师", "side": "player", "emoji": "🔮", "element": "water", "maxHp": 180, "atk": 42, "def": 8, "speed": 6, "critRate": 0.1, "critDmg": 1.6, "maxMp": 80, "mpPerAttack": 20, "gridX": -1, "gridY": -1, "skillSlots": { "normal": "skill_slash", "skill": "skill_frost_arrow", "ultimate": "", "learned": "" } },
  { "id": "e_skeleton", "name": "骷髅兵", "side": "enemy", "emoji": "💀", "element": "dark", "maxHp": 240, "atk": 26, "def": 20, "speed": 7, "critRate": 0.05, "critDmg": 1.4, "maxMp": 40, "mpPerAttack": 10, "gridX": 0, "gridY": 0, "skillSlots": { "normal": "skill_dark_claw", "skill": "", "ultimate": "", "learned": "" } }
];
