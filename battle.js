// ==========================================
// 读取同步数据
// ==========================================
if (typeof STATUSES === 'undefined') { window.STATUSES = {}; }

if (localStorage.getItem('my_game_characters')) { try { const d = JSON.parse(localStorage.getItem('my_game_characters')); if (Array.isArray(d) && d.length) { CHARACTERS.length=0; CHARACTERS.push(...d); } } catch(e){} }
if (localStorage.getItem('my_game_skills_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_skills_sync')); if (Array.isArray(d) && d.length) { Object.keys(SKILLS).forEach(k=>delete SKILLS[k]); d.forEach(sk => SKILLS[sk.id]={...sk}); } } catch(e){} }
if (localStorage.getItem('my_game_statuses_sync')) { try { const d = JSON.parse(localStorage.getItem('my_game_statuses_sync')); if (Array.isArray(d) && d.length) { Object.keys(STATUSES).forEach(k=>delete STATUSES[k]); d.forEach(st => STATUSES[st.id]={...st}); } } catch(e){} }

// ==========================================
// 纯逻辑层：战斗单位与伤害计算
// ==========================================
class Unit {
  constructor(data) {
    Object.assign(this, data);
    if (!this.skillSlots) this.skillSlots = { normal: '', skill: '', ultimate: '', learned: '' };
    this.baseAtk = this.atk || 10; this.baseDef = this.def || 10; this.baseSpeed = this.speed || 10;
    Object.values(this.skillSlots).forEach(skId => {
      if (!skId || !SKILLS[skId]) return;
      const sk = SKILLS[skId];
      if (sk.type === 'passive') {
        if (sk.passiveType === 'atkAdd') { this.atk += sk.passiveValue; this.baseAtk += sk.passiveValue; }
        if (sk.passiveType === 'hpAdd') this.maxHp += sk.passiveValue;
        if (sk.passiveType === 'defAdd') { this.def += sk.passiveValue; this.baseDef += sk.passiveValue; }
        if (sk.passiveType === 'speedAdd') { this.speed += sk.passiveValue; this.baseSpeed += sk.passiveValue; }
      }
    });
    this.hp = this.maxHp; this.mp = Math.floor((this.maxMp || 50) * CONFIG.START_MP_RATIO);
    this.cooldowns = {}; this.statuses = []; 
  }
  isAlive() { return this.hp > 0; }
  gainMp() { this.mp = Math.min(this.maxMp, this.mp + this.mpPerAttack); }
  takeDamage(dmg) { this.hp = Math.max(0, this.hp - dmg); }
  reduceCooldowns() { for (let key in this.cooldowns) { if (this.cooldowns[key] > 0) this.cooldowns[key]--; } }
  refreshStats() {
    this.atk = this.baseAtk; this.def = this.baseDef; this.speed = this.baseSpeed;
    this.statuses.forEach(st => {
      const config = STATUSES[st.id]; if (!config) return;
      if (config.statMod === 'atk') this.atk += config.statValue;
      if (config.statMod === 'def') this.def += config.statValue;
      if (config.statMod === 'speed') this.speed += config.statValue;
    });
    this.atk = Math.max(1, this.atk); this.def = Math.max(0, this.def); this.speed = Math.max(1, this.speed);
  }
  tickStatuses() {
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const st = this.statuses[i]; const config = STATUSES[st.id];
      if (config && config.isDot && config.dotValue > 0) this.takeDamage(config.dotValue); 
      st.duration--; if (st.duration <= 0) this.statuses.splice(i, 1); 
    }
    this.refreshStats(); 
  }
  addStatus(statusId) {
    if (!statusId || !STATUSES[statusId]) return;
    const existing = this.statuses.find(s => s.id === statusId);
    if (existing) existing.duration = STATUSES[statusId].duration; 
    else this.statuses.push({ id: statusId, duration: STATUSES[statusId].duration });
    this.refreshStats();
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
    const enemies = allUnits.filter(u => u.side !== actor.side && u.isAlive());
    if (enemies.length === 0) return [];
    if (skill.targetRule === 'frontRow') { const minY = Math.min(...enemies.map(u => u.gridY)); return enemies.filter(u => u.gridY === minY); }
    else if (skill.targetRule === 'lowestHp') { const minHp = Math.min(...enemies.map(u => u.hp)); return enemies.filter(u => u.hp === minHp); }
    else if (skill.targetRule === 'random') { return [enemies[Math.floor(Math.random() * enemies.length)]]; }
    return [enemies[0]];
  },
  computeDamage(actor, target, skill) {
    let base = actor.atk * skill.multiplier;
    const elemMult = this.getElementMultiplier(skill.element, target.element); base *= elemMult;
    const isCrit = Math.random() < actor.critRate; if (isCrit) base *= actor.critDmg;
    const finalDamage = Math.max(base - target.def * 0.5, base * 0.1);
    return { damage: Math.round(finalDamage), isCrit, elemMult };
  },
  chooseSkill(actor) {
    const slots = actor.skillSlots || {};
    const availableSkills = Object.values(slots).filter(id => id && SKILLS[id] && SKILLS[id].type !== 'passive').map(id => SKILLS[id]);
    const usable = availableSkills.filter(sk => { const cd = actor.cooldowns[sk.id] || 0; return actor.mp >= (sk.cost?.mp || 0) && cd <= 0; });
    const typeWeight = { ultimate: 3, skill: 2, normal: 1 };
    usable.sort((a, b) => (typeWeight[b.type] || 0) - (typeWeight[a.type] || 0));
    if (usable.length > 0) return usable[0];
    const fallbackSkill = Object.values(SKILLS).find(s => s.type === 'normal');
    if (fallbackSkill) return fallbackSkill;
    return { id: 'default_atk', name: '普通攻击', type: 'normal', multiplier: 1, cost: {mp: 0}, targetRule: 'frontRow', element: 'fire' };
  },
  buildActionOrder(units) { return [...units].filter(u => u.isAlive()).sort((a, b) => b.speed - a.speed); }
};

// ==========================================
// 场景 1：战前布阵
// ==========================================
class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE;
    const gridLeft = (CONFIG.WIDTH - gridW) / 2, gridTop = 180, standbyTop = 680; 

    this.add.text(10, 10, '版本: v2.0.1', { fontSize: '16px', color: '#00ff00' });
    
    // ★ 修改：把编辑器和强刷按钮并排放在右上角，绝对不会被遮挡
    const editBtn = this.add.text(CONFIG.WIDTH - 120, 20, '⚙️ 编辑器', { fontSize: '18px', color: '#ffffff', backgroundColor: '#3498db', padding: { x: 10, y: 5 } }).setOrigin(0, 0).setInteractive();
    editBtn.on('pointerdown', () => { window.location.href = 'editor.html'; });

    const refreshBtn = this.add.text(CONFIG.WIDTH - 10, 20, '🔄 强刷', { fontSize: '18px', color: '#ffffff', backgroundColor: '#e74c3c', padding: { x: 10, y: 5 } }).setOrigin(1, 0).setInteractive();
    refreshBtn.on('pointerdown', () => { const url = new URL(window.location.href); url.searchParams.set('t', Date.now().toString()); window.location.href = url.href; });

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
      this.scene.start('BattleScene'); 
    });

    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));
    const playerChars = CHARACTERS.filter(c => c.side === 'player');
    playerChars.forEach(data => { data.gridX = -1; data.gridY = -1; });

    this.unitContainers = [];
    playerChars.forEach(data => {
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
  create() {
    this.allUnits = []; this.unitViews = new Map(); this.drawBattlefield();
    
    let enemyCount = 0;
    CHARACTERS.filter(c => c.side === 'enemy').forEach(enemy => {
      if (enemy.gridX === -1 || enemy.gridX === undefined) { enemy.gridX = enemyCount % CONFIG.GRID_SIZE; enemy.gridY = Math.floor(enemyCount / CONFIG.GRID_SIZE); }
      enemyCount++;
    });
    if (enemyCount === 0) CHARACTERS.push({ id: 'e_fallback', name: '木桩', side: 'enemy', emoji: '🪵', element: 'fire', maxHp: 500, atk: 10, def: 10, speed: 5, critRate: 0, critDmg: 1, maxMp: 0, mpPerAttack: 0, gridX: 1, gridY: 0, skillSlots: { normal: '', skill: '', ultimate: '', learned: '' } });

    const activeFighters = CHARACTERS.filter(c => c.side === 'enemy' || (c.side === 'player' && c.gridX !== -1));
    activeFighters.forEach(data => { const unit = new Unit(data); this.allUnits.push(unit); this.createUnitView(unit); });
    
    this.roundText = this.add.text(CONFIG.WIDTH / 2, 24, '第 1 回合', { fontSize: '30px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.logText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, '', { fontSize: '22px', color: '#ffffff', align: 'center', wordWrap: { width: CONFIG.WIDTH - 100 } }).setOrigin(0.5);
    this.time.delayedCall(800, () => this.startBattle());
  }
  drawBattlefield() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE, gridLeft = (CONFIG.WIDTH - gridW) / 2;
    this.drawGrid(gridLeft, 70, cell, 0xE74C3C, 0.2); this.drawGrid(gridLeft, 700, cell, 0x3498DB, 0.2);
    this.add.rectangle(CONFIG.WIDTH / 2, 620, CONFIG.WIDTH - 100, 2, 0xffffff, 0.15);
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
    const circle = this.add.circle(0, 0, 42, ELEMENTS[unit.element].color).setStrokeStyle(3, 0xffffff, 0.9);
    const emoji = this.add.text(0, 0, unit.emoji, { fontSize: '48px' }).setOrigin(0.5);
    const nameText = this.add.text(0, 50, unit.name, { fontSize: '18px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    const hpBg = this.add.rectangle(0, 72, 90, 10, 0x000000, 0.8).setStrokeStyle(1, 0xffffff, 0.4);
    const hpBar = this.add.rectangle(-45, 72, 90, 8, 0x2ECC71).setOrigin(0, 0.5);
    const mpBg = this.add.rectangle(0, 82, 90, 5, 0x000000, 0.8);
    const mpBar = this.add.rectangle(-45, 82, 90, 4, 0x3498DB).setOrigin(0, 0.5);
    const statusText = this.add.text(0, -55, '', { fontSize: '14px', color: '#ffcc00', stroke: '#000', strokeThickness: 2, align: 'center' }).setOrigin(0.5);

    container.add([circle, emoji, nameText, hpBg, hpBar, mpBg, mpBar, statusText]);
    this.unitViews.set(unit, { container, circle, emoji, hpBar, mpBar, statusText });
    this.updateUnitView(unit);
  }
  getUnitScreenPosition(unit) {
    const cell = CONFIG.CELL_SIZE, gridW = cell * CONFIG.GRID_SIZE, gridLeft = (CONFIG.WIDTH - gridW) / 2;
    let x = gridLeft + unit.gridX * cell + cell / 2;
    let y = unit.side === 'enemy' ? 70 + (CONFIG.GRID_SIZE - 1 - unit.gridY) * cell + cell / 2 : 700 + unit.gridY * cell + cell / 2;
    return { x, y };
  }
  startBattle() { this.round = 1; this.actionOrder = BattleLogic.buildActionOrder(this.allUnits); this.actionIndex = 0; this.nextAction(); }
  
  nextAction() {
    const players = this.allUnits.filter(u => u.side === 'player' && u.isAlive());
    const enemies = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
    if (players.length === 0) return this.showResult('defeat');
    if (enemies.length === 0) return this.showResult('victory');
    if (this.round > CONFIG.MAX_ROUNDS) return this.showResult('timeout');
    
    if (this.actionIndex >= this.actionOrder.length) {
      this.round++;
      this.roundText.setText(`第 ${this.round} 回合`);
      
      this.allUnits.forEach(u => {
        if (!u.isAlive()) return;
        const oldHp = u.hp;
        u.tickStatuses(); 
        if (u.hp < oldHp) this.showDamageNumber(u, { damage: oldHp - u.hp, isCrit: false }, '#ff00ff'); 
        this.updateUnitView(u);
      });

      if (this.allUnits.filter(u => u.side === 'player' && u.isAlive()).length === 0) return this.showResult('defeat');
      if (this.allUnits.filter(u => u.side === 'enemy' && u.isAlive()).length === 0) return this.showResult('victory');

      this.actionOrder = BattleLogic.buildActionOrder(this.allUnits);
      this.actionIndex = 0;
      this.time.delayedCall(800, () => this.nextAction());
      return;
    }
    
    const actor = this.actionOrder[this.actionIndex++];
    if (!actor.isAlive()) return this.time.delayedCall(80, () => this.nextAction());
    this.executeAction(actor);
  }
  
  executeAction(actor) {
    const skill = BattleLogic.chooseSkill(actor);
    if (!skill) return this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction()); 
    const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
    if (targets.length === 0) return this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction());
    
    const view = this.unitViews.get(actor);
    if (view) this.tweens.add({ targets: view.container, scaleX: 1.2, scaleY: 1.2, duration: 150, yoyo: true });
    
    const isUlt = skill.type === 'ultimate';
    this.logText.setText(`${actor.name} 使用了【${skill.name}】`).setColor(isUlt ? '#e74c3c' : '#ffffff');

    this.time.delayedCall(450, () => {
      actor.mp = Math.max(0, actor.mp - (skill.cost?.mp || 0));
      if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;

      targets.forEach(t => {
        const result = BattleLogic.computeDamage(actor, t, skill);
        t.takeDamage(result.damage);
        
        if (skill.statusId && skill.statusChance > 0) {
          if (Math.random() * 100 < skill.statusChance && STATUSES[skill.statusId]) {
            t.addStatus(skill.statusId);
            const tView = this.unitViews.get(t);
            if (tView) {
              const stName = STATUSES[skill.statusId].name;
              const txt = this.add.text(tView.container.x, tView.container.y - 40, `+${stName}`, { fontSize: '18px', color: '#00ffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
              this.tweens.add({ targets: txt, y: txt.y - 60, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            }
          }
        }

        this.showDamageNumber(t, result);
        this.updateUnitView(t);
      });
      
      actor.gainMp();
      actor.reduceCooldowns();
      this.updateUnitView(actor);
      this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction());
    });
  }
  
  showDamageNumber(unit, result, customColor = null) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    const color = customColor || (result.isCrit ? '#ffcc00' : '#ff5555');
    const size = result.isCrit ? '38px' : '26px';
    const label = result.isCrit ? `-${result.damage} 暴击!` : `-${result.damage}`;
    const txt = this.add.text(view.container.x, view.container.y - 70, label, { fontSize: size, color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: txt.y - 90, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => txt.destroy() });
  }

  updateUnitView(unit) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    this.tweens.add({ targets: view.hpBar, scaleX: Math.max(0, unit.hp / unit.maxHp), duration: 300 });
    this.tweens.add({ targets: view.mpBar, scaleX: Math.max(0, unit.mp / unit.maxMp), duration: 300 });
    
    if (unit.statuses.length > 0) {
      const stNames = unit.statuses.map(s => STATUSES[s.id] ? STATUSES[s.id].name.substring(0,1) : '?').join('');
      view.statusText.setText(`[${stNames}]`);
    } else { view.statusText.setText(''); }
    if (!unit.isAlive()) { view.emoji.setAlpha(0.25); view.circle.setAlpha(0.25); }
  }
  
  showResult(type) {
    const texts = { victory: '胜 利 !', defeat: '失 败...', timeout: '超时失败' };
    const colors = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.75);
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, texts[type], { fontSize: '90px', color: colors[type], fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, `共进行 ${this.round} 回合`, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    const btn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 150, '🔄 重新布阵', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 22 } }).setOrigin(0.5).setInteractive();
    btn.on('pointerdown', () => { this.scene.start('FormationScene'); });
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'my_game_data_v4') {
    const confirmReload = confirm("检测到编辑器数据更新，是否立即刷新游戏查看效果？");
    if (confirmReload) window.location.reload();
  }
});

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#0f0f1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
  scene: [FormationScene, BattleScene],
});
