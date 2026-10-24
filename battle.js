if (typeof STATUSES === 'undefined') { window.STATUSES = {}; }
if (typeof ITEMS === 'undefined') { window.ITEMS = {}; }
if (typeof LEVELS === 'undefined') { window.LEVELS = []; }
if (typeof INVENTORY === 'undefined') { window.INVENTORY = []; }

if (localStorage.getItem('my_game_characters')) { try { const d = JSON.parse(localStorage.getItem('my_game_characters')); if (Array.isArray(d) && d.length) { CHARACTERS.length = 0; CHARACTERS.push(...d); } } catch(e){} }
if (localStorage.getItem('my_game_skills_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_skills_sync')); if (Array.isArray(d) && d.length) { Object.keys(SKILLS).forEach(k => delete SKILLS[k]); d.forEach(sk => SKILLS[sk.id] = {...sk}); } } catch(e){} }
if (localStorage.getItem('my_game_statuses_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_statuses_sync')); if (Array.isArray(d) && d.length) { Object.keys(STATUSES).forEach(k => delete STATUSES[k]); d.forEach(st => STATUSES[st.id] = {...st}); } } catch(e){} }
if (localStorage.getItem('my_game_items_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_items_sync')); if (Array.isArray(d) && d.length) { Object.keys(ITEMS).forEach(k => delete ITEMS[k]); d.forEach(it => ITEMS[it.id] = {...it}); } } catch(e){} }
if (localStorage.getItem('my_game_levels_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_levels_sync')); if (Array.isArray(d) && d.length) { LEVELS.length = 0; LEVELS.push(...d); } } catch(e){} }
if (localStorage.getItem('my_game_inventory_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_inventory_sync')); if (Array.isArray(d)) { INVENTORY.length = 0; INVENTORY.push(...d); } } catch(e){} }

try {
  const gc = JSON.parse(localStorage.getItem('my_game_config') || '{}');
  window.DROP_RATES = gc.dropRates; window.GLOBAL_AFFIX_POOLS = gc.affixPools; window.GLOBAL_AFFIX_VALUES = gc.affixValues;
  window.EXP_TABLE = gc.expTable || []; window.GROWTH_MODELS = gc.growthModels || []; window.ART_CONFIG = gc.artConfig || {}; 
} catch(e) { window.ART_CONFIG = {}; }

class Unit {
  constructor(data) {
    Object.assign(this, data);
    if (!this.skillSlots) this.skillSlots = { normal: '', skill: '', ultimate: '', followup: '', learned: '' };
    if (!this.equipment) this.equipment = {};
    if (this.equipment.armor && !this.equipment.body) { this.equipment.body = this.equipment.armor; delete this.equipment.armor; }
    if (this.equipment.accessory && !this.equipment.ring) { this.equipment.ring = this.equipment.accessory; delete this.equipment.accessory; }
    ['weapon', 'head', 'body', 'legs', 'ring', 'necklace'].forEach(s => { if (!this.equipment[s]) this.equipment[s] = ''; });
    this.level = this.level || 1; this.exp = this.exp || 0; this.sizeX = this.sizeX || 1; this.sizeY = this.sizeY || 1;
    this.hitRate = this.hitRate || 0; this.dodgeRate = this.dodgeRate || 0; this.critRate = this.critRate || 0; this.critResist = this.critResist || 0; 
    this.dmgIncrease = this.dmgIncrease || 0; this.dmgReduction = this.dmgReduction || 0; this.dmgTakenIncrease = this.dmgTakenIncrease || 0;
    this.trueDmg = this.trueDmg || 0; this.critDmg = this.critDmg || 1.5; this.lifesteal = this.lifesteal || 0;

    let baseStats = JSON.parse(JSON.stringify(data.stats || { fengRui: 0, hunHou: 0, lingDong: 0, jianRen: 0, guiMi: 0, jueQing: 0 }));
    let gm = (window.GROWTH_MODELS || []).find(m => m.id === this.growthModel) || (window.GROWTH_MODELS || [])[0];
    if (gm && this.level > 1) {
      baseStats.fengRui += (gm.fengRui||0)*(this.level-1); baseStats.hunHou += (gm.hunHou||0)*(this.level-1); baseStats.lingDong += (gm.lingDong||0)*(this.level-1);
      baseStats.jianRen += (gm.jianRen||0)*(this.level-1); baseStats.guiMi += (gm.guiMi||0)*(this.level-1); baseStats.jueQing += (gm.jueQing||0)*(this.level-1);
    }
    this.maxHp = (this.maxHp || 0) + baseStats.hunHou * CONFIG.hunHouToHp;
    this.atk = (this.atk || 0) + baseStats.fengRui * CONFIG.fengRuiToAtk;
    this.def = (this.def || 0) + baseStats.jianRen * CONFIG.jianRenToDef;
    this.speed = (this.speed || 0) + baseStats.lingDong * CONFIG.lingDongToSpd;
    this.critRate = this.critRate + Math.min((baseStats.jueQing * CONFIG.jueQingToCrit / 100), CONFIG.maxCritFromStats / 100);
    this.dodgeRate = this.dodgeRate + Math.min((baseStats.lingDong * CONFIG.lingDongToEva / 100), CONFIG.maxEvaFromStats / 100);
    this.hitRate = this.hitRate + (baseStats.guiMi * CONFIG.guiMiToHit / 100);
    this.critResist = this.critResist + (baseStats.jianRen * CONFIG.jianRenToRes / 100);
    this.critDmg = this.critDmg + (baseStats.guiMi * CONFIG.guiMiToCritDmg / 100);

    let eqAtkAdd=0, eqDefAdd=0, eqHpAdd=0, eqAtkPct=0, eqDefPct=0, eqHpPct=0;
    Object.values(this.equipment).forEach(uid => {
      if (!uid) return; const inst = INVENTORY.find(i => i.uid === uid);
      if (inst) {
        eqAtkAdd += (inst.baseAtk||0); eqDefAdd += (inst.baseDef||0); eqHpAdd += (inst.baseHp||0);
        if (inst.extras) inst.extras.forEach(ex => {
          let val = ex.value;
          if (ex.stat === 'atkFlat') eqAtkAdd += val; else if (ex.stat === 'defFlat') eqDefAdd += val; else if (ex.stat === 'hpFlat') eqHpAdd += val;
          else if (ex.stat === 'atkPercent') eqAtkPct += val; else if (ex.stat === 'defPercent') eqDefPct += val; else if (ex.stat === 'hpPercent') eqHpPct += val;
          else if (this[ex.stat] !== undefined) this[ex.stat] += val;
        });
      }
    });
    this.maxHp = Math.floor((this.maxHp + eqHpAdd) * (1 + eqHpPct));
    this.atk = Math.floor((this.atk + eqAtkAdd) * (1 + eqAtkPct));
    this.def = Math.floor((this.def + eqDefAdd) * (1 + eqDefPct));
    this.baseAtk = this.atk; this.baseDef = this.def; this.baseSpeed = this.speed;
    
    this.passives = Object.values(this.skillSlots).filter(id => id && SKILLS[id] && SKILLS[id].type === 'passive').map(id => SKILLS[id]);
    this.passives.forEach(sk => {
      if (sk.isAura) return;
      if (sk.passiveType === 'atkAdd') { this.atk += this.baseAtk * sk.passiveValue; this.baseAtk += this.baseAtk * sk.passiveValue; }
      if (sk.passiveType === 'hpAdd') this.maxHp += this.maxHp * sk.passiveValue;
      if (sk.passiveType === 'defAdd') { this.def += this.baseDef * sk.passiveValue; this.baseDef += this.baseDef * sk.passiveValue; }
      if (sk.passiveType === 'speedAdd') { this.speed += this.baseSpeed * sk.passiveValue; this.baseSpeed += this.baseSpeed * sk.passiveValue; }
    });
    this.hp = this.maxHp; this.maxMp = 100; this.mp = 100; this.cooldowns = {}; this.statuses = []; this.followupCounts = {}; this.shield = 0; this.skipTurn = false;
  }
  isAlive() { return this.hp > 0; }
  gainMp(a) { this.mp = Math.min(100, this.mp + a); }
  takeDamage(dmg) {
    if (this.shield > 0) {
      if (dmg <= this.shield) { this.shield -= dmg; return 0; }
      else { const r = dmg - this.shield; this.shield = 0; this.hp = Math.max(0, this.hp - r); return r; }
    }
    this.hp = Math.max(0, this.hp - dmg); return dmg;
  }
  heal(a) { if (this.isAlive()) this.hp = Math.min(this.maxHp, this.hp + a); }
  addShield(a) { if (this.isAlive()) this.shield += a; }
  reduceCooldowns() { for (let k in this.cooldowns) if (this.cooldowns[k] > 0) this.cooldowns[k]--; }
  resetFollowups() { this.followupCounts = {}; }
  applyAura(allUnits) {
    this.atk = this.baseAtk; this.def = this.baseDef; this.speed = this.baseSpeed;
    allUnits.forEach(ally => {
      if (ally.side !== this.side || !ally.isAlive()) return;
      ally.passives.forEach(sk => {
        if (!sk.isAura) return;
        const dist = Math.abs(ally.gridX - this.gridX) + Math.abs(ally.gridY - this.gridY);
        if (dist <= sk.auraRange) {
          if (sk.passiveType === 'atkAdd') this.atk += this.baseAtk * sk.passiveValue;
          if (sk.passiveType === 'defAdd') this.def += this.baseDef * sk.passiveValue;
          if (sk.passiveType === 'speedAdd') this.speed += this.baseSpeed * sk.passiveValue;
        }
      });
    });
    this.statuses.forEach(st => {
      const c = STATUSES[st.id]; if (!c) return;
      if (c.statMod === 'atk') this.atk += this.baseAtk * c.statValue;
      if (c.statMod === 'def') this.def += this.baseDef * c.statValue;
      if (c.statMod === 'speed') this.speed += this.baseSpeed * c.statValue;
    });
    this.atk = Math.max(1, Math.floor(this.atk)); this.def = Math.max(0, Math.floor(this.def)); this.speed = Math.max(1, Math.floor(this.speed));
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }
  tickStatuses() {
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const st = this.statuses[i]; const c = STATUSES[st.id];
      if (c && c.isDot && c.dotValue > 0) this.takeDamage(c.dotValue);
      st.duration--; if (st.duration <= 0) this.statuses.splice(i, 1);
    }
  }
  addStatus(id) {
    if (!id || !STATUSES[id]) return;
    if (STATUSES[id].isStun) { this.skipTurn = true; if (!this.statuses.find(s => s.id === id)) this.statuses.push({ id, duration: 1 }); return; }
    const ex = this.statuses.find(s => s.id === id);
    if (ex) ex.duration = STATUSES[id].duration; else this.statuses.push({ id, duration: STATUSES[id].duration });
  }
}

const BattleLogic = {
  selectTargets(actor, skill, allUnits) {
    let pool = [];
    if (skill.targetSide === 'self') return [actor];
    if (skill.targetSide === 'player') pool = allUnits.filter(u => u.side === actor.side && u.isAlive());
    else pool = allUnits.filter(u => u.side !== actor.side && u.isAlive());
    if (pool.length === 0) return [];
    if (skill.targetRule === 'all') return pool;
    if (skill.targetRule === 'frontRow') { const xs = pool.map(u => u.gridX); const m = pool[0].side === 'enemy' ? Math.max(...xs) : Math.min(...xs); return pool.filter(u => u.gridX === m); }
    if (skill.targetRule === 'lowestHp') { const m = Math.min(...pool.map(u => u.hp)); return pool.filter(u => u.hp === m); }
    if (skill.targetRule === 'highestHp') { const m = Math.max(...pool.map(u => u.hp)); return pool.filter(u => u.hp === m); }
    if (skill.targetRule === 'random') return [pool[Math.floor(Math.random() * pool.length)]];
    return [pool[0]];
  },
  computeDamage(actor, target, skill) {
    if (skill.multiplier === 0) return { damage: 0, isCrit: false, isMiss: false, lifestealAmount: 0 };
    let hit = Math.max(CONFIG.HIT_RATE_MIN, Math.min(CONFIG.HIT_RATE_MAX, 1 + actor.hitRate - target.dodgeRate));
    if (Math.random() > hit) return { damage: 0, isCrit: false, isMiss: true, lifestealAmount: 0 };
    let base = actor.atk * skill.multiplier;
    let def = target.def / (target.def + CONFIG.DEF_CONSTANT);
    let dmg = Math.max(base * (1 - def), base * CONFIG.MIN_DAMAGE_RATIO);
    let cr = Math.max(0, Math.min(CONFIG.CRIT_RATE_CAP, actor.critRate - target.critResist));
    const isCrit = Math.random() < cr; if (isCrit) dmg *= actor.critDmg;
    dmg *= Math.max(0.1, 1 + actor.dmgIncrease - actor.dmgReduction);
    dmg *= Math.max(0.1, 1 + target.dmgTakenIncrease - target.dmgReduction);
    dmg *= getElementMultiplier(skill.element, target.element);
    dmg += actor.trueDmg;
    const d = Math.round(dmg);
    return { damage: d, isCrit, isMiss: false, lifestealAmount: Math.round(d * actor.lifesteal) };
  },
  chooseSkill(actor, allUnits) {
    const slots = actor.skillSlots || {};
    let avail = Object.values(slots).filter(id => id && SKILLS[id] && !['passive', 'followup'].includes(SKILLS[id].type)).map(id => SKILLS[id]);
    let usable = avail.filter(sk => {
      const cd = actor.cooldowns[sk.id] || 0;
      if (actor.mp < (sk.mpCost || 0) || cd > 0) return false;
      if (sk.healMultiplier > 0 && sk.multiplier === 0) { if (!allUnits.filter(u => u.side === actor.side && u.isAlive()).some(u => u.hp < u.maxHp)) return false; }
      return true;
    });
    const w = { ultimate: 3, skill: 2, normal: 1 };
    usable.sort((a, b) => (w[b.type] || 0) - (w[a.type] || 0));
    if (usable.length > 0) return usable[0];
    const fb = Object.values(SKILLS).find(s => s.type === 'normal');
    if (fb) return fb;
    return { id: 'default_atk', name: '普通攻击', type: 'normal', multiplier: 1, mpCost: 0, targetRule: 'frontRow', targetSide: 'enemy', element: 'fire', healMultiplier: 0, effects: [] };
  },
  buildActionOrder(units) { return [...units].filter(u => u.isAlive()).sort((a, b) => b.speed - a.speed); }
};

function generateRandomInstance(templateId) {
  const t = ITEMS[templateId]; if (!t) return null;
  const dropRates = window.DROP_RATES || [{ q: 'white', min: 0, max: 100, m: 1.0, n: 0, tier: 1 }];
  const r = Math.random() * 100;
  let config = dropRates.find(d => r >= d.min && r < d.max) || dropRates[0];
  const q = config.q; const m = config.m; const n = config.n;
  const a = Math.floor((Math.floor(Math.random() * ((t.atkMax||0)-(t.atkMin||0)+1))+(t.atkMin||0))*m);
  const d = Math.floor((Math.floor(Math.random() * ((t.defMax||0)-(t.defMin||0)+1))+(t.defMin||0))*m);
  const h = Math.floor((Math.floor(Math.random() * ((t.hpMax||0)-(t.hpMin||0)+1))+(t.hpMin||0))*m);
  let pool = t.category === 'armor' ? [...(window.GLOBAL_AFFIX_POOLS?.armor||[])] : (t.category === 'weapon' ? [...(window.GLOBAL_AFFIX_POOLS?.weapon||[])] : [...(window.GLOBAL_AFFIX_POOLS?.accessory||[])]);
  const extras = []; const intTypes = ['speed', 'atkFlat', 'defFlat', 'hpFlat'];
  for (let i = 0; i < n; i++) {
    if(pool.length === 0) break;
    const idx = Math.floor(Math.random() * pool.length);
    const stat = pool.splice(idx, 1)[0];
    const cfg = window.GLOBAL_AFFIX_VALUES?.[stat] || { min: 0, max: 0 };
    let val = cfg.max >= cfg.min ? Math.random() * (cfg.max - cfg.min) + cfg.min : cfg.min;
    if (intTypes.includes(stat)) val = Math.round(val); else val = Math.round((val / 100) * 100) / 100;
    extras.push({ stat, value: val });
  }
  return { uid: 'inst_' + Date.now() + Math.floor(Math.random()*1000), itemId: t.id, quality: q, baseAtk: a, baseDef: d, baseHp: h, extras: ex, equippedBy: '', count: 1 };
}

function addCharacterExp(char, amount) {
  if (char.level >= 60) return false;
  char.exp = (char.exp || 0) + amount;
  let currentLv = char.level || 1;
  let reqExp = window.EXP_TABLE[currentLv - 1] || 100;
  let leveledUp = false;
  while (char.exp >= reqExp && currentLv < 60) {
    char.exp -= reqExp; currentLv++;
    char.freePoints = (char.freePoints || 0) + 3;
    reqExp = window.EXP_TABLE[currentLv - 1] || 100;
    leveledUp = true;
  }
  char.level = currentLv; return leveledUp;
}
class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.text(CONFIG.WIDTH / 2, 200, '中大型策略战棋', { fontSize: '64px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(CONFIG.WIDTH / 2, 500, '⚔️ 开始推图', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    b.on('pointerdown', () => this.scene.start('FormationScene', { levelIndex: 0 }));
    const e = this.add.text(CONFIG.WIDTH - 20, 20, '⚙️ 编辑器', { fontSize: '20px', color: '#fff', backgroundColor: '#3498db', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    e.on('pointerdown', () => { window.location.href = 'editor.html'; });
    const invBtn = this.add.text(30, CONFIG.HEIGHT - 40, '👤 人物与背包', { fontSize: '20px', color: '#fff', backgroundColor: '#9b59b6', padding: { x: 15, y: 10 } }).setOrigin(0, 1).setInteractive();
    invBtn.on('pointerdown', () => { if (window.openCharacterUI) window.openCharacterUI(); });
  }
}

class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE;
    const standbyLeft = 50, gridLeft = CONFIG.WIDTH / 2 + 50, gridTop = 150;
    const lv = LEVELS[this.currentLevelIndex] || { name: '未知关卡' };
    this.add.text(20, 20, `v14.0 | ${lv.name}`, { fontSize: '16px', color: '#00ff00' });
    const editBtn = this.add.text(CONFIG.WIDTH - 180, 20, '⚙️ 编辑器', { fontSize: '18px', color: '#fff', backgroundColor: '#3498db', padding: { x: 10, y: 5 } }).setOrigin(0, 0).setInteractive();
    editBtn.on('pointerdown', () => { window.location.href = 'editor.html'; });
    const refreshBtn = this.add.text(CONFIG.WIDTH - 20, 20, '🔄 强刷', { fontSize: '18px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    refreshBtn.on('pointerdown', () => { const url = new URL(window.location.href); url.searchParams.set('t', Date.now().toString()); window.location.href = url.href; });
    const teamBtn = this.add.text(30, CONFIG.HEIGHT - 40, '👤 人物与背包', { fontSize: '20px', color: '#fff', backgroundColor: '#9b59b6', padding: { x: 15, y: 10 } }).setOrigin(0, 1).setInteractive();
    teamBtn.on('pointerdown', () => { if (window.openCharacterUI) window.openCharacterUI(); });
    this.countText = this.add.text(CONFIG.WIDTH / 2, 80, '当前上阵: 0 / 5', { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 30, '战前布阵', { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const g = this.add.graphics(); g.lineStyle(2, 0x3498DB, 0.5);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) { g.lineBetween(gridLeft, gridTop + i * cell, gridLeft + gridW, gridTop + i * cell); g.lineBetween(gridLeft + i * cell, gridTop, gridLeft + i * cell, gridTop + gridW); }
    const bg = this.add.graphics(); bg.fillStyle(0x16213e, 0.8); bg.fillRoundedRect(standbyLeft - 20, 100, 500, 500, 10); bg.lineStyle(2, 0x3498DB, 0.5); bg.strokeRoundedRect(standbyLeft - 20, 100, 500, 500, 10);
    const startBtn = this.add.text(CONFIG.WIDTH - 150, CONFIG.HEIGHT - 60, '⚔️ 开始战斗', { fontSize: '36px', color: '#fff', backgroundColor: '#e67e22', padding: { x: 30, y: 15 } }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => { if (CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1).length === 0) return alert('至少需要上阵1名角色！'); this.scene.start('BattleScene', { levelIndex: this.currentLevelIndex }); });
    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));
    this.unitContainers = [];
    CHARACTERS.filter(c => c.side === 'player').forEach(data => {
      data.gridX = -1; data.gridY = -1;
      const c = this.add.container(0, 0);
      c.add([this.add.circle(0, 0, 42, getElementInfo(data.element).color).setStrokeStyle(3, 0xffffff, 0.9), this.add.text(0, 0, data.emoji, { fontSize: '48px' }).setOrigin(0.5), this.add.text(0, 50, data.name, { fontSize: '18px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5)]); 
      c.setSize(80, 80).setInteractive({ draggable: true }); this.input.setDraggable(c);
      c.unitData = data; c.isOnGrid = false; this.unitContainers.push(c);
      c.on('dragstart', () => { if (c.isOnGrid) { for (let y = data.gridY; y < data.gridY + data.sizeY; y++) for (let x = data.gridX; x < data.gridX + data.sizeX; x++) this.gridState[y][x] = null; } c.setDepth(100); });
      c.on('drag', (p, dx, dy) => { c.x = dx; c.y = dy; });
      c.on('dragend', () => {
        c.setDepth(0); let col = Math.floor((c.x - gridLeft) / cell), row = Math.floor((c.y - gridTop) / cell); let ok = true;
        if (col < 0 || col + data.sizeX > CONFIG.GRID_SIZE || row < 0 || row + data.sizeY > CONFIG.GRID_SIZE) ok = false;
        if (ok) { for (let y = row; y < row + data.sizeY; y++) for (let x = col; x < col + data.sizeX; x++) if (this.gridState[y][x]) ok = false; }
        if (ok) {
          for (let y = row; y < row + data.sizeY; y++) for (let x = col; x < col + data.sizeX; x++) this.gridState[y][x] = data;
          data.gridX = col; data.gridY = row; c.isOnGrid = true; const s = Math.max(data.sizeX, data.sizeY);
          c.setScale(1 + (s - 1) * 0.15); c.x = gridLeft + col * cell + (cell * data.sizeX) / 2; c.y = gridTop + row * cell + (cell * data.sizeY) / 2;
        } else { data.gridX = -1; data.gridY = -1; c.isOnGrid = false; c.setScale(1); }
        this.layoutStandby(standbyLeft);
      });
    });
    this.layoutStandby(standbyLeft);
  }
  layoutStandby(left) {
    const list = this.unitContainers.filter(c => !c.isOnGrid); const n = this.unitContainers.filter(c => c.isOnGrid).length;
    this.countText.setText(`当前上阵: ${n} / 5`).setColor(n >= 5 ? '#e74c3c' : '#f1c40f');
    list.forEach((c, i) => { this.tweens.add({ targets: c, x: left + 40 + (i % 4) * 120, y: 180 + Math.floor(i / 4) * 120, duration: 200 }); });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }
  preload() {
    const art = window.ART_CONFIG || {};
    if (art.boardBg && art.boardBg.url) this.load.image('art_boardBg', art.boardBg.url);
    if (art.unitHalo && art.unitHalo.url) this.load.image('art_unitHalo', art.unitHalo.url);
    if (art.hpBg && art.hpBg.url) this.load.image('art_hpBg', art.hpBg.url);
    if (art.hpFill && art.hpFill.url) this.load.image('art_hpFill', art.hpFill.url);
  }
  create() {
    this.allUnits = []; this.unitViews = new Map(); this.drawBattlefield();
    this.speedMultiplier = 1; this.isSkipping = false; this.battleEnded = false;
    const sBtn = this.add.text(30, 20, '⏩ 1x 速度', { fontSize: '18px', color: '#fff', backgroundColor: '#2980b9', padding: { x: 10, y: 5 } }).setOrigin(0, 0).setInteractive().setDepth(200);
    sBtn.on('pointerdown', () => { this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1; sBtn.setText(`⏩ ${this.speedMultiplier}x 速度`); sBtn.setBackgroundColor(this.speedMultiplier === 2 ? '#e67e22' : '#2980b9'); });
    const skip = this.add.text(CONFIG.WIDTH - 20, 20, '⏭️ 跳过战斗', { fontSize: '18px', color: '#fff', backgroundColor: '#c0392b', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive().setDepth(200);
    skip.on('pointerdown', () => { if (this.isSkipping || this.battleEnded) return; this.isSkipping = true; this.fastForward(); });
    const lv = LEVELS[this.currentLevelIndex] || { enemyList: [] };
    const fighters = [];
    CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1).forEach(c => fighters.push({ ...c }));
    if (Array.isArray(lv.enemyList)) {
      lv.enemyList.forEach(item => {
        const orig = CHARACTERS.find(c => c.id === item.id);
        if (orig) { const inst = JSON.parse(JSON.stringify(orig)); inst.gridX = item.x; inst.gridY = item.y; fighters.push(inst); }
      });
    }
    if (fighters.filter(f => f.side === 'enemy').length === 0) fighters.push({ id: 'e_fb', name: '木桩', side: 'enemy', level: 1, element: 'fire', maxHp: 5000, atk: 10, def: 10, speed: 5, sizeX: 1, sizeY: 1, critRate: 0, critDmg: 1, hitRate: 0, dodgeRate: 0, critResist: 0, stats: { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }, skillSlots: {}, equipment: {} });
    fighters.forEach(d => { const u = new Unit(d); this.allUnits.push(u); });
    this.allUnits.forEach(u => u.applyAura(this.allUnits)); this.allUnits.forEach(u => this.createUnitView(u));
    this.roundText = this.add.text(CONFIG.WIDTH / 2, 24, '第 1 回合', { fontSize: '30px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.logBg = this.add.rectangle(CONFIG.WIDTH / 2, 620, 600, 80, 0x000000, 0.7).setStrokeStyle(1, 0x3498db).setDepth(50);
    this.logHistory = []; this.logTexts = [];
    this.time.delayedCall(800, () => this.startBattle());
  }

  drawBattlefield() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const art = window.ART_CONFIG?.boardBg;
    if (this.textures.exists('art_boardBg')) {
      const bgImg = this.add.image(0, 0, 'art_boardBg').setOrigin(0, 0).setDepth(-10).setAlpha(0.85);
      const iw = bgImg.width, ih = bgImg.height;
      const boxW = CONFIG.WIDTH, boxH = CONFIG.HEIGHT;
      const drawW = boxW * (art.scale || 1); const drawH = drawW * (ih / iw);
      bgImg.setDisplaySize(drawW, drawH);
      let offsetX = (boxW - drawW) * ((art.posX ?? 50) / 100); let offsetY = (boxH - drawH) * ((art.posY ?? 50) / 100);
      bgImg.setPosition(offsetX, offsetY);
    }
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE;
    const enemyLeft = 100, playerLeft = CONFIG.WIDTH - 100 - gridW, gridTop = 150;
    this.drawGrid(enemyLeft, gridTop, cell, 0xE74C3C, 0.6); this.drawGrid(playerLeft, gridTop, cell, 0x3498DB, 0.6);
    this.add.text(enemyLeft, gridTop - 30, '敌方', { fontSize: '20px', color: '#E74C3C', fontStyle: 'bold' });
    this.add.text(playerLeft, gridTop - 30, '我方', { fontSize: '20px', color: '#3498DB', fontStyle: 'bold' });
    this.enemyLeft = enemyLeft; this.playerLeft = playerLeft; this.gridTop = gridTop;
  }
  drawGrid(x, y, cell, color, alpha) {
    const g = this.add.graphics(); g.lineStyle(2, color, alpha);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) { g.lineBetween(x, y + i * cell, x + CONFIG.GRID_SIZE * cell, y + i * cell); g.lineBetween(x + i * cell, y, x + i * cell, y + CONFIG.GRID_SIZE * cell); }
  }

  createUnitView(unit) {
    const cell = CONFIG.CELL_SIZE; let x, y;
    if (unit.side === 'enemy') { x = this.enemyLeft + unit.gridX * cell + (cell * unit.sizeX) / 2; y = this.gridTop + unit.gridY * cell + (cell * unit.sizeY) / 2; }
    else { x = this.playerLeft + unit.gridX * cell + (cell * unit.sizeX) / 2; y = this.gridTop + unit.gridY * cell + (cell * unit.sizeY) / 2; }
    const c = this.add.container(x, y);
    const scale = Math.max(unit.sizeX, unit.sizeY);
    const r = Math.min((cell / 2) * 0.85 * scale, 60); 
    
    if (this.textures.exists('art_unitHalo')) {
      const artHalo = window.ART_CONFIG.unitHalo || {};
      const halo = this.add.image(0, 0, 'art_unitHalo');
      const tw = Math.min(r * 2.5, 150); const th = Math.min(r * 1.5, 80);
      const imgRatio = halo.width / halo.height; const targetRatio = tw / th;
      let dw, dh;
      if (imgRatio > targetRatio) { dh = th * (artHalo.scale||1); dw = dh * imgRatio; } else { dw = tw * (artHalo.scale||1); dh = dw / imgRatio; }
      let ox = (tw - dw) * ((artHalo.posX ?? 50) / 100); let oy = (th - dh) * ((artHalo.posY ?? 50) / 100);
      halo.setCrop(-ox / (dw / halo.width), -oy / (dh / halo.height), tw / (dw / halo.width), th / (dh / halo.height));
      halo.setDisplaySize(tw, th); halo.setOrigin(0.5, 0.5); c.add(halo);
    }
    
    const circle = this.add.circle(0, 0, r, getElementInfo(unit.element).color);
    if (!this.textures.exists('art_unitHalo')) circle.setStrokeStyle(3, 0xffffff, 0.9); else circle.setAlpha(0.2);
    const emoji = this.add.text(0, 0, unit.emoji, { fontSize: (r * 1.3) + 'px' }).setOrigin(0.5);
    const nameText = this.add.text(0, r + 10, `${unit.name} Lv.${unit.level}`, { fontSize: '18px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    
    const bw = Math.min(cell * scale * 0.85, 120); 
    let hpBg, hpBar;
    
    if (this.textures.exists('art_hpBg')) {
      hpBg = this.add.image(-bw/2, r + 32, 'art_hpBg').setOrigin(0, 0.5);
      const art = window.ART_CONFIG.hpBg || {}; const targetH = 12;
      let dw = bw * (art.scale||1); let dh = dw * (hpBg.height / hpBg.width);
      let ox = (bw - dw) * ((art.posX ?? 50) / 100); let oy = (targetH - dh) * ((art.posY ?? 50) / 100);
      hpBg.setCrop(-ox / (dw / hpBg.width), -oy / (dh / hpBg.height), bw / (dw / hpBg.width), targetH / (dh / hpBg.height));
      hpBg.setDisplaySize(bw, targetH);
    } else {
      hpBg = this.add.rectangle(-bw/2, r + 32, bw, 12, 0x000000).setOrigin(0, 0.5).setStrokeStyle(1, 0xffffff, 0.4);
    }

    if (this.textures.exists('art_hpFill')) {
      hpBar = this.add.image(-bw/2, r + 32, 'art_hpFill').setOrigin(0, 0.5);
      const art = window.ART_CONFIG.hpFill || {}; const targetH = 12;
      let dw = bw * (art.scale||1); let dh = dw * (hpBar.height / hpBar.width);
      let ox = (bw - dw) * ((art.posX ?? 50) / 100); let oy = (targetH - dh) * ((art.posY ?? 50) / 100);
      
      // 记录基础裁剪参数，用于满血/掉血的计算
      hpBar.baseSrcX = -ox / (dw / hpBar.width);
      hpBar.baseSrcY = -oy / (dh / hpBar.height);
      hpBar.maxSrcW = bw / (dw / hpBar.width);
      hpBar.maxSrcH = targetH / (dh / hpBar.height);
      hpBar.maxW = bw;
      
      hpBar.setCrop(hpBar.baseSrcX, hpBar.baseSrcY, hpBar.maxSrcW, hpBar.maxSrcH);
      hpBar.setDisplaySize(bw, targetH);
    } else {
      hpBar = this.add.rectangle(-bw/2, r + 32, bw, 8, 0xff4444).setOrigin(0, 0.5);
      hpBar.maxWidth = bw;
    }

    const hpText = this.add.text(-bw/2 + bw/2, r + 32, '', { fontSize: '11px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    const shieldBar = this.add.rectangle(-bw/2, r + 32, bw, 8, 0xdddddd, 0.85).setOrigin(0, 0.5); shieldBar.setVisible(false);
    const shieldText = this.add.text(0, r + 18, '', { fontSize: '10px', color: '#fff', fontStyle: 'bold', backgroundColor: '#555', padding: {x:2,y:1} }).setOrigin(0.5);
    const mpBg = this.add.rectangle(-bw/2, r + 45, bw, 7, 0x000000).setOrigin(0, 0.5);
    const mpBar = this.add.rectangle(-bw/2, r + 45, bw, 5, 0x3498DB).setOrigin(0, 0.5);
    const mpText = this.add.text(bw/2, r + 45, '', { fontSize: '10px', color: '#88ccff' }).setOrigin(1, 0.5);
    const statusText = this.add.text(0, -r - 20, '', { fontSize: '14px', color: '#ffcc00', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
    c.add([circle, emoji, nameText, hpBg, hpBar, shieldBar, mpBg, mpBar, hpText, shieldText, mpText, statusText]);
    c.bringToTop(shieldBar); c.bringToTop(shieldText); c.bringToTop(hpText);
    this.unitViews.set(unit, { container: c, circle, emoji, hpBar, shieldBar, mpBar, statusText, hpText, shieldText, mpText });
    this.updateUnitView(unit);
  }

  startBattle() { if (this.isSkipping || this.battleEnded) return; this.round = 1; this.allUnits.forEach(u => u.resetFollowups()); this.actionOrder = BattleLogic.buildActionOrder(this.allUnits); this.actionIndex = 0; this.nextAction(); }
  nextAction() {
    if (this.isSkipping || this.battleEnded) return;
    const p = this.allUnits.filter(u => u.side === 'player' && u.isAlive()); const e = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
    if (p.length === 0) return this.endBattle('defeat'); if (e.length === 0) return this.endBattle('victory'); if (this.round > CONFIG.MAX_ROUNDS) return this.endBattle('timeout');
    if (this.actionIndex >= this.actionOrder.length) {
      this.round++; this.roundText.setText(`第 ${this.round} 回合`);
      this.allUnits.forEach(u => { if (!u.isAlive()) return; u.resetFollowups(); const old = u.hp; u.tickStatuses(); if (u.hp < old) this.showDamage(u, { damage: old - u.hp, isCrit: false }, '#ff00ff'); this.updateUnitView(u); });
      if (this.allUnits.filter(u => u.side === 'player' && u.isAlive()).length === 0) return this.endBattle('defeat');
      if (this.allUnits.filter(u => u.side === 'enemy' && u.isAlive()).length === 0) return this.endBattle('victory');
      this.actionOrder = BattleLogic.buildActionOrder(this.allUnits); this.actionIndex = 0;
      this.time.delayedCall(800 / this.speedMultiplier, () => this.nextAction()); return;
    }
    const actor = this.actionOrder[this.actionIndex++];
    if (!actor.isAlive()) return this.time.delayedCall(80 / this.speedMultiplier, () => this.nextAction());
    this.allUnits.forEach(u => u.applyAura(this.allUnits)); this.allUnits.forEach(u => this.updateUnitView(u)); this.execute(actor);
  }

  execute(actor) {
    if (this.battleEnded) return;
    if (actor.skipTurn) { actor.skipTurn = false; const i = actor.statuses.findIndex(s => STATUSES[s.id]?.isStun); if (i !== -1) actor.statuses.splice(i, 1); this.updateUnitView(actor); this.addLog(`${actor.name} 眩晕跳过`, '#f1c40f'); const c = this.unitViews.get(actor).container; this.tweens.add({ targets: c, angle: 10, yoyo: true, repeat: 3, duration: 100 }); return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction()); }
    const sk = BattleLogic.chooseSkill(actor, this.allUnits);
    if (!sk) return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    const targets = BattleLogic.selectTargets(actor, sk, this.allUnits);
    if (targets.length === 0) return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    const v = this.unitViews.get(actor);
    if (v) {
      const origX = v.container.x; const origY = v.container.y; const target = targets[0]; const tv = this.unitViews.get(target);
      if (tv && sk.multiplier > 0) {
        const dirX = tv.container.x > origX ? 1 : -1; const dirY = tv.container.y > origY ? 1 : -1;
        this.tweens.add({ targets: v.container, x: origX + (40 * dirX), y: origY + (40 * dirY), duration: 150 / this.speedMultiplier, yoyo: true, ease: 'Quad.easeOut' });
      } else { this.tweens.add({ targets: v.container, scaleX: v.container.scaleX * 1.1, scaleY: v.container.scaleY * 1.1, duration: 150 / this.speedMultiplier, yoyo: true }); }
    }
    this.addLog(`${actor.name} 使用【${sk.name}】`, sk.type === 'ultimate' ? '#e74c3c' : '#fff');
    this.time.delayedCall(450 / this.speedMultiplier, () => {
      actor.mp = Math.max(0, actor.mp - (sk.mpCost || 0)); if (sk.cooldown > 0) actor.cooldowns[sk.id] = sk.cooldown;
      let heal = 0;
      targets.forEach(t => {
        if (sk.healMultiplier > 0) { const h = Math.round(actor.atk * sk.healMultiplier); t.heal(h); this.showFloat(t, `+${h}`, '#2ecc71'); this.addLog(`${actor.name} 为 ${t.name} 回血 ${h}`, '#2ecc71'); }
        else if (sk.shieldMultiplier > 0) { const s = Math.round(actor.atk * sk.shieldMultiplier); t.addShield(s); this.showFloat(t, `盾+${s}`, '#ddd'); this.addLog(`${actor.name} 为 ${t.name} 套盾 ${s}`, '#ddd'); }
        else {
          const r = BattleLogic.computeDamage(actor, t, sk);
          if (r.isMiss) { this.showFloat(t, 'MISS', '#aaa'); this.addLog(`${t.name} 闪避了攻击`, '#aaa'); }
          else {
            t.takeDamage(r.damage); if (r.lifestealAmount > 0) heal += r.lifestealAmount;
            this.showDamage(t, r); this.addLog(`${actor.name} 对 ${t.name} 造成 ${r.damage} ${r.isCrit ? '暴击' : ''}伤害`, '#ff5555');
            const tv2 = this.unitViews.get(t);
            if (tv2) { tv2.circle.setFillStyle(0xffffff); this.time.delayedCall(100, () => { if (tv2.circle.active) tv2.circle.setFillStyle(Phaser.Display.Color.HexStringToColor(getElementInfo(t.element).color).color); }); this.cameras.main.shake(100 / this.speedMultiplier, 0.005 * (r.isCrit ? 2 : 1)); }
          }
        }
        this.updateUnitView(t);
      });
      if (sk.effects && sk.effects.length > 0) {
        sk.effects.forEach(eff => {
          if (Math.random() > eff.chance) return;
          let et = [];
          if (eff.targetSide === 'sameAsMain' && eff.targetRule === 'sameAsMain') et = targets;
          else { let pool = eff.targetSide === 'enemy' ? this.allUnits.filter(u => u.side !== actor.side && u.isAlive()) : eff.targetSide === 'player' ? this.allUnits.filter(u => u.side === actor.side && u.isAlive()) : [actor]; if (eff.targetRule === 'all') et = pool; else if (eff.targetRule === 'lowestHp') { const m = Math.min(...pool.map(u => u.hp)); et = pool.filter(u => u.hp === m); } else et = [pool[0]]; }
          et.forEach(t => {
            if (!t || !t.isAlive()) return;
            if (eff.type === 'status') { t.addStatus(eff.value); this.showFloat(t, `+${STATUSES[eff.value]?.name || ''}`, '#0ff'); this.updateUnitView(t); }
            else if (eff.type === 'heal_pct') { const h = Math.round(actor.atk * eff.value); t.heal(h); this.showFloat(t, `+${h}`, '#2ecc71'); this.updateUnitView(t); }
            else if (eff.type === 'heal_flat') { const h = Math.round(eff.value); t.heal(h); this.showFloat(t, `+${h}`, '#2ecc71'); this.updateUnitView(t); }
            else if (eff.type === 'shield_pct') { const s = Math.round(actor.atk * eff.value); t.addShield(s); this.showFloat(t, `盾+${s}`, '#ddd'); this.updateUnitView(t); }
            else if (eff.type === 'shield_flat') { const s = Math.round(eff.value); t.addShield(s); this.showFloat(t, `盾+${s}`, '#ddd'); this.updateUnitView(t); }
            else if (eff.type === 'mp') { t.gainMp(eff.value); this.showFloat(t, `MP+${eff.value}%`, '#8cf'); this.updateUnitView(t); }
          });
        });
      }
      if (heal > 0) { actor.heal(heal); this.showFloat(actor, `+${heal}`, '#2ecc71'); this.updateUnitView(actor); }
      if (actor.isAlive()) actor.gainMp(CONFIG.MP_REGEN_PER_ROUND * 100);
      actor.reduceCooldowns(); this.updateUnitView(actor);
      if (sk.comboTagOut) this.checkFollowup(sk.comboTagOut, actor);
      this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    });
  }

  checkFollowup(tag, original) {
    let cand = this.allUnits.filter(u => u.isAlive() && u.side === original.side && u !== original); cand.sort((a, b) => a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX);
    for (let u of cand) {
      const fid = u.skillSlots.followup; if (!fid || !SKILLS[fid]) continue;
      if (SKILLS[fid].comboTagIn === tag) {
        const used = u.followupCounts[fid] || 0; if (used < (SKILLS[fid].maxTriggers || 1)) { u.followupCounts[fid] = used + 1; this.doFollowup(u, SKILLS[fid]); break; }
      }
    }
  }
  doFollowup(actor, sk) {
    const targets = BattleLogic.selectTargets(actor, sk, this.allUnits); if (targets.length === 0) return;
    const v = this.unitViews.get(actor);
    if (v) { this.showFloat(actor, '⚡追打', '#fc0'); this.tweens.add({ targets: v.container, scaleX: v.container.scaleX * 1.2, scaleY: v.container.scaleY * 1.2, duration: 150 / this.speedMultiplier, yoyo: true }); }
    this.addLog(`⚡ ${actor.name} 追打【${sk.name}】`, '#fc0');
    this.time.delayedCall(300 / this.speedMultiplier, () => {
      actor.mp = Math.max(0, actor.mp - (sk.mpCost || 0));
      targets.forEach(t => { const r = BattleLogic.computeDamage(actor, t, sk); if (!r.isMiss) { t.takeDamage(r.damage); this.showDamage(t, r); this.updateUnitView(t); this.cameras.main.shake(80 / this.speedMultiplier, 0.005); } });
      this.updateUnitView(actor); if (sk.comboTagOut) this.checkFollowup(sk.comboTagOut, actor);
    });
  }

  showDamage(u, r, c) {
    const v = this.unitViews.get(u); if (!v) return;
    const col = c || (r.isCrit ? '#fc0' : '#f55'); const s = r.isCrit ? '42px' : '28px';
    const t = this.add.text(v.container.x, v.container.y - 70, r.isCrit ? `-${r.damage} 暴击` : `-${r.damage}`, { fontSize: s, color: col, fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(100);
    if (r.isCrit) { t.setScale(1.5); this.tweens.add({ targets: t, scaleX: 1, scaleY: 1, duration: 200 }); }
    this.tweens.add({ targets: t, y: t.y - 90, alpha: 0, duration: 900 / this.speedMultiplier, onComplete: () => t.destroy() });
  }
  showFloat(u, txt, col) {
    const v = this.unitViews.get(u); if (!v) return;
    const t = this.add.text(v.container.x, v.container.y - 30, txt, { fontSize: '24px', color: col, fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 800 / this.speedMultiplier, onComplete: () => t.destroy() });
  }
  addLog(txt, col = '#fff') {
    this.logHistory.unshift({ text: txt, color: col }); if (this.logHistory.length > 4) this.logHistory.pop();
    this.logTexts.forEach(t => t.destroy()); this.logTexts = [];
    this.logHistory.forEach((l, i) => { const t = this.add.text(360, 645 - i * 20, l.text, { fontSize: '16px', color: l.color, stroke: '#000', strokeThickness: 2 }).setDepth(51); this.logTexts.push(t); });
  }
  
  // 【核心修复】：彻底抛弃遮罩，采用原图裁剪宽度直接改变
  updateUnitView(u) {
    const v = this.unitViews.get(u); if (!v) return;
    let ratio = Math.max(0, u.hp / u.maxHp);
    
    if (v.hpBar.baseSrcW) { 
      // 图片血条：直接改变裁剪宽度和显示宽度，左端原点固定，完美从右边减少
      v.hpBar.setCrop(v.hpBar.baseSrcX, v.hpBar.baseSrcY, v.hpBar.baseSrcW * ratio, v.hpBar.baseSrcH);
      v.hpBar.setDisplaySize(v.hpBar.maxW * ratio, 12);
    } else if (v.hpBar.maxWidth) { 
      v.hpBar.displayWidth = v.hpBar.maxWidth * ratio; 
    } else { 
      this.tweens.add({ targets: v.hpBar, scaleX: ratio, duration: 300 / this.speedMultiplier }); 
    }
    
    v.hpText.setText(`${u.hp}/${u.maxHp}`);
    this.tweens.add({ targets: v.mpBar, scaleX: Math.max(0, u.mp / 100), duration: 300 / this.speedMultiplier }); v.mpText.setText(`${u.mp}%`);
    if (u.shield > 0) { v.shieldBar.setVisible(true); this.tweens.add({ targets: v.shieldBar, scaleX: Math.min(1, u.shield / u.maxHp), duration: 300 / this.speedMultiplier }); v.shieldText.setText(`${u.shield}`); } 
    else { v.shieldBar.setVisible(false); v.shieldText.setText(''); }
    v.statusText.setText(u.statuses.length > 0 ? `[${u.statuses.map(s => STATUSES[s.id]?.name.substring(0,1) || '?').join('')}]` : '');
    if (!u.isAlive()) { v.emoji.setAlpha(0.25); v.circle.setAlpha(0.25); }
  }

  fastForward() {
    let r = 0;
    while (r < CONFIG.MAX_ROUNDS) {
      const p = this.allUnits.filter(u => u.side === 'player' && u.isAlive()); const e = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
      if (p.length === 0) { this.scene.start('ResultScene', { type: 'defeat', levelIndex: this.currentLevelIndex }); return; }
      if (e.length === 0) { this.scene.start('ResultScene', { type: 'victory', levelIndex: this.currentLevelIndex }); return; }
      this.allUnits.forEach(u => { if (u.isAlive()) u.tickStatuses(); }); this.allUnits.forEach(u => u.applyAura(this.allUnits));
      const order = BattleLogic.buildActionOrder(this.allUnits);
      for (let a of order) {
        if (!a.isAlive() || a.skipTurn) continue; const sk = BattleLogic.chooseSkill(a, this.allUnits); if (!sk) continue;
        const t = BattleLogic.selectTargets(a, sk, this.allUnits); a.mp = Math.max(0, a.mp - (sk.mpCost || 0));
        t.forEach(x => { if (sk.healMultiplier > 0) x.heal(Math.round(a.atk * sk.healMultiplier)); else if (sk.shieldMultiplier > 0) x.addShield(Math.round(a.atk * sk.shieldMultiplier)); else { const res = BattleLogic.computeDamage(a, x, sk); if (!res.isMiss) x.takeDamage(res.damage); } });
        if (a.isAlive()) a.gainMp(CONFIG.MP_REGEN_PER_ROUND * 100);
      }
      r++;
    }
    this.scene.start('ResultScene', { type: 'timeout', levelIndex: this.currentLevelIndex });
  }

  endBattle(type) {
    this.battleEnded = true;
    const txt = { victory: '战斗胜利!', defeat: '战斗失败...', timeout: '超时失败' }; const col = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    const t = this.add.text(CONFIG.WIDTH / 2, 250, txt[type], { fontSize: '60px', color: col[type], fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: t, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 800 });
    const b = this.add.text(CONFIG.WIDTH / 2, 450, '👉 点击继续', { fontSize: '28px', color: '#fff', backgroundColor: '#e67e22', padding: { x: 30, y: 15 } }).setOrigin(0.5).setInteractive().setDepth(201);
    b.on('pointerdown', () => this.scene.start('ResultScene', { type, levelIndex: this.currentLevelIndex }));
  }
}

class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }
  init(d) { this.resultType = d.type; this.currentLevelIndex = d.levelIndex || 0; }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const txt = { victory: '战斗胜利!', defeat: '战斗失败...', timeout: '超时失败' }; const col = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, txt[this.resultType] || '未知结果', { fontSize: '80px', color: col[this.resultType] || '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    let label = '🔄 重新挑战'; let action = () => this.scene.start('FormationScene', { levelIndex: this.currentLevelIndex });
    if (this.resultType === 'victory') {
      const lv = LEVELS[this.currentLevelIndex]; let totalExp = lv.rewardExp || 0; let levelUpInfo = [];
      if(totalExp > 0) { CHARACTERS.filter(c => c.side === 'player').forEach(c => { const oldLv = c.level || 1; addCharacterExp(c, totalExp); if(c.level > oldLv) levelUpInfo.push(`${c.name}升到Lv.${c.level}`); }); }
      if (lv && lv.rewardItemId && ITEMS[lv.rewardItemId]) {
        try {
          const inst = generateRandomInstance(lv.rewardItemId);
          if (inst) {
            const tpl = ITEMS[inst.itemId];
            if (tpl && !['weapon', 'armor', 'accessory'].includes(tpl.category)) { const existing = INVENTORY.find(i => i.itemId === tpl.id && !i.equippedBy); if (existing && existing.count < (tpl.maxStack || 1)) existing.count++; else INVENTORY.push(inst); } 
            else INVENTORY.push(inst);
            const qc = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
            this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, '获得掉落：', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 10, ITEMS[inst.itemId].name, { fontSize: '36px', color: qc[inst.quality] || '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
          }
        } catch (err) { console.error("掉落报错：", err); }
      }
      if(totalExp > 0) { this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 80, `全队获得 ${totalExp} 经验`, { fontSize: '24px', color: '#f1c40f' }).setOrigin(0.5); if(levelUpInfo.length > 0) { this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 120, levelUpInfo.join('，'), { fontSize: '20px', color: '#2ecc71' }).setOrigin(0.5); } }
      localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY)); localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
      if (this.currentLevelIndex < LEVELS.length - 1) { label = '➡️ 进入下一关'; action = () => this.scene.start('FormationScene', { levelIndex: this.currentLevelIndex + 1 }); }
    }
    const b = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 200, label, { fontSize: '36px', color: '#fff', backgroundColor: '#e67e22', padding: { x: 40, y: 20 } }).setOrigin(0.5).setInteractive();
    b.on('pointerdown', action);
  }
}

window.addEventListener('storage', (e) => { if (e.key === 'my_game_characters' || e.key === 'my_game_levels_sync' || e.key === 'my_game_skills_sync') { if (confirm('检测到编辑器数据更新，是否立即刷新游戏查看效果？')) window.location.reload(); } });

window.game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#0f0f1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
  scene: [MainMenuScene, FormationScene, BattleScene, TeamScene, ResultScene],
});
