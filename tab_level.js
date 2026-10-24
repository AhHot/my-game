// ==========================================
// 模块：关卡面板 (tab_level.js)
// ==========================================
window.renderTabLevel = function(container) {
  container.innerHTML = `
    <div id="level-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewLevel()">➕ 新增关卡</button>
  `;
  renderLevelsList();
};

function renderLevelsList() {
  const list = document.getElementById('level-list'); list.innerHTML = '';
  gameLevels.forEach((lv, index) => {
    const enemyTypes = gameChars.filter(c => c.side === 'enemy');
    let poolHtml = '';
    enemyTypes.forEach(enemy => {
      poolHtml += `<div class="enemy-pool-item" onclick="window.spawnEnemyToBoard(${index}, '${enemy.id}')"><span style="font-size:20px;">${enemy.emoji}</span><span style="flex:1;">${enemy.name}</span><span style="font-size:10px; color:#666;">${enemy.sizeX}x${enemy.sizeY}格</span></div>`;
    });

    let bgCells = '';
    for (let i = 0; i < 16; i++) { bgCells += `<div class="bg-cell"></div>`; }

    let rewardOptions = `<option value="">无掉落</option>`;
    gameItems.forEach(it => {
      rewardOptions += `<option value="${it.id}" ${lv.rewardItemId === it.id ? 'selected' : ''}>${it.icon || ''} ${it.name}</option>`;
    });

    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `
      <div class="card-header"><h3>${lv.name}</h3><button class="btn-del" onclick="window.deleteLevel(${index})">删除</button></div>
      <div class="form-grid" style="margin-bottom:15px;">
        <div class="form-item"><label>关卡名称</label><input type="text" value="${lv.name}" onchange="window.updateLevel(${index}, 'name', this.value)"></div>
        <div class="form-item">
          <label style="color:#f1c40f;">通关掉落物 (模板)</label>
          <select onchange="window.updateLevel(${index}, 'rewardItemId', this.value)">${rewardOptions}</select>
        </div>
        <div class="form-item">
          <label style="color:#2ecc71;">通关经验</label>
          <input type="number" value="${lv.rewardExp || 0}" onchange="window.updateLevel(${index}, 'rewardExp', parseInt(this.value))">
        </div>
      </div>
      <div class="level-editor-layout">
        <div class="enemy-pool">
          <div style="font-size:12px; color:#f1c40f; margin-bottom:5px;">点击敌人，自动寻找空位生成</div>
          ${poolHtml}
        </div>
        <div class="grid-container">
        <div style="text-align:center; color:#f1c40f; margin-bottom:5px; font-size:13px;">← 后排 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 前排 →</div>
          <div class="board-wrapper" id="board-${index}"><div class="bg-grid">${bgCells}</div></div>
        </div>
      </div>`;
    list.appendChild(div);
    window.renderBoardUnits(index);
  });
}

window.renderBoardUnits = function(lvIdx) {
  const board = document.getElementById(`board-${lvIdx}`); if (!board) return;
  board.querySelectorAll('.unit-block').forEach(el => el.remove());
  const lv = gameLevels[lvIdx];
  const cellSize = board.clientWidth / 4;

  lv.enemyList.forEach(item => {
    const charData = gameChars.find(c => c.id === item.id); if (!charData) return;
    const w = charData.sizeX * cellSize; const h = charData.sizeY * cellSize;
    const el = document.createElement('div'); el.className = 'unit-block';
    el.style.width = w + 'px'; el.style.height = h + 'px';
    el.style.left = item.x * cellSize + 'px'; el.style.top = item.y * cellSize + 'px';
    el.innerHTML = `<span class="block-del" onclick="window.removeEnemyFromBoard(${lvIdx}, '${item.uid}')">✖</span><span class="block-emoji">${charData.emoji}</span>`;
    window.setupDrag(el, lvIdx, item.uid, charData);
    board.appendChild(el);
  });
};

window.spawnEnemyToBoard = function(lvIdx, enemyId) {
  const charData = gameChars.find(c => c.id === enemyId);
  const lv = gameLevels[lvIdx]; if (!charData) return;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      if (canPlaceAt(lv, x, y, charData.sizeX, charData.sizeY)) {
        lv.enemyList.push({ uid: window.genUid(), id: enemyId, x: x, y: y });
        saveData(); window.renderBoardUnits(lvIdx); return; 
      }
    }
  }
  alert('没有足够的空位生成该敌人！');
};

function canPlaceAt(lv, startX, startY, sizeX, sizeY, ignoreUid = null) {
  if (startX + sizeX > 4 || startY + sizeY > 4) return false;
  for (let item of lv.enemyList) {
    if (item.uid === ignoreUid) continue; 
    const c = gameChars.find(ch => ch.id === item.id); if (!c) continue;
    const noOverlap = startX >= item.x + c.sizeX || startX + sizeX <= item.x || startY >= item.y + c.sizeY || startY + sizeY <= item.y;
    if (!noOverlap) return false;
  }
  return true;
}

window.removeEnemyFromBoard = function(lvIdx, uid) { gameLevels[lvIdx].enemyList = gameLevels[lvIdx].enemyList.filter(i => i.uid !== uid); saveData(); window.renderBoardUnits(lvIdx); };

window.setupDrag = function(el, lvIdx, uid, charData) {
  let startX, startY, isDragging = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('block-del')) return; 
    e.preventDefault(); startX = e.clientX; startY = e.clientY; isDragging = true; el.style.zIndex = 999; el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    const board = el.parentElement; const cellSize = board.clientWidth / 4; const lv = gameLevels[lvIdx];
    const currentLeft = el.offsetLeft + dx; const currentTop = el.offsetTop + dy;
    const targetCol = Math.round(currentLeft / cellSize); const targetRow = Math.round(currentTop / cellSize);
    if (canPlaceAt(lv, targetCol, targetRow, charData.sizeX, charData.sizeY, uid)) el.classList.remove('invalid');
    else el.classList.add('invalid');
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el._targetCol = targetCol; el._targetRow = targetRow;
  });
  el.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false; el.releasePointerCapture(e.pointerId); el.style.zIndex = 10; el.style.transform = ''; 
    const lv = gameLevels[lvIdx];
    if (canPlaceAt(lv, el._targetCol, el._targetRow, charData.sizeX, charData.sizeY, uid)) {
       const item = lv.enemyList.find(i => i.uid === uid); item.x = el._targetCol; item.y = el._targetRow; saveData();
    } 
    window.renderBoardUnits(lvIdx);
  });
};

window.updateLevel = function(index, key, value) { gameLevels[index][key] = value; saveData(); };
window.addNewLevel = function() { gameLevels.push({ id:'lv_'+Date.now(), name:'新关卡', enemyList: [], rewardItemId: '', rewardExp: 0 }); saveData(); window.renderTabLevel(document.getElementById('app-content')); };
window.deleteLevel = function(index) { if (confirm('确定删除？')) { gameLevels.splice(index, 1); saveData(); window.renderTabLevel(document.getElementById('app-content')); } };
