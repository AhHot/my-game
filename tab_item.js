// ==========================================
// 模块：物品面板 (tab_item.js)
// ==========================================
let currentItemSubTab = 'weapon';

window.switchItemSubTab = function(sub) {
  currentItemSubTab = sub;
  ['weapon', 'armor', 'accessory', 'consumable', 'material', 'quest'].forEach(s => {
    document.getElementById(`tab-item-${s}`).classList.toggle('active', sub === s);
  });
  window.renderTabItem(document.getElementById('app-content'));
};

window.renderTabItem = function(container) {
  container.innerHTML = `
    <div class="search-bar"><input type="text" id="search-item" placeholder="🔍 搜索物品..." oninput="window.filterItemList()"></div>
    <div class="sub-tabs">
      <div class="sub-tab ${currentItemSubTab==='weapon'?'active':''}" id="tab-item-weapon" onclick="window.switchItemSubTab('weapon')">武器</div>
      <div class="sub-tab ${currentItemSubTab==='armor'?'active':''}" id="tab-item-armor" onclick="window.switchItemSubTab('armor')">防具</div>
      <div class="sub-tab ${currentItemSubTab==='accessory'?'active':''}" id="tab-item-accessory" onclick="window.switchItemSubTab('accessory')">饰品</div>
      <div class="sub-tab ${currentItemSubTab==='consumable'?'active':''}" id="tab-item-consumable" onclick="window.switchItemSubTab('consumable')">消耗品</div>
      <div class="sub-tab ${currentItemSubTab==='material'?'active':''}" id="tab-item-material" onclick="window.switchItemSubTab('material')">材料</div>
      <div class="sub-tab ${currentItemSubTab==='quest'?'active':''}" id="tab-item-quest" onclick="window.switchItemSubTab('quest')">任务</div>
    </div>
    <div id="item-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewItem()">➕ 新增物品模板</button>
  `;

  window.filterItemList = function() {
    const list = document.getElementById('item-list'); list.innerHTML = '';
    const keyword = document.getElementById('search-item').value.toLowerCase();
    
    gameItems.forEach((item, index) => {
      if (item.category !== currentItemSubTab) return;
      if (keyword && !item.name.toLowerCase().includes(keyword)) return;
      
      const isEquip = ['weapon', 'armor', 'accessory'].includes(item.category);
      let slotSelector = '';
      if (item.category === 'armor') {
        slotSelector = `
          <div class="form-item">
            <label>装备部位</label>
            <select onchange="window.updateItem(${index}, 'equipSlot', this.value)">
              <option value="head" ${item.equipSlot === 'head' ? 'selected' : ''}>头部</option>
              <option value="body" ${item.equipSlot === 'body' ? 'selected' : ''}>衣服</option>
              <option value="legs" ${item.equipSlot === 'legs' ? 'selected' : ''}>腿部</option>
            </select>
          </div>`;
      } else if (item.category === 'accessory') {
        slotSelector = `
          <div class="form-item">
            <label>装备部位</label>
            <select onchange="window.updateItem(${index}, 'equipSlot', this.value)">
              <option value="ring" ${item.equipSlot === 'ring' ? 'selected' : ''}>戒指</option>
              <option value="necklace" ${item.equipSlot === 'necklace' ? 'selected' : ''}>项链</option>
            </select>
          </div>`;
      }

      let equipStatsHtml = '';
      if (isEquip) {
        equipStatsHtml = `
          <div class="sub-title">基础属性范围</div>
          <div class="form-item"><label>攻击力</label><div style="display:flex;gap:2px;"><input type="number" value="${item.atkMin||0}" onchange="window.updateItem(${index}, 'atkMin', parseInt(this.value))" placeholder="Min"><input type="number" value="${item.atkMax||0}" onchange="window.updateItem(${index}, 'atkMax', parseInt(this.value))" placeholder="Max"></div></div>
          <div class="form-item"><label>防御力</label><div style="display:flex;gap:2px;"><input type="number" value="${item.defMin||0}" onchange="window.updateItem(${index}, 'defMin', parseInt(this.value))" placeholder="Min"><input type="number" value="${item.defMax||0}" onchange="window.updateItem(${index}, 'defMax', parseInt(this.value))" placeholder="Max"></div></div>
          <div class="form-item"><label>生命值</label><div style="display:flex;gap:2px;"><input type="number" value="${item.hpMin||0}" onchange="window.updateItem(${index}, 'hpMin', parseInt(this.value))" placeholder="Min"><input type="number" value="${item.hpMax||0}" onchange="window.updateItem(${index}, 'hpMax', parseInt(this.value))" placeholder="Max"></div></div>

          <div class="sub-title">自带额外属性 (填 10 代表 10%)</div>
          <div class="form-item"><label>攻击力(%)</label><input type="number" step="0.1" value="${(item.atkPercent||0)*100}" onchange="window.updateItemPct(${index}, 'atkPercent', this.value)"></div>
          <div class="form-item"><label>防御力(%)</label><input type="number" step="0.1" value="${(item.defPercent||0)*100}" onchange="window.updateItemPct(${index}, 'defPercent', this.value)"></div>
          <div class="form-item"><label>生命值(%)</label><input type="number" step="0.1" value="${(item.hpPercent||0)*100}" onchange="window.updateItemPct(${index}, 'hpPercent', this.value)"></div>
          <div class="form-item"><label>暴击率(%)</label><input type="number" step="0.1" value="${(item.critRate||0)*100}" onchange="window.updateItemPct(${index}, 'critRate', this.value)"></div>
          <div class="form-item"><label>暴击伤害</label><input type="number" step="0.1" value="${item.critDmg||0}" onchange="window.updateItem(${index}, 'critDmg', parseFloat(this.value))"></div>
          <div class="form-item"><label>抗暴率(%)</label><input type="number" step="0.1" value="${(item.critResist||0)*100}" onchange="window.updateItemPct(${index}, 'critResist', this.value)"></div>
          <div class="form-item"><label>命中率(%)</label><input type="number" step="0.1" value="${(item.hitRate||0)*100}" onchange="window.updateItemPct(${index}, 'hitRate', this.value)"></div>
          <div class="form-item"><label>闪避率(%)</label><input type="number" step="0.1" value="${(item.dodgeRate||0)*100}" onchange="window.updateItemPct(${index}, 'dodgeRate', this.value)"></div>
          <div class="form-item"><label>吸血(%)</label><input type="number" step="0.1" value="${(item.lifesteal||0)*100}" onchange="window.updateItemPct(${index}, 'lifesteal', this.value)"></div>
          <div class="form-item"><label>速度</label><input type="number" value="${item.speed||0}" onchange="window.updateItem(${index}, 'speed', parseInt(this.value))"></div>
        `;
      }

      let consumableHtml = '';
      if (item.category === 'consumable') {
        consumableHtml = `
          <div class="sub-title" style="color:#2ecc71;">养成与效果设定</div>
          <div class="form-item">
            <label>使用效果</label>
            <select onchange="window.updateItem(${index}, 'useEffect', this.value)">
              <option value="None" ${item.useEffect === 'None' ? 'selected' : ''}>无效果</option>
              <option value="AddExp" ${item.useEffect === 'AddExp' ? 'selected' : ''}>增加经验</option>
              <option value="AddStat" ${item.useEffect === 'AddStat' ? 'selected' : ''}>永久增加意境</option>
              <option value="PackageEquip" ${item.useEffect === 'PackageEquip' ? 'selected' : ''}>自选装备包(预留)</option>
              <option value="RandomEquip" ${item.useEffect === 'RandomEquip' ? 'selected' : ''}>随机装备包(预留)</option>
            </select>
          </div>
          <div class="form-item">
            <label>效果数值</label>
            <input type="number" value="${item.useValue || 0}" onchange="window.updateItem(${index}, 'useValue', parseFloat(this.value))">
          </div>
          <div class="form-item full" style="display:${item.useEffect === 'AddStat' ? 'flex' : 'none'};">
            <label>增加哪种意境</label>
            <select onchange="window.updateItem(${index}, 'useStatKey', this.value)">
              <option value="fengRui" ${item.useStatKey === 'fengRui' ? 'selected' : ''}>锋锐</option>
              <option value="hunHou" ${item.useStatKey === 'hunHou' ? 'selected' : ''}>浑厚</option>
              <option value="lingDong" ${item.useStatKey === 'lingDong' ? 'selected' : ''}>灵动</option>
              <option value="jianRen" ${item.useStatKey === 'jianRen' ? 'selected' : ''}>坚韧</option>
              <option value="guiMi" ${item.useStatKey === 'guiMi' ? 'selected' : ''}>诡秘</option>
              <option value="jueQing" ${item.useStatKey === 'jueQing' ? 'selected' : ''}>绝情</option>
            </select>
          </div>
        `;
      }

      const div = document.createElement('div'); div.className = 'card';
      div.innerHTML = `
        <div class="card-header">
          <h3>${item.icon || '📦'} ${item.name}</h3>
          <div>
            <button class="btn-grant" onclick="window.grantTestItem('${item.id}')">🎁 发放测试</button>
            <button class="btn-del" onclick="window.deleteItem(${index})">删除</button>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-item"><label>名称</label><input type="text" value="${item.name}" onchange="window.updateItem(${index}, 'name', this.value)"></div>
          <div class="form-item"><label>图标</label><input type="text" value="${item.icon || ''}" onchange="window.updateItem(${index}, 'icon', this.value)"></div>
          <div class="form-item"><label>最大堆叠数</label><input type="number" value="${item.maxStack || 1}" onchange="window.updateItem(${index}, 'maxStack', parseInt(this.value))"></div>
          ${slotSelector}
          <div class="form-item full"><label>描述</label><input type="text" value="${item.desc || ''}" onchange="window.updateItem(${index}, 'desc', this.value)"></div>
          ${equipStatsHtml}
          ${consumableHtml}
        </div>`;
      list.appendChild(div);
    });
  };
  window.filterItemList();
};

window.updateItem = function(index, key, value) { 
  gameItems[index][key] = value; saveData(); 
  if (['category', 'useEffect'].includes(key)) window.renderTabItem(document.getElementById('app-content')); 
};
window.updateItemPct = function(index, key, value) { gameItems[index][key] = parseFloat(value) / 100; saveData(); };
window.addNewItem = function() { 
  const isEquip = ['weapon', 'armor', 'accessory'].includes(currentItemSubTab);
  gameItems.push({ 
    id:'item_'+Date.now(), name:'新物品', category:currentItemSubTab, 
    equipSlot: currentItemSubTab === 'weapon' ? 'weapon' : (currentItemSubTab === 'armor' ? 'body' : (currentItemSubTab === 'accessory' ? 'ring' : '')), 
    icon:'📦', desc:'', maxStack: isEquip ? 1 : 99,
    useEffect: 'None', useValue: 0, useStatKey: 'fengRui',
    atkMin:0, atkMax:0, defMin:0, defMax:0, hpMin:0, hpMax:0, 
    atkPercent:0, defPercent:0, hpPercent:0, critRate:0, critDmg:0, lifesteal:0, hitRate:0, dodgeRate:0, critResist:0, speed:0 
  }); 
  saveData(); window.renderTabItem(document.getElementById('app-content')); 
};
window.deleteItem = function(index) { if (confirm('确定删除？')) { gameItems.splice(index, 1); saveData(); window.renderTabItem(document.getElementById('app-content')); } };

window.grantTestItem = function(itemId) {
  const tpl = gameItems.find(i => i.id === itemId);
  if (!tpl) return;
  
  const isEquip = ['weapon', 'armor', 'accessory'].includes(tpl.category);
  if (isEquip) {
    const inst = generateRandomInstance(tpl.id);
    if(inst) inventory.push(inst);
  } else {
    const existing = inventory.find(i => i.itemId === tpl.id && !i.equippedBy);
    if (existing && existing.count < (tpl.maxStack || 1)) {
      existing.count = (existing.count || 1) + 1;
    } else {
      inventory.push({ uid: 'inst_' + Date.now() + Math.floor(Math.random()*1000), itemId: tpl.id, quality: 'white', count: 1, equippedBy: '' });
    }
  }
  saveData();
  alert(`已成功发放：${tpl.name} (请在游戏内背包查看)`);
};
