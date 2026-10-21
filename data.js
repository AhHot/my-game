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

const SKILLS = {
  skill_slash: { id: 'skill_slash', name: '斩击', element: 'fire', multiplier: 1.0, cost: { mp: 0, rage: 0 }, targetRule: 'frontRow' },
  skill_arrow: { id: 'skill_arrow', name: '穿云箭', element: 'wind', multiplier: 1.1, cost: { mp: 0, rage: 0 }, targetRule: 'lowestHp' },
  skill_dark_claw: { id: 'skill_dark_claw', name: '暗影爪', element: 'dark', multiplier: 1.0, cost: { mp: 0, rage: 0 }, targetRule: 'frontRow' },
  skill_slime_tackle: { id: 'skill_slime_tackle', name: '水泡冲撞', element: 'water', multiplier: 1.0, cost: { mp: 0, rage: 0 }, targetRule: 'frontRow' },
  skill_fireball: { id: 'skill_fireball', name: '火球术', element: 'fire', multiplier: 2.0, cost: { mp: 20, rage: 0 }, targetRule: 'frontRow' },
  skill_frost_arrow: { id: 'skill_frost_arrow', name: '霜冻箭', element: 'water', multiplier: 1.8, cost: { mp: 15, rage: 0 }, targetRule: 'lowestHp' },
  skill_bone_throw: { id: 'skill_bone_throw', name: '掷骨', element: 'dark', multiplier: 1.5, cost: { mp: 15, rage: 0 }, targetRule: 'random' },
};

const CHARACTERS = [
  { id: 'p_warrior', name: '战士', side: 'player', emoji: '⚔️', element: 'fire', maxHp: 300, atk: 32, def: 18, speed: 8, critRate: 0.15, critDmg: 1.5, maxMp: 60, mpPerAttack: 15, gridX: 1, gridY: 0, skills: ['skill_slash', 'skill_fireball'] },
  { id: 'p_mage', name: '法师', side: 'player', emoji: '🔮', element: 'water', maxHp: 180, atk: 42, def: 8, speed: 6, critRate: 0.1, critDmg: 1.6, maxMp: 80, mpPerAttack: 20, gridX: 0, gridY: 2, skills: ['skill_slash', 'skill_frost_arrow'] },
  { id: 'p_archer', name: '射手', side: 'player', emoji: '🏹', element: 'wind', maxHp: 200, atk: 36, def: 10, speed: 12, critRate: 0.25, critDmg: 1.6, maxMp: 50, mpPerAttack: 12, gridX: 2, gridY: 2, skills: ['skill_arrow', 'skill_frost_arrow'] },
  { id: 'e_skeleton', name: '骷髅兵', side: 'enemy', emoji: '💀', element: 'dark', maxHp: 240, atk: 26, def: 20, speed: 7, critRate: 0.05, critDmg: 1.4, maxMp: 40, mpPerAttack: 10, gridX: 0, gridY: 0, skills: ['skill_dark_claw', 'skill_bone_throw'] },
  { id: 'e_slime', name: '史莱姆', side: 'enemy', emoji: '🟢', element: 'water', maxHp: 320, atk: 22, def: 14, speed: 5, critRate: 0.05, critDmg: 1.3, maxMp: 40, mpPerAttack: 10, gridX: 1, gridY: 0, skills: ['skill_slime_tackle', 'skill_bone_throw'] },
  { id: 'e_goblin', name: '哥布林', side: 'enemy', emoji: '👺', element: 'wind', maxHp: 180, atk: 34, def: 10, speed: 11, critRate: 0.2, critDmg: 1.5, maxMp: 50, mpPerAttack: 12, gridX: 2, gridY: 1, skills: ['skill_arrow', 'skill_bone_throw'] },
];
