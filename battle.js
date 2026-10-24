// ==========================================
// 讀取同步數據
// ==========================================
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
  window.DROP_RATES = gc.dropRates;
  window.GLOBAL_AFFIX_POOLS = gc.affixPools;
  window.GLOBAL_AFFIX_VALUES = gc.affixValues;
} catch(e) {}

// ==========================================
// Unit 類
// ==========================================
class Unit {
  constructor(data) {
    Object.assign(this, data);
    if (!this.skillSlots) this.skillSlots = { normal: '', skill: '', ultimate: '', followup: '', learned: '' };
    
    if (!this.equipment) this.equipment = {};
    if (this.equipment.armor && !this.equipment.body) { this.equipment.body = this.equipment.armor; delete this.equipment.armor; }
    if (this.equipment.accessory && !this.equipment.ring) { this.equipment.ring = this.equipment.accessory; delete this.equipment.accessory; }
    const defaultSlots = ['weapon', 'head', 'body', 'legs', 'ring', 'necklace'];
    defaultSlots.forEach(s => { if (!this.equipment[s]) this.equipment[s] = ''; });

    if (!this.sizeX) this.sizeX = 1;
    if (!this.sizeY) this.sizeY = 1;

    this.hitRate = this.hitRate || 0; 
    this.dodgeRate = this.dodgeRate || 0;
    this.critRate = this.critRate || 0;
    this.critResist = this.critResist || 0; 
    this.dmgIncrease = this.dmgIncrease || 0;
    this.dmgReduction = this.dmgReduction || 0; 
    this.dmgTakenIncrease = this.dmgTakenIncrease || 0;
    this.trueDmg = this.trueDmg || 0; 
    this.critDmg = this.critDmg || 1.5;
    this.lifesteal = this.lifesteal || 0;

    const stats = data.stats || { fengRui: 0, hunHou: 0, lingDong: 0, jianRen: 0, guiMi: 0, jueQing: 0 };
    
    this.maxHp = (this.maxHp || 0) + stats.hunHou * CONFIG.hunHouToHp;
    this.atk = (this.atk || 0) + stats.fengRui * CONFIG.fengRuiToAtk;
    this.def = (this.def || 0) + stats.jianRen * CONFIG.jianRenToDef;
    this.speed = (this.speed || 0) + stats.lingDong * CONFIG.lingDongToSpd;

    let critGain = (stats.jueQing * CONFIG.jueQingToCrit / 100);
    this.critRate = this.critRate + Math.min(critGain, CONFIG.maxCritFromStats / 100);
    
    let evaGain = (stats.lingDong * CONFIG.lingDongToEva / 100);
    this.dodgeRate = this.dodgeRate + Math.min(evaGain, CONFIG.maxEvaFromStats / 100);
    
    this.hitRate = this.hitRate + (stats.guiMi * CONFIG.guiMiToHit / 100);
    this.critResist = this.critResist + (stats.jianRen * CONFIG.jianRenToRes / 100);
    this.critDmg = this.critDmg + (stats.guiMi * CONFIG.guiMiToCritDmg / 100);

    let eqAtkAdd = 0, eqDefAdd = 0, eqHpAdd = 0;
    let eqAtkPct = 0, eqDefPct = 0, eqHpPct = 0;
    
    Object.values(this.equipment).forEach(uid => {
      if (!uid) return;
      const inst = INVENTORY.find(i => i.uid === uid);
      if (inst) {
        eqAtkAdd += (inst.baseAtk || 0); 
        eqDefAdd += (inst.baseDef || 0); 
        eqHpAdd += (inst.baseHp || 0);
        if (inst.extras) {
          inst.extras.forEach(ex => {
            let val = ex.value;
            if (ex.stat === 'atkFlat') eqAtkAdd += val;
            else if (ex.stat === 'defFlat') eqDefAdd += val;
            else if (ex.stat === 'hpFlat') eqHpAdd += val;
            else if (ex.stat === 'atkPercent') eqAtkPct += val;
            else if (ex.stat === 'defPercent') eqDefPct += val;
            else if (ex.stat === 'hpPercent') eqHpPct += val;
            else if (this[ex.stat] !== undefined) this[ex.stat] += val;
          });
        }
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
    this.hp = this.maxHp; this.maxMp = 100; this.mp = 100;
    this.cooldowns = {}; this.statuses = []; this.followupCounts = {};
    this.shield = 0; this.skipTurn = false;
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
    this.atk = Math.max(1, Math.floor(this.atk));
    this.def = Math.max(0, Math.floor(this.def));
    this.speed = Math.max(1, Math.floor(this.speed));
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
    if (STATUSES[id].isStun) {
      this.skipTurn = true;
      if (!this.statuses.find(s => s.id === id)) this.statuses.push({ id, duration: 1 });
      return;
    }
    const ex = this.statuses.find(s => s.id === id);
    if (ex) ex.duration = STATUSES[id].duration; else this.statuses.push({ id, duration: STATUSES[id].duration });
  }
}

// ==========================================
// BattleLogic
// ==========================================
const BattleLogic = {
  selectTargets(actor, skill, allUnits) {
    let pool = [];
    if (skill.targetSide === 'self') return [actor];
    if (skill.targetSide === 'player') pool = allUnits.filter(u => u.side === actor.side && u.isAlive());
    else pool = allUnits.filter(u => u.side !== actor.side && u.isAlive());
    if (pool.length === 0) return [];
    if (skill.targetRule === 'all') return pool;
    if (skill.targetRule === 'frontRow') {
      const xs = pool.map(u => u.gridX);
      const isEnemyTarget = pool[0].side === 'enemy';
      const m = isEnemyTarget ? Math.max(...xs) : Math.min(...xs);
      return pool.filter(u => u.gridX === m);
    }
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
      return true;
    });
    const w = { ultimate: 3, skill: 2, normal: 1 };
    usable.sort((a, b) => (w[b.type] || 0) - (w[a.type] || 0));
    if (usable.length > 0) return usable[0];
    const fb = Object.values(SKILLS).find(s => s.type === 'normal');
    if (fb) return fb;
    return { id: 'default_atk', name: '普通攻擊', type: 'normal', multiplier: 1, mpCost: 0, targetRule: 'frontRow', targetSide: 'enemy', element: 'fire', healMultiplier: 0, effects: [] };
  },
  buildActionOrder(units) { return [...units].filter(u => u.isAlive()).sort((a, b) => b.speed - a.speed); }
};

// ==========================================
// 隨機掉落
// ==========================================
function generateRandomInstance(templateId) {
  const t = ITEMS[templateId]; if (!t) return null;
  return { uid: 'inst_' + Date.now() + Math.floor(Math.random()*1000), itemId: t.id, quality: 'white', baseAtk: 50, baseDef: 10, baseHp: 100, extras: [], equippedBy: '', count: 1 };
}

// ==========================================
// 主菜單與場景類別
// ==========================================
class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.text(CONFIG.WIDTH / 2, 200, '中大型策略戰棋', { fontSize: '64px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(CONFIG.WIDTH / 2, 500, '⚔️ 開始推圖', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    b.on('pointerdown', () => this.scene.start('FormationScene', { levelIndex: 0 }));
    const e = this.add.text(CONFIG.WIDTH - 20, 20, '⚙️ 編輯器', { fontSize: '20px', color: '#fff', backgroundColor: '#3498db', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    e.on('pointerdown', () => { window.location.href = 'editor.html'; });
  }
}

class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }
  create() {
    this.scene.start('BattleScene', { levelIndex: this.currentLevelIndex });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }

  create() {
    this.allUnits = []; this.unitViews = new Map(); this.drawBattlefield();
    this.speedMultiplier = 1; this.isSkipping = false; this.battleEnded = false;

    const lv = LEVELS[this.currentLevelIndex] || { enemyList: [] };
    const fighters = [];
    CHARACTERS.filter(c => c.side === 'player').forEach(c => fighters.push({ ...c }));
    if (Array.isArray(lv.enemyList)) {
      lv.enemyList.forEach(item => {
        const orig = CHARACTERS.find(c => c.id === item.id);
        if (orig) { const inst = JSON.parse(JSON.stringify(orig)); inst.gridX = item.x; inst.gridY = item.y; fighters.push(inst); }
      });
    }

    if (fighters.filter(f => f.side === 'enemy').length === 0) {
      fighters.push({ id: 'e_fb', name: '木樁', side: 'enemy', emoji: '🪵', element: 'fire', maxHp: 50000, atk: 10, def: 10, speed: 5, sizeX: 1, sizeY: 1, gridX: 1, gridY: 0, skillSlots: {} });
    }

    fighters.forEach(d => { const u = new Unit(d); this.allUnits.push(u); });
    this.allUnits.forEach(u => u.applyAura(this.allUnits));
    this.allUnits.forEach(u => this.createUnitView(u));

    this.roundText = this.add.text(CONFIG.WIDTH / 2, 24, '第 1 回合', { fontSize: '30px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.logHistory = []; this.logTexts = [];
    this.time.delayedCall(800, () => this.startBattle());
  }

  drawBattlefield() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE;
    this.enemyLeft = 100; this.playerLeft = CONFIG.WIDTH - 100 - gridW; this.gridTop = 150;
  }

  createUnitView(unit) {
    const cell = CONFIG.CELL_SIZE;
    let x = unit.side === 'enemy' ? (this.enemyLeft + unit.gridX * cell + cell/2) : (this.playerLeft + unit.gridX * cell + cell/2);
    let y = this.gridTop + unit.gridY * cell + cell/2;

    const c = this.add.container(x, y);
    const r = (cell / 2) * 0.85;
    const circle = this.add.circle(0, 0, r, getElementInfo(unit.element).color).setStrokeStyle(3, 0xffffff, 0.9);
    
    let avatarVisual;
    if (unit.avatar && unit.avatar.trim() !== '') {
      avatarVisual = this.add.image(0, 0, unit.id + '_avatar').setDisplaySize(r * 1.8, r * 1.8);
    } else {
      avatarVisual = this.add.text(0, 0, unit.emoji || '👤', { fontSize: (r * 1.2) + 'px' }).setOrigin(0.5);
    }

    const nameText = this.add.text(0, r + 10, unit.name, { fontSize: '16px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    const hpText = this.add.text(0, r + 32, `${unit.hp}/${unit.maxHp}`, { fontSize: '11px', color: '#fff' }).setOrigin(0.5);

    c.add([circle, avatarVisual, nameText, hpText]);
    this.unitViews.set(unit, { container: c, circle, hpText });
  }

  startBattle() { if (this.isSkipping || this.battleEnded) return; this.round = 1; this.allUnits.forEach(u => u.resetFollowups()); this.actionOrder = BattleLogic.buildActionOrder(this.allUnits); this.actionIndex = 0; this.nextAction(); }

  nextAction() {
    if (this.isSkipping || this.battleEnded) return;
    const p = this.allUnits.filter(u => u.side === 'player' && u.isAlive());
    const e = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
    if (p.length === 0) return this.endBattle('defeat');
    if (e.length === 0) return this.endBattle('victory');
    if (this.round > CONFIG.MAX_ROUNDS) return this.endBattle('timeout');

    if (this.actionIndex >= this.actionOrder.length) {
      this.round++; this.roundText.setText(`第 ${this.round} 回合`);
      this.allUnits.forEach(u => { if (u.isAlive()) { u.resetFollowups(); u.tickStatuses(); } });
      this.actionOrder = BattleLogic.buildActionOrder(this.allUnits);
      this.actionIndex = 0;
      this.time.delayedCall(800, () => this.nextAction());
      return;
    }

    const actor = this.actionOrder[this.actionIndex++];
    if (!actor.isAlive()) return this.nextAction();
    this.execute(actor);
  }

  execute(actor) {
    if (this.battleEnded) return;
    const sk = BattleLogic.chooseSkill(actor, this.allUnits);
    if (!sk) return this.nextAction();
    const targets = BattleLogic.selectTargets(actor, sk, this.allUnits);
    if (targets.length === 0) return this.nextAction();

    this.addLog(`${actor.name} 使用【${sk.name}】`);

    this.time.delayedCall(450, () => {
      targets.forEach(t => {
        const r = BattleLogic.computeDamage(actor, t, sk);
        if (r.isMiss) { this.addLog(`${t.name} 閃避了攻擊`); }
        else {
          t.takeDamage(r.damage);
          this.showDamage(t, r);
          this.updateUnitView(t);
          this.addLog(`${actor.name} 對 ${t.name} 造成 ${r.damage} 傷害`);
          
          // 觸發追打鏈
          if (sk.comboTagOut) {
            this.checkFollowup(sk.comboTagOut, actor);
          }
        }
      });
      this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction());
    });
  }

  // 支援遞迴的追打檢查
  checkFollowup(tag, originalActor) {
    if (!tag) return;
    let candidates = this.allUnits.filter(u => u.isAlive() && u.side === originalActor.side);
    candidates.sort((a, b) => (a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX));

    for (let u of candidates) {
      const fid = u.skillSlots?.followup;
      if (!fid || !SKILLS[fid]) continue;
      const skill = SKILLS[fid];
      if (skill.comboTagIn === tag) {
        const used = u.followupCounts[fid] || 0;
        if (used < (skill.maxTriggers || 1)) {
          u.followupCounts[fid] = used + 1;
          this.doFollowup(u, skill);
          break;
        }
      }
    }
  }

  doFollowup(actor, skill) {
    const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
    if (targets.length === 0) return;
    this.addLog(`⚡ ${actor.name} 追打【${skill.name}】`, '#fc0');

    targets.forEach(t => {
      const r = BattleLogic.computeDamage(actor, t, skill);
      if (r.isMiss) {
        this.addLog(`❌ ${t.name} 閃避了追打，連擊中斷！`);
      } else {
        t.takeDamage(r.damage);
        this.showDamage(t, r);
        this.updateUnitView(t);

        // 遞迴觸發下一個追打
        if (skill.comboTagOut) {
          this.time.delayedCall(300, () => {
            this.checkFollowup(skill.c
