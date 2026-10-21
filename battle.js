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
// 场景 1：战前布阵（加入待命区）
// ==========================================
class FormationScene extends Phaser.Scene {
  constructor() { super('FormationScene'); }
  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    const cell = CONFIG.CELL_SIZE;
    const gridW = cell * CONFIG.GRID_SIZE;
    const gridLeft = (CONFIG.WIDTH - gridW) / 2;
    
    // 坐标区域划分
    const standbyTop = 180; // 待命区起始位置
    const playerTop = 650;  // 网格区起始位置

    this.add.text(CONFIG.WIDTH / 2, 60, '战前布阵', { fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(CONFIG.WIDTH / 2, 110, '拖动角色进入下方网格上阵 (最多5人)\n拖回上方即可下阵', { fontSize: '20px', color: '#aaaaaa', align: 'center' }).setOrigin(0.5);

    // 画待命区背景框
    const standbyBg = this.add.graphics();
    standbyBg.fillStyle(0x16213e, 0.8);
    standbyBg.fillRoundedRect(40, standbyTop - 20, CONFIG.WIDTH - 80, 160, 10);
    standbyBg.lineStyle(2, 0x3498DB, 0.5);
    standbyBg.strokeRoundedRect(40, standbyTop - 20, CONFIG.WIDTH - 80, 160, 10);

    // 画我方网格
    const g = this.add.graphics();
    g.lineStyle(2, 0x3498DB, 0.5);
    for (let i = 0; i <= CONFIG.GRID_SIZE; i++) {
      g.lineBetween(gridLeft, playerTop + i * cell, gridLeft + gridW, playerTop + i * cell);
      g.lineBetween(gridLeft + i * cell, playerTop, gridLeft + i * cell, playerTop + gridW);
    }

    const startBtn = this.add.text(CONFIG.WIDTH / 2, 1200, '⚔️ 开始战斗', { fontSize: '42px', color: '#ffffff', backgroundColor: '#e67e22', padding: { x: 50, y: 20 } }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => { 
      // 检查上阵人数
      const players = CHARACTERS.filter(c => c.side === 'player' && c.gridX !== -1);
      if (players.length === 0) {
        alert("至少需要上阵1名角色！");
        return;
      }
      this.scene.start('BattleScene'); 
    });

    // 初始化网格状态
    this.gridState = Array(CONFIG.GRID_SIZE).fill(null).map(() => Array(CONFIG.GRID_SIZE).fill(null));

    // 计算待命区位置
    let standbyCount = 0;
    const getStandbyPos = () => {
      const pos = {
        x: 100 + (standbyCount % 5) * 130, // 一行放5个
        y: standbyTop + Math.floor(standbyCount / 5) * 70 + 40
      };
      standbyCount++;
      return pos;
    };

    // 生成所有我方角色
    CHARACTERS.filter(c => c.side === 'player').forEach(data => {
      // 处理历史数据：如果有坐标但重叠了，只保留一个在网格，其他去待命区
      if (data.gridX !== -1 && data.gridX !== undefined) {
        if (this.gridState[data.gridX][data.gridY]) {
          data.gridX = -1; data.gridY = -1; // 重叠了，退回待命区
        } else {
          this.gridState[data.gridX][data.gridY] = data;
        }
      }

      let pos;
      if (data.gridX === -1 || data.gridX === undefined) {
        pos = getStandbyPos();
      } else {
        pos = {
          x: gridLeft + data.gridX * cell + cell / 2,
          y: playerTop + data.gridY * cell + cell / 2
        };
      }

      const container = this.add.container(pos.x, pos.y);
      
      // 战斗小人 UI
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
      container.standbyPos = pos; // 记录待命区位置

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
        let row = Math.floor((container.y - playerTop) / cell);

        // 判断松手位置
        if (col >= 0 && col < CONFIG.GRID_SIZE && row >= 0 && row < CONFIG.GRID_SIZE) {
          // === 松手在网格内 ===
          const targetUnit = this.gridState[col][row];
          
          if (targetUnit) {
            // 目标格有人：如果原来是从待命区拖来，把人挤回待命区；如果是从网格拖来，互换位置
            if (container.isOnGrid) {
               targetUnit.gridX = container.startCol; targetUnit.gridY = container.startRow;
               this.gridState[container.startCol][container.startRow] = targetUnit;
               this.updateUnitPos(targetUnit, gridLeft + targetUnit.gridX * cell + cell / 2, playerTop + targetUnit.gridY * cell + cell / 2);
            } else {
               // 从待命区拖到有人的格子，拦截，退回待命区
               container.x = container.standbyPos.x;
               container.y = container.standbyPos.y;
               return;
            }
          }

          // 记录新位置
          data.gridX = col; data.gridY = row;
          this.gridState[col][row] = data;
          container.x = gridLeft + col * cell + cell / 2;
          container.y = playerTop + row * cell + cell / 2;
          container.isOnGrid = true;
          container.startCol = col;
          container.startRow = row;

        } else {
          // === 松手在网格外（回待命区） ===
          data.gridX = -1; data.gridY = -1;
          container.isOnGrid = false;
          container.x = container.standbyPos.x;
          container.y = container.standbyPos.y;
        }
      });
    });
  }

  updateUnitPos(unitData, x, y) {
    const targetContainer = this.children.list.find(child => child.unitData === unitData);
    if (targetContainer) {
      targetContainer.x = x; targetContainer.y = y;
      targetContainer.startCol = unitData.gridX;
      targetContainer.startRow = unitData.gridY;
      targetContainer.isOnGrid = true;
    }
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
    
    // 核心修改：只加载在网格上的人进入战斗
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
