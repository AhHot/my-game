// ==========================================
// 读取同步数据
// ==========================================
if (localStorage.getItem('my_game_characters')) {
  try {
    const localData = JSON.parse(localStorage.getItem('my_game_characters'));
    if (Array.isArray(localData) && localData.length > 0) {
      CHARACTERS.length = 0; 
      CHARACTERS.push(...localData);
    }
  } catch(e) { console.error('读取本地数据失败', e); }
}

// ==========================================
// 纯逻辑层：战斗单位与伤害计算
// ==========================================
class Unit {
  constructor(data) {
    Object.assign(this, data);
    this.skills = [...data.skills];
    this.hp = this.maxHp;
    this.mp = Math.floor(this.maxMp * CONFIG.START_MP_RATIO);
  }
  isAlive() { return this.hp > 0; }
  gainMp() { this.mp = Math.min(this.maxMp, this.mp + this.mpPerAttack); }
  takeDamage(dmg) { this.hp = Math.max(0, this.hp - dmg); }
}

const BattleLogic = {
  getElementMultiplier(atkElement, defElement) {
    const atk = ELEMENTS[atkElement];
    if (!atk) return 1.0;
    if (atk.beats === defElement) return CONFIG.ADVANTAGE_MULT;
    if (atk.weak === defElement) return CONFIG.DISADVANTAGE_MULT;
    return 1.0;
  },
  selectTargets(actor, skill, allUnits) {
    const enemies = allUnits.filter(u => u.side !== actor.side && u.isAlive());
    if (enemies.length === 0) return [];
    if (skill.targetRule === 'frontRow') {
      const minY = Math.min(...enemies.map(u => u.gridY));
      return enemies.filter(u => u.gridY === minY);
    } else if (skill.targetRule === 'lowestHp') {
      const minHp = Math.min(...enemies.map(u => u.hp));
      return enemies.filter(u => u.hp === minHp);
    } else if (skill.targetRule === 'random') {
      return [enemies[Math.floor(Math.random() * enemies.length)]];
    }
    return [enemies[0]];
  },
  computeDamage(actor, target, skill) {
    let base = actor.atk * skill.multiplier;
    const elemMult = this.getElementMultiplier(skill.element, target.element);
    base *= elemMult;
    const isCrit = Math.random() < actor.critRate;
    if (isCrit) base *= actor.critDmg;
    const finalDamage = Math.max(base - target.def * 0.5, base * 0.1);
    return { damage: Math.round(finalDamage), isCrit, elemMult };
  },
  chooseSkill(actor) {
    const usable = actor.skills.map(id => SKILLS[id]).filter(sk => sk && actor.mp >= (sk.cost?.mp || 0) && (actor.rage || 0) >= (sk.cost?.rage || 0));
    if (usable.length === 0) return SKILLS[actor.skills[0]];
    usable.sort((a, b) => b.multiplier - a.multiplier);
    return usable[0];
  },
  buildActionOrder(units) {
    return [...units].filter(u => u.isAlive()).sort((a, b) => b.speed - a.speed);
  }
};

// ==========================================
// 场景 1：战前布阵（重构版）
// ==========================================
class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE;
    const gridW = cell * CONFIG.GRID_SIZE;
    
    // 布局参数：上方上阵区，下方待命区
    const gridLeft = (CONFIG.WIDTH - gridW) / 2;
    const gridTop = 180;
    const standbyTop = 680; // 待命区整体靠下

    // 强刷按钮
    const refreshBtn = this.add.text(CONFIG.WIDTH - 20, 20, '🔄 强刷更新', { 
      fontSize: '20px', color: '#ffffff', backgroundColor: '#e74c3c', padding: { x: 10, y: 5 } 
    }).setOrigin(1, 0).setInteractive();
    refreshBtn.on('pointerdown', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.href;
    });

    this.add.text(CONFIG.WIDTH / 2, 60, '战前布阵', { fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 120, '从下方待命区拖入上方网格 (最多5人)\n拖回下方即可下阵', { fontSize: '20px', color: '#aaaaaa', align: 'center' }).setOrigin(0.5);

    // 1. 画上阵网格
    const g = this.add.graphics();
    g.lineStyle(2, 0x3498DB, 0.5);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      g.lineBetween(gridLeft, gridTop + i * cell, gridLeft + gridW, gridTop + i * cell);
      g.lineBetween(gridLeft + i * cell, gridTop, gridLeft + i * cell, gridTop + gridW);
    }

    // 2. 画待命区背景（加高了高度，防止超出）
    const standbyBg = this.add.graphics();
    standbyBg.fillStyle(0x16213e, 0.8);
    standbyBg.fillRoundedRect(20, standbyTop - 20, CONFIG.WIDTH - 40, 300, 10); // 高度改为 300
    standbyBg.lineStyle(2, 0x3498DB, 0.5);
    standbyBg.strokeRoundedRect(20, standbyTop - 20, CONFIG.WIDTH - 40, 300, 10);

    // 3. 画开始按钮
    const startBtn = this.add.text(CONFIG.WIDTH / 2, 1180, '⚔️ 开始战斗', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => { 
      const players = CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1);
      if (players.length === 0) { alert("至少需要上阵1名角色！"); return; }
      this.scene.start('BattleScene'); 
    });

    // 4. 初始化
    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));
    const playerChars = CHARACTERS.filter(c => c.side === 'player');
    
    // ★ 修复2：强制所有角色初始在待命区（防止旧数据导致默认在场上）
    playerChars.forEach(data => {
      data.gridX = -1; 
      data.gridY = -1; 
    });

    this.unitContainers = [];
    
    // 5. 生成角色 UI
    playerChars.forEach(data => {
      // 初始位置都在待命区
      const container = this.add.container(0, 0);
      
      const circle = this.add.circle(0, 0, 42, ELEMENTS[data.element].color).setStrokeStyle(3, 0xffffff, 0.9);
      const emoji = this.add.text(0, 0, data.emoji, { fontSize: '48px' }).setOrigin(0.5);
      const nameText = this.add.text(0, 50, data.name, { fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      
      container.add([circle, emoji, nameText]);
      container.setSize(80, 80); 
      container.setInteractive({ draggable: true });
      this.input.setDraggable(container);
      
      container.unitData = data; 
      container.isOnGrid = false;
      this.unitContainers.push(container);

      // --- 拖拽事件 ---
      container.on('dragstart', () => {
        // 如果它原来在网格上，腾出位置
        if (container.isOnGrid) {
          this.gridState[data.gridX][data.gridY] = null;
        }
        container.setDepth(100); 
      });

      container.on('drag', (pointer, dragX, dragY) => {
        container.x = dragX; container.y = dragY;
      });

      container.on('dragend', () => {
        container.setDepth(0); 
        let col = Math.floor((container.x - gridLeft) / cell);
        let row = Math.floor((container.y - gridTop) / cell);

        // 判断松手在哪
        if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
          // ★ 落在网格内
          const targetUnitData = this.gridState[col][row];
          
          if (targetUnitData && targetUnitData !== data) {
            // 情况 A：目标格已经有人
            if (container.isOnGrid) {
              // 原本就在网格，两者互换位置
              const oldCol = data.gridX;
              const oldRow = data.gridY;
              
              targetUnitData.gridX = oldCol;
              targetUnitData.gridY = oldRow;
              this.gridState[oldCol][oldRow] = targetUnitData;
              
              const targetContainer = this.unitContainers.find(c => c.unitData === targetUnitData);
              targetContainer.x = gridLeft + oldCol * cell + cell / 2;
              targetContainer.y = gridTop + oldRow * cell + cell / 2;
            } else {
              // ★ 修复3：从待命区拖上来，把人挤回待命区
              targetUnitData.gridX = -1;
              targetUnitData.gridY = -1;
              const targetContainer = this.unitContainers.find(c => c.unitData === targetUnitData);
              targetContainer.isOnGrid = false;
            }
          }

          // 自己正式落入网格
          data.gridX = col; data.gridY = row;
          this.gridState[col][row] = data;
          container.x = gridLeft + col * cell + cell / 2;
          container.y = gridTop + row * cell + cell / 2;
          container.isOnGrid = true;

        } else {
          // ★ 落在网格外（回待命区）
          data.gridX = -1; data.gridY = -1;
          container.isOnGrid = false;
        }

        // 无论怎么拖，最后都重新整理一次下方待命区的排列
        this.layoutStandby(standbyTop);
      });
    });

    // 首次布局
    this.layoutStandby(standbyTop);
  }

  // 核心：重新整理待命区，按顺序排列，绝对不重叠，且完全在框内
  layoutStandby(standbyTop) {
    const standbyContainers = this.unitContainers.filter(c => !c.isOnGrid);
    const cols = 4; // 每行4个
    const cellW = 140; // 横向间距
    const cellH = 120; // 纵向间距
    const startX = (CONFIG.WIDTH - (cols - 1) * cellW) / 2;
    
    standbyContainers.forEach((container, index) => {
      const cCol = index % cols;
      const cRow = Math.floor(index / cols);
      
      const targetX = startX + cCol * cellW;
      // ★ 修复1：调整纵向起始位置，让角色框完全在待命区背景内
      const targetY = standbyTop + 50 + cRow * cellH; 
      
      this.tweens.add({
        targets: container,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: 'Cubic.easeOut'
      });
    });
  }
}

// ==========================================
// 场景 2：战斗表现 (保持不变)
// ==========================================
class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene'); }
  create() {
    this.allUnits = [];
    this.unitViews = new Map();
    this.drawBattlefield();
    
    const activeFighters = CHARACTERS.filter(c => c.gridX !== -1);
    
    activeFighters.forEach(data => {
      const unit = new Unit(data); 
      this.allUnits.push(unit);
      this.createUnitView(unit);
    });
    this.roundText = this.add.text(CONFIG.WIDTH / 2, 24, '第 1 回合', { fontSize: '30px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.logText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, '', { fontSize: '22px', color: '#ffffff', align: 'center', wordWrap: { width: CONFIG.WIDTH - 100 } }).setOrigin(0.5);
    this.time.delayedCall(800, () => this.startBattle());
  }
  drawBattlefield() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE;
    const gridW = cell * CONFIG.GRID_SIZE;
    const gridLeft = (CONFIG.WIDTH - gridW) / 2;
    this.drawGrid(gridLeft, 70, cell, 0xE74C3C, 0.2);
    this.drawGrid(gridLeft, 700, cell, 0x3498DB, 0.2);
    this.add.rectangle(CONFIG.WIDTH / 2, 620, CONFIG.WIDTH - 100, 2, 0xffffff, 0.15);
    this.add.text(gridLeft + gridW + 10, 74, '敌方', { fontSize: '20px', color: '#E74C3C' });
    this.add.text(gridLeft + gridW + 10, 704, '我方', { fontSize: '20px', color: '#3498DB' });
  }
  drawGrid(x, y, cell, color, alpha) {
    const g = this.add.graphics();
    g.lineStyle(2, color, alpha);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      g.lineBetween(x, y + i * cell, x + CONFIG.GRID_SIZE * cell, y + i * cell);
      g.lineBetween(x + i * cell, y, x + i * cell, y + CONFIG.GRID_SIZE * cell);
    }
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
    container.add([circle, emoji, nameText, hpBg, hpBar, mpBg, mpBar]);
    this.unitViews.set(unit, { container, circle, emoji, hpBar, mpBar });
    this.updateUnitView(unit);
  }
  getUnitScreenPosition(unit) {
    const cell = CONFIG.CELL_SIZE;
    const gridW = cell * CONFIG.GRID_SIZE;
    const gridLeft = (CONFIG.WIDTH - gridW) / 2;
    let x = gridLeft + unit.gridX * cell + cell / 2;
    let y = unit.side === 'enemy' ? 70 + (CONFIG.GRID_SIZE - 1 - unit.gridY) * cell + cell / 2 : 700 + unit.gridY * cell + cell / 2;
    return { x, y };
  }
  startBattle() {
    this.round = 1;
    this.actionOrder = BattleLogic.buildActionOrder(this.allUnits);
    this.actionIndex = 0;
    this.nextAction();
  }
  nextAction() {
    const players = this.allUnits.filter(u => u.side === 'player' && u.isAlive());
    const enemies = this.allUnits.filter(u => u.side === 'enemy' && u.isAlive());
    if (players.length === 0) return this.showResult('defeat');
    if (enemies.length === 0) return this.showResult('victory');
    if (this.round > CONFIG.MAX_ROUNDS) return this.showResult('timeout');
    if (this.actionIndex >= this.actionOrder.length) {
      this.round++;
      this.roundText.setText(`第 ${this.round} 回合`);
      this.actionOrder = BattleLogic.buildActionOrder(this.allUnits);
      this.actionIndex = 0;
      this.time.delayedCall(600, () => this.nextAction());
      return;
    }
    const actor = this.actionOrder[this.actionIndex++];
    if (!actor.isAlive()) return this.time.delayedCall(80, () => this.nextAction());
    this.executeAction(actor);
  }
  executeAction(actor) {
    const skill = BattleLogic.chooseSkill(actor);
    const targets = BattleLogic.selectTargets(actor, skill, this.allUnits);
    if (targets.length === 0) return this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction());
    const view = this.unitViews.get(actor);
    if (view) this.tweens.add({ targets: view.container, scaleX: 1.2, scaleY: 1.2, duration: 150, yoyo: true });
    this.logText.setText(`${actor.name} 使用了【${skill.name}】`);

    this.time.delayedCall(450, () => {
      actor.mp = Math.max(0, actor.mp - (skill.cost?.mp || 0));
      targets.forEach(t => {
        const result = BattleLogic.computeDamage(actor, t, skill);
        t.takeDamage(result.damage);
        const tView = this.unitViews.get(t);
        if (tView) {
          const color = result.isCrit ? '#ffcc00' : '#ff5555';
          const size = result.isCrit ? '38px' : '26px';
          const label = result.isCrit ? `-${result.damage} 暴击!` : `-${result.damage}`;
          const txt = this.add.text(tView.container.x, tView.container.y - 70, label, { fontSize: size, color: color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 }).setOrigin(0.5);
          this.tweens.add({ targets: txt, y: txt.y - 90, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => txt.destroy() });
        }
        this.updateUnitView(t);
      });
      actor.gainMp();
      this.updateUnitView(actor);
      this.time.delayedCall(CONFIG.ACTION_DELAY, () => this.nextAction());
    });
  }
  updateUnitView(unit) {
    const view = this.unitViews.get(unit);
    if (!view) return;
    this.tweens.add({ targets: view.hpBar, scaleX: Math.max(0, unit.hp / unit.maxHp), duration: 300 });
    this.tweens.add({ targets: view.mpBar, scaleX: Math.max(0, unit.mp / unit.maxMp), duration: 300 });
    if (!unit.isAlive()) { view.emoji.setAlpha(0.25); view.circle.setAlpha(0.25); }
  }
  showResult(type) {
    const texts = { victory: '胜 利 !', defeat: '失 败...', timeout: '超时失败' };
    const colors = { victory: '#2ECC71', defeat: '#E74C3C', timeout: '#E67E22' };
    this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.75);
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, texts[type], { fontSize: '90px', color: colors[type], fontStyle: 'bold', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
    const detail = type === 'timeout' ? `已超过 ${CONFIG.MAX_ROUNDS} 回合上限` : `共进行 ${this.round} 回合`;
    this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 30, detail, { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
    const btn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 150, '🔄 重新布阵', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 22 } }).setOrigin(0.5).setInteractive();
    btn.on('pointerdown', () => { this.scene.start('FormationScene'); });
  }
}

// ==========================================
// 启动游戏
// ==========================================
new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#0f0f1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: CONFIG.WIDTH, height: CONFIG.HEIGHT },
  scene: [FormationScene, BattleScene],
});
