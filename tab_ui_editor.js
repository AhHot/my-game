// tab_ui_editor.js - 所見即所得 (WYSIWYG) 劇本內容與 UI 佈局全能編輯器
window.renderTabUIEditor = function(container) {
  // 1. 初始化或讀取完整劇本與 UI 數據
  let defaultFullData = {
    // 佈局座標與尺寸 (1280x720)
    layout: {
      topNav: { x: 0, y: 0, w: 1280, h: 60, visible: true, name: '頂部欄' },
      leftTab: { x: 30, y: 80, w: 250, h: 560, visible: true, name: '左側 Tab 鏈' },
      rightSlider: { x: 300, y: 100, w: 940, h: 520, visible: true, name: '右側關卡卡片區' },
      bottomNav: { x: 0, y: 660, w: 1280, h: 60, visible: true, name: '底部功能列' }
    },
    // 左側 Tab 分類清單
    categories: [
      { id: 'main', name: '本篇主線' },
      { id: 'sub', name: '外傳江湖' },
      { id: 'daily', name: '日常試煉' },
      { id: 'event', name: '限時活動' }
    ],
    // 各 Tab 分類對應的章節大卡片數據
    chapters: {
      main: [
        { id: 'm1', title: '第一章：青城山變', progress: '0/7', cover: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1000&auto=format&fit=crop' },
        { id: 'm2', title: '第二章：江南煙雨', progress: '0/8', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop' }
      ],
      sub: [
        { id: 's1', title: '外傳：竹林隱逸', progress: '0/5', cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop' }
      ]
    },
    // 底部按鈕清單
    bottomButtons: ['戰鬥畫面', '本篇', '外傳', '研修', '資源', '挑戰'],
    activeTabId: 'main'
  };

  let fullData = JSON.parse(localStorage.getItem('my_game_ui_full_config')) || defaultFullData;
  window.uiFullData = fullData;
  window.selectedUIModule = 'layout'; // layout, categories, chapters, bottomNav

  container.innerHTML = `
    <div class="card" style="background:#111217; border:1px solid #222;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <h3 style="color:#00ffff;">🎨 劇本介面「所見即所得」內容與 UI 編輯器</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" style="background:#e74c3c; font-size:12px; padding:6px 12px;" onclick="resetUIPageConfig()">🔄 重置預設</button>
          <button class="btn" style="background:#2ecc71; font-size:12px; padding:6px 16px; font-weight:bold;" onclick="saveUIPageConfig()">💾 保存整體介面與內容</button>
        </div>
      </div>

      <div style="display: flex; gap: 15px; margin-bottom: 15px; flex-wrap: wrap;">
        <button class="btn" style="background:#3498db; font-size:12px; flex:1;" onclick="switchEditorModule('layout')">📐 1. 調整區塊座標與尺寸</button>
        <button class="btn" style="background:#9b59b6; font-size:12px; flex:1;" onclick="switchEditorModule('categories')">🏷️ 2. 管理左側 Tab 功能</button>
        <button class="btn" style="background:#e67e22; font-size:12px; flex:1;" onclick="switchEditorModule('chapters')">🖼️ 3. 管理右側章節關卡卡片</button>
        <button class="btn" style="background:#1abc9c; font-size:12px; flex:1;" onclick="switchEditorModule('bottomNav')">🔘 4. 管理底部導覽按鈕</button>
      </div>

      <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
        <!-- 核心：真實遊戲畫面預覽畫布 (1280x720) -->
        <div style="position: relative; flex: 1; min-width: 320px;">
          <div id="wysiwyg-viewport" style="width: 100%; max-width: 896px; height: 504px; background: #08090c; border: 2px solid #333; position: relative; overflow: hidden; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.9);">
            <!-- 背景網格 -->
            <div style="position:absolute; inset:0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size:28px 28px; pointer-events:none;"></div>
            
            <!-- 實機縮放畫布 -->
            <div id="wysiwyg-canvas" style="width: 1280px; height: 720px; transform: scale(0.7); transform-origin: 0 0; position: absolute; top:0; left:0;"></div>
          </div>
          <div style="font-size:11px; color:#666; text-align:center; margin-top:6px;">🎮 遊戲預覽畫布 (預覽與即時縮放對齊 1280x720)</div>
        </div>

        <!-- 右側動態編輯面板 -->
        <div style="width: 340px; background: #161a23; border: 1px solid #333; padding: 15px; border-radius: 8px;" id="module-editor-panel">
        </div>
      </div>
    </div>
  `;

  renderWYSIWYGCanvas();
  renderModuleControlPanel();
};

window.switchEditorModule = function(mod) {
  window.selectedUIModule = mod;
  renderWYSIWYGCanvas();
  renderModuleControlPanel();
};

// 🌟 渲染真實遊戲質感的預覽畫布
function renderWYSIWYGCanvas() {
  const canvas = document.getElementById('wysiwyg-canvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  const data = window.uiFullData;
  const layout = data.layout;
  const currentCatId = data.activeTabId || (data.categories[0] ? data.categories[0].id : 'main');

  // 1. 頂部欄渲染
  if (layout.topNav && layout.topNav.visible) {
    const topEl = document.createElement('div');
    topEl.style.cssText = `
      position: absolute; left: ${layout.topNav.x}px; top: ${layout.topNav.y}px;
      width: ${layout.topNav.w}px; height: ${layout.topNav.h}px;
      background: rgba(15, 17, 23, 0.9); border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex; justify-content: space-between; align-items: center; padding: 0 30px;
      z-index: 10; color: #fff; font-size: 14px; font-weight: bold;
    `;
    topEl.innerHTML = `<div>◀ 返回大廳 &nbsp;&nbsp; 🏠 主頁</div><div>俠客傳記 ▶▶</div>`;
    makeElementInteractable(topEl, 'topNav');
    canvas.appendChild(topEl);
  }

  // 2. 左側 Tab 鏈渲染
  if (layout.leftTab && layout.leftTab.visible) {
    const tabEl = document.createElement('div');
    tabEl.style.cssText = `
      position: absolute; left: ${layout.leftTab.x}px; top: ${layout.leftTab.y}px;
      width: ${layout.leftTab.w}px; height: ${layout.leftTab.h}px;
      display: flex; flex-direction: column; gap: 10px; z-index: 10;
    `;
    
    data.categories.forEach(cat => {
      const isActive = cat.id === currentCatId;
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 12px 18px; background: ${isActive ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255,255,255,0.05)'};
        border-left: 4px solid ${isActive ? '#00ffff' : 'transparent'};
        color: ${isActive ? '#fff' : '#888'}; font-weight: bold; font-size: 14px; border-radius: 4px;
        cursor: pointer; display: flex; justify-content: space-between; align-items: center;
      `;
      item.innerHTML = `<span>● ${cat.name}</span> ${isActive ? '<span style="color:#00ffff;">◆</span>' : ''}`;
      item.onclick = (e) => {
        e.stopPropagation();
        data.activeTabId = cat.id;
        renderWYSIWYGCanvas();
        renderModuleControlPanel();
      };
      tabEl.appendChild(item);
    });

    makeElementInteractable(tabEl, 'leftTab');
    canvas.appendChild(tabEl);
  }

  // 3. 右側關卡大卡片滑動區渲染
  if (layout.rightSlider && layout.rightSlider.visible) {
    const sliderEl = document.createElement('div');
    sliderEl.style.cssText = `
      position: absolute; left: ${layout.rightSlider.x}px; top: ${layout.rightSlider.y}px;
      width: ${layout.rightSlider.w}px; height: ${layout.rightSlider.h}px;
      display: flex; gap: 20px; overflow-x: auto; align-items: center; padding: 10px; z-index: 10;
    `;

    const chapList = data.chapters[currentCatId] || [];
    if (chapList.length === 0) {
      sliderEl.innerHTML = `<div style="color:#666; font-size:16px; margin:auto;">該分類下暫無關卡，請在右側點擊「新增卡片」</div>`;
    } else {
      chapList.forEach(c => {
        const card = document.createElement('div');
        card.style.cssText = `
          width: 500px; height: 320px; flex-shrink: 0; border-radius: 8px; overflow: hidden;
          background: url('${c.cover}') center/cover; position: relative; border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 10px 25px rgba(0,0,0,0.6); display: flex; align-items: flex-end; padding: 20px;
        `;
        card.innerHTML = `
          <div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>
          <div style="position:relative; z-index:2; display:flex; justify-content:space-between; width:100%; align-items:flex-end;">
            <div style="color:#fff; font-size:22px; font-weight:bold;">${c.title}</div>
            <div style="background:rgba(0,0,0,0.7); color:#00ffff; padding:4px 10px; border-radius:4px; font-size:12px;">通關: ${c.progress}</div>
          </div>
        `;
        sliderEl.appendChild(card);
      });
    }

    makeElementInteractable(sliderEl, 'rightSlider');
    canvas.appendChild(sliderEl);
  }

  // 4. 底部功能列渲染
  if (layout.bottomNav && layout.bottomNav.visible) {
    const botEl = document.createElement('div');
    botEl.style.cssText = `
      position: absolute; left: ${layout.bottomNav.x}px; top: ${layout.bottomNav.y}px;
      width: ${layout.bottomNav.w}px; height: ${layout.bottomNav.h}px;
      background: rgba(10, 11, 15, 0.95); border-top: 1px solid rgba(255,255,255,0.1);
      display: flex; justify-content: center; align-items: center; gap: 30px; z-index: 10;
    `;

    data.bottomButtons.forEach((btnName, idx) => {
      const btn = document.createElement('div');
      btn.style.cssText = `color: ${idx === 1 ? '#3699ff' : '#718096'}; font-size: 14px; font-weight: bold; cursor: pointer;`;
      btn.innerText = btnName;
      botEl.appendChild(btn);
    });

    makeElementInteractable(botEl, 'bottomNav');
    canvas.appendChild(botEl);
  }
}

// 拖拽與縮放控制點掛載
function makeElementInteractable(el, key) {
  if (window.selectedUIModule !== 'layout') return; // 只在「調整座標與尺寸」模式下啟用拖動

  el.style.outline = '2px dashed #00ffff';
  el.style.cursor = 'move';

  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.style.cssText = `
    position: absolute; right: -6px; bottom: -6px; width: 18px; height: 18px;
    background: #00ffff; border: 2px solid #000; border-radius: 3px; cursor: se-resize; z-index: 99;
  `;
  el.appendChild(handle);

  const startInteraction = (clientX, clientY, target) => {
    if (target.classList.contains('resize-handle')) {
      startResizing(clientX, clientY, key);
    } else {
      startDragging(clientX, clientY, key);
    }
  };

  el.addEventListener('mousedown', (e) => { e.stopPropagation(); startInteraction(e.clientX, e.clientY, e.target); });
  el.addEventListener('touchstart', (e) => { e.stopPropagation(); const t = e.touches[0]; startInteraction(t.clientX, t.clientY, e.target); }, { passive: true });
}

function startDragging(startX, startY, key) {
  const comp = window.uiFullData.layout[key];
  const initX = comp.x, initY = comp.y, scale = 0.7;

  function onMove(cx, cy) {
    comp.x = Math.max(0, Math.min(1280 - comp.w, Math.round(initX + (cx - startX) / scale)));
    comp.y = Math.max(0, Math.min(720 - comp.h, Math.round(initY + (cy - startY) / scale)));
    renderWYSIWYGCanvas();
  }

  function onEnd() {
    window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', onEnd);
  }
  function mm(e) { onMove(e.clientX, e.clientY); }
  function tm(e) { onMove(e.touches[0].clientX, e.touches[0].clientY); }

  window.addEventListener('mousemove', mm); window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', onEnd);
}

function startResizing(startX, startY, key) {
  const comp = window.uiFullData.layout[key];
  const initW = comp.w, initH = comp.h, scale = 0.7;

  function onMove(cx, cy) {
    comp.w = Math.max(100, Math.round(initW + (cx - startX) / scale));
    comp.h = Math.max(40, Math.round(initH + (cy - startY) / scale));
    renderWYSIWYGCanvas();
  }

  function onEnd() {
    window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', onEnd);
  }
  function mm(e) { onMove(e.clientX, e.clientY); }
  function tm(e) { onMove(e.touches[0].clientX, e.touches[0].clientY); }

  window.addEventListener('mousemove', mm); window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', onEnd);
}

// 🌟 右側模組控制面板邏輯
function renderModuleControlPanel() {
  const panel = document.getElementById('module-editor-panel');
  if (!panel) return;
  const mod = window.selectedUIModule;
  const data = window.uiFullData;

  if (mod === 'layout') {
    panel.innerHTML = `
      <h4 style="color:#00ffff; margin-bottom:10px;">📐 區塊座標與尺寸微調</h4>
      <p style="font-size:12px; color:#aaa; margin-bottom:12px;">直接在畫布上拖動藍色區塊，或在此輸入數值微調：</p>
      ${Object.keys(data.layout).map(k => `
        <div style="background:#0f1218; padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #333;">
          <div style="font-size:12px; color:#f1c40f; font-weight:bold; margin-bottom:4px;">${data.layout[k].name}</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
            <input type="number" value="${data.layout[k].x}" oninput="data.layout['${k}'].x=parseInt(this.value)||0; renderWYSIWYGCanvas();">
            <input type="number" value="${data.layout[k].y}" oninput="data.layout['${k}'].y=parseInt(this.value)||0; renderWYSIWYGCanvas();">
            <input type="number" value="${data.layout[k].w}" oninput="data.layout['${k}'].w=parseInt(this.value)||0; renderWYSIWYGCanvas();">
            <input type="number" value="${data.layout[k].h}" oninput="data.layout['${k}'].h=parseInt(this.value)||0; renderWYSIWYGCanvas();">
          </div>
        </div>
      `).join('')}
    `;
  } else if (mod === 'categories') {
    panel.innerHTML = `
      <h4 style="color:#9b59b6; margin-bottom:10px;">🏷️ 管理左側 Tab 分類</h4>
      <button class="btn" style="background:#2ecc71; width:100%; font-size:12px; padding:6px; margin-bottom:12px;" onclick="addNewCategoryItem()">➕ 新增 Tab 分類</button>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${data.categories.map((cat, idx) => `
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" value="${cat.name}" style="flex:1; background:#0f1218; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;" oninput="data.categories[${idx}].name=this.value; renderWYSIWYGCanvas();">
            <button class="btn-del" onclick="deleteCategoryItem(${idx})">刪</button>
          </div>
        `).join('')}
      </div>
    `;
  } else if (mod === 'chapters') {
    const curCatId = data.activeTabId || (data.categories[0] ? data.categories[0].id : 'main');
    const curCatName = (data.categories.find(c => c.id === curCatId) || {}).name || '當前分類';
    const chapList = data.chapters[curCatId] || [];

    panel.innerHTML = `
      <h4 style="color:#e67e22; margin-bottom:10px;">🖼️ 管理【${curCatName}】的章節卡片</h4>
      <button class="btn" style="background:#3498db; width:100%; font-size:12px; padding:6px; margin-bottom:12px;" onclick="addNewChapterCard('${curCatId}')">➕ 新增章節大圖卡片</button>
      <div style="display:flex; flex-direction:column; gap:12px; max-height:350px; overflow-y:auto;">
        ${chapList.map((chap, idx) => `
          <div style="background:#0f1218; border:1px solid #333; padding:10px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
              <span style="font-size:12px; color:#00ffff; font-weight:bold;">卡片 #${idx + 1}</span>
              <button class="btn-del" style="padding:2px 6px; font-size:10px;" onclick="deleteChapterCard('${curCatId}', ${idx})">刪除</button>
            </div>
            <input type="text" value="${chap.title}" placeholder="章節標題" style="width:100%; margin-bottom:6px; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${curCatId}'][${idx}].title=this.value; renderWYSIWYGCanvas();">
            <input type="text" value="${chap.cover}" placeholder="圖片 URL" style="width:100%; margin-bottom:6px; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${curCatId}'][${idx}].cover=this.value; renderWYSIWYGCanvas();">
            <input type="text" value="${chap.progress}" placeholder="進度 (如 0/7)" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${curCatId}'][${idx}].progress=this.value; renderWYSIWYGCanvas();">
          </div>
        `).join('')}
      </div>
    `;
  } else if (mod === 'bottomNav') {
    panel.innerHTML = `
      <h4 style="color:#1abc9c; margin-bottom:10px;">🔘 管理底部導覽按鈕</h4>
      <button class="btn" style="background:#2ecc71; width:100%; font-size:12px; padding:6px; margin-bottom:12px;" onclick="addNewBottomButton()">➕ 新增底部按鈕</button>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${data.bottomButtons.map((btnName, idx) => `
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" value="${btnName}" style="flex:1; background:#0f1218; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;" oninput="data.bottomButtons[${idx}]=this.value; renderWYSIWYGCanvas();">
            <button class="btn-del" onclick="deleteBottomButton(${idx})">刪</button>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// 增刪選單與卡片輔助函數
window.addNewCategoryItem = function() {
  const name = prompt('請輸入新 Tab 分類名稱（如：日常試煉）：');
  if (!name) return;
  const newId = 'cat_' + Date.now();
  window.uiFullData.categories.push({ id: newId, name: name });
  window.uiFullData.chapters[newId] = [];
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.deleteCategoryItem = function(idx) {
  if (!confirm('確定刪除此 Tab 分類嗎？')) return;
  const cat = window.uiFullData.categories[idx];
  if (cat) delete window.uiFullData.chapters[cat.id];
  window.uiFullData.categories.splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.addNewChapterCard = function(catId) {
  if (!window.uiFullData.chapters[catId]) window.uiFullData.chapters[catId] = [];
  window.uiFullData.chapters[catId].push({
    id: 'chap_' + Date.now(),
    title: '新章節名稱',
    progress: '0/7',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop'
  });
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.deleteChapterCard = function(catId, idx) {
  if (window.uiFullData.chapters[catId]) window.uiFullData.chapters[catId].splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.addNewBottomButton = function() {
  const name = prompt('請輸入底部按鈕名稱：', '新功能');
  if (!name) return;
  window.uiFullData.bottomButtons.push(name);
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.deleteBottomButton = function(idx) {
  window.uiFullData.bottomButtons.splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel();
};

window.saveUIPageConfig = function() {
  localStorage.setItem('my_game_ui_full_config', JSON.stringify(window.uiFullData));
  alert('✅ 介面佈局、Tab 分類與章節卡片內容已成功全額儲存！遊戲中將完美同步。');
};

window.resetUIPageConfig = function() {
  if (!confirm('⚠️ 確定重置全頁面設定嗎？')) return;
  localStorage.removeItem('my_game_ui_full_config');
  window.renderTabUIEditor(document.getElementById('app-content'));
};
