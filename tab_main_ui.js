// tab_main_ui.js - 主畫面與 UI 配置模組
window.renderTabMainUI = function(container) {
  let mainConfig = JSON.parse(localStorage.getItem('my_game_main_config')) || {
    // 預設主畫面背景圖庫
    bgList: [
      { id: 'bg_01', name: '破廟夜色', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', unlocked: true },
      { id: 'bg_02', name: '江南煙雨', url: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1200&auto=format&fit=crop', unlocked: false }
    ],
    // 左側與功能按鈕開關狀態 (active: 是否顯示, icon: 圖標或圖片URL, title: 顯示名稱)
    buttons: {
      profile: { title: '玩家檔案', icon: '👤', active: true },
      story: { title: '劇本歷程', icon: '📜', active: true },
      character: { title: '人物編隊', icon: '👥', active: true },
      backpack: { title: '背包裝備', icon: '🎒', active: true },
      quest: { title: '江湖任務', icon: '📋', active: false, statusText: '敬請期待' },
      shop: { title: '珍寶商店', icon: '🛒', active: false, statusText: '敬請期待' },
      settings: { title: '系統設置', icon: '⚙️', active: true }
    }
  };

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>🖼️ 主畫面 UI 與背景配置</h3>
        <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="saveMainConfigDirect()">💾 儲存主畫面設定</button>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此設定遊戲主畫面 (index.html) 的背景圖片庫，以及各個功能按鈕的顯示狀態與圖標預留。
      </p>

      <!-- 背景圖管理區 -->
      <div class="sub-title" style="margin-top:10px;">🏞️ 可解鎖背景圖庫管理</div>
      <div id="bg-list-editor" style="display:flex; flex-direction:column; gap:10px; margin-top:8px;"></div>
      <button class="btn" style="background:#3498db; margin-top:10px; font-size:12px;" onclick="addBgImage()">➕ 新增解鎖背景圖</button>

      <hr style="border:none; border-top:1px solid #333; margin:20px 0;">

      <!-- 功能按鈕開關區 -->
      <div class="sub-title">🔘 主介面按鈕顯示與狀態控制</div>
      <div id="btn-list-editor" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:8px;"></div>
    </div>
  `;

  renderBgList(mainConfig);
  renderBtnList(mainConfig);
};

// 渲染背景圖片清單
function renderBgList(config) {
  const container = document.getElementById('bg-list-editor');
  if (!container) return;
  container.innerHTML = '';

  config.bgList.forEach((bg, index) => {
    const item = document.createElement('div');
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; gap:10px; align-items:center;";
    item.innerHTML = `
      <img src="${bg.url}" style="width:70px; height:45px; object-fit:cover; border-radius:4px; border:1px solid #444;">
      <div style="flex:1;">
        <input type="text" value="${bg.name}" style="background:#16213e; color:#fff; border:1px solid #444; padding:4px 8px; border-radius:4px; width:120px; font-size:12px;" oninput="updateBgField(${index}, 'name', this.value)">
        <input type="text" value="${bg.url}" style="background:#16213e; color:#aaa; border:1px solid #444; padding:4px 8px; border-radius:4px; width:220px; font-size:12px; margin-left:5px;" oninput="updateBgField(${index}, 'url', this.value)">
      </div>
      <label style="font-size:12px; color:#aaa;">
        <input type="checkbox" ${bg.unlocked ? 'checked' : ''} onchange="updateBgField(${index}, 'unlocked', this.checked)"> 預設已解鎖
      </label>
      <button class="btn-del" onclick="deleteBgImage(${index})" style="font-size:12px;">刪除</button>
    `;
    container.appendChild(item);
  });
}

// 渲染按鈕控制列表
function renderBtnList(config) {
  const container = document.getElementById('btn-list-editor');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(config.buttons).forEach(key => {
    const btn = config.buttons[key];
    const item = document.createElement('div');
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;";
    item.innerHTML = `
      <div>
        <span style="font-size:16px; margin-right:6px;">${btn.icon}</span>
        <strong style="color:#fff; font-size:13px;">${btn.title}</strong>
        <span style="font-size:11px; color:#888; margin-left:5px;">(${key})</span>
      </div>
      <label style="font-size:12px; color:#3498db; cursor:pointer;">
        <input type="checkbox" ${btn.active ? 'checked' : ''} onchange="updateBtnActive('${key}', this.checked)"> 啟用/開放
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

window.updateBtnActive = function(key, active) {
  let config = JSON.parse(localStorage.getItem('my_game_main_config'));
  if (config && config.buttons[key]) {
    config.buttons[key].active = active;
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
  alert('✅ 主畫面 UI 配置已儲存！');
};
