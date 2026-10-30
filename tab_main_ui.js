// tab_main_ui.js - 主畫面 UI 配置模組 (支援卡片背景圖編輯)
window.renderTabMainUI = function(container) {
  let mainConfig = JSON.parse(localStorage.getItem('my_game_main_config')) || {};

  // 確保結構完整
  if (!mainConfig.bgList) {
    mainConfig.bgList = [
      { id: 'bg_01', name: '破廟夜色', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', unlocked: true }
    ];
  }
  if (!mainConfig.stageCard) {
    mainConfig.stageCard = { tag: '當前江湖主線', title: '第一章：青城山變', desc: '探索江湖風雲，解鎖沉浸式武俠劇本與策略戰棋關卡。', bgUrl: '' };
  } else if (mainConfig.stageCard.bgUrl === undefined) {
    mainConfig.stageCard.bgUrl = ''; // 兼容舊存檔
  }
  
  if (!mainConfig.buttons || Object.keys(mainConfig.buttons).length === 0) {
    mainConfig.buttons = {
      character: { title: '角色與背包', icon: '👥', active: true, action: 'character' },
      shop: { title: '坊市入口', icon: '🛒', active: true, action: 'shop' },
      settings: { title: '系統設置', icon: '⚙️', active: true, action: 'settings' }
    };
  } else {
    if (mainConfig.buttons.story) {
      mainConfig.buttons.shop = { title: '坊市入口', icon: '🛒', active: true, action: 'shop' };
      delete mainConfig.buttons.story;
    }
  }

  localStorage.setItem('my_game_main_config', JSON.stringify(mainConfig));

  container.innerHTML = `
    <div class="card" style="max-height: 80vh; overflow-y: auto; padding-right: 5px;">
      <div class="card-header" style="position: sticky; top: 0; background: #1a1c29; z-index: 10; padding-bottom: 10px;">
        <h3>🖼️ 主畫面 UI 與背景配置</h3>
        <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="saveMainConfigDirect()">💾 儲存主畫面設定</button>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此設定遊戲主畫面 (index.html) 的背景圖片、右側主線卡片，以及左側導覽按鈕。
      </p>

      <!-- 背景圖管理區 -->
      <div class="sub-title" style="margin-top:10px;">🏞️ 可解鎖背景圖庫管理 (全螢幕背景)</div>
      <div id="bg-list-editor" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
      <button class="btn" style="background:#3498db; margin-top:10px; font-size:12px;" onclick="addBgImage()">➕ 新增解鎖背景圖</button>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- 右側主線卡片設定區 -->
      <div class="sub-title">📜 大廳右側主線卡片配置</div>
      <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <div style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">標籤 (Tag)</label>
            <input type="text" id="stage-card-tag" value="${mainConfig.stageCard.tag || ''}" style="background:#16213e; color:#f1c40f; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('tag', this.value)">
          </div>
          <div style="flex:2;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">主標題 (Title)</label>
            <input type="text" id="stage-card-title" value="${mainConfig.stageCard.title || ''}" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('title', this.value)">
          </div>
        </div>
        <div>
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">說明文字 (Description)</label>
          <textarea id="stage-card-desc" rows="2" style="background:#16213e; color:#aaa; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px; resize:vertical;" oninput="updateStageCardField('desc', this.value)">${mainConfig.stageCard.desc || ''}</textarea>
        </div>
        
        <!-- ★ 新增：卡片專屬背景圖 URL -->
        <div style="margin-top: 5px; padding-top: 8px; border-top: 1px dashed #333;">
          <label style="font-size:11px; color:#e67e22; font-weight:bold; display:block; margin-bottom:2px;">卡片背景圖片 URL (選填)</label>
          <input type="text" id="stage-card-bg" value="${mainConfig.stageCard.bgUrl || ''}" placeholder="留空則使用預設深色底。建議填入 assets/ 路徑" style="background:#16213e; color:#e67e22; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('bgUrl', this.value)">
        </div>

      </div>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- 左側功能按鈕編輯區 -->
      <div class="sub-title">🔘 左側功能按鈕管理</div>
      <div id="btn-list-editor" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
      <button class="btn" style="background:#3498db; margin-top:10px; font-size:12px;" onclick="addMainButton()">➕ 新增左側導覽按鈕</button>
    </div>
  `;

  renderBgList(mainConfig);
  renderBtnList(mainConfig);
};

function renderBgList(config) {
  const container = document.getElementById('bg-list-editor');
  if (!container) return;
  container.innerHTML = '';

  config.bgList.forEach((bg, index) => {
    const item = document.createElement('div');
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; gap:10px; align-items:center; flex-wrap: wrap;";
    item.innerHTML = `
      <img src="${bg.url}" style="width:70px; height:45px; object-fit:cover; border-radius:4px; border:1px solid #444;" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop'">
      <div style="flex:1; min-width: 200px;">
        <input type="text" value="${bg.name || ''}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px 8px; border-radius:4px; width:110px; font-size:12px;" oninput="updateBgField(${index}, 'name', this.value)">
        <input type="text" value="${bg.url || ''}" style="background:#16213e; color:#aaa; border:1px solid #444; padding:4px 8px; border-radius:4px; width:180px; font-size:12px; margin-left:5px;" oninput="updateBgField(${index}, 'url', this.value)">
      </div>
      <label style="font-size:12px; color:#aaa; display:flex; align-items:center; gap:4px;">
        <input type="checkbox" ${bg.unlocked ? 'checked' : ''} onchange="updateBgField(${index}, 'unlocked', this.checked)"> 預設已解鎖
      </label>
      <button class="btn-del" onclick="deleteBgImage(${index})" style="font-size:12px;">刪除</button>
    `;
    container.appendChild(item);
  });
}

function renderBtnList(config) {
  const container = document.getElementById('btn-list-editor');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(config.buttons).forEach(key => {
    const btn = config.buttons[key];
    const item = document.createElement('div');
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;";
    
    item.innerHTML = `
      <input type="text" value="${btn.icon || '📌'}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; width:40px; text-align:center; font-size:16px;" oninput="updateBtnField('${key}', 'icon', this.value)" title="圖標">
      <input type="text" value="${btn.title || ''}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px 8px; border-radius:4px; width:130px; font-size:12px;" oninput="updateBtnField('${key}', 'title', this.value)" title="按鈕名稱">
      
      <select style="background:#16213e; color:#aaa; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px;" onchange="updateBtnField('${key}', 'action', this.value)" title="點擊觸發動作">
        <option value="character" ${btn.action === 'character' ? 'selected' : ''}>開啟人物與背包</option>
        <option value="shop" ${btn.action === 'shop' ? 'selected' : ''}>開啟坊市入口</option>
        <option value="story" ${btn.action === 'story' ? 'selected' : ''}>進入江湖劇本</option>
        <option value="settings" ${btn.action === 'settings' ? 'selected' : ''}>系統設置</option>
        <option value="toast" ${btn.action === 'toast' ? 'selected' : ''}>顯示提示訊息</option>
      </select>

      <label style="font-size:12px; color:#3498db; cursor:pointer; display:flex; align-items:center; gap:4px; margin-left:auto;">
        <input type="checkbox" ${btn.active ? 'checked' : ''} onchange="updateBtnField('${key}', 'active', this.checked)"> 啟用
      </label>
      <button class="btn-del" onclick="deleteMainButton('${key}')" style="font-size:12px; background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">刪除</button>
    `;
    container.appendChild(item);
  });
}

window.updateBgField = function(index, field, value) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config && config.bgList[index]) {
    config.bgList[index][field] = value;
    localStorage.setItem('my_game_main_config', JSON.stringify(config));
  }
};

window.updateStageCardField = function(field, value) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config')) || {};
  if (!config.stageCard) config.stageCard = {};
  config.stageCard[field] = value;
  localStorage.setItem('my_game_main_config', JSON.stringify(config));
};

window.updateBtnField = function(key, field, value) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config && config.buttons[key]) {
    config.buttons[key][field] = value;
    localStorage.setItem('my_game_main_config', JSON.stringify(config));
  }
};

window.addMainButton = function() {
  let config = JSON.parse(localStorage.getItem('my_game_main_config')) || { buttons: {} };
  const newKey = 'btn_' + Date.now();
  if (!config.buttons) config.buttons = {};
  config.buttons[newKey] = { title: '新按鈕', icon: '👤', active: true, action: 'character' };
  localStorage.setItem('my_game_main_config', JSON.stringify(config));
  window.renderTabMainUI(document.getElementById('app-content'));
};

window.deleteMainButton = function(key) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config && config.buttons && config.buttons[key]) {
    delete config.buttons[key];
    localStorage.setItem('my_game_main_config', JSON.stringify(config));
    window.renderTabMainUI(document.getElementById('app-content'));
  }
};

window.addBgImage = function() {
  let config = JSON.parse(localStorage.getItem('my_game_main_config')) || { bgList: [], buttons: {} };
  config.bgList.push({
    id: 'bg_' + Date.now(),
    name: '新風景背景',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop',
    unlocked: false
  });
  localStorage.setItem('my_game_main_config', JSON.stringify(config));
  window.renderTabMainUI(document.getElementById('app-content'));
};

window.deleteBgImage = function(index) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config && config.bgList) {
    config.bgList.splice(index, 1);
    localStorage.setItem('my_game_main_config', JSON.stringify(config));
    window.renderTabMainUI(document.getElementById('app-content'));
  }
};

window.saveMainConfigDirect = function() {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config) {
    localStorage.setItem('my_game_main_config', JSON.stringify(config));
  }
  alert('✅ 主畫面 UI 配置與按鈕設定已成功儲存！');
};
