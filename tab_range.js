// ==========================================
// 模組：攻擊範圍模式視覺化編輯器 (tab_range.js)
// ==========================================

window.renderTabRange = function(container) {
  // 確保初始化預設範圍模式
  if (!globalData.rangePatterns) {
    globalData.rangePatterns = [
      { id: 'single', name: '📌 單體目標 (1格)', pattern: [{x: 0, y: 0}] },
      { id: 'cross', name: '➕ 十字範圍 (5格)', pattern: [{x:0, y:0}, {x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}] },
      { id: 'front_row_3', name: '🧱 前方橫向3格', pattern: [{x:0, y:0}, {x:-1, y:0}, {x:1, y:0}] },
      { id: 'square_3x3', name: '⏹️ 九宮格 (3x3)', pattern: [{x:-1,y:-1},{x:0,y:-1},{x:1,y:-1},{x:-1,y:0},{x:0,y:0},{x:1,y:0},{x:-1,y:1},{x:0,y:1},{x:1,y:1}] }
    ];
  }

  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:10px;">🎯 自訂攻擊範圍模式編輯器</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:15px;">
        在此可視化點選格子來建立或修改攻擊範圍。中心 <b style="color:#f1c40f;">[0,0]</b> 為主目標基準點。儲存後即可直接在「技能面板」的下拉選單中選擇！
      </p>
      <button class="btn" style="background:#3498db; margin-bottom:15px;" onclick="window.addNewRangePattern()">➕ 新增範圍模式</button>
      <div id="range-pattern-list" style="display:flex; flex-direction:column; gap:15px;"></div>
    </div>
  `;
  renderRangePatternList();
};

function renderRangePatternList() {
  const listEl = document.getElementById('range-pattern-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  globalData.rangePatterns.forEach((rp, idx) => {
    // 建立 5x5 可視化點選網格 (dy: -2 到 2, dx: -2 到 2)
    let gridHtml = `<div style="display:grid; grid-template-columns: repeat(5, 36px); gap:4px; background:#111; padding:10px; border-radius:6px; border:1px solid #444; width:fit-content;">`;
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const isCenter = (dx === 0 && dy === 0);
        const isSelected = rp.pattern.some(p => p.x === dx && p.y === dy);
        
        let bg = '#222';
        let border = '#444';
        let textColor = '#666';
        
        if (isCenter) {
          bg = '#34495e'; border = '#f1c40f'; textColor = '#f1c40f';
        } else if (isSelected) {
          bg = '#e67e22'; border = '#f39c12'; textColor = '#fff';
        }

        gridHtml += `
          <div onclick="window.toggleCustomRangeCell(${idx}, ${dx}, ${dy})" 
               style="width: 36px; height: 36px; background: ${bg}; border: 1px solid ${border}; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: ${textColor}; cursor: pointer; user-select: none;"
               title="相對座標 (dx:${dx}, dy:${dy})">
            ${isCenter ? '主' : (isSelected ? '✓' : '')}
          </div>`;
      }
    }
    gridHtml += `</div>`;

    const card = document.createElement('div');
    card.style.cssText = "background:#181a24; border:1px solid #333; border-radius:8px; padding:15px; display:flex; flex-direction:column; gap:10px;";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; gap:10px; align-items:center; flex:1;">
          <div style="flex:1;"><label style="font-size:11px; color:#aaa;">模式代碼 (ID)</label><input type="text" value="${rp.id}" onchange="window.updateRangeProp(${idx}, 'id', this.value)" style="width:100%;"></div>
          <div style="flex:2;"><label style="font-size:11px; color:#aaa;">顯示名稱 (Name)</label><input type="text" value="${rp.name}" onchange="window.updateRangeProp(${idx}, 'name', this.value)" style="width:100%;"></div>
        </div>
        <button class="btn-del" onclick="window.deleteRangePattern(${idx})" style="margin-left:15px; align-self:flex-end;">刪除</button>
      </div>
      <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
        <div>
          <div style="font-size:11px; color:#f1c40f; margin-bottom:4px;">點選下方網格設定範圍：</div>
          ${gridHtml}
        </div>
        <div style="flex:1; font-size:12px; color:#888; background:#111; padding:10px; border-radius:6px; min-width:200px;">
          <div><b>自動生成的座標代碼：</b></div>
          <div style="color:#2ecc71; margin-top:4px; word-break:break-all;">${JSON.stringify(rp.pattern)}</div>
        </div>
      </div>
    `;
    listEl.appendChild(card);
  });
}

window.toggleCustomRangeCell = function(idx, dx, dy) {
  let rp = globalData.rangePatterns[idx];
  if (!rp.pattern) rp.pattern = [{x:0, y:0}];
  
  const pIdx = rp.pattern.findIndex(p => p.x === dx && p.y === dy);
  if (pIdx !== -1) {
    if (dx === 0 && dy === 0) return; // 規定中心點 [0,0] 為主目標，不可關閉
    rp.pattern.splice(pIdx, 1);
  } else {
    rp.pattern.push({x: dx, y: dy});
  }
  saveData();
  renderRangePatternList();
};

window.updateRangeProp = function(idx, key, val) {
  globalData.rangePatterns[idx][key] = val;
  saveData();
};

window.addNewRangePattern = function() {
  globalData.rangePatterns.push({
    id: 'pattern_' + Date.now(),
    name: '新範圍模式',
    pattern: [{x: 0, y: 0}]
  });
  saveData();
  renderRangePatternList();
};

window.deleteRangePattern = function(idx) {
  if (globalData.rangePatterns.length <= 1) {
    alert('至少需要保留一個範圍模式！');
    return;
  }
  if (confirm('確定要刪除此範圍模式嗎？')) {
    globalData.rangePatterns.splice(idx, 1);
    saveData();
    renderRangePatternList();
  }
};
