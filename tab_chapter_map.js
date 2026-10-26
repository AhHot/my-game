// tab_chapter_map.js - 沉浸式章節關卡地圖與節點佈局編輯器 (動態聯動劇本數據)
window.renderTabChapterMap = function(container) {
  let targetContainer = container;
  if (!targetContainer || !(targetContainer instanceof HTMLElement)) {
    targetContainer = document.getElementById('app-content') || document.body;
  }

  // 🌟 動態從劇本數據讀取所有 books 作為地圖選項
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { books: [] };
  let books = storyData.books || [];

  let mapsConfig = {};
  try {
    mapsConfig = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  } catch(e) { mapsConfig = {}; }

  if (!window.currentMapEditorId && books.length > 0) {
    window.currentMapEditorId = books[0].id;
  } else if (!window.currentMapEditorId) {
    window.currentMapEditorId = 'book_01';
  }

  if (!mapsConfig[window.currentMapEditorId]) {
    mapsConfig[window.currentMapEditorId] = {
      bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop',
      nodes: [
        { id: 1, name: '1-1 山麓前哨', x: 220, y: 380, nodeIndex: 0, shape: 'circle', size: 80, imgUrl: '' },
        { id: 2, name: '1-2 密林險境', x: 480, y: 220, nodeIndex: 1, shape: 'circle', size: 80, imgUrl: '' }
      ]
    };
  }

  let currentMap = mapsConfig[window.currentMapEditorId];

  let bookOptionsHtml = '';
  if (books.length === 0) {
    bookOptionsHtml = `<option value="book_01">預設第一章 (book_01)</option>`;
  } else {
    books.forEach(b => {
      bookOptionsHtml += `<option value="${b.id}" ${window.currentMapEditorId === b.id ? 'selected' : ''}>${b.title} (${b.id})</option>`;
    });
  }

  targetContainer.innerHTML = `
    <div class="card" style="background:#111217; border:1px solid #222; padding:15px; border-radius:8px; color:#fff; width:100%; box-sizing:border-box;">
      <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="color:#00ffff; margin:0;">🗺️ 沉浸式章節關卡地圖編輯器</h3>
        <div>
          <button class="btn" style="background:#2ecc71; color:#fff; border:none; border-radius:4px; padding:6px 16px; font-weight:bold; cursor:pointer;" onclick="saveChapterMapConfig()">💾 儲存地圖設定</button>
        </div>
      </div>

      <div style="display:flex; gap:15px; margin-bottom:15px; align-items:center;">
        <label style="color:#f1c40f; font-weight:bold;">選擇對應劇本篇章：</label>
        <select id="map-selector" style="background:#1a1c29; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;" onchange="switchMapEditorId(this.value)">
          ${bookOptionsHtml}
        </select>
      </div>

      <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">
        <div style="position:relative; flex:1; min-width:300px;">
          <div id="map-editor-viewport" style="width:100%; aspect-ratio:16/9; background:#08090c; border:2px solid #333; position:relative; overflow:hidden; border-radius:6px;">
            <div id="map-editor-canvas" style="width:1280px; height:720px; transform-origin:0 0; position:absolute; top:0; left:0; background: url('${currentMap.bgUrl}') center/cover no-repeat; filter:brightness(0.9);">
              <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4);"></div>
              <div id="map-editor-nodes-layer"></div>
            </div>
          </div>
          <div style="font-size:11px; color:#aaa; text-align:center; margin-top:6px;">💡 提示：可在預覽畫布上直接「滑鼠拖動節點」調整位置！</div>
        </div>

        <div style="width:380px; background:#161a23; border:1px solid #333; padding:15px; border-radius:8px; max-height:500px; overflow-y:auto;">
          <h4 style="color:#3498db; margin-bottom:10px;">⚙️ 地圖與節點設定</h4>
          <div style="margin-bottom:12px;">
            <label style="font-size:12px; color:#aaa;">地圖背景圖片 URL：</label>
            <input type="text" id="map-bg-url-input" value="${currentMap.bgUrl}" style="width:100%; background:#0f1218; color:#fff; border:1px solid #444; padding:6px; border-radius:4px; margin-top:4px;" oninput="updateMapBgUrl(this.value)">
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-top:1px solid #333; padding-top:10px;">
            <span style="font-size:13px; color:#f1c40f; font-weight:bold;">關卡節點列表</span>
            <button class="btn" style="background:#e67e22; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:11px; cursor:pointer;" onclick="addMapEditorNode()">➕ 新增節點</button>
          </div>

          <div id="map-editor-nodes-list" style="display:flex; flex-direction:column; gap:10px;"></div>
        </div>
      </div>
    </div>
  `;

  renderMapEditorNodes();
  setTimeout(autoFitMapEditorScale, 50);
  window.addEventListener('resize', autoFitMapEditorScale);
};

function autoFitMapEditorScale() {
  const vp = document.getElementById('map-editor-viewport');
  const cvs = document.getElementById('map-editor-canvas');
  if (!vp || !cvs) return 0.5;
  const sc = vp.clientWidth / 1280;
  cvs.style.transform = `scale(${sc})`;
  window.currentMapEditorScale = sc;
  return sc;
}

window.switchMapEditorId = function(mapId) {
  window.currentMapEditorId = mapId;
  window.renderTabChapterMap();
};

window.updateMapBgUrl = function(url) {
  let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  if (!maps[window.currentMapEditorId]) maps[window.currentMapEditorId] = { bgUrl: url, nodes: [] };
  maps[window.currentMapEditorId].bgUrl = url;
  localStorage.setItem('my_game_chapter_maps_config', JSON.stringify(maps));
  const cvs = document.getElementById('map-editor-canvas');
  if (cvs) cvs.style.backgroundImage = `url('${url}')`;
};

// 🌟 節點渲染 + 支援預覽畫布滑鼠拖動調整位置
window.renderMapEditorNodes = function() {
  let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  let currentMap = maps[window.currentMapEditorId] || { nodes: [] };
  
  const layer = document.getElementById('map-editor-nodes-layer');
  const list = document.getElementById('map-editor-nodes-list');
  if (!layer || !list) return;

  layer.innerHTML = '';
  list.innerHTML = '';

  currentMap.nodes.forEach((node, idx) => {
    const size = node.size || 80;
    const shape = node.shape || 'circle';
    const borderRadius = shape === 'square' ? '8px' : (shape === 'triangle' ? '0' : '50%');
    const clipPath = shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none';

    // 1. 在畫布上建立可視化節點
    const nd = document.createElement('div');
    nd.style.cssText = `
      position: absolute; left: ${node.x}px; top: ${node.y}px; transform: translate(-50%, -50%);
      width: ${size}px; height: ${size}px; border-radius: ${borderRadius}; clip-path: ${clipPath};
      background: ${node.imgUrl ? `url('${node.imgUrl}') center/cover` : 'rgba(20,24,33,0.9)'};
      border: 3px solid #3699ff; display: flex; flex-direction: column; justify-content: center;
      align-items: center; text-align: center; color: #fff; cursor: move; box-shadow: 0 4px 15px rgba(0,0,0,0.8);
    `;
    if (!node.imgUrl) {
      nd.innerHTML = `<div style="font-size:12px; font-weight:bold;">#${node.id || idx+1}</div><div style="font-size:8px; color:#aaa; overflow:hidden; text-overflow:ellipsis; max-width:60px;">${node.name}</div>`;
    }
    
    // 讓節點可在畫布上直接用滑鼠拖動
    makeMapNodeInteractable(nd, idx);
    layer.appendChild(nd);

    // 2. 右側控制面板項目 (支援形狀、大小、圖片自定義)
    const item = document.createElement('div');
    item.style.cssText = "background:#0f1218; border:1px solid #333; padding:8px; border-radius:6px;";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="font-size:12px; color:#00ffff; font-weight:bold;">節點 #${idx+1}</span>
        <button style="background:#c0392b; color:#fff; border:none; border-radius:3px; padding:2px 6px; font-size:10px; cursor:pointer;" onclick="deleteMapEditorNode(${idx})">刪除</button>
      </div>
      <input type="text" value="${node.name}" placeholder="節點名稱" style="width:100%; margin-bottom:4px; background:#1a1c29; color:#fff; border:1px solid #444; padding:3px; border-radius:3px;" oninput="updateMapNodeField(${idx}, 'name', this.value)">
      <input type="text" value="${node.imgUrl || ''}" placeholder="自定義圖片 URL (選填)" style="width:100%; margin-bottom:4px; background:#1a1c29; color:#fff; border:1px solid #444; padding:3px; border-radius:3px;" oninput="updateMapNodeField(${idx}, 'imgUrl', this.value)">
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; margin-bottom:4px;">
        <div>
          <label style="font-size:9px; color:#888;">形狀:</label>
          <select style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:2px;" onchange="updateMapNodeField(${idx}, 'shape', this.value)">
            <option value="circle" ${shape==='circle'?'selected':''}>圓形</option>
            <option value="square" ${shape==='square'?'selected':''}>方形</option>
            <option value="triangle" ${shape==='triangle'?'selected':''}>三角形</option>
          </select>
        </div>
        <div><label style="font-size:9px; color:#888;">大小 (px):</label><input type="number" value="${size}" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:2px;" oninput="updateMapNodeField(${idx}, 'size', parseInt(this.value)||80)"></div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px;">
        <div><label style="font-size:9px; color:#888;">X:</label><input type="number" value="${node.x}" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:2px;" oninput="updateMapNodeField(${idx}, 'x', parseInt(this.value)||0)"></div>
        <div><label style="font-size:9px; color:#888;">Y:</label><input type="number" value="${node.y}" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:2px;" oninput="updateMapNodeField(${idx}, 'y', parseInt(this.value)||0)"></div>
        <div><label style="font-size:9px; color:#888;">節點索引:</label><input type="number" value="${node.nodeIndex}" style="width:100%; background:#1a1c29; color:#fff; border:1px solid #444; padding:2px;" oninput="updateMapNodeField(${idx}, 'nodeIndex', parseInt(this.value)||0)"></div>
      </div>
    `;
    list.appendChild(item);
  });
};

function makeMapNodeInteractable(el, idx) {
  let isDragging = false;
  let startX = 0, startY = 0;

  el.onpointerdown = (e) => {
    e.stopPropagation();
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
  };

  el.onpointermove = (e) => {
    if (!isDragging) return;
    const scale = window.currentMapEditorScale || 1;
    let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
    let node = maps[window.currentMapEditorId].nodes[idx];

    node.x = Math.max(0, Math.min(1280, Math.round(node.x + (e.clientX - startX) / scale)));
    node.y = Math.max(0, Math.min(720, Math.round(node.y + (e.clientY - startY) / scale)));

    startX = e.clientX;
    startY = e.clientY;

    localStorage.setItem('my_game_chapter_maps_config', JSON.stringify(maps));
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
  };

  el.onpointerup = (e) => {
    if (!isDragging) return;
    isDragging = false;
    el.releasePointerCapture(e.pointerId);
    renderMapEditorNodes(); // 更新右側數值
  };
}

window.addMapEditorNode = function() {
  let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  if (!maps[window.currentMapEditorId]) maps[window.currentMapEditorId] = { bgUrl: '', nodes: [] };
  const len = maps[window.currentMapEditorId].nodes.length;
  maps[window.currentMapEditorId].nodes.push({
    id: len + 1,
    name: `新關卡 #${len + 1}`,
    x: 200 + (len % 4) * 250,
    y: 350,
    nodeIndex: len,
    shape: 'circle',
    size: 80,
    imgUrl: ''
  });
  localStorage.setItem('my_game_chapter_maps_config', JSON.stringify(maps));
  renderMapEditorNodes();
};

window.deleteMapEditorNode = function(idx) {
  let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  if (maps[window.currentMapEditorId] && maps[window.currentMapEditorId].nodes) {
    maps[window.currentMapEditorId].nodes.splice(idx, 1);
    localStorage.setItem('my_game_chapter_maps_config', JSON.stringify(maps));
    renderMapEditorNodes();
  }
};

window.updateMapNodeField = function(idx, field, val) {
  let maps = JSON.parse(localStorage.getItem('my_game_chapter_maps_config')) || {};
  if (maps[window.currentMapEditorId] && maps[window.currentMapEditorId].nodes[idx]) {
    maps[window.currentMapEditorId].nodes[idx][field] = val;
    localStorage.setItem('my_game_chapter_maps_config', JSON.stringify(maps));
    renderMapEditorNodes();
  }
};

window.saveChapterMapConfig = function() {
  alert('✅ 關卡地圖設定已成功儲存！');
};
