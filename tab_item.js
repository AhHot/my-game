// ==========================================
// 模組：物品與裝備模板管理 (tab_item.js) - 完整分類 Tab 版 + 專屬品質掉落設定
// ==========================================

window.renderTabItem = function(container) {
  if (!window.gameItems) {
    window.gameItems = [];
  }

  // 記錄當前分類篩選狀態
  if (window._currentItemTab === undefined) window._currentItemTab = 'all';

  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🎒 物品與裝備模板管理</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:15px;">在此管理所有道具、裝備、消耗品及突破/升級材料的屬性、最大堆疊數與發送測試。</p>
      
      <!-- 物品分類 Tab 列 -->
      <div class="sub-tabs" style="display: flex; gap: 8px; margin-bottom: 15px;">
        <div class="sub-tab ${window._currentItemTab === 'all' ? 'active' : ''}" onclick="window.switchItemTab('all')" style="flex:1; padding:8px; text-align:center; background:${window._currentItemTab === 'all' ? '#e74c3c' : '#0f3460'}; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">全部</div>
        <div class="sub-tab ${window._currentItemTab === 'equip' ? 'active' : ''}" onclick="window.switchItemTab('equip')" style="flex:1; padding:8px; text-align:center; background:${window._currentItemTab === 'equip' ? '#e74c3c' : '#0f3460'}; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">裝備</div>
        <div class="sub-tab ${window._currentItemTab === 'consumable' ? 'active' : ''}" onclick="window.switchItemTab('consumable')" style="flex:1; padding:8px; text-align:center; background:${window._currentItemTab === 'consumable' ? '#e74c3c' : '#0f3460'}; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">消耗品</div>
        <div class="sub-tab ${window._currentItemTab === 'material' ? 'active' : ''}" onclick="window.switchItemTab('material')" style="flex:1; padding:8px; text-align:center; background:${window._currentItemTab === 'material' ? '#e74c3c' : '#0f3460'}; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">材料</div>
        <div class="sub-tab ${window._currentItemTab === 'quest' ? 'active' : ''}" onclick="window.switchItemTab('quest')" style="flex:1; padding:8px; text-align:center; background:${window._currentItemTab === 'quest' ? '#e74c3c' : '#0f3460'}; border-radius:4px; cursor:pointer; font-size:13px; font-weight:bold;">任務</div>
      </div>

      <div id="item-editor-list"></div>
      <button class="btn" style="background:#3498db; width:100%; margin-top:15px;" onclick="window.addNewItemTemplate()">➕ 新增物品模板</button>
    </div>
    <button class="btn btn-play" style="width:100%; margin-bottom:20px;" onclick="saveData(); alert('物品配置已成功保存！');">💾 保存物品配置</button>
  `;

  renderItemList();
};

window.switchItemTab = function(tab) {
  window._currentItemTab = tab;
  const container = document.getElementById('app-content');
  if (container && window.renderTabItem) window.renderTabItem(container);
};

function renderItemList() {
  const list = document.getElementById('item-editor-list');
  if (!list) return;
  list.innerHTML = '';

  let filteredItems = window.gameItems.filter(item => {
    let tab = window._currentItemTab || 'all';
    if (tab === 'all') return true;
    if (tab === 'equip') return ['weapon', 'armor', 'accessory'].includes(item.category);
    return item.category === tab;
  });

  filteredItems.forEach((item) => {
    // 找出該物品在全局 gameItems 中的真實索引
    const index = window.gameItems.findIndex(i => i.id === item.id);
    let isEquip = ['weapon', 'armor', 'accessory'].includes(item.category);
    let isConsumable = item.category === 'consumable';

    let equipStatsHtml = '';
    if (isEquip) {
      equipStatsHtml = `
        <!-- ★ 新增：專屬品質掉落範圍設定 -->
        <div class="sub-title" style="margin-top: 15px; color: #e74c3c;">🎲 專屬掉落品質範圍設定</div>
        <div class="form-item full" style="background: #2a1a1a; padding: 10px; border-radius: 6px; border: 1px solid #c0392b; margin-bottom: 10px;">
          <p style="font-size: 11px; color: #e74c3c; margin-bottom: 8px;">※ 設定此裝備只會在哪個品質區間內隨機抽選（系統會自動重新分配機率）。</p>
          <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="color: #fff;">最低品質下限</label>
              <select onchange="window.updateItemField(${index}, 'qualityMin', this.value)" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px; border-radius: 4px;">
                <option value="white" ${item.qualityMin === 'white' || !item.qualityMin ? 'selected' : ''}>白 (white)</option>
                <option value="green" ${item.qualityMin === 'green' ? 'selected' : ''}>綠 (green)</option>
                <option value="blue" ${item.qualityMin === 'blue' ? 'selected' : ''}>藍 (blue)</option>
                <option value="purple" ${item.qualityMin === 'purple' ? 'selected' : ''}>紫 (purple)</option>
                <option value="orange" ${item.qualityMin === 'orange' ? 'selected' : ''}>橙 (orange)</option>
                <option value="red" ${item.qualityMin === 'red' ? 'selected' : ''}>紅 (red)</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="color: #fff;">最高品質上限</label>
              <select onchange="window.updateItemField(${index}, 'qualityMax', this.value)" style="width: 100%; background: #111; color: #fff; border: 1px solid #444; padding: 5px; border-radius: 4px;">
                <option value="white" ${item.qualityMax === 'white' ? 'selected' : ''}>白 (white)</option>
                <option value="green" ${item.qualityMax === 'green' ? 'selected' : ''}>綠 (green)</option>
                <option value="blue" ${item.qualityMax === 'blue' ? 'selected' : ''}>藍 (blue)</option>
                <option value="purple" ${item.qualityMax === 'purple' ? 'selected' : ''}>紫 (purple)</option>
                <option value="orange" ${item.qualityMax === 'orange' ? 'selected' : ''}>橙 (orange)</option>
                <option value="red" ${item.qualityMax === 'red' || !item.qualityMax ? 'selected' : ''}>紅 (red)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="sub-title">⚔️ 裝備基礎數值範圍</div>
        <div class="form-item"><label>最小攻擊 (atkMin)</label><input type="number" value="${item.atkMin || 0}" onchange="window.updateItemField(${index}, 'atkMin', parseFloat(this.value))"></div>
        <div class="form-item"><label>最大攻擊 (atkMax)</label><input type="number" value="${item.atkMax || 0}" onchange="window.updateItemField(${index}, 'atkMax', parseFloat(this.value))"></div>
        <div class="form-item"><label>最小防御 (defMin)</label><input type="number" value="${item.defMin || 0}" onchange="window.updateItemField(${index}, 'defMin', parseFloat(this.value))"></div>
        <div class="form-item"><label>最大防御 (defMax)</label><input type="number" value="${item.defMax || 0}" onchange="window.updateItemField(${index}, 'defMax', parseFloat(this.value))"></div>
        <div class="form-item"><label>最小生命 (hpMin)</label><input type="number" value="${item.hpMin || 0}" onchange="window.updateItemField(${index}, 'hpMin', parseFloat(this.value))"></div>
        <div class="form-item"><label>最大生命 (hpMax)</label><input type="number" value="${item.hpMax || 0}" onchange="window.updateItemField(${index}, 'hpMax', parseFloat(this.value))"></div>
        
        <div class="sub-title">✨ 裝備固定附加屬性 (%)</div>
        <div class="form-item"><label>攻擊百分比 (%)</label><input type="number" step="0.1" value="${item.atkPercent || 0}" onchange="window.updateItemField(${index}, 'atkPercent', parseFloat(this.value))"></div>
        <div class="form-item"><label>防禦百分比 (%)</label><input type="number" step="0.1" value="${item.defPercent || 0}" onchange="window.updateItemField(${index}, 'defPercent', parseFloat(this.value))"></div>
        <div class="form-item"><label>生命百分比 (%)</label><input type="number" step="0.1" value="${item.hpPercent || 0}" onchange="window.updateItemField(${index}, 'hpPercent', parseFloat(this.value))"></div>
        <div class="form-item"><label>暴擊率 (%)</label><input type="number" step="0.1" value="${item.critRate || 0}" onchange="window.updateItemField(${index}, 'critRate', parseFloat(this.value))"></div>
        <div class="form-item"><label>暴擊傷害 (%)</label><input type="number" step="0.1" value="${item.critDmg || 0}" onchange="window.updateItemField(${index}, 'critDmg', parseFloat(this.value))"></div>
        <div class="form-item"><label>吸血 (%)</label><input type="number" step="0.1" value="${item.lifesteal || 0}" onchange="window.updateItemField(${index}, 'lifesteal', parseFloat(this.value))"></div>
        <div class="form-item"><label>速度加成</label><input type="number" value="${item.speed || 0}" onchange="window.updateItemField(${index}, 'speed', parseFloat(this.value))"></div>
      `;
    }

    let consumableHtml = '';
    if (isConsumable) {
      consumableHtml = `
        <div class="sub-title">💊 消耗品效果設置</div>
        <div class="form-item">
          <label>效果類型 (useEffect)</label>
          <select onchange="window.updateItemField(${index}, 'useEffect', this.value)">
            <option value="None" ${item.useEffect === 'None' ? 'selected' : ''}>無</option>
            <option value="AddExp" ${item.useEffect === 'AddExp' ? 'selected' : ''}>增加經驗 (AddExp)</option>
            <option value="AddStat" ${item.useEffect === 'AddStat' ? 'selected' : ''}>永久增加屬性 (AddStat)</option>
          </select>
        </div>
        <div class="form-item"><label>效果數值 (useValue)</label><input type="number" value="${item.useValue || 0}" onchange="window.updateItemField(${index}, 'useValue', parseFloat(this.value))"></div>
        <div class="form-item">
          <label>屬性Key (若是AddStat)</label>
          <select onchange="window.updateItemField(${index}, 'useStatKey', this.value)">
            <option value="">(無)</option>
            <option value="fengRui" ${item.useStatKey === 'fengRui' ? 'selected' : ''}>鋒銳</option>
            <option value="hunHou" ${item.useStatKey === 'hunHou' ? 'selected' : ''}>渾厚</option>
            <option value="lingDong" ${item.useStatKey === 'lingDong' ? 'selected' : ''}>靈動</option>
            <option value="jianRen" ${item.useStatKey === 'jianRen' ? 'selected' : ''}>堅韌</option>
            <option value="guiMi" ${item.useStatKey === 'guiMi' ? 'selected' : ''}>詭秘</option>
            <option value="jueQing" ${item.useStatKey === 'jueQing' ? 'selected' : ''}>絕情</option>
          </select>
        </div>
      `;
    }

    const div = document.createElement('div');
    div.className = 'card';
    div.style.background = '#111';
    div.innerHTML = `
      <div class="card-header">
        <h4 style="color:#3498db;">${item.icon || '📦'} ${item.name || '未命名'} (ID: ${item.id})</h4>
        <div>
          <button class="btn-grant" onclick="window.grantItemToPlayer('${item.id}')">🎁 發送到背包</button>
          <button class="btn-del" onclick="window.deleteItemTemplate(${index})">刪除物品</button>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-item"><label>物品 ID (英文唯一識別碼)</label><input type="text" value="${item.id}" onchange="window.updateItemField(${index}, 'id', this.value)"></div>
        <div class="form-item"><label>物品名稱</label><input type="text" value="${item.name}" onchange="window.updateItemField(${index}, 'name', this.value)"></div>
        <div class="form-item">
          <label>物品分類</label>
          <select onchange="window.updateItemField(${index}, 'category', this.value); renderItemList();">
            <option value="weapon" ${item.category === 'weapon' ? 'selected' : ''}>武器 (weapon)</option>
            <option value="armor" ${item.category === 'armor' ? 'selected' : ''}>防具/衣服 (armor)</option>
            <option value="accessory" ${item.category === 'accessory' ? 'selected' : ''}>飾品 (accessory)</option>
            <option value="consumable" ${item.category === 'consumable' ? 'selected' : ''}>消耗品 (consumable)</option>
            <option value="material" ${item.category === 'material' ? 'selected' : ''}>材料 (material)</option>
            <option value="quest" ${item.category === 'quest' ? 'selected' : ''}>任務 (quest)</option>
          </select>
        </div>
        <div class="form-item"><label>圖標 (Emoji)</label><input type="text" value="${item.icon || '📦'}" onchange="window.updateItemField(${index}, 'icon', this.value)"></div>
        <div class="form-item"><label>最大堆疊數 (maxStack)</label><input type="number" value="${item.maxStack || 99}" onchange="window.updateItemField(${index}, 'maxStack', parseInt(this.value))"></div>
        <div class="form-item full"><label>物品描述</label><textarea onchange="window.updateItemField(${index}, 'desc', this.value)">${item.desc || ''}</textarea></div>
        ${equipStatsHtml}
        ${consumableHtml}
      </div>
    `;
    list.appendChild(div);
  });
}

window.updateItemField = function(index, key, val) {
  if (window.gameItems[index]) {
    window.gameItems[index][key] = val;
    saveData();
  }
};

window.grantItemToPlayer = function(itemId) {
  const template = window.gameItems.find(i => i.id === itemId);
  if (!template) return alert('找不到該物品模板！');

  if (!window.INVENTORY) window.INVENTORY = [];

  let isEquip = ['weapon', 'armor', 'accessory'].includes(template.category);
  if (isEquip) {
    let inst = generateRandomInstance(itemId);
    if (inst) {
      window.INVENTORY.push(inst);
    }
  } else {
    let existing = window.INVENTORY.find(i => i.itemId === itemId && !i.equippedBy);
    let maxStack = template.maxStack || 99;
    if (existing && (existing.count || 1) < maxStack) {
      existing.count = (existing.count || 1) + 1;
    } else {
      window.INVENTORY.push({
        uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1000),
        itemId: itemId,
        quality: 'white',
        count: 1,
        equippedBy: ''
      });
    }
  }
  saveData();
  alert(`🎁 成功發送「${template.name}」到玩家背包！`);
};

window.addNewItemTemplate = function() {
  window.gameItems.push({
    id: 'item_' + Date.now(),
    name: '新物品',
    category: 'material',
    icon: '📦',
    desc: '',
    maxStack: 9999,
    useEffect: 'None',
    useValue: 0
  });
  saveData();
  renderItemList();
};

window.deleteItemTemplate = function(index) {
  if (confirm('確定刪除此物品模板？')) {
    window.gameItems.splice(index, 1);
    saveData();
    renderItemList();
  }
};
