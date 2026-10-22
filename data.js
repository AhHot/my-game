// ===== 技能库 =====
const SKILLS = {
  "skill_slash": {
    "id": "skill_slash",
    "name": "斩击",
    "type": "normal",
    "element": "fire",
    "multiplier": 1,
    "mpCost": 0,
    "cooldown": 0,
    "targetRule": "frontRow",
    "statusId": "",
    "statusChance": 0,
    "cost": {
      "mp": 0,
      "rage": 0
    }
  },
  "skill_fireball": {
    "id": "skill_fireball",
    "name": "火球术",
    "type": "skill",
    "element": "fire",
    "multiplier": 1.8,
    "mpCost": 20,
    "cooldown": 2,
    "targetRule": "frontRow",
    "statusId": "status_burn",
    "statusChance": 100,
    "cost": {
      "mp": 20,
      "rage": 0
    }
  },
  "skill_frost_arrow": {
    "id": "skill_frost_arrow",
    "name": "霜冻箭",
    "type": "skill",
    "element": "water",
    "multiplier": 1.8,
    "mpCost": 15,
    "cooldown": 1,
    "targetRule": "lowestHp",
    "statusId": "status_slow",
    "statusChance": 100,
    "cost": {
      "mp": 15,
      "rage": 0
    }
  },
  "skill_dark_claw": {
    "id": "skill_dark_claw",
    "name": "暗影爪",
    "type": "normal",
    "element": "dark",
    "multiplier": 1,
    "mpCost": 0,
    "cooldown": 0,
    "targetRule": "random",
    "statusId": "status_1792648975444",
    "statusChance": 50,
    "cost": {
      "mp": 0,
      "rage": 0
    }
  },
  "passive_atk_up": {
    "id": "passive_atk_up",
    "name": "力量强化",
    "type": "passive",
    "passiveType": "atkAdd",
    "passiveValue": 10
  }
};

// ===== 状态库 =====
const STATUSES = {
  "status_burn": {
    "id": "status_burn",
    "name": "灼烧",
    "type": "debuff",
    "duration": 3,
    "statMod": "none",
    "statValue": 0,
    "isDot": true,
    "dotValue": 20
  },
  "status_slow": {
    "id": "status_slow",
    "name": "冰缓",
    "type": "debuff",
    "duration": 2,
    "statMod": "speed",
    "statValue": -5,
    "isDot": false,
    "dotValue": 0
  },
  "status_rage": {
    "id": "status_rage",
    "name": "狂暴",
    "type": "buff",
    "duration": 2,
    "statMod": "atk",
    "statValue": 15,
    "isDot": false,
    "dotValue": 0
  },
  "status_1792648975444": {
    "id": "status_1792648975444",
    "name": "流血",
    "type": "debuff",
    "duration": 3,
    "statMod": "none",
    "statValue": 0,
    "isDot": true,
    "dotValue": 30
  }
};

// ===== 角色库 =====
const CHARACTERS = [
  {
    "id": "p_warrior",
    "name": "战士",
    "side": "player",
    "emoji": "⚔️",
    "element": "fire",
    "maxHp": 300,
    "atk": 32,
    "def": 18,
    "speed": 8,
    "critRate": 0.15,
    "critDmg": 1.5,
    "maxMp": 60,
    "mpPerAttack": 15,
    "skillSlots": {
      "normal": "skill_slash",
      "skill": "skill_fireball",
      "ultimate": "",
      "learned": ""
    }
  },
  {
    "id": "p_mage",
    "name": "法师",
    "side": "player",
    "emoji": "🔮",
    "element": "water",
    "maxHp": 180,
    "atk": 42,
    "def": 8,
    "speed": 6,
    "critRate": 0.1,
    "critDmg": 1.6,
    "maxMp": 80,
    "mpPerAttack": 20,
    "skillSlots": {
      "normal": "skill_slash",
      "skill": "skill_frost_arrow",
      "ultimate": "",
      "learned": ""
    }
  },
  {
    "id": "e_skeleton",
    "name": "骷髅兵",
    "side": "enemy",
    "emoji": "💀",
    "element": "dark",
    "maxHp": 240,
    "atk": 26,
    "def": 20,
    "speed": 7,
    "critRate": 0.05,
    "critDmg": 1.4,
    "maxMp": 40,
    "mpPerAttack": 10,
    "skillSlots": {
      "normal": "skill_dark_claw",
      "skill": "",
      "ultimate": "",
      "learned": ""
    }
  },
  {
    "id": "char_1792649032668",
    "name": "新角色",
    "side": "enemy",
    "emoji": "🙂",
    "element": "dark",
    "maxHp": 500,
    "atk": 10,
    "def": 10,
    "speed": 10,
    "critRate": 0.1,
    "critDmg": 1.5,
    "maxMp": 50,
    "mpPerAttack": 10,
    "gridX": -1,
    "gridY": -1,
    "skillSlots": {
      "normal": "skill_dark_claw",
      "skill": "",
      "ultimate": "",
      "learned": ""
    }
  }
];
