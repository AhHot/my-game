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
// 场景 1：战前布阵（修复重叠与待命区逻辑）
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
    const standbyTop = 700;

    this.add.text(CONFIG.WIDTH / 2, 60, '战前布阵', { fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 120, '从下方待命区拖入上方网格 (最多5人)\n拖回下方即可下阵', { fontSize: '20px', color: '#aaaaaa', align: 'center' }).setOrigin(0.5);

    // 1. 画上阵网格
    const g = this.add.graphics();
    g.lineStyle(2, 0x3498DB, 0.5);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      g.lineBetween(gridLeft, gridTop + i * cell, gridLeft + gridW, gridTop + i * cell);
      g.lineBetween(gridLeft + i * cell, gridTop, gridLeft + i * cell, gridTop + gridW);
    }

    // 2. 画待命区背景
    const standbyBg = this.add.graphics();
    standbyBg.fillStyle(0x16213e, 0.8);
    standbyBg.fillRoundedRect(20, standbyTop - 30, CONFIG.WIDTH - 40, 260, 10);
    standbyBg.lineStyle(2, 0x3498DB, 0.5);
    standbyBg.strokeRoundedRect(20, standbyTop - 30, CONFIG.WIDTH - 40, 260, 10);

    // 3. 画开始按钮
    const startBtn = this.add.text(CONFIG.WIDTH / 2, 1150, '⚔️ 开始战斗', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => { 
      const players = CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1);
      if (players.length === 0) { alert("至少需要上阵1名角色！"); return; }
      this.scene.start('BattleScene'); 
    });

    // 4. 初始化网格状态
    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));
    
    // 获取所有玩家角色
    const playerChars = CHARACTERS.filter(c => c.side === 'player');
    
    // 5. 校验初始数据，解决数据遗留的“重叠”问题
    playerChars.forEach(data => {
      if (data.gridX !== -1 && data.gridX !== undefined && data.gridY !== -1 && data.gridY !== undefined) {
        if (this.gridState[data.gridX][data.gridY]) {
          // 该格子已经有人了，当前角色退回待命区
          data.gridX = -1; data.gridY = -1; 
        } else {
          this.gridState[data.gridX][data.gridY] = data;
        }
      } else {
        data.gridX = -1; data.gridY = -1; // 确保非法数据变为待命状态
      }
    });

    // 6. 生成角色 UI
    this.unitContainers = [];
    playerChars.forEach(data => {
      let pos;
      if (data.gridX === -1) {
        pos = { x: 0, y: 0 }; // 临时位置，稍后整理
      } else {
        pos = { x: gridLeft + data.gridX * cell + cell / 2, y: gridTop + data.gridY * cell + cell / 2 };
      }

      const container = this.add.container(pos.x, pos.y);
      
      const circle = this.add.circle(0, 0, 42, ELEMENTS[data.element].color).setStrokeStyle(3, 0xffffff, 0.9);
      const emoji = this.add.text(0, 0, data.emoji, { fontSize: '48px' }).setOrigin(0.5);
      const nameText = this.add.text(0, 50, data.name, { fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      
      container.add([circle, emoji, nameText]);
      container.setSize(80, 80); 
      container.setInteractive({ draggable: true });
      this.input.setDraggable(container);
      
      container.unitData = data; 
      container.isOnGrid = data.gridX !== -1;
      container.startCol = data.gridX;
      container.startRow = data.gridY;
      this.unitContainers.push(container);

      // --- 拖拽事件 ---
      container.on('dragstart', () => {
        if (container.isOnGrid) {
          this.gridState[container.startCol][container.startRow] = null;
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

        // 判断是否落在上阵网格内
        if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
          const targetUnit = this.gridState[col][row];
          
          if (targetUnit) {
            if (container.isOnGrid) {
              // 情况 A：网格内互换位置
              targetUnit.gridX = container.startCol; targetUnit.gridY = container.startRow;
              this.gridState[container.startCol][container.startRow] = targetUnit;
              
              const targetContainer = this.unitContainers.find(c => c.unitData === targetUnit);
              targetContainer.x = gridLeft + targetUnit.gridX * cell + cell / 2;
              targetContainer.y = gridTop + targetUnit.gridY * cell + cell / 2;
              targetContainer.startCol = targetUnit.gridX;
              targetContainer.startRow = targetUnit.gridY;
            } else {
              // 情况 B：从待命区拖到已占用的格子，拒绝，退回待命区
              this.revertToStandby(container, standbyTop);
              this.layoutStandby(standbyTop);
              return;
            }
          }

          // 正式落地
          data.gridX = col; data.gridY = row;
          this.gridState[col][row] = data;
          container.x = gridLeft + col * cell + cell / 2;
          container.y = gridTop + row * cell + cell / 2;
          container.isOnGrid = true;
          container.startCol = col;
          container.startRow = row;

        } else {
          // 情况 C：松手在网格外（拖回待命区）
          this.revertToStandby(container, standbyTop);
          this.layoutStandby(standbyTop);
        }
      });
    });

    // 首次生成时，整理待命区
    this.layoutStandby(standbyTop);
  }

  // 核心辅助方法：把角色数据重置为待命状态，并瞬间移动回大致区域
  revertToStandby(container, standbyTop) {
    container.unitData.gridX = -1;
    container.unitData.gridY = -1;
    container.isOnGrid = false;
    container.startCol = -1;
    container.startRow = -1;
    container.x = CONFIG.WIDTH / 2;
    container.y = standbyTop;
  }

  // 核心辅助方法：重新排列下方的待命区，确保不重叠
  layoutStandby(standbyTop) {
    // 筛选出所有没上阵的角色
    const standbyContainers = this.unitContainers.filter(c => !c.isOnGrid);
    
    // 排列规则：每行 4 个
    const cols = 4;
    const cellW = 140;
    const startX = (CONFIG.WIDTH - (cols - 1) * cellW) / 2;
    
    standbyContainers.forEach((container, index) => {
      const cCol = index % cols;
      const cRow = Math.floor(index / cols);
      
      const targetX = startX + cCol * cellW;
      const targetY = standbyTop + cRow * 110;
      
      // 加个小动画让排列更顺滑
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
// 场景 2：战斗表现
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
