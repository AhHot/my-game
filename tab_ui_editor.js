// tab_ui_editor.js - 頂部僅保留左側返回按鈕
window.renderTabUIEditor = function(container) {
  let targetContainer = container;
  if (!targetContainer || !(targetContainer instanceof HTMLElement)) {
    targetContainer = document.getElementById('app-content') || document.getElementById('main-content') || document.querySelector('.content') || document.body;
  }

  let defaultFullData = {
    bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
    topNavLeftText: '返回大廳',
    layout: {
      topNav: { x: 0, y: 0, w: 1280, h: 60, visible: true, name: '頂部欄' },
      leftTab: { x: 30, y: 80, w: 250, h: 560, visible: true, name: '左側 Tab 鏈' },
      rightSlider: { x: 300, y: 100, w: 940, h: 520, visible: true, name: '右側關卡卡片區' },
      bottomNav: { x: 0, y: 660, w: 1280, h: 60, visible: true, name: '底部功能列' }
    },
    categories: [
      { id: 'main', name: '本篇主線' },
      { id: 'sub', name: '外傳江湖' },
      { id: 'event', name: '限時活動' }
    ],
    chapters: {
      main: [
        { id: 'm1', title: '第一章：青城山變', progress: '0/7', cover: 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?q=80&w=1000&auto=format&fit=crop' },
        { id: 'm2', title: '第二章：江南煙雨', progress: '0/8', cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop' }
      ],
      sub: []
    },
    bottomButtons: ['戰鬥畫面', '本篇', '研修', '資源', '挑戰'],
    activeTabId: 'main'
  };

  let savedRaw = localStorage.getItem('my_game_ui_full_config');
  let fullData = defaultFullData;
  if (savedRaw) {
    try { 
      let parsed = JSON.parse(savedRaw);
      fullData = Object.assign({}, defaultFullData, parsed);
      if (parsed.layout) fullData.layout = Object.assign({}, defaultFullData.layout, parsed.layout);
    } catch(e) { 
      console.error('解析配置失敗', e); 
    }
  }

  window.uiFullData = fullData;
  if (!window.selectedUIModule) window.selectedUIModule = 'layout';

  targetContainer.innerHTML = `
    <div class="card" style="background:#111217; border:1px solid #222; padding:15px; border-radius:8px; color:#fff; width:100%; box-sizing:border-box;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
        <h3 style="color:#00ffff; margin:0;">🎨 劇本介面全能編輯器</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" style="background:#e74c3c; color:#fff; border:none; border-radius:4px; font-size:12px; padding:6px 12px; cursor:pointer;" onclick="resetUIPageConfig()">🔄 重置預設</button>
          <button class="btn" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; font-size:12px; padding:6px 16px; font-weight:bold; cursor:pointer;" onclick="saveUIPageConfig()">💾 保存整體設定</button>
        </div>
      </div>

      <div style="display: flex; gap: 6px; margin-bottom: 15px; flex-wrap: wrap;">
        <button class="btn" style="background:${window.selectedUIModule==='bg'?'#e67e22':'#333'}; color:#fff; border:none; border-radius:4px; font-size:11px; flex:1; padding:8px; cursor:pointer;" onclick="switchEditorModule('bg')">🖼️ 底圖</button>
        <button class="btn" style="background:${window.selectedUIModule==='layout'?'#3498db':'#333'}; color:#fff; border:none; border-radius:4px; font-size:11px; flex:1; padding:8px; cursor:pointer;" onclick="switchEditorModule('layout')">📐 座標與顯隱</button>
        <button class="btn" style="background:${window.selectedUIModule==='categories'?'#9b59b6':'#333'}; color:#fff; border:none; border-radius:4px; font-size:11px; flex:1; padding:8px; cursor:pointer;" onclick="switchEditorModule('categories')">🏷️ 左側Tab</button>
        <button class="btn" style="background:${window.selectedUIModule==='chapters'?'#1abc9c':'#333'}; color:#fff; border:none; border-radius:4px; font-size:11px; flex:1; padding:8px; cursor:pointer;" onclick="switchEditorModule('chapters')">📚 章節卡片</button>
        <button class="btn" style="background:${window.selectedUIModule==='navs'?'#e84393':'#333'}; color:#fff; border:none; border-radius:4px; font-size:11px; flex:1; padding:8px; cursor:pointer;" onclick="switchEditorModule('navs')">🧭 上下導覽列</button>
      </div>

      <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;">
        <div style="position: relative; flex: 1; min-width: 300px;">
          <div id="wysiwyg-viewport" style="width: 100%; aspect-ratio: 16/9; background: #08090c; border: 2px solid #333; position: relative; overflow: hidden; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.9);">
            <div id="wysiwyg-canvas" style="width: 1280px; height: 720px; transform-origin: 0 0; position: absolute; top:0; left:0;"></div>
          </div>
          <div style="font-size:11px; color:#aaa; text-align:center; margin-top:6px;">🎮 互動畫布 (1280x720 等比縮放)</div>
        </div>

        <div style="width: 340px; background: #161a23; border: 1px solid #333; padding: 15px; border-radius: 8px;" id="module-editor-panel"></div>
      </div>
    </div>
  `;

  renderWYSIWYGCanvas();
  renderModuleControlPanel();

  window.removeEventListener('resize', autoFitEditorCanvasScale);
  window.addEventListener('resize', autoFitEditorCanvasScale);
};

function autoFitEditorCanvasScale() {
  const viewport = document.getElementById('wysiwyg-viewport');
  const canvas = document.getElementById('wysiwyg-canvas');
  if (!viewport || !canvas) return 0.5;
  const currentScale = viewport.clientWidth / 1280;
  canvas.style.transform = `scale(${currentScale})`;
  window.currentEditorCanvasScale = currentScale;
  return currentScale;
}

window.switchEditorModule = function(mod) {
  window.selectedUIModule = mod;
  window.renderTabUIEditor();
};

function renderWYSIWYGCanvas() {
  const canvas = document.getElementById('wysiwyg-canvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  const data = window.uiFullData;
  const layout = data.layout;
  const currentCatId = data.activeTabId || (data.categories[0] ? data.categories[0].id : 'main');
  const isLayoutMode = window.selectedUIModule === 'layout';

  const bgDiv = document.createElement('div');
  bgDiv.style.cssText = `position: absolute; inset:0; background: url('${data.bgUrl || ''}') center/cover no-repeat; filter: brightness(0.4); z-index:1;`;
  canvas.appendChild(bgDiv);

  Object.keys(layout).forEach(key => {
    const comp = layout[key];
    if (!comp.visible && !isLayoutMode) return;

    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute; left: ${comp.x}px; top: ${comp.y}px; width: ${comp.w}px; height: ${comp.h}px;
      z-index: 10; opacity: ${comp.visible ? 1 : 0.25}; transition: opacity 0.2s;
    `;

    if (key === 'topNav') {
      el.style.background = 'rgba(15, 17, 23, 0.9)';
      el.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      el.style.display = 'flex'; el.style.justifyContent = 'flex-start'; el.style.alignItems = 'center'; el.style.padding = '0 30px';
      el.style.color = '#fff'; el.style.fontSize = '14px'; el.style.fontWeight = 'bold';
      el.innerHTML = `<div>◀ ${data.topNavLeftText || '返回大廳'}</div>`;
    } else if (key === 'leftTab') {
      el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.gap = '10px';
      data.categories.forEach(cat => {
        const isActive = cat.id === currentCatId;
        const item = document.createElement('div');
        item.style.cssText = `padding: 12px 18px; background: ${isActive ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255,255,255,0.05)'}; border-left: 4px solid ${isActive ? '#00ffff' : 'transparent'}; color: ${isActive ? '#fff' : '#888'}; font-weight: bold; font-size: 14px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;`;
        item.innerHTML = `<span>● ${cat.name}</span> ${isActive ? '<span style="color:#00ffff;">◆</span>' : ''}`;
        item.onclick = (e) => {
          e.stopPropagation();
          data.activeTabId = cat.id;
          renderWYSIWYGCanvas();
          if (window.selectedUIModule === 'chapters') renderModuleControlPanel();
        };
        el.appendChild(item);
      });
    } else if (key === 'rightSlider') {
      el.style.display = 'flex'; el.style.gap = '20px'; el.style.overflowX = 'auto'; el.style.alignItems = 'center'; el.style.padding = '10px';
      const chapList = data.chapters[currentCatId] || [];
      if (chapList.length === 0) {
        el.innerHTML = `<div style="color:#aaa; font-size:16px; margin:auto; background:rgba(0,0,0,0.6); padding:10px 20px; border-radius:6px;">當前分類尚無章節</div>`;
      } else {
        chapList.forEach(c => {
          const card = document.createElement('div');
          card.style.cssText = `width: 420px; height: 280px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: url('${c.cover}') center/cover; position: relative; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(0,0,0,0.6); display: flex; align-items: flex-end; padding: 20px;`;
          card.innerHTML = `
            <div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>
            <div style="position:relative; z-index:2; display:flex; justify-content:space-between; width:100%; align-items:flex-end;">
              <div style="color:#fff; font-size:20px; font-weight:bold; text-shadow:0 2px 5px rgba(0,0,0,0.8);">${c.title}</div>
              <div style="background:rgba(0,0,0,0.8); color:#00ffff; padding:4px 10px; border-radius:4px; font-size:12px; border:1px solid rgba(0,255,255,0.3);">通關: ${c.progress}</div>
            </div>
          `;
          el.appendChild(card);
        });
      }
    } else if (key === 'bottomNav') {
      el.style.background = 'rgba(10, 11, 15, 0.95)';
      el.style.borderTop = '1px solid rgba(255,255,255,0.1)';
      el.style.display = 'flex'; el.style.justifyContent: 'center'; el.style.alignItems: 'center'; el.style.gap = '30px';
      data.bottomButtons.forEach((btnName, idx) => {
        const btn = document.createElement('div');
        btn.style.cssText = `color: ${idx === 1 ? '#3699ff' : '#718096'}; font-size: 14px; font-weight: bold;`;
        btn.innerText = btnName;
        el.appendChild(btn);
      });
    } else {
      el.style.background = 'rgba(255, 165, 0, 0.2)';
      el.style.border = '2px dashed orange';
      el.style.display = 'flex'; el.style.justifyContent: 'center'; el.style.alignItems: 'center';
      el.style.color = '#ffaa00'; el.style.fontWeight = 'bold'; el.style.borderRadius = '6px';
      el.innerHTML = `<span>${comp.name}</span>`;
    }

    if (isLayoutMode) {
      makeElementInteractable(el, key);
    }
    canvas.appendChild(el);
  });

  setTimeout(autoFitEditorCanvasScale, 10);
}

function makeElementInteractable(el, key) {
  el.style.outline = '2px dashed #00ffff';
  el.style.cursor = 'move';

  const handle = document.createElement('div');
  handle.style.cssText = `
    position: absolute; right: -6px; bottom: -6px; width: 22px; height: 22px;
    background: #00ffff; border: 2px solid #000; border-radius: 3px; cursor: se-resize; z-index: 99;
  `;
  el.appendChild(handle);

  const startInteraction = (clientX, clientY, target) => {
    if (target === handle) {
      startResizing(clientX, clientY, key);
    } else {
      startDragging(clientX, clientY, key);
    }
  };

  el.addEventListener('mousedown', (e) => { e.stopPropagation(); startInteraction(e.clientX, e.clientY, e.target); });
  el.addEventListener('touchstart', (e) => { e.stopPropagation(); const t = e.touches[0]; startInteraction(t.clientX, t.clientY, t.target); }, { passive: true });
}

function startDragging(startX, startY, key) {
  const comp = window.uiFullData.layout[key];
  const initX = comp.x, initY = comp.y;

  function onMove(cx, cy) {
    const scale = window.currentEditorCanvasScale || autoFitEditorCanvasScale();
    comp.x = Math.max(0, Math.min(1280 - comp.w, Math.round(initX + (cx - startX) / scale)));
    comp.y = Math.max(0, Math.min(720 - comp.h, Math.round(initY + (cy - startY) / scale)));
    renderWYSIWYGCanvas();
    if (window.selectedUIModule === 'layout') renderModuleControlPanel();
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
  const initW = comp.w, initH = comp.h;

  function onMove(cx, cy) {
    const scale = window.currentEditorCanvasScale || autoFitEditorCanvasScale();
    comp.w = Math.max(100, Math.round(initW + (cx - startX) / scale));
    comp.h = Math.max(40, Math.round(initH + (cy - startY) / scale));
    renderWYSIWYGCanvas();
    if (window.selectedUIModule === 'layout') renderModuleControlPanel();
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

function renderModuleControlPanel() {
  const panel = document.getElementById('module-editor-panel');
  if (!panel) return;
  const mod = window.selectedUIModule;
  const data = window.uiFullData;

  if (mod === 'bg') {
    panel.innerHTML = `
      <h4 style="color:#e67e22; margin-bottom:10px;">🖼️ 劇本介面底圖設定</h4>
      <p style="font-size:12px; color:#aaa; margin-bottom:10px;">輸入圖片網址 (URL)：</p>
      <input type="text" value="${data.bgUrl || ''}" placeholder="https://..." style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:8px; border-radius:4px; margin-bottom:10px;" oninput="window.uiFullData.bgUrl=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
    `;
  } else if (mod === 'layout') {
    panel.innerHTML = `
      <h4 style="color:#3498db; margin-bottom:10px;">📐 座標、尺寸與顯隱管理</h4>
      <button class="btn" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; width:100%; font-size:12px; padding:6px; margin-bottom:10px; cursor:pointer;" onclick="addNewCustomUIComponent()">➕ 新增自定義 UI 組件</button>
      <div style="max-height:330px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
        ${Object.keys(data.layout).map(k => {
          const comp = data.layout[k];
          const isCustom = k.startsWith('custom_');
          return `
            <div style="background:#0f1218; padding:8px; border-radius:4px; border:1px solid #333;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:12px; color:#f1c40f; font-weight:bold;">${comp.name}</span>
                <div style="display:flex; gap:6px; align-items:center;">
                  <label style="font-size:11px; color:#aaa; cursor:pointer;"><input type="checkbox" ${comp.visible ? 'checked' : ''} onchange="window.uiFullData.layout['${k}'].visible=this.checked; renderWYSIWYGCanvas(); saveUIPageConfigSilently();"> 顯示</label>
                  ${isCustom ? `<button class="btn-del" style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:10px; cursor:pointer;" onclick="deleteCustomUIComponent('${k}')">刪</button>` : ''}
                </div>
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                <div><label style="font-size:10px; color:#888;">X:</label><input type="number" value="${comp.x}" oninput="data.layout['${k}'].x=parseInt(this.value)||0; renderWYSIWYGCanvas(); saveUIPageConfigSilently();" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;"></div>
                <div><label style="font-size:10px; color:#888;">Y:</label><input type="number" value="${comp.y}" oninput="data.layout['${k}'].y=parseInt(this.value)||0; renderWYSIWYGCanvas(); saveUIPageConfigSilently();" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;"></div>
                <div><label style="font-size:10px; color:#888;">W:</label><input type="number" value="${comp.w}" oninput="data.layout['${k}'].w=parseInt(this.value)||0; renderWYSIWYGCanvas(); saveUIPageConfigSilently();" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;"></div>
                <div><label style="font-size:10px; color:#888;">H:</label><input type="number" value="${comp.h}" oninput="data.layout['${k}'].h=parseInt(this.value)||0; renderWYSIWYGCanvas(); saveUIPageConfigSilently();" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else if (mod === 'categories') {
    panel.innerHTML = `
      <h4 style="color:#9b59b6; margin-bottom:10px;">🏷️ 管理左側 Tab 分類</h4>
      <button class="btn" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; width:100%; font-size:12px; padding:6px; margin-bottom:10px; cursor:pointer;" onclick="addNewCategoryItem()">➕ 新增 Tab</button>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${data.categories.map((cat, idx) => `
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="text" value="${cat.name}" style="flex:1; background:#0f1218; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;" oninput="data.categories[${idx}].name=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
            <button class="btn-del" style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:4px 8px; font-size:11px; cursor:pointer;" onclick="deleteCategoryItem(${idx})">刪</button>
          </div>
        `).join('')}
      </div>
    `;
  } else if (mod === 'chapters') {
    const currentCatId = data.activeTabId || (data.categories[0] ? data.categories[0].id : 'main');
    const currentCatObj = data.categories.find(c => c.id === currentCatId) || data.categories[0];
    if (!data.chapters[currentCatId]) data.chapters[currentCatId] = [];
    const chapList = data.chapters[currentCatId];

    panel.innerHTML = `
      <h4 style="color:#1abc9c; margin-bottom:10px;">📚 管理【${currentCatObj ? currentCatObj.name : '分組'}】的章節卡片</h4>
      <button class="btn" style="background:#3498db; color:#fff; border:none; border-radius:4px; width:100%; font-size:12px; padding:6px; margin-bottom:10px; cursor:pointer;" onclick="addNewChapterCard('${currentCatId}')">➕ 新增章節卡片</button>
      <div style="display:flex; flex-direction:column; gap:10px; max-height:330px; overflow-y:auto;">
        ${chapList.map((chap, idx) => `
          <div style="background:#0f1218; border:1px solid #333; padding:8px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span style="font-size:12px; color:#00ffff; font-weight:bold;">#${idx + 1} 章節</span>
              <button class="btn-del" style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:10px; cursor:pointer;" onclick="deleteChapterCard('${currentCatId}', ${idx})">刪除</button>
            </div>
            <input type="text" value="${chap.title}" placeholder="標題" style="width:100%; margin-bottom:4px; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${currentCatId}'][${idx}].title=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
            <input type="text" value="${chap.cover}" placeholder="圖片 URL" style="width:100%; margin-bottom:4px; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${currentCatId}'][${idx}].cover=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
            <input type="text" value="${chap.progress}" placeholder="通關進度" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px; border-radius:4px;" oninput="data.chapters['${currentCatId}'][${idx}].progress=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
          </div>
        `).join('')}
      </div>
    `;
  } else if (mod === 'navs') {
    panel.innerHTML = `
      <h4 style="color:#e84393; margin-bottom:10px;">🧭 上下方導覽列設定</h4>
      
      <div style="background:#0f1218; padding:8px; border-radius:4px; margin-bottom:10px; border:1px solid #333;">
        <div style="font-size:12px; color:#f1c40f; font-weight:bold; margin-bottom:4px;">頂部導覽列返回按鈕文字</div>
        <input type="text" value="${data.topNavLeftText || '返回大廳'}" placeholder="左側按鈕文字" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;" oninput="window.uiFullData.topNavLeftText=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
      </div>

      <div style="background:#0f1218; padding:8px; border-radius:4px; border:1px solid #333;">
        <div style="font-size:12px; color:#f1c40f; font-weight:bold; margin-bottom:4px;">底部功能按鈕管理</div>
        <button class="btn" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; width:100%; font-size:11px; padding:4px; margin-bottom:6px; cursor:pointer;" onclick="addNewBottomNavBtn()">➕ 新增底部按鈕</button>
        <div style="display:flex; flex-direction:column; gap:4px; max-height:180px; overflow-y:auto;">
          ${(data.bottomButtons || []).map((bName, idx) => `
            <div style="display:flex; gap:4px; align-items:center;">
              <input type="text" value="${bName}" style="flex:1; background:#1a1c29; color:#fff; border:1px solid #444; padding:4px;" oninput="data.bottomButtons[${idx}]=this.value; renderWYSIWYGCanvas(); saveUIPageConfigSilently();">
              <button class="btn-del" style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:10px; cursor:pointer;" onclick="deleteBottomNavBtn(${idx})">刪</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
}

window.addNewCustomUIComponent = function() {
  const name = prompt('請輸入自定義 UI 組件名稱：', '公告橫幅');
  if (!name) return;
  const key = 'custom_' + Date.now();
  window.uiFullData.layout[key] = { x: 100, y: 100, w: 400, h: 200, visible: true, name: name };
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.deleteCustomUIComponent = function(key) {
  if (!confirm('確定刪除此自定義組件？')) return;
  delete window.uiFullData.layout[key];
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.addNewCategoryItem = function() {
  const name = prompt('請輸入新 Tab 名稱：');
  if (!name) return;
  const newId = 'cat_' + Date.now();
  window.uiFullData.categories.push({ id: newId, name: name });
  if (!window.uiFullData.chapters[newId]) window.uiFullData.chapters[newId] = [];
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.deleteCategoryItem = function(idx) {
  if (!confirm('確定刪除此 Tab 嗎？')) return;
  const cat = window.uiFullData.categories[idx];
  if (cat) delete window.uiFullData.chapters[cat.id];
  window.uiFullData.categories.splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.addNewChapterCard = function(catId) {
  if (!window.uiFullData.chapters[catId]) window.uiFullData.chapters[catId] = [];
  window.uiFullData.chapters[catId].push({
    id: 'chap_' + Date.now(),
    title: '新關卡章節',
    progress: '0/6',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop'
  });
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.deleteChapterCard = function(catId, idx) {
  if (window.uiFullData.chapters[catId]) window.uiFullData.chapters[catId].splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.addNewBottomNavBtn = function() {
  const name = prompt('請輸入底部按鈕名稱：', '新功能');
  if (!name) return;
  if (!window.uiFullData.bottomButtons) window.uiFullData.bottomButtons = [];
  window.uiFullData.bottomButtons.push(name);
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.deleteBottomNavBtn = function(idx) {
  window.uiFullData.bottomButtons.splice(idx, 1);
  renderWYSIWYGCanvas(); renderModuleControlPanel(); saveUIPageConfigSilently();
};

window.saveUIPageConfigSilently = function() {
  localStorage.setItem('my_game_ui_full_config', JSON.stringify(window.uiFullData));
};

window.saveUIPageConfig = function() {
  localStorage.setItem('my_game_ui_full_config', JSON.stringify(window.uiFullData));
  alert('✅ 介面設定、顯隱狀態與所有導覽設定已成功儲存！');
};

window.resetUIPageConfig = function() {
  if (!confirm('⚠️ 確定重置所有設定嗎？')) return;
  localStorage.removeItem('my_game_ui_full_config');
  window.renderTabUIEditor();
};
