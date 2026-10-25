// tab_main_ui.js - 主畫面與 UI 配置模組 (完整支援背景、右側主線、左側按鈕編輯)
window.renderTabMainUI = function(container) {
  let mainConfig = JSON.parse(localStorage.getItem('my_game_main_config')) || {
    bgList: [
      { id: 'bg_01', name: '破廟夜色', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', unlocked: true },
      { id: 'bg_02', name: '江南煙雨', url: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1200&auto=format&fit=crop', unlocked: false }
    ],
    stageCard: {
      tag: '當前江湖主線',
      title: '第一章：青城山變',
      desc: '探索江湖風雲，解鎖沉浸式武俠劇本與策略戰棋關卡。'
    },
    buttons: {
      story: { title: '江湖歷程', icon: '📜', active: true },
      character: { title: '角色與背包', icon: '👥', active: true },
      settings: { title: '系統設置', icon: '⚙️', active: true }
    }
  };

  container.innerHTML = `
    <div class="card" style="max-height: 80vh; overflow-y: auto; padding-right: 5px;">
      <div class="card-header" style="position: sticky; top: 0; background: #1a1c29; z-index: 10; padding-bottom: 10px;">
        <h3>🖼️ 主畫面 UI 與背景配置</h3>
        <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="saveMainConfigDirect()">💾 儲存主畫面設定</button>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此設定遊戲主畫面 (index.html) 的背景、右側主線卡片資訊，以及左側功能按鈕的圖標、名稱與開關。
      </p>

      <!-- 背景圖管理區 -->
      <div class="sub-title" style="margin-top:10px;">🏞️ 可解鎖背景圖庫管理</div>
      <div id="bg-list-editor" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
      <button class="btn" style="background:#3498db; margin-top:10px; font-size:12px;" onclick="addBgImage()">➕ 新增解鎖背景圖</button>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- 右側主線卡片設定區 -->
      <div class="sub-title">📜 大廳右側主線卡片配置</div>
      <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        <div style="display:flex; gap:10px;">
          <div style="flex:1;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">標籤 (Tag)</label>
            <input type="text" id="stage-card-tag" value="${mainConfig.stageCard?.tag || '當前江湖主線'}" style="background:#16213e; color:#f1c40f; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('tag', this.value)">
          </div>
          <div style="flex:2;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">主標題 (Title)</label>
            <input type="text" id="stage-card-title" value="${mainConfig.stageCard?.title || ''}" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateStageCardField('title', this.value)">
          </div>
        </div>
        <div>
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">說明文字 (Description)</label>
          <textarea id="stage-card-desc" rows="2" style="background:#16213e; color:#aaa; border:1px solid #444; padding:6px 8px; border-radius:4px; width:100%; font-size:12px; resize:vertical;" oninput="updateStageCardField('desc', this.value)">${mainConfig.stageCard?.desc || ''}</textarea>
        </div>
      </div>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- 左側功能按鈕編輯區 -->
      <div class="sub-title">🔘 左側功能按鈕編輯與狀態控制</div>
      <div id="btn-list-editor" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
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
        <input type="text" value="${bg.name}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px 8px; border-radius:4px; width:110px; font-size:12px;" oninput="updateBgField(${index}, 'name', this.value)">
        <input type="text" value="${bg.url}" style="background:#16213e; color:#aaa; border:1px solid #444; padding:4px 8px; border-radius:4px; width:180px; font-size:12px; margin-left:5px;" oninput="updateBgField(${index}, 'url', this.value)">
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
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; gap:10px; align-items:center;";
    item.innerHTML = `
      <input type="text" value="${btn.icon}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; width:40px; text-align:center; font-size:16px;" oninput="updateBtnField('${key}', 'icon', this.value)" title="圖標">
      <div style="flex:1;">
        <input type="text" value="${btn.title}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px 8px; border-radius:4px; width:100%; font-size:12px;" oninput="updateBtnField('${key}', 'title', this.value)" title="按鈕名稱">
      </div>
      <span style="font-size:11px; color:#888;">(${key})</span>
      <label style="font-size:12px; color:#3498db; cursor:pointer; display:flex; align-items:center; gap:4px;">
        <input type="checkbox" ${btn.active ? 'checked' : ''} onchange="updateBtnField('${key}', 'active', this.checked)"> 啟用
      </label>
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
  alert('✅ 主畫面 UI 配置與右側主線卡片設定已成功儲存！');
};
