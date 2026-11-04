// tab_main_ui.js - 主畫面 UI 配置模組 (支援卡片背景圖 + 摘星樓入口編輯)
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

  // ★ 補全摘星樓入口配置
  if (!mainConfig.towerEntry) {
    mainConfig.towerEntry = {
      enabled: true,
      name: '摘星樓',
      bgUrl: '',
      icon: '🏯'
    };
  } else {
    if (mainConfig.towerEntry.enabled === undefined) mainConfig.towerEntry.enabled = true;
    if (!mainConfig.towerEntry.name) mainConfig.towerEntry.name = '摘星樓';
    if (mainConfig.towerEntry.bgUrl === undefined) mainConfig.towerEntry.bgUrl = '';
    if (!mainConfig.towerEntry.icon) mainConfig.towerEntry.icon = '🏯';
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
        在此設定遊戲主畫面 (index.html) 的背景圖片、右側主線卡片、摘星樓入口，以及左側導覽按鈕。
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

        <!-- 卡片專屬背景圖 URL -->
        <div style="margin-top: 5px; padding-top: 8px; border-top: 1px dashed #333;">
          <label style="font-size:11px; color:#e67e22; font-weight:bold; display:block; margin-bottom:2px;">卡片背景圖片 URL (選填)</label>
          <input type="text" id="stage-card-bg" value="${mainConfig.stageCard.bgUrl || ''}" placeholder="留空則使用預設深色底。建議填入 assets/ 路徑" style="background:#16213e; color:#e67e22; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('bgUrl', this.value)">
        </div>
      </div>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- ★ 摘星樓入口配置 -->
      <div class="sub-title">🏯 摘星樓入口配置（劇本卡片正下方）</div>
      <div style="background:#0f0f1a; border:1px solid #333; padding:14px; border-radius:6px; margin-top:8px;">
        <p style="font-size:12px; color:#888; margin-bottom:12px; line-height:1.6;">
          入口卡片尺寸固定為「劇本卡片寬度的一半（170px × 130px）」，位置在劇本卡片正下方靠右。<br>
          顯示資訊會自動根據玩家的「帳號等級」與「摘星樓進度」動態更新。
        </p>

        <!-- 開關 -->
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; padding:8px 12px; background:#16213e; border-radius:6px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; color:#2ecc71; font-weight:bold;">
            <input type="checkbox" ${mainConfig.towerEntry.enabled ? 'checked' : ''} onchange="updateTowerEntryField('enabled', this.checked)" style="width:16px; height:16px; cursor:pointer;">
            在主畫面顯示摘星樓入口
          </label>
        </div>

        <div style="display:grid; grid-template-columns:80px 1fr 200px; gap:10px; margin-bottom:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">圖示</label>
            <input type="text" value="${mainConfig.towerEntry.icon || '🏯'}" maxlength="4" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:18px; text-align:center;" oninput="updateTowerEntryField('icon', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">名稱</label>
            <input type="text" value="${mainConfig.towerEntry.name || '摘星樓'}" style="background:#16213e; color:#f1c40f; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:13px; font-weight:bold;" oninput="updateTowerEntryField('name', this.value)">
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px; width:100%;" onclick="previewTowerEntry()">👁️ 在主頁預覽</button>
          </div>
        </div>

        <div style="margin-bottom:10px;">
          <label style="font-size:11px; color:#e67e22; display:block; margin-bottom:2px;">卡片背景圖片 URL (選填)</label>
          <input type="text" value="${mainConfig.towerEntry.bgUrl || ''}" placeholder="留空則使用預設金紫色漸變背景" style="background:#16213e; color:#e67e22; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateTowerEntryField('bgUrl', this.value); refreshTowerPreview();">
        </div>

        <!-- 迷你預覽 -->
        <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #333;">
          <label style="font-size:11px; color:#aaa; display:block; margin-bottom:6px;">📱 預覽效果</label>
          <div id="tower-entry-preview" style="
            width:170px; height:130px; margin:0 auto;
            border-radius:12px; position:relative; overflow:hidden;
            border:2px solid #f1c40f;
            box-shadow: 0 6px 20px rgba(241,196,15,0.3);
            display:flex; align-items:center; justify-content:center;
          ">
            <div id="tower-entry-preview-bg" style="
              position:absolute; inset:0;
              background-size:cover; background-position:center;
              filter: brightness(0.4); z-index:1;
            "></div>
            <div style="position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center; padding:10px;">
              <div id="tower-entry-preview-icon" style="font-size:42px; line-height:1; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">${mainConfig.towerEntry.icon || '🏯'}</div>
              <div id="tower-entry-preview-name" style="color:#f1c40f; font-size:15px; font-weight:bold; text-shadow:0 2px 4px rgba(0,0,0,0.8);">${mainConfig.towerEntry.name || '摘星樓'}</div>
              <div style="color:#ccc; font-size:11px; background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:8px;">第 1 層待挑戰</div>
            </div>
          </div>
          <p style="font-size:11px; color:#666; text-align:center; margin-top:8px;">※ 玩家未達解鎖等級時，卡片會變灰並顯示「需要 Lv.X」</p>
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
  setTimeout(refreshTowerPreview, 50);
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

// ============ 摘星樓入口預覽刷新 ============
function refreshTowerPreview() {
  const cfg = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (!cfg || !cfg.towerEntry) return;

  const iconEl = document.getElementById('tower-entry-preview-icon');
  const nameEl = document.getElementById('tower-entry-preview-name');
  const bgEl = document.getElementById('tower-entry-preview-bg');
  const cardEl = document.getElementById('tower-entry-preview');

  if (iconEl) iconEl.innerText = cfg.towerEntry.icon || '🏯';
  if (nameEl) nameEl.innerText = cfg.towerEntry.name || '摘星樓';
  if (bgEl) {
    if (cfg.towerEntry.bgUrl && cfg.towerEntry.bgUrl.trim()) {
      bgEl.style.backgroundImage = `url('${encodeURI(cfg.towerEntry.bgUrl.trim())}')`;
      bgEl.style.background = '';
    } else {
      bgEl.style.backgroundImage = 'none';
      bgEl.style.background = 'linear-gradient(135deg, #2a1a2e 0%, #1a1c29 100%)';
    }
  }
  if (cardEl) {
    cardEl.style.opacity = cfg.towerEntry.enabled ? '1' : '0.35';
  }
}

window.refreshTowerPreview = refreshTowerPreview;

window.updateTowerEntryField = function(field, value) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config')) || {};
  if (!config.towerEntry) {
    config.towerEntry = { enabled: true, name: '摘星樓', bgUrl: '', icon: '🏯' };
  }
  config.towerEntry[field] = value;
  localStorage.setItem('my_game_main_config', JSON.stringify(config));

  // 即時更新預覽
  if (field === 'icon' || field === 'name') {
    const iconEl = document.getElementById('tower-entry-preview-icon');
    const nameEl = document.getElementById('tower-entry-preview-name');
    if (iconEl) iconEl.innerText = config.towerEntry.icon || '🏯';
    if (nameEl) nameEl.innerText = config.towerEntry.name || '摘星樓';
  }
  if (field === 'bgUrl') {
    refreshTowerPreview();
  }
  if (field === 'enabled') {
    refreshTowerPreview();
  }
};

window.previewTowerEntry = function() {
  // 打開主頁並聚焦到摘星樓入口（以新窗口打開，方便比對）
  const win = window.open('index.html?t=' + Date.now(), '_blank');
  if (!win) {
    alert('彈窗被阻擋，請允許彈窗或手動打開 index.html 查看效果');
  }
};

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
