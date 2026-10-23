// ==========================================
// 读取同步数据
// ==========================================
if (typeof STATUSES === 'undefined') { window.STATUSES = {}; }
if (typeof ITEMS === 'undefined') { window.ITEMS = {}; }
if (typeof LEVELS === 'undefined') { window.LEVELS = []; }
if (typeof INVENTORY === 'undefined') { window.INVENTORY = []; }

if (localStorage.getItem('my_game_characters')) { try { const d = JSON.parse(localStorage.getItem('my_game_characters')); if (Array.isArray(d) && d.length) { CHARACTERS.length=0; CHARACTERS.push(...d); } } catch(e){} }
if (localStorage.getItem('my_game_skills_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_skills_sync')); if (Array.isArray(d) && d.length) { Object.keys(SKILLS).forEach(k=>delete SKILLS[k]); d.forEach(sk => SKILLS[sk.id]={...sk}); } } catch(e){} }
if (localStorage.getItem('my_game_statuses_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_statuses_sync')); if (Array.isArray(d) && d.length) { Object.keys(STATUSES).forEach(k=>delete STATUSES[k]); d.forEach(st => STATUSES[st.id]={...st}); } } catch(e){} }
if (localStorage.getItem('my_game_items_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_items_sync')); if (Array.isArray(d) && d.length) { Object.keys(ITEMS).forEach(k=>delete ITEMS[k]); d.forEach(it => ITEMS[it.id]={...it}); } } catch(e){} }
if (localStorage.getItem('my_game_levels_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_levels_sync')); if (Array.isArray(d) && d.length) { LEVELS.length=0; LEVELS.push(...d); } } catch(e){} }
if (localStorage.getItem('my_game_inventory_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_inventory_sync')); if (Array.isArray(d)) { INVENTORY.length=0; INVENTORY.push(...d); } } catch(e){} }

// ==========================================
// 纯逻辑层
// ==========================================
class Unit {
  constructor(data) {
    Object.assign(this, data);
    if (!this.skillSlots) this.skillSlots = { normal: '', skill: '', ultimate: '', followup: '', learned: '' };
    if (!this.equipment) this.equipment = { weapon: '', armor: '', accessory: '' };
    if (!this.sizeX) this.sizeX = 1;
    if (!this.sizeY) this.sizeY = 1;

    this.hitRate = this.hitRate || 0; this.dodgeRate = this.dodgeRate || 0;
    this.critResist = this.critResist || 0; this.dmgIncrease = this.dmgIncrease || 0;
    this.dmgReduction = this.dmgReduction || 0; this.dmgTakenIncrease = this.dmgTakenIncrease || 0;
    this.trueDmg = this.trueDmg || 0; this.critDmg = this.critDmg || 1.5;
    this.lifesteal = this.lifesteal || 0;

    let eqAtkAdd = 0, eqDefAdd = 0, eqHpAdd = 0;
    let eqAtkPct = 0, eqDefPct = 0, eqHpPct = 0;

    Object.values(this.equipment).forEach(uid => {
      if (!uid) return;
      const inst = INVENTORY.find(i => i.uid === uid);
      if (inst) {
        eqAtkAdd += (inst.baseAtk || 0); eqDefAdd += (inst.baseDef || 0); eqHpAdd += (inst.baseHp || 0);
        if (inst.extras) {
          inst.extras.forEach(ex => {
            let val = ex.value;
            const percentStats = ['atkPercent', 'defPercent', 'hpPercent', 'critRate', 'critResist', 'hitRate', 'dodgeRate', 'lifesteal', 'dmgIncrease', 'dmgReduction'];
            if (percentStats.includes(ex.stat) && val > 1) val = val / 100;
            if (ex.stat === 'atkPercent') eqAtkPct += val;
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
    
    // 过滤出自身的被动
    this.passives = Object.values(this.skillSlots).filter(id => id && SKILLS[id] && SKILLS[id].type === 'passive').map(id => SKILLS[id]);
    
    // 应用自身被动
    this.passives.forEach(sk => {
      if (sk.isAura) return; // 光环不在初始化时应用给自己
      if (sk.passiveType === 'atkAdd') { this.atk += this.baseAtk * sk.passiveValue; this.baseAtk += this.baseAtk * sk.passiveValue; }
      if (sk.passiveType === 'hpAdd') this.maxHp += this.maxHp * sk.passiveValue;
      if (sk.passiveType === 'defAdd') { this.def += this.baseDef * sk.passiveValue; this.baseDef += this.baseDef * sk.passiveValue; }
      if (sk.passiveType === 'speedAdd') { this.speed += this.baseSpeed * sk.passiveValue; this.baseSpeed += this.baseSpeed * sk.passiveValue; }
    });

    this.hp = this.maxHp; 
    this.maxMp = 100; this.mp = 100;
    this.cooldowns = {}; this.statuses = []; this.followupCounts = {}; 
    this.shield = 0; 
    this.skipTurn = false; 
  }
  isAlive() { return this.hp > 0; }
  gainMp(amount) { this.mp = Math.min(100, this.mp + amount); }
  
  takeDamage(dmg) { 
    if (this.shield > 0) {
      if (dmg <= this.shield) { this.shield -= dmg; return 0; } 
      else { const remain = dmg - this.shield; this.shield = 0; this.hp = Math.max(0, this.hp - remain); return remain; }
    } else { this.hp = Math.max(0, this.hp - dmg); return dmg; }
  }
  
  heal(amount) { if (this.isAlive()) this.hp = Math.min(this.maxHp, this.hp + amount); }
  addShield(amount) { if (this.isAlive()) this.shield += amount; }
  reduceCooldowns() { for (let key in this.cooldowns) { if (this.cooldowns[key] > 0) this.cooldowns[key]--; } }
  resetFollowups() { this.followupCounts = {}; }

  // 重新计算所有光环（每次轮到自己行动前或者布阵完调用）
  applyAura(allUnits) {
    // 先把所有属性重置为基础值
    this.atk = this.baseAtk; this.def = this.baseDef; this.speed = this.baseSpeed;
    
    // 遍历场上所有友方单位的光环
    allUnits.forEach(ally => {
      if (ally.side !== this.side || !ally.isAlive()) return;
      ally.passives.forEach(sk => {
        if (!sk.isAura) return;
        
        // 计算曼哈顿距离 (忽略体积，仅按中心点算)
        const dist = Math.abs(ally.gridX - this.gridX) + Math.abs(ally.gridY - this.gridY);
        if (dist <= sk.auraRange) {
          if (sk.passiveType === 'atkAdd') this.atk += this.baseAtk * sk.passiveValue;
          if (sk.passiveType === 'hpAdd') this.maxHp += this.baseHp * sk.passiveValue; // 注意上限变化
          if (sk.passiveType === 'defAdd') this.def += this.baseDef * sk.passiveValue;
          if (sk.passiveType === 'speedAdd') this.speed += this.baseSpeed * sk.passiveValue;
        }
      });
    });

    // 应用 Debuff 修正
    this.statuses.forEach(st => {
      const config = STATUSES[st.id]; if (!config) return;
      if (config.statMod === 'atk') this.atk += this.baseAtk * config.statValue;
      if (config.statMod === 'def') this.def += this.baseDef * config.statValue;
      if (config.statMod === 'speed') this.speed += this.baseSpeed * config.statValue;
    });

    this.atk = Math.max(1, Math.floor(this.atk)); 
    this.def = Math.max(0, Math.floor(this.def)); 
    this.speed = Math.max(1, Math.floor(this.speed));
    // 血量上限如果变了，不能超过
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }
  
  tickStatuses() {
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const st = this.statuses[i]; const config = STATUSES[st.id];
      if (config && config.isDot && config.dotValue > 0) this.takeDamage(config.dotValue); 
      st.duration--; if (st.duration <= 0) this.statuses.splice(i, 1); 
    }
  }
  
  addStatus(statusId) {
    if (!statusId || !STATUSES[statusId]) return;
    if (STATUSES[statusId].isStun) {
      this.skipTurn = true;
      const existing = this.statuses.find(s => s.id === statusId);
      if (!existing) this.statuses.push({ id: statusId, duration: 1 });
      return;
    }
    const existing = this.statuses.find(s => s.id === statusId);
    if (existing) existing.duration = STATUSES[statusId].duration; 
    else this.statuses.push({ id: statusId, duration: STATUSES[statusId].duration });
  }
}

const BattleLogic = {
  getElementMultiplier(atkElement, defElement) {
    const atk = ELEMENTS[atkElement]; if (!atk) return 1.0;
    if (atk.beats === defElement) return CONFIG.ADVANTAGE_MULT;
    if (atk.weak === defElement) return CONFIG.DISADVANTAGE_MULT;
    return 1.0;
  },
  
  selectTargets(actor, skill, allUnits) {
    let candidates = [];
    if (skill.targetSide === 'self') return [actor];
    if (skill.targetSide === 'player') candidates = allUnits.filter(u => u.side === actor.side && u.isAlive());
    else candidates = allUnits.filter(u => u.side !== actor.side && u.isAlive());
    
    if (candidates.length === 0) return [];
    if (skill.targetRule === 'all') return candidates;

    if (skill.targetRule === 'frontRow') { const minY = Math.min(...candidates.map(u => u.gridY)); return candidates.filter(u => u.gridY === minY); }
    else if (skill.targetRule === 'lowestHp') { const minHp = Math.min(...candidates.map(u => u.hp)); return candidates.filter(u => u.hp === minHp); }
    else if (skill.targetRule === 'highestHp') { const maxHp = Math.max(...candidates.map(u => u.hp)); return candidates.filter(u => u.hp === maxHp); }
    else if (skill.targetRule === 'highestAtk') { const maxAtk = Math.max(...candidates.map(u => u.atk)); return candidates.filter(u => u.atk === maxAtk); }
    else if (skill.targetRule === 'random') { return [candidates[Math.floor(Math.random() * candidates.length)]]; }
    return [candidates[0]];
  },
  
  computeDamage(actor, target, skill) {
    if (skill.multiplier === 0) return { damage: 0, isCrit: false, isMiss: false, lifestealAmount: 0 };

    let hitRate = 1.0 + (actor.hitRate || 0) - (target.dodgeRate || 0);
    hitRate = Math.max(0.2, Math.min(1.0, hitRate)); 
    if (Math.random() > hitRate) return { damage: 0, isCrit: false, isMiss: true, lifestealAmount: 0 };

    let base = actor.atk * skill.multiplier;
    const baseForMin = base; 

    const defReduceRate = target.def / (target.def + 1000);
    let dmgAfterDef = base * (1 - defReduceRate);
    dmgAfterDef = Math.max(dmgAfterDef, baseForMin * 0.1); 

    let critRate = (actor.critRate || 0) - (target.critResist || 0);
    critRate = Math.max(0, Math.min(1, critRate));
    const isCrit = Math.random() < critRate;
    if (isCrit) dmgAfterDef *= actor.critDmg;

    const dmgIncMod = Math.max(0.1, 1 + (actor.dmgIncrease || 0) - (actor.dmgReduction || 0));
    const dmgTakenMod = Math.max(0.1, 1 + (target.dmgTakenIncrease || 0) - (target.dmgReduction || 0));
    let finalDmg = dmgAfterDef * dmgIncMod * dmgTakenMod;

    const elemMult = this.getElementMultiplier(skill.element, target.element);
    finalDmg *= elemMult;
    finalDmg += (actor.trueDmg || 0);

    const damageVal = Math.round(finalDmg);
    const lifestealAmount = Math.round(damageVal * (actor.lifesteal || 0)); 

    return { damage: damageVal, isCrit, isMiss: false, lifestealAmount };
  },
  
  chooseSkill(actor, allUnits) {
    const slots = actor.skillSlots || {};
    const availableSkills = Object.values(slots).filter(id => id && SKILLS[id] && SKILLS[id].type !== 'passive' && SKILLS[id].type !== 'followup').map(id => SKILLS[id]);
    
    const usable = availableSkills.filter(sk => { 
      const cd = actor.cooldowns[sk.id] || 0; 
      if (actor.mp < (sk.mpCost || 0) || cd > 0) return false;
      
      if (sk.healMultiplier > 0 && sk.multiplier === 0) {
        const allies = allUnits.filter(u => u.side === actor.side && u.isAlive());
        const needsHeal = allies.some(u => u.hp < u.maxHp);
        if (!needsHeal) return false;
      }
      return true;
    });

    const typeWeight = { ultimate: 3, skill: 2, normal: 1 };
    usable.sort((a, b) => (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0));
    if (usable.length > 0) return usable[0];
    
    const fallbackSkill = Object.values(SKILLS).find(s => s.type === 'normal');
    if (fallbackSkill) return fallbackSkill;
    return { id: 'default_atk', name: '普通攻击', type: 'normal', multiplier: 1, mpCost: 0, targetRule: 'frontRow', targetSide: 'enemy', element: 'fire', healMultiplier:0, shieldMultiplier:0, effects: [] };
  },
  buildActionOrder(units) { return [...units].filter(u => u.isAlive()).sort((a, b) => b.speed - a.speed); }
};

function generateRandomInstance(templateId) {
  const template = ITEMS[templateId];
  if (!template) return null;
  const rand = Math.random() * 100;
  let quality = 'white', qMult = 1.0, extraCount = 0, tier = 1;
  if (rand > 99) { quality = 'red'; qMult = 1.8; extraCount = 5; tier = 3; }
  else if (rand > 95) { quality = 'orange'; qMult = 1.5; extraCount = 4; tier = 3; }
  else if (rand > 85) { quality = 'purple'; qMult = 1.3; extraCount = 3; tier = 2; }
  else if (rand > 60) { quality = 'blue'; qMult = 1.15; extraCount = 2; tier = 2; }
  else if (rand > 30) { quality = 'green'; qMult = 1.05; extraCount = 1; tier = 1; }

  const baseAtk = Math.floor((Math.floor(Math.random() * ((template.atkMax||0) - (template.atkMin||0) + 1)) + (template.atkMin||0)) * qMult);
  const baseDef = Math.floor((Math.floor(Math.random() * ((template.defMax||0) - (template.defMin||0) + 1)) + (template.defMin||0)) * qMult);
  const baseHp = Math.floor((Math.floor(Math.random() * ((template.hpMax||0) - (template.hpMin||0) + 1)) + (template.hpMin||0)) * qMult);

  const WEAPON_ACC_POOL = ['atkPercent', 'critRate', 'critDmg', 'lifesteal', 'hitRate', 'speed'];
  const ARMOR_POOL = ['hpPercent', 'defPercent', 'critResist', 'dodgeRate', 'speed'];
  const pool = template.category === 'armor' ? ARMOR_POOL : WEAPON_ACC_POOL;
  
  let tempPool = [...pool];
  const extras = [];
  for (let i = 0; i < extraCount; i++) {
    if(tempPool.length === 0) break;
    const idx = Math.floor(Math.random() * tempPool.length);
    const stat = tempPool.splice(idx, 1)[0];
    let val = 0;
    if (stat === 'speed') val = tier === 1 ? Math.floor(Math.random()*2)+1 : tier === 2 ? Math.floor(Math.random()*3)+3 : Math.floor(Math.random()*5)+6;
    else if (stat === 'lifesteal') val = tier === 1 ? (Math.floor(Math.random()*2)+1)/100 : tier === 2 ? (Math.floor(Math.random()*3)+3)/100 : (Math.floor(Math.random()*5)+6)/100;
    else if (stat === 'atkPercent') val = tier === 1 ? (Math.floor(Math.random()*3)+2)/100 : tier === 2 ? (Math.floor(Math.random()*3)+5)/100 : (Math.floor(Math.random()*3)+8)/100;
    else if (stat === 'defPercent') val = tier === 1 ? (Math.floor(Math.random()*3)+2)/100 : tier === 2 ? (Math.floor(Math.random()*3)+5)/100 : (Math.floor(Math.random()*3)+6)/100;
    else val = tier === 1 ? (Math.floor(Math.random()*5)+1)/100 : tier === 2 ? (Math.floor(Math.random()*5)+10)/100 : (Math.floor(Math.random()*10)+20)/100;
    extras.push({ stat, value: val });
  }

  const extraKeys = ['atkPercent', 'defPercent', 'hpPercent', 'critRate', 'critDmg', 'lifesteal', 'hitRate', 'dodgeRate', 'critResist', 'speed'];
  extraKeys.forEach(k => { if (template[k] && template[k] !== 0) extras.push({ stat: k, value: template[k] / 100 }); });

  return { uid: 'inst_' + Date.now() + Math.floor(Math.random()*1000), itemId: template.id, quality, baseAtk, baseDef, baseHp, extras, equippedBy: '' };
}

// ==========================================
// 场景 1：战前布阵
// ==========================================
class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE;
    const gridLeft = (CONFIG.WIDTH - gridW) / 2, gridTop = 180, standbyTop = 680; 

    const levelData = LEVELS[this.currentLevelIndex] || { name: '未知关卡' };
    this.add.text(10, 10, `版本: v10.0.0 | 当前: ${levelData.name}`, { fontSize: '16px', color: '#00ff00' });
    
    const editBtn = this.add.text(CONFIG.WIDTH - 20, 20, '⚙️ 编辑器', { fontSize: '18px', color: '#ffffff', backgroundColor: '#3498db', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    editBtn.on('pointerdown', () => { window.location.href = 'editor.html'; });

    const refreshBtn = this.add.text(CONFIG.WIDTH - 20, 65, '🔄 强刷', { fontSize: '18px', color: '#ffffff', backgroundColor: '#e74c3c', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    refreshBtn.on('pointerdown', () => { const url = new URL(window.location.href); url.searchParams.set('t', Date.now().toString()); window.location.href = url.href; });

    const teamBtn = this.add.text(CONFIG.WIDTH - 20, 110, '👥 队伍与装备', { fontSize: '18px', color: '#ffffff', backgroundColor: '#9b59b6', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    teamBtn.on('pointerdown', () => { this.scene.start('TeamScene', { levelIndex: this.currentLevelIndex }); });

    this.countText = this.add.text(CONFIG.WIDTH / 2, 150, '当前上阵: 0 / 5', { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 60, '战前布阵', { fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const g = this.add.graphics(); g.lineStyle(2, 0x3498DB, 0.5);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      g.lineBetween(gridLeft, gridTop + i * cell, gridLeft + gridW, gridTop + i * cell);
      g.lineBetween(gridLeft + i * cell, gridTop, gridLeft + i * cell, gridTop + gridW);
    }

    const standbyBg = this.add.graphics(); standbyBg.fillStyle(0x16213e, 0.8);
    standbyBg.fillRoundedRect(20, standbyTop - 20, CONFIG.WIDTH - 40, 300, 10);
    standbyBg.lineStyle(2, 0x3498DB, 0.5); standbyBg.strokeRoundedRect(20, standbyTop - 20, CONFIG.WIDTH - 40, 300, 10);

    const startBtn = this.add.text(CONFIG.WIDTH / 2, 1180, '⚔️ 开始战斗', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => { 
      const playersCount = CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1).length;
      if (playersCount === 0) { alert("至少需要上阵1名角色！"); return; }
      this.scene.start('BattleScene', { levelIndex: this.currentLevelIndex }); 
    });

    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));
    const playerChars = CHARACTERS.filter(c => c.side === 'player');
    playerChars.forEach(data => { data.gridX = -1; data.gridY = -1; });

    this.unitContainers = [];
    playerChars.forEach(data => {
      // 暂时玩家还是 1x1，如果有 2x2 玩家，这里的渲染和拖拽逻辑需要大幅修改
      const container = this.add.container(0, 0);
      const circle = this.add.circle(0, 0, 42, ELEMENTS[data.element].color).setStrokeStyle(3, 0xffffff, 0.9);
      const emoji = this.add.text(0, 0, data.emoji, { fontSize: '48px' }).setOrigin(0.5);
      const nameText = this.add.text(0, 50, data.name, { fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      container.add([circle, emoji, nameText]); container.setSize(80, 80); 
      container.setInteractive({ draggable: true }); this.input.setDraggable(container);
      container.unitData = data; container.isOnGrid = false;
      this.unitContainers.push(container);

      container.on('dragstart', () => { if (container.isOnGrid) this.gridState[data.gridX][data.gridY] = null; container.setDepth(100); });
      container.on('drag', (p, dragX, dragY) => { container.x = dragX; container.y = dragY; });
      container.on('dragend', () => {
        container.setDepth(0); 
        let col = Math.floor((container.x - gridLeft) / cell), row = Math.floor((container.y - gridTop) / cell);
        if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
          const tData = this.gridState[col][row];
          if (!container.isOnGrid) {
            if (tData) { tData.gridX = -1; tData.gridY = -1; const tC = this.unitContainers.find(c => c.unitData === tData); tC.isOnGrid = false; data.gridX = col; data.gridY = row; this.gridState[col][row] = data; container.isOnGrid = true; }
            else { const cCount = CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1).length; if (cCount >= 5) { data.gridX = -1; data.gridY = -1; container.isOnGrid = false; } else { data.gridX = col; data.gridY = row; this.gridState[col][row] = data; container.isOnGrid = true; } }
          } else {
            if (tData && tData !== data) { const oC = data.gridX, oR = data.gridY; tData.gridX = oC; tData.gridY = oR; this.gridState[oC][oR] = tData; const tC = this.unitContainers.find(c => c.unitData === tData); tC.x = gridLeft + oC * cell + cell / 2; tC.y = gridTop + oR * cell + cell / 2; }
            data.gridX = col; data.gridY = row; this.gridState[col][row] = data;
          }
          if (container.isOnGrid) { container.x = gridLeft + data.gridX * cell + cell / 2; container.y = gridTop + data.gridY * cell + cell / 2; }
        } else { data.gridX = -1; data.gridY = -1; container.isOnGrid = false; }
        this.layoutStandby(standbyTop);
      });
    });
    this.layoutStandby(standbyTop);
  }

  layoutStandby(standbyTop) {
    const standbyContainers = this.unitContainers.filter(c => !c.isOnGrid);
    const cCount = this.unitContainers.filter(c => c.isOnGrid).length;
    this.countText.setText(`当前上阵: ${cCount} / 5`).setColor(cCount >= 5 ? '#e74c3c' : '#f1c40f');
    const cols = 4, cellW = 140, cellH = 120, startX = (CONFIG.WIDTH - (cols - 1) * cellW) / 2;
    standbyContainers.forEach((container, index) => {
      const targetX = startX + (index % cols) * cellW;
      const targetY = standbyTop + 50 + Math.floor(index / cols) * cellH; 
      this.tweens.add({ targets: container, x: targetX, y: targetY, duration: 200, ease: 'Cubic.easeOut' });
    });
  }
}

// ==========================================
// 场景 2：战斗表现
// ==========================================
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  init(data) { this.currentLevelIndex = data.levelIndex || 0; }

  create() {
    this.allUnits = []; this.unitViews = new Map(); this.drawBattlefield();
    this.speedMultiplier = 1; this.isSkipping = false; this.battleEnded = false;

    const speedBtn = this.add.text(30, 20, '⏩ 1x 速度', { fontSize: '18px', color: '#fff', backgroundColor: '#2980b9', padding: { x: 10, y: 5 } }).setOrigin(0, 0).setInteractive().setDepth(200);
    speedBtn.on('pointerdown', () => {
      this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
      speedBtn.setText(`⏩ ${this.speedMultiplier}x 速度`);
      speedBtn.setBackgroundColor(this.speedMultiplier === 2 ? '#e67e22' : '#2980b9');
    });

    const skipBtn = this.add.text(150, 20, '⏭️ 跳过战斗', { fontSize: '18px', color: '#fff', backgroundColor: '#c0392b', padding: { x: 10, y: 5 } }).setOrigin(0, 0).setInteractive().setDepth(200);
    skipBtn.on('pointerdown', () => { 
      if (this.isSkipping || this.battleEnded) return; 
      this.isSkipping = true; 
      this.fastForwardBattle(); 
    });

    const levelData = LEVELS[this.currentLevelIndex] || { enemyGrid: [] };
    const activeFighters = [];
    CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1).forEach(c => activeFighters.push({...c}));
    
    // ★ 读取 4x4 网格配置
    if (levelData.enemyGrid) {
      levelData.enemyGrid.forEach((enemyId, idx) => {
        if (!enemyId) return;
        const originalEnemy = CHARACTERS.find(c => c.id === enemyId);
        if (originalEnemy) {
          const enemyInstance = JSON.parse(JSON.stringify(originalEnemy));
          enemyInstance.gridX = idx % CONFIG.GRID_SIZE;
          enemyInstance.gridY = Math.floor(idx / CONFIG.GRID_SIZE);
          activeFighters.push(enemyInstance);
        }
      });
    }

    if (activeFighters.filter(f => f.side === 'enemy').length === 0) activeFighters.push({ id: 'e_fallback', name: '木桩', side: 'enemy', emoji: '🪵', element: 'fire', maxHp: 5000, atk: 10, def: 10, speed: 5, sizeX:1, sizeY:1, critRate: 0, critDmg: 1, hitRate:0, dodgeRate:0, critResist:0, dmgIncrease:0, dmgReduction:0, dmgTakenIncrease:0, trueDmg:0, lifesteal:0, gridX: 1, gridY: 0, skillSlots: { normal: '', skill: '', ultimate: '', followup: '', learned: '' }, equipment: {} });

    activeFighters.forEach(data => { const unit = new Unit(data); this.allUnits.push(unit); });
    
    // ★ 初始光环结算
    this.allUnits.forEach(u => u.applyAura(this.allUnits));

    // 渲染单位
    this.allUnits.forEach(unit => this.createUnitView(unit));
    
    this.roundText = this.add.text(CONFIG.WIDTH / 2, 24, '第 1 回合', { fontSize: '30px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0);
    
    this.logBg = this.add.rectangle(CONFIG.WIDTH / 2, 620, 640, 80, 0x000000, 0.7).setStrokeStyle(1, 0x3498db).setDepth(50);
    this.logHistory = []; 
    this.logTexts = [];   

    this.time.delayedCall(800, () => this.startBattle());
  }

  drawBattlefield() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE, gridLeft = (CONFIG.WIDTH - gridW) / 2;
    this.drawGrid(gridLeft, 70, cell, 0xE74C3C, 0.2); this.drawGrid(gridLeft, 700, cell, 0x3498DB, 0.2);
    this.add.rectangle(CONFIG.WIDTH / 2, 660, CONFIG.WIDTH - 100, 2, 0xffffff, 0.15);
    this.add.text(gridLeft + gridW + 10, 74, '敌方', { fontSize: '20px', color: '#E74C3C' });
    this.add.text(gridLeft + gridW + 10, 704, '我方', { fontSize: '20px', color: '#3498DB' });
  }
  drawGrid(x, y, cell, color, alpha) {
    const g = this.add.graphics(); g.lineStyle(2, color, alpha);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) { g.lineBetween(x, y + i * cell, x + CONFIG.GRID_SIZE * cell, y + i * cell); g.lineBetween(x + i * cell, y, x + i * cell, y + CONFIG.GRID_SIZE * cell); }
  }
  
  createUnitView(unit) {
    const pos = this.getUnitScreenPosition(unit);
    const container = this.add.container(pos.x, pos.y);
    
    // ★ 如果占格大于 1，缩放头像并居中
    const scaleFactor = (unit.sizeX > 1 || unit.sizeY > 1) ? 1.2 : 1.0;
    const offsetX = (unit.sizeX - 1) * CONFIG.CELL_SIZE / 2;
    const offsetY = (unit.sizeY - 1) * CONFIG.CELL_SIZE / 2;
    container.x += offsetX;
    // 对于敌方，因为 Y 轴是倒序的，需要反向偏移
    if (unit.side === 'enemy') container.y -= offsetY; else container.y += offsetY;

    const circle = this.add.circle(0, 0, 42 * scaleFactor, ELEMENTS[unit.element].color).setStrokeStyle(3, 0xffffff, 0.9);
    const emoji = this.add.text(0, 0, unit.emoji, { fontSize: (48 * scaleFactor) + 'px' }).setOrigin(0.5);
    const nameText = this.add.text(0, 50 * scaleFactor, unit.name, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    
    const hpBg = this.add.rectangle(0, 74, 94, 12, 0x000000).setStrokeStyle(1, 0xffffff, 0.4);
    const hpBar = this.add.rectangle(-45, 74, 90, 8, 0xff4444).setOrigin(0, 0.5);
    const hpText = this.add.text(0, 74, '', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const shieldBar = this.add.rectangle(-45, 74, 90, 8, 0xcccccc, 0.8).setOrigin(0, 0.5);
    shieldBar.setVisible(false);
    const shieldText = this.add.text(0, 60, '', { fontSize: '10px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#555', padding: {x:2, y:1} }).setOrigin(0.5);

    const mpBg = this.add.rectangle(0, 85, 94, 7, 0x000000);
    const mpBar = this.add.rectangle(-45, 85, 90, 5, 0x3498DB).setOrigin(0, 0.5);
    const mpText = this.add.text(45, 85, '', { fontSize: '10px', color: '#88ccff' }).setOrigin(1, 0.5);

    const statusText = this.add.text(0, -55 * scaleFactor, '', { fontSize: '14px', color: '#ffcc00', stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5);
    
    container.add([circle, emoji, nameText, hpBg, hpBar, shieldBar, mpBg, mpBar, hpText, shieldText, mpText, statusText]);
    container.bringToTop(shieldBar);
    container.bringToTop(shieldText);
    container.bringToTop(hpText);

    this.unitViews.set(unit, { container, circle, emoji, hpBar, shieldBar, mpBar, statusText, hpText, shieldText, mpText });
    this.updateUnitView(unit);
  }
  getUnitScreenPosition(unit) {
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE, gridLeft = (CONFIG.WIDTH - gridW) / 2;
    let x = gridLeft + unit.gridX * cell + cell / 2;
    let y = unit.side === 'enemy' ? 70 + (CONFIG.GRID_SIZE - 1 - unit.gridY) * cell + cell / 2 : 700 + unit.gridY * cell + cell / 2;
    return { x, y };
  }
  
  startBattle() { 
    if (this.isSkipping || this.battleEnded) return;
    this.round = 1; 
    this.allUnits.forEach(u => u.resetFollowups()); 
    this.actionOrder = BattleLogic.buildActionOrder(this.allUnits); 
    this.actionIndex = 0; 
    this.nextAction(); 
  }
  
  nextAction() {
    if (this.isSkipping || this.battleEnded) return;
    const players = this.allUnits.filter(u => u.side === 'player' && u.isAlive());
    const enemies = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
    if (players.length === 0) return this.endBattle('defeat');
    if (enemies.length === 0) return this.endBattle('victory');
    if (this.round > CONFIG.MAX_ROUNDS) return this.endBattle('timeout');
    
    if (this.actionIndex >= this.actionOrder.length) {
      this.round++;
      this.roundText.setText(`第 ${this.round} 回合`);
      this.allUnits.forEach(u => {
        if (!u.isAlive()) return;
        u.resetFollowups();
        const oldHp = u.hp;
        u.tickStatuses(); 
        if (u.hp < oldHp) this.showDamageNumber(u, { damage: oldHp - u.hp, isCrit: false, isMiss: false }, '#ff00ff'); 
        this.updateUnitView(u);
      });
      if (this.allUnits.filter(u => u.side === 'player' && u.isAlive()).length === 0) return this.endBattle('defeat');
      if (this.allUnits.filter(u => u.side === 'enemy' && u.isAlive()).length === 0) return this.endBattle('victory');
      this.actionOrder = BattleLogic.buildActionOrder(this.allUnits);
      this.actionIndex = 0;
      this.time.delayedCall(800 / this.speedMultiplier, () => this.nextAction());
      return;
    }
    const actor = this.actionOrder[this.actionIndex++];
    if (!actor.isAlive()) return this.time.delayedCall(80 / this.speedMultiplier, () => this.nextAction());
    
    // ★ 每次行动前重新计算光环
    this.allUnits.forEach(u => u.applyAura(this.allUnits));
    this.allUnits.forEach(u => this.updateUnitView(u));

    this.executeAction(actor);
  }
  
  executeAction(actor) {
    if (this.battleEnded) return;
    if (actor.skipTurn) {
      actor.skipTurn = false;
      const stIndex = actor.statuses.findIndex(st => STATUSES[st.id] && STATUSES[st.id].isStun);
      if (stIndex !== -1) actor.statuses.splice(stIndex, 1);
      this.updateUnitView(actor);
      this.addLog(`${actor.name} 处于眩晕状态，无法行动！`, '#f1c40f');
      
      const view = this.unitViews.get(actor).container;
      this.tweens.add({ targets: view, angle: 10, yoyo: true, repeat: 3, duration: 100 });
      return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    }

    const skill = BattleLogic.chooseSkill(actor, this.allUnits);
    if (!skill) return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction()); 
    const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
    if (targets.length === 0) return this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    
    const view = this.unitViews.get(actor);
    if (view) this.tweens.add({ targets: view.container, scaleX: 1.2, scaleY: 1.2, duration: 150 / this.speedMultiplier, yoyo: true });
    
    const isUlt = skill.type === 'ultimate';
    this.addLog(`${actor.name} 使用了【${skill.name}】`, isUlt ? '#e74c3c' : '#ffffff');

    this.time.delayedCall(450 / this.speedMultiplier, () => {
      actor.mp = Math.max(0, actor.mp - (skill.mpCost || 0));
      if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
      
      let totalHeal = 0;
      
      targets.forEach(t => {
        if (skill.healMultiplier > 0) {
          const healVal = Math.round(actor.atk * skill.healMultiplier);
          t.heal(healVal);
          this.showFloatText(t, `+${healVal}`, '#2ecc71');
          this.addLog(`${actor.name} 为 ${t.name} 恢复了 ${healVal} 点生命。`, '#2ecc71');
        } else if (skill.shieldMultiplier > 0) {
          const shieldVal = Math.round(actor.atk * skill.shieldMultiplier);
          t.addShield(shieldVal);
          this.showFloatText(t, `盾+${shieldVal}`, '#dddddd');
          this.addLog(`${actor.name} 为 ${t.name} 提供了 ${shieldVal} 点护盾。`, '#dddddd');
        } else {
          const result = BattleLogic.computeDamage(actor, t, skill);
          if (result.isMiss) {
            this.showFloatText(t, 'MISS', '#aaaaaa');
            this.addLog(`${t.name} 闪避了 ${actor.name} 的攻击！`, '#aaaaaa');
          } else {
            t.takeDamage(result.damage);
            if (result.lifestealAmount > 0) totalHeal += result.lifestealAmount; 
            this.showDamageNumber(t, result);
            this.addLog(`${actor.name} 对 ${t.name} 造成了 ${result.damage} 点${result.isCrit?'暴击':''}伤害！`, '#ff5555');
          }
        }
        this.updateUnitView(t);
      });

      if (skill.effects && skill.effects.length > 0) {
        skill.effects.forEach(eff => {
          if (Math.random() > eff.chance) return;

          let effTargets = [];
          if (eff.targetSide === 'sameAsMain' && eff.targetRule === 'sameAsMain') {
            effTargets = targets;
          } else {
            let pool = [];
            if (eff.targetSide === 'enemy') pool = this.allUnits.filter(u => u.side !== actor.side && u.isAlive());
            else if (eff.targetSide === 'player') pool = this.allUnits.filter(u => u.side === actor.side && u.isAlive());
            else pool = [actor];
            
            if (eff.targetRule === 'all') effTargets = pool;
            else if (eff.targetRule === 'lowestHp') { const minHp = Math.min(...pool.map(u => u.hp)); effTargets = pool.filter(u => u.hp === minHp); }
            else if (eff.targetRule === 'random') effTargets = [pool[Math.floor(Math.random() * pool.length)]];
            else effTargets = [pool[0]];
          }

          effTargets.forEach(t => {
            if (!t || !t.isAlive()) return;
            if (eff.type === 'status') {
              t.addStatus(eff.value);
              this.showFloatText(t, `+${STATUSES[eff.value]?.name || '状态'}`, '#00ffff');
              this.addLog(`${t.name} 被附加了【${STATUSES[eff.value]?.name || '状态'}】。`, '#00ffff');
              this.updateUnitView(t);
            } else if (eff.type === 'heal_pct') {
              const val = Math.round(actor.atk * eff.value);
              t.heal(val);
              this.showFloatText(t, `+${val}`, '#2ecc71');
              this.addLog(`${t.name} 恢复了 ${val} 点生命。`, '#2ecc71');
              this.updateUnitView(t);
            } else if (eff.type === 'heal_flat') {
              const val = Math.round(eff.value);
              t.heal(val);
              this.showFloatText(t, `+${val}`, '#2ecc71');
              this.addLog(`${t.name} 恢复了 ${val} 点生命。`, '#2ecc71');
              this.updateUnitView(t);
            } else if (eff.type === 'shield_pct') {
              const val = Math.round(actor.atk * eff.value);
              t.addShield(val);
              this.showFloatText(t, `盾+${val}`, '#dddddd');
              this.addLog(`${t.name} 获得了 ${val} 点护盾。`, '#dddddd');
              this.updateUnitView(t);
            } else if (eff.type === 'shield_flat') {
              const val = Math.round(eff.value);
              t.addShield(val);
              this.showFloatText(t, `盾+${val}`, '#dddddd');
              this.addLog(`${t.name} 获得了 ${val} 点护盾。`, '#dddddd');
              this.updateUnitView(t);
            } else if (eff.type === 'mp') {
              const val = eff.value; 
              t.gainMp(val);
              this.showFloatText(t, `MP +${val}%`, '#88ccff');
              this.addLog(`${t.name} 恢复了 ${val}% MP。`, '#88ccff');
              this.updateUnitView(t);
            }
          });
        });
      }
      
      if (totalHeal > 0) {
        actor.heal(totalHeal);
        this.showFloatText(actor, `+${totalHeal}`, '#2ecc71');
        this.addLog(`${actor.name} 触发吸血，恢复了 ${totalHeal} 点生命。`, '#2ecc71');
        this.updateUnitView(actor);
      }

      if (actor.isAlive()) actor.gainMp(10);

      actor.reduceCooldowns(); this.updateUnitView(actor);
      if (skill.comboTagOut) this.checkFollowups(skill.comboTagOut, actor); 
      this.time.delayedCall(CONFIG.ACTION_DELAY / this.speedMultiplier, () => this.nextAction());
    });
  }
  
  checkFollowups(tag, originalActor) {
    let candidates = this.allUnits.filter(u => u.isAlive() && u.side === originalActor.side && u !== originalActor);
    candidates.sort((a, b) => { if (a.gridY !== b.gridY) return a.gridY - b.gridY; return a.gridX - b.gridX; });
    for (let unit of candidates) {
      const followupId = unit.skillSlots.followup;
      if (!followupId || !SKILLS[followupId]) continue;
      const sk = SKILLS[followupId];
      if (sk.comboTagIn === tag) {
        const used = unit.followupCounts[sk.id] || 0;
        const max = sk.maxTriggers || 1;
        if (used < max) {
          unit.followupCounts[sk.id] = used + 1; 
          this.triggerFollowupAction(unit, sk, tag);
          break; 
        }
      }
    }
  }

  triggerFollowupAction(actor, skill, tag) {
    const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
    if (targets.length === 0) return;
    const view = this.unitViews.get(actor);
    if (view) {
      this.showFloatText(actor, `⚡追打!`, '#ffcc00');
      this.tweens.add({ targets: view.container, scaleX: 1.3, scaleY: 1.3, duration: 150 / this.speedMultiplier, yoyo: true });
    }
    this.addLog(`⚡ ${actor.name} 发动追打【${skill.name}】`, '#ffcc00');
    this.time.delayedCall(300 / this.speedMultiplier, () => {
      actor.mp = Math.max(0, actor.mp - (skill.mpCost || 0));
      if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
      
      let totalHeal = 0;
      targets.forEach(t => {
        const result = BattleLogic.computeDamage(actor, t, skill);
        if(!result.isMiss) { 
          t.takeDamage(result.damage); 
          if(result.lifestealAmount > 0) totalHeal += result.lifestealAmount;
          this.showDamageNumber(t, result); 
          this.addLog(`${actor.name} 对 ${t.name} 造成了 ${result.damage} 点追打伤害！`, '#ff5555');
          this.updateUnitView(t); 
        }
      });

      if (skill.effects && skill.effects.length > 0) {
        skill.effects.forEach(eff => {
          if (Math.random() > eff.chance) return;
          let effTargets = [];
          if (eff.targetSide === 'sameAsMain' && eff.targetRule === 'sameAsMain') effTargets = targets;
          else {
            let pool = eff.targetSide === 'enemy' ? this.allUnits.filter(u => u.side !== actor.side && u.isAlive()) : (eff.targetSide === 'player' ? this.allUnits.filter(u => u.side === actor.side && u.isAlive()) : [actor]);
            if (eff.targetRule === 'all') effTargets = pool;
            else if (eff.targetRule === 'lowestHp') { const minHp = Math.min(...pool.map(u => u.hp)); effTargets = pool.filter(u => u.hp === minHp); }
            else effTargets = [pool[0]];
          }
          effTargets.forEach(t => {
            if (!t || !t.isAlive()) return;
            if (eff.type === 'heal_pct' || eff.type === 'heal_flat') { const val = eff.type === 'heal_pct' ? Math.round(actor.atk * eff.value) : Math.round(eff.value); t.heal(val); this.showFloatText(t, `+${val}`, '#2ecc71'); }
            else if (eff.type === 'shield_pct' || eff.type === 'shield_flat') { const val = eff.type === 'shield_pct' ? Math.round(actor.atk * eff.value) : Math.round(eff.value); t.addShield(val); this.showFloatText(t, `盾+${val}`, '#dddddd'); }
            else if (eff.type === 'mp') { t.gainMp(eff.value); this.showFloatText(t, `MP +${eff.value}%`, '#88ccff'); }
            else if (eff.type === 'status') { t.addStatus(eff.value); this.showFloatText(t, `+状态`, '#00ffff'); }
            this.updateUnitView(t);
          });
        });
      }

      if (totalHeal > 0) {
        actor.heal(totalHeal);
        this.showFloatText(actor, `+${totalHeal}`, '#2ecc71');
      }
      this.updateUnitView(actor);
    });
  }
  
  showDamageNumber(unit, result, customColor = null) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    const color = customColor || (result.isCrit ? '#ffcc00' : '#ff5555');
    const size = result.isCrit ? '38px' : '26px';
    const label = result.isCrit ? `-${result.damage} 暴击!` : `-${result.damage}`;
    const txt = this.add.text(view.container.x, view.container.y - 70, label, { fontSize: size, color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: txt, y: txt.y - 90, alpha: 0, duration: 900 / this.speedMultiplier, ease: 'Cubic.easeOut', onComplete: () => txt.destroy() });
  }

  showFloatText(unit, text, color) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    const txt = this.add.text(view.container.x, view.container.y - 30, text, { fontSize: '24px', color: color, fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 800 / this.speedMultiplier, onComplete: () => txt.destroy() });
  }

  addLog(text, color = '#ffffff') {
    this.logHistory.unshift({ text, color });
    if (this.logHistory.length > 4) this.logHistory.pop(); 

    this.logTexts.forEach(t => t.destroy());
    this.logTexts = [];

    this.logHistory.forEach((log, index) => {
      const yPos = 645 - (index * 20); 
      const txt = this.add.text(50, yPos, log.text, { fontSize: '16px', color: log.color, stroke: '#000', strokeThickness: 2 });
      txt.setDepth(51); 
      this.logTexts.push(txt);
    });
  }

  updateUnitView(unit) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    
    this.tweens.add({ targets: view.hpBar, scaleX: Math.max(0, unit.hp / unit.maxHp), duration: 300 / this.speedMultiplier });
    view.hpText.setText(`${unit.hp}/${unit.maxHp}`);

    this.tweens.add({ targets: view.mpBar, scaleX: Math.max(0, unit.mp / unit.maxMp), duration: 300 / this.speedMultiplier });
    view.mpText.setText(`${unit.mp}%`);

    if (unit.shield > 0) {
      view.shieldBar.setVisible(true);
      const shieldRatio = Math.min(1, unit.shield / unit.maxHp);
      this.tweens.add({ targets: view.shieldBar, scaleX: shieldRatio, duration: 300 / this.speedMultiplier });
      view.shieldText.setText(`${unit.shield}`);
    } else { 
      view.shieldBar.setVisible(false); 
      view.shieldText.setText('');
    }

    if (unit.statuses.length > 0) {
      const stNames = unit.statuses.map(s => STATUSES[s.id] ? STATUSES[s.id].name.substring(0,1) : '?').join('');
      view.statusText.setText(`[${stNames}]`);
    } else { view.statusText.setText(''); }
    
    if (!unit.isAlive()) { view.emoji.setAlpha(0.25); view.circle.setAlpha(0.25); }
  }
  
  fastForwardBattle() {
    let rounds = 0;
    while (rounds < CONFIG.MAX_ROUNDS) {
      const players = this.allUnits.filter(u => u.side === 'player' && u.isAlive());
      const enemies = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
      if (players.length === 0) { this.scene.start('ResultScene', { type: 'defeat', levelIndex: this.currentLevelIndex }); return; }
      if (enemies.length === 0) { this.scene.start('ResultScene', { type: 'victory', levelIndex: this.currentLevelIndex }); return; }
      
      this.allUnits.forEach(u => { if (u.isAlive()) u.tickStatuses(); });
      this.allUnits.forEach(u => u.applyAura(this.allUnits));
      
      const actionOrder = BattleLogic.buildActionOrder(this.allUnits);
      
      for (let actor of actionOrder) {
        if (!actor.isAlive() || actor.skipTurn) continue; 
        const skill = BattleLogic.chooseSkill(actor, this.allUnits);
        if (!skill) continue;
        const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
        actor.mp = Math.max(0, actor.mp - (skill.mpCost || 0));
        if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
        
        targets.forEach(t => { 
          if (skill.healMultiplier > 0) t.heal(Math.round(actor.atk * skill.healMultiplier));
          else if (skill.shieldMultiplier > 0) t.addShield(Math.round(actor.atk * skill.shieldMultiplier));
          else { const res = BattleLogic.computeDamage(actor, t, skill); if (!res.isMiss) t.takeDamage(res.damage); }
        });
        if(actor.isAlive()) actor.gainMp(10);
        actor.reduceCooldowns();
      }
      rounds++;
    }
    this.scene.start('ResultScene', { type: 'timeout', levelIndex: this.currentLevelIndex });
  }

  endBattle(type) {
    this.battleEnded = true;
    
    const texts = { victory: '战斗胜利!', defeat: '战斗失败...', timeout: '超时失败' };
    const colors = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    
    const titleObj = this.add.text(CONFIG.WIDTH / 2, 250, texts[type], { fontSize: '60px', color: colors[type], fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: titleObj, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: -1, duration: 800 });

    const contBtn = this.add.text(CONFIG.WIDTH / 2, 450, '👉 点击继续', { fontSize: '28px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 30, y: 15 } }).setOrigin(0.5).setInteractive().setDepth(201);
    contBtn.on('pointerdown', () => {
      this.scene.start('ResultScene', { type: type, levelIndex: this.currentLevelIndex });
    });
  }
}

// ==========================================
// 场景 3：结算场景
// ==========================================
class ResultScene extends Phaser.Scene {
  constructor() { super('ResultScene'); }
  init(data) { this.resultType = data.type; this.currentLevelIndex = data.levelIndex || 0; }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const texts = { victory: '战斗胜利!', defeat: '战斗失败...', timeout: '超时失败' };
    const colors = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, texts[this.resultType], { fontSize: '80px', color: colors[this.resultType], fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    
    let btnText = '🔄 重新挑战';
    let btnAction = () => { this.scene.start('FormationScene', { levelIndex: this.currentLevelIndex }); };

    if (this.resultType === 'victory') {
      const level = LEVELS[this.currentLevelIndex];
      if (level && level.rewardItemId && ITEMS[level.rewardItemId]) {
        const inst = generateRandomInstance(level.rewardItemId);
        if (inst) {
          INVENTORY.push(inst);
          localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
          const qColors = { white: '#ffffff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
          this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, `获得掉落：`, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
          this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 30, `${ITEMS[inst.itemId].name}`, { fontSize: '36px', color: qColors[inst.quality] || '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        }
      }
      if (this.currentLevelIndex < LEVELS.length - 1) {
        btnText = '➡️ 进入下一关';
        btnAction = () => { this.scene.start('FormationScene', { levelIndex: this.currentLevelIndex + 1 }); };
      }
    }

    const btn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 150, btnText, { fontSize: '36px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 40, y: 20 } }).setOrigin(0.5).setInteractive();
    btn.on('pointerdown', btnAction);
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'my_game_data_v18') {
    const confirmReload = confirm("检测到编辑器数据更新，是否立即刷新游戏查看效果？");
    if (confirmReload) window.location.reload();
  }
});

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#0f0f1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
  scene: [FormationScene, BattleScene, TeamScene, ResultScene],
});
