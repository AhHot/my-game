// tab_ui_editor.js - 可視化 UI 佈局與拖拽編輯器模組
window.renderTabUIEditor = function(container) {
  // 1. 讀取現有佈局或初始化預設佈局 (1280x720 座標系)
  let defaultLayout = {
    topNav: { x: 0, y: 0, w: 1280, h: 60, visible: true, name: '頂部導覽列' },
    leftTab: { x: 30, y: 80, w: 260, h: 560, visible: true, name: '左側分類 Tab 鏈' },
    rightSlider: { x: 310, y: 120, w: 930, h: 500, visible: true, name: '右側關卡卡片區' },
    bottomNav: { x: 0, y: 660, w: 1280, h: 60, visible: true, name: '底部系統選單' }
  };

  let layoutData = JSON.parse(localStorage.getItem('my_game_ui_layout')) || defaultLayout;
  window.currentLayoutData = layoutData;
  window.selectedUIComponentKey = 'leftTab'; // 預設選中左側 Tab

  container.innerHTML = `
    <div class="card" style="background:#111217; border:1px solid #222;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="color:#00ffff;">🎨 劇本介面 (story_menu) 可視化佈局編輯器</h3>
        <div style="display:flex; gap:10px;">
          <button class="btn" style="background:#e74c3c; font-size:12px; padding:6px 12px;" onclick="resetUILayoutToDefault()">🔄 重置預設</button>
          <button class="btn" style="background:#2ecc71; font-size:12px; padding:6px 16px; font-weight:bold;" onclick="saveUILayoutData()">💾 儲存 UI 佈局設定</button>
        </div>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在下方 1280x720 模擬畫布中，直接<b>點擊並拖拽組件移動位置</b>，或<b>拖動右下角 ↘ 縮放大小</b>。
      </p>

      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <!-- 模擬畫布區域 (縮放顯示) -->
        <div style="position: relative;">
          <div id="ui-canvas-viewport" style="width: 896px; height: 504px; background: #08090c; border: 2px solid #333; position: relative; overflow: hidden; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
            <!-- 背景裝飾網格 -->
            <div style="position:absolute; inset:0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size:28px 28px; pointer-events:none;"></div>
            
            <!-- 可拖拽組件池 -->
            <div id="ui-draggable-container" style="width: 1280px; height: 720px; transform: scale(0.7); transform-origin: 0 0; position: absolute; top:0; left:0;"></div>
          </div>
          <div style="font-size:11px; color:#666; text-align:center; margin-top:6px;">模擬 1280 x 720 畫布 (已縮放展示)</div>
        </div>

        <!-- 右側屬性與座標手動微調面板 -->
        <div style="width: 320px; background: #161a23; border: 1px solid #333; padding: 15px; border-radius: 8px;" id="ui-inspector-panel">
          <h4 style="color:#f1c40f; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:12px;">⚙️ 組件屬性微調</h4>
          <div id="inspector-content">
            <div style="color:#888; font-size:13px; text-align:center; margin-top:40px;">請點擊畫布上的組件進行編輯</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderUICanvasComponents();
  renderInspectorPanel();
};

// 渲染畫布上的所有可拖拽區塊
function renderUICanvasComponents() {
  const container = document.getElementById('ui-draggable-container');
  if (!container) return;
  container.innerHTML = '';

  const layout = window.currentLayoutData;

  Object.keys(layout).forEach(key => {
    const comp = layout[key];
    if (!comp.visible) return;

    const isSelected = window.selectedUIComponentKey === key;

    const el = document.createElement('div');
    el.id = `comp-el-${key}`;
    el.style.cssText = `
      position: absolute;
      left: ${comp.x}px;
      top: ${comp.y}px;
      width: ${comp.w}px;
      height: ${comp.h}px;
      background: ${isSelected ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
      border: 2px ${isSelected ? 'solid #00ffff' : 'dashed rgba(255, 255, 255, 0.3)'};
      box-shadow: ${isSelected ? '0 0 15px rgba(0, 255, 255, 0.4)' : 'none'};
      color: ${isSelected ? '#00ffff' : '#fff'};
      display: flex; justify-content: center; align-items: center;
      font-weight: bold; font-size: 16px; cursor: move;
      user-select: none; border-radius: 4px; z-index: ${isSelected ? 10 : 2};
    `;

    el.innerHTML = `
      <span>${comp.name} (${comp.w}×${comp.h})</span>
      <!-- 右下角縮放控制點 -->
      <div class="resize-handle" data-key="${key}" style="
        position: absolute; right: -6px; bottom: -6px; width: 14px; height: 14px;
        background: #00ffff; border: 2px solid #000; border-radius: 2px; cursor: se-resize;
      "></div>
    `;

    // 點擊選擇
    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      window.selectedUIComponentKey = key;
      renderUICanvasComponents();
      renderInspectorPanel();

      // 如果點到的是縮放手把
      if (e.target.classList.contains('resize-handle')) {
        startResizingComponent(e, key);
      } else {
        startDraggingComponent(e, key);
      }
    });

    container.appendChild(el);
  });
}

// 拖動邏輯 (Drag)
function startDraggingComponent(e, key) {
  const comp = window.currentLayoutData[key];
  const startX = e.clientX;
  const startY = e.clientY;
  const initialCompX = comp.x;
  const initialCompY = comp.y;
  const scale = 0.7; // 畫布縮放比率

  function onMouseMove(me) {
    const dx = (me.clientX - startX) / scale;
    const dy = (me.clientY - startY) / scale;

    comp.x = Math.max(0, Math.min(1280 - comp.w, Math.round(initialCompX + dx)));
    comp.y = Math.max(0, Math.min(720 - comp.h, Math.round(initialCompY + dy)));

    renderUICanvasComponents();
    renderInspectorPanel();
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

// 縮放大小邏輯 (Resize)
function startResizingComponent(e, key) {
  const comp = window.currentLayoutData[key];
  const startX = e.clientX;
  const startY = e.clientY;
  const initialW = comp.w;
  const initialH = comp.h;
  const scale = 0.7;

  function onMouseMove(me) {
    const dx = (me.clientX - startX) / scale;
    const dy = (me.clientY - startY) / scale;

    comp.w = Math.max(50, Math.round(initialW + dx));
    comp.h = Math.max(30, Math.round(initialH + dy));

    renderUICanvasComponents();
    renderInspectorPanel();
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

// 渲染右側屬性欄
function renderInspectorPanel() {
  const inspector = document.getElementById('inspector-content');
  if (!inspector) return;

  const key = window.selectedUIComponentKey;
  const comp = window.currentLayoutData[key];

  if (!comp) {
    inspector.innerHTML = `<div style="color:#888; font-size:13px; text-align:center; margin-top:40px;">請點擊畫布上的組件</div>`;
    return;
  }

  inspector.innerHTML = `
    <div style="margin-bottom:12px; font-size:14px; color:#00ffff; font-weight:bold;">📍 當前組件：${comp.name}</div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
      <div>
        <label style="font-size:11px; color:#aaa; display:block; margin-bottom:3px;">X 座標 (px)</label>
        <input type="number" value="${comp.x}" style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:5px; border-radius:4px;" oninput="updateCompVal('${key}', 'x', this.value)">
      </div>
      <div>
        <label style="font-size:11px; color:#aaa; display:block; margin-bottom:3px;">Y 座標 (px)</label>
        <input type="number" value="${comp.y}" style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:5px; border-radius:4px;" oninput="updateCompVal('${key}', 'y', this.value)">
      </div>
      <div>
        <label style="font-size:11px; color:#aaa; display:block; margin-bottom:3px;">寬度 W (px)</label>
        <input type="number" value="${comp.w}" style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:5px; border-radius:4px;" oninput="updateCompVal('${key}', 'w', this.value)">
      </div>
      <div>
        <label style="font-size:11px; color:#aaa; display:block; margin-bottom:3px;">高度 H (px)</label>
        <input type="number" value="${comp.h}" style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:5px; border-radius:4px;" oninput="updateCompVal('${key}', 'h', this.value)">
      </div>
    </div>

    <div style="margin-top:15px; border-top:1px dashed #333; padding-top:12px;">
      <label style="font-size:12px; color:#aaa; display:flex; align-items:center; gap:8px; cursor:pointer;">
        <input type="checkbox" ${comp.visible ? 'checked' : ''} onchange="toggleCompVisible('${key}', this.checked)">
        顯示此組件
      </label>
    </div>
  `;
}

window.updateCompVal = function(key, prop, val) {
  if (window.currentLayoutData[key]) {
    window.currentLayoutData[key][prop] = parseInt(val) || 0;
    renderUICanvasComponents();
  }
};

window.toggleCompVisible = function(key, isVisible) {
  if (window.currentLayoutData[key]) {
    window.currentLayoutData[key].visible = isVisible;
    renderUICanvasComponents();
  }
};

window.saveUILayoutData = function() {
  localStorage.setItem('my_game_ui_layout', JSON.stringify(window.currentLayoutData));
  alert('✅ UI 佈局設定已成功儲存！遊戲畫面 (story_menu.html) 將會依據此佈局顯示。');
};

window.resetUILayoutToDefault = function() {
  if (!confirm('⚠️ 確定要重置 UI 佈局為預設位置嗎？')) return;
  localStorage.removeItem('my_game_ui_layout');
  window.renderTabUIEditor(document.getElementById('app-content'));
};
