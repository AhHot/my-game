class TeamScene extends Phaser.Scene {
  constructor() { super('TeamScene'); }
  init(data) { this.levelIndex = data.levelIndex || 0; }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');
    this.add.text(CONFIG.WIDTH / 2, 60, '👥 队伍与装备', { fontSize: '36px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
    
    // 增加一个背包状态的提示，方便测试
    this.bagInfoText = this.add.text(CONFIG.WIDTH / 2, 110, '', { fontSize: '16px', color: '#aaa' }).setOrigin(0.5);

    const backBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '返回布阵', { fontSize: '28px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 40, y: 15 } }).setOrigin(0.5).setInteractive();
    backBtn.on('pointerdown', () => { this.scene.start('FormationScene', { levelIndex: this.levelIndex }); });

    this.renderTeamList();
  }

  renderTeamList() {
    if (this.teamContainer) this.teamContainer.destroy();
    this.teamContainer = this.add.container(0, 0);

    // 更新顶部提示
    if(this.bagInfoText) {
      this.bagInfoText.setText(`当前背包物品总数: ${INVENTORY.length}`);
    }

    let startY = 150;
    const playerChars = CHARACTERS.filter(c => c.side === 'player');

    playerChars.forEach((char) => {
      let totalAtk = char.atk, totalDef = char.def, totalHp = char.maxHp;
      if (char.equipment) {
        Object.values(char.equipment).forEach(uid => {
          if (!uid) return;
          const inst = INVENTORY.find(i => i.uid === uid);
          if (inst) {
            const item = ITEMS[inst.itemId];
            if (item) {
              totalAtk += (item.atk || 0);
              totalDef += (item.def || 0);
              totalHp += (item.hp || 0);
            }
          }
        });
      }

      const nameTxt = this.add.text(50, startY, `${char.emoji} ${char.name}`, { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' });
      const statTxt = this.add.text(250, startY + 5, `攻:${totalAtk} 防:${totalDef} 血:${totalHp}`, { fontSize: '18px', color: '#aaa' });
      this.teamContainer.add([nameTxt, statTxt]);

      ['weapon', 'armor'].forEach((slotType, i) => {
        let itemName = '空';
        const uid = char.equipment ? char.equipment[slotType] : '';
        if (uid) {
          const inst = INVENTORY.find(inst => inst.uid === uid);
          if (inst) {
            const item = ITEMS[inst.itemId];
            if (item) itemName = item.name;
          }
        }

        const btn = this.add.text(50 + i * 250, startY + 40, `[${slotType === 'weapon' ? '武器' : '防具'}] ${itemName}`, { 
          fontSize: '18px', color: uid ? '#2ecc71' : '#fff', 
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
    const title = this.add.text(CONFIG.WIDTH / 2, 60, `为 ${char.name} 选择${slotType === 'weapon' ? '武器' : '防具'}`, { fontSize: '30px', color: '#f1c40f' }).setOrigin(0.5);
    const closeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '取消', { fontSize: '28px', color: '#fff', backgroundColor: '#555', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => { this.equipContainer.destroy(); });
    this.equipContainer.add([overlay, title, closeBtn]);

    let y = 140;
    const equippedUid = char.equipment ? char.equipment[slotType] : '';
    let hasItem = false;

    INVENTORY.forEach(inst => {
      if (inst.equippedBy !== '' && inst.equippedBy !== char.id) return;
      if (inst.uid === equippedUid) return;

      const item = ITEMS[inst.itemId];
      if (!item) return; // 找不到模板则跳过

      // ★ 核心修改：放宽了分类限制，只要是为了测试，或者分类匹配，就显示
      const isMatch = item.category === slotType;
      const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 60, 70, isMatch ? 0x1e3a5f : 0x2a2a2a);
      const name = this.add.text(60, y - 10, `${item.icon || ''} ${item.name}`, { fontSize: '20px', color: isMatch ? '#fff' : '#888' });
      const info = this.add.text(60, y + 15, `攻+${item.atk||0} 防+${item.def||0} 血+${item.hp||0}`, { fontSize: '14px', color: '#aaa' });
      
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

      this.equipContainer.add([bg, name, info, btn]);
      y += 85;
      hasItem = true;
    });

    if (equippedUid) {
      const inst = INVENTORY.find(i => i.uid === equippedUid);
      const item = inst ? ITEMS[inst.itemId] : null;
      if (item) {
        const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 60, 70, 0x0f3460);
        const name = this.add.text(60, y - 10, `[已穿戴] ${item.icon || ''} ${item.name}`, { fontSize: '20px', color: '#2ecc71' });
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

    if (!hasItem) {
      const emptyTxt = this.add.text(CONFIG.WIDTH / 2, 250, '背包中暂无该类型的可用装备', { fontSize: '20px', color: '#aaa' }).setOrigin(0.5);
      this.equipContainer.add(emptyTxt);
    }
  }

  saveGameData() {
    localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
    localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    
    const d = JSON.parse(localStorage.getItem('my_game_data_v9'));
    if(d) { 
      d.forEach(c => { 
        const newC = CHARACTERS.find(cc => cc.id === c.id); 
        if(newC) c.equipment = newC.equipment; 
      }); 
      localStorage.setItem('my_game_data_v9', JSON.stringify(d)); 
    }
  }
}
