class TeamScene extends Phaser.Scene {
  constructor() { super('TeamScene'); }
  init(data) { this.levelIndex = data.levelIndex || 0; }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.text(CONFIG.WIDTH / 2, 60, '👥 队伍与装备', { fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    
    const backBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '返回布阵', { fontSize: '28px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 40, y: 15 } }).setOrigin(0.5).setInteractive();
    backBtn.on('pointerdown', () => { this.scene.start('FormationScene', { levelIndex: this.levelIndex }); });

    this.renderTeamList();
  }

  renderTeamList() {
    if (this.teamContainer) this.teamContainer.destroy();
    this.teamContainer = this.add.container(0, 0);

    let startY = 150;
    const playerChars = CHARACTERS.filter(c => c.side === 'player');
    const qColors = { white: '#ffffff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };

    playerChars.forEach((char) => {
      let totalAtk = char.atk, totalDef = char.def, totalHp = char.maxHp;
      if (char.equipment) {
        Object.values(char.equipment).forEach(uid => {
          if (!uid) return;
          const inst = INVENTORY.find(i => i.uid === uid);
          if (inst) {
            totalAtk += (inst.baseAtk || 0);
            totalDef += (inst.baseDef || 0);
            totalHp += (inst.baseHp || 0);
          }
        });
      }

      const nameTxt = this.add.text(50, startY, `${char.emoji} ${char.name}`, { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' });
      const statTxt = this.add.text(250, startY + 5, `攻:${totalAtk} 防:${totalDef} 血:${totalHp}`, { fontSize: '18px', color: '#aaa' });
      this.teamContainer.add([nameTxt, statTxt]);

      ['weapon', 'armor'].forEach((slotType, i) => {
        let itemName = '空';
        let itemColor = '#ffffff'; // 默认白色
        const uid = char.equipment ? char.equipment[slotType] : '';
        if (uid) {
          const inst = INVENTORY.find(inst => inst.uid === uid);
          if (inst) {
            itemName = ITEMS[inst.itemId]?.name || '未知';
            itemColor = qColors[inst.quality] || '#ffffff'; // ★ 这里修复了穿戴后颜色不匹配的问题
          }
        }

        const btn = this.add.text(50 + i * 250, startY + 40, `[${slotType === 'weapon' ? '武器' : '防具'}] ${itemName}`, { 
          fontSize: '18px', color: itemColor, 
          backgroundColor: '#333', padding: { x: 10, y: 5 } 
        }).setInteractive();
        
        btn.on('pointerdown', () => { this.openEquipSelection(char, slotType); });
        this.teamContainer.add(btn);
      });

      startY += 100;
    });
  }

  openEquipSelection(char, slotType) {
    if (this.equipContainer) this.equipContainer.destroy();
    this.equipContainer = this.add.container(0, 0);

    const overlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.95);
    const title = this.add.text(CONFIG.WIDTH / 2, 60, `选择${slotType === 'weapon' ? '武器' : '防具'}`, { fontSize: '30px', color: '#f1c40f' }).setOrigin(0.5);
    const closeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '关闭', { fontSize: '28px', color: '#fff', backgroundColor: '#555', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => { this.equipContainer.destroy(); });
    this.equipContainer.add([overlay, title, closeBtn]);

    let y = 130;
    const equippedUid = char.equipment ? char.equipment[slotType] : '';
    let hasItem = false;

    const qColors = { white: '#ffffff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };

    // 1. 先渲染“已穿戴”的
    if (equippedUid) {
      const inst = INVENTORY.find(i => i.uid === equippedUid);
      const item = inst ? ITEMS[inst.itemId] : null;
      if (item) {
        const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 60, 70, 0x0f3460).setInteractive();
        bg.on('pointerdown', () => { this.showItemDetail(inst, item); });

        const name = this.add.text(60, y, `${item.icon || ''} ${item.name}`, { fontSize: '20px', color: qColors[inst.quality] || '#fff' }).setOrigin(0, 0.5).setInteractive();
        name.on('pointerdown', () => { this.showItemDetail(inst, item); });
        
        const btn = this.add.text(CONFIG.WIDTH - 120, y, '脱除', { fontSize: '18px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive();
        btn.on('pointerdown', () => {
          inst.equippedBy = '';
          char.equipment[slotType] = '';
          this.saveGameData();
          this.equipContainer.destroy();
          this.renderTeamList();
        });
        this.equipContainer.add([bg, name, btn]);
        hasItem = true;
        y += 85;
      }
    }

    // 2. 渲染“背包中未穿戴”的
    INVENTORY.forEach(inst => {
      if (inst.equippedBy !== '' && inst.equippedBy !== char.id) return;
      if (inst.uid === equippedUid) return;

      const item = ITEMS[inst.itemId];
      if (!item || item.category !== slotType) return;

      const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 60, 70, 0x1e3a5f).setInteractive();
      bg.on('pointerdown', () => { this.showItemDetail(inst, item); });

      const name = this.add.text(60, y, `${item.icon || ''} ${item.name}`, { fontSize: '20px', color: qColors[inst.quality] || '#fff' }).setOrigin(0, 0.5).setInteractive();
      name.on('pointerdown', () => { this.showItemDetail(inst, item); });

      const btnText = equippedUid ? '替换' : '穿戴';
      const btnColor = equippedUid ? '#e67e22' : '#2ecc71';
      const btn = this.add.text(CONFIG.WIDTH - 120, y, btnText, { fontSize: '18px', color: '#fff', backgroundColor: btnColor, padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive();
      
      btn.on('pointerdown', () => {
        if (equippedUid) { const oldInst = INVENTORY.find(i => i.uid === equippedUid); if (oldInst) oldInst.equippedBy = ''; }
        inst.equippedBy = char.id;
        char.equipment[slotType] = inst.uid;
        
        this.saveGameData();
        this.equipContainer.destroy();
        this.renderTeamList(); 
      });

      this.equipContainer.add([bg, name, btn]);
      y += 85;
      hasItem = true;
    });

    if (!hasItem) {
      const emptyTxt = this.add.text(CONFIG.WIDTH / 2, 250, '背包中暂无该类型的可用装备', { fontSize: '20px', color: '#aaa' }).setOrigin(0.5);
      this.equipContainer.add(emptyTxt);
    }
  }

  showItemDetail(inst, item) {
    if (this.detailContainer) this.detailContainer.destroy();
    this.detailContainer = this.add.container(0, 0);

    const overlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.95).setInteractive();
    overlay.on('pointerdown', () => { this.detailContainer.destroy(); });

    const panel = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH - 100, 400, 0x16213e).setStrokeStyle(2, 0x3498db);
    
    const qColors = { white: '#ffffff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
    const title = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 150, `${item.name}`, { fontSize: '32px', color: qColors[inst.quality] || '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    
    const qualityMap = { white: '普通', green: '精良', blue: '稀有', purple: '史诗', orange: '传说', red: '神话' };
    const qualityText = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 110, `[${qualityMap[inst.quality]}]`, { fontSize: '18px', color: qColors[inst.quality] }).setOrigin(0.5);

    let detailStr = ``;
    if (inst.baseAtk) detailStr += `攻击力: +${inst.baseAtk}\n`;
    if (inst.baseDef) detailStr += `防御力: +${inst.baseDef}\n`;
    if (inst.baseHp) detailStr += `生命值: +${inst.baseHp}\n`;
    
    if (inst.extras && inst.extras.length > 0) {
      detailStr += `\n--- 附加属性 ---\n`;
      inst.extras.forEach(ex => {
        let valStr = ex.isPercent ? `${(ex.value * 100).toFixed(1)}%` : `${ex.value}`;
        detailStr += `${ex.label}: +${valStr}\n`;
      });
    }
    
    const desc = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 10, detailStr, { fontSize: '20px', color: '#fff', align: 'center', lineSpacing: 8 }).setOrigin(0.5);
    
    const closeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 + 160, '返回', { fontSize: '24px', color: '#fff', backgroundColor: '#555', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => { this.detailContainer.destroy(); });

    this.detailContainer.add([overlay, panel, title, qualityText, desc, closeBtn]);
  }

  saveGameData() {
    localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
    localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    
    const d = JSON.parse(localStorage.getItem('my_game_data_v11'));
    if(d) { 
      d.forEach(c => { 
        const newC = CHARACTERS.find(cc => cc.id === c.id); 
        if(newC) c.equipment = newC.equipment; 
      }); 
      localStorage.setItem('my_game_data_v11', JSON.stringify(d)); 
    }
  }
}
