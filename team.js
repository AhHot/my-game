// ==========================================
// 场景 3：队伍与装备管理（完全独立）
// ==========================================
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

    playerChars.forEach((char) => {
      let totalAtk = char.atk, totalDef = char.def, totalHp = char.maxHp;
      
      // 计算装备加成
      if (char.equipment) {
        Object.values(char.equipment).forEach(uid => {
          if (!uid) return;
          const inst = INVENTORY.find(i => i.uid === uid);
          if (inst) {
            const eq = EQUIPS[inst.eqId];
            if (eq) {
              totalAtk += (eq.atk || 0);
              totalDef += (eq.def || 0);
              totalHp += (eq.hp || 0);
            }
          }
        });
      }

      const nameTxt = this.add.text(50, startY, `${char.emoji} ${char.name}`, { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' });
      const statTxt = this.add.text(250, startY + 5, `攻:${totalAtk} 防:${totalDef} 血:${totalHp}`, { fontSize: '18px', color: '#aaa' });
      this.teamContainer.add([nameTxt, statTxt]);

      ['weapon', 'armor'].forEach((slotType, i) => {
        let eqName = '空';
        const uid = char.equipment ? char.equipment[slotType] : '';
        if (uid) {
          const inst = INVENTORY.find(inst => inst.uid === uid);
          if (inst) {
            const eq = EQUIPS[inst.eqId];
            if (eq) eqName = eq.name;
          }
        }

        const btn = this.add.text(50 + i * 250, startY + 40, `[${slotType === 'weapon' ? '武器' : '防具'}] ${eqName}`, { 
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

    const overlay = this.add.rectangle(CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.9);
    const title = this.add.text(CONFIG.WIDTH / 2, 80, `为 ${char.name} 选择${slotType === 'weapon' ? '武器' : '防具'}`, { fontSize: '30px', color: '#f1c40f' }).setOrigin(0.5);
    const closeBtn = this.add.text(CONFIG.WIDTH / 2, CONFIG.HEIGHT - 80, '返回列表', { fontSize: '28px', color: '#fff', backgroundColor: '#555', padding: { x: 30, y: 10 } }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => { this.equipContainer.destroy(); });
    this.equipContainer.add([overlay, title, closeBtn]);

    let y = 180;
    const equippedUid = char.equipment ? char.equipment[slotType] : '';

    INVENTORY.forEach(inst => {
      if (inst.equippedBy !== '' && inst.equippedBy !== char.id) return; // 别人穿了
      if (inst.uid === equippedUid) return;

      const eq = EQUIPS[inst.eqId];
      if (!eq || eq.type !== slotType) return;

      const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 80, 80, 0x1a1a2e);
      const name = this.add.text(80, y - 15, eq.name, { fontSize: '22px', color: '#fff' });
      const info = this.add.text(80, y + 15, `攻+${eq.atk||0} 防+${eq.def||0} 血+${eq.hp||0}`, { fontSize: '16px', color: '#aaa' });
      
      const btnText = equippedUid ? '替换' : '穿戴';
      const btnColor = equippedUid ? '#e67e22' : '#2ecc71';
      const btn = this.add.text(CONFIG.WIDTH - 120, y, btnText, { fontSize: '20px', color: '#fff', backgroundColor: btnColor, padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive();
      
      btn.on('pointerdown', () => {
        // 脱掉旧的
        if (equippedUid) {
          const oldInst = INVENTORY.find(i => i.uid === equippedUid);
          if (oldInst) oldInst.equippedBy = '';
        }
        // 穿新的
        inst.equippedBy = char.id;
        char.equipment[slotType] = inst.uid;
        
        this.saveGameData();
        this.equipContainer.destroy();
        this.renderTeamList();
      });

      this.equipContainer.add([bg, name, info, btn]);
      y += 100;
    });

    // 如果当前穿着装备，可以在这里点击脱除
    if (equippedUid) {
      const bg = this.add.rectangle(CONFIG.WIDTH / 2, y, CONFIG.WIDTH - 80, 80, 0x0f3460);
      const inst = INVENTORY.find(i => i.uid === equippedUid);
      const eq = inst ? EQUIPS[inst.eqId] : null;
      if (eq) {
        const name = this.add.text(80, y - 15, `[已穿戴] ${eq.name}`, { fontSize: '22px', color: '#2ecc71' });
        const btn = this.add.text(CONFIG.WIDTH - 120, y, '脱除', { fontSize: '20px', color: '#fff', backgroundColor: '#e74c3c', padding: { x: 15, y: 8 } }).setOrigin(0.5).setInteractive();
        btn.on('pointerdown', () => {
          inst.equippedBy = '';
          char.equipment[slotType] = '';
          this.saveGameData();
          this.equipContainer.destroy();
          this.renderTeamList();
        });
        this.equipContainer.add([bg, name, btn]);
      }
    }
  }

  saveGameData() {
    localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
    localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    
    const d = JSON.parse(localStorage.getItem('my_game_data_v6'));
    if(d) { d.forEach(c => { if(c.id === char.id) c.equipment = char.equipment; }); localStorage.setItem('my_game_data_v6', JSON.stringify(d)); }
  }
}
