// ==========================================
// 场景 3：队伍与装备管理（完全独立）
// ==========================================
class TeamScene extends Phaser.Scene {
  constructor() { super('TeamScene'); }
  
  // 接收从布阵界面传来的关卡进度
  init(data) { 
    this.levelIndex = data.levelIndex || 0; 
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.text(CONFIG.WIDTH / 2, 60, '👥 队伍与装备', { fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    
    // 底部返回按钮
    const backBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '返回布阵', { fontSize: '28px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 40, y: 15 } }).setOrigin(0.5).setInteractive();
    backBtn.on('pointerdown', () => { 
      // 保存数据并返回布阵场景
      this.scene.start('FormationScene', { levelIndex: this.levelIndex }); 
    });

    this.renderTeamList();
  }

  renderTeamList() {
    // 清除旧的列表 UI（如果有）
    if (this.teamContainer) this.teamContainer.destroy();
    this.teamContainer = this.add.container(0, 0);

    let startY = 150;
    const playerChars = CHARACTERS.filter(c => c.side === 'player');

    playerChars.forEach((char) => {
      // 计算包含装备的真实属性
      let totalAtk = char.atk, totalDef = char.def, totalHp = char.maxHp;
      if (char.equipment) {
        Object.values(char.equipment).forEach(eqId => {
          if (eqId && EQUIPS[eqId]) {
            totalAtk += (EQUIPS[eqId].atk || 0);
            totalDef += (EQUIPS[eqId].def || 0);
            totalHp += (EQUIPS[eqId].hp || 0);
          }
        });
      }

      // 角色基础信息
      const nameTxt = this.add.text(50, startY, `${char.emoji} ${char.name}`, { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' });
      const statTxt = this.add.text(250, startY + 5, `攻:${totalAtk} 防:${totalDef} 血:${totalHp}`, { fontSize: '18px', color: '#aaa' });
      this.teamContainer.add([nameTxt, statTxt]);

      // 渲染装备槽
      ['weapon', 'armor'].forEach((slotType, i) => {
        const eqId = char.equipment ? char.equipment[slotType] : '';
        const eqName = eqId && EQUIPS[eqId] ? EQUIPS[eqId].name : '空';
        const btn = this.add.text(50 + i * 250, startY + 40, `[${slotType === 'weapon' ? '武器' : '防具'}] ${eqName}`, { 
          fontSize: '18px', color: eqId ? '#2ecc71' : '#fff', 
          backgroundColor: '#333', padding: { x: 10, y: 5 } 
        }).setInteractive();
        
        btn.on('pointerdown', () => {
          this.openEquipSelection(char, slotType);
        });
        this.teamContainer.add(btn);
      });

      startY += 100;
    });
  }

  // 装备选择弹窗
  openEquipSelection(char, slotType) {
    if (this.equipContainer) this.equipContainer.destroy();
    this.equipContainer = this.add.container(0, 0);

    const overlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.9);
    const title = this.add.text(CONFIG.WIDTH / 2, 80, `为 ${char.name} 选择${slotType === 'weapon' ? '武器' : '防具'}`, { fontSize: '30px', color: '#f1c40f' }).setOrigin(0.5);
    const closeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '返回列表', { fontSize: '28px', color: '#fff', backgroundColor: '#555', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => { this.equipContainer.destroy(); });
    this.equipContainer.add([overlay, title, closeBtn]);

    let y = 180;
    const equippedId = char.equipment ? char.equipment[slotType] : '';

    OWNED_EQUIPS.forEach(id => {
      const eq = EQUIPS[id];
      if (!eq || eq.type !== slotType) return;

      const isEquipped = (id === equippedId);
      const bgColor = isEquipped ? '#0f3460' : '#1a1a2e';
      
      const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 80, 80, parseInt(bgColor.replace('#',''),16));
      const name = this.add.text(80, y - 15, eq.name, { fontSize: '22px', color: isEquipped ? '#2ecc71' : '#fff' });
      const info = this.add.text(80, y + 15, `攻+${eq.atk||0} 防+${eq.def||0} 血+${eq.hp||0}`, { fontSize: '16px', color: '#aaa' });
      
      let btnText = '穿戴'; let btnColor = '#2ecc71';
      if (isEquipped) { btnText = '脱除'; btnColor = '#e74c3c'; }
      else if (equippedId) { btnText = '替换'; btnColor = '#e67e22'; }

      const btn = this.add.text(CONFIG.WIDTH - 120, y, btnText, { fontSize: '20px', color: '#fff', backgroundColor: btnColor, padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive();
      
      btn.on('pointerdown', () => {
        if (!char.equipment) char.equipment = { weapon: '', armor: '' };
        if (isEquipped) char.equipment[slotType] = '';
        else char.equipment[slotType] = id;
        
        // 同步保存数据到 localStorage，确保战斗时能读取到
        localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
        const d = JSON.parse(localStorage.getItem('my_game_data_v5'));
        if(d) { d.forEach(c => { if(c.id === char.id) c.equipment = char.equipment; }); localStorage.setItem('my_game_data_v5', JSON.stringify(d)); }

        this.equipContainer.destroy();
        this.renderTeamList(); // 刷新列表属性
      });

      this.equipContainer.add([bg, name, info, btn]);
      y += 100;
    });

    if (y === 180) {
      const empty = this.add.text(CONFIG.WIDTH / 2, 300, '没有可用的装备', { fontSize: '24px', color: '#aaa' }).setOrigin(0.5);
      this.equipContainer.add(empty);
    }
  }
}
