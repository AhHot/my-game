// ==========================================
// 模块：关卡编辑器 (tab_stage.js) v3 - 滚动无跳动修复版
// - 分类子Tab：全部/主线/支线/活动/日常/摘星樓
// - 每关：首通奖励 + 重复奖励（多掉落，含账号经验）
// - 摘星樓：左10层折叠分组 + 右侧详情
// ==========================================
(function () {
  'use strict';

  const CATEGORIES = [
    { id: 'all', name: '全部', icon: '📋' },
    { id: 'main', name: '主線', icon: '⚔️' },
    { id: 'side', name: '支線', icon: '📜' },
    { id: 'event', name: '活動', icon: '🔥' },
    { id: 'daily', name: '日常', icon: '📅' },
    { id: 'tower', name: '摘星樓', icon: '🏯' }
  ];

  const QUALITY_OPTIONS = [
    { q: 'white', name: '白' },
    { q: 'green', name: '綠' },
    { q: 'blue', name: '藍' },
    { q: 'purple', name: '紫' },
    { q: 'orange', name: '橙' },
    { q: 'red', name: '紅' }
  ];

  if (typeof window._currentStageCategory === 'undefined') window._currentStageCategory = 'all';
  if (typeof window._currentTowerGroup === 'undefined') window._currentTowerGroup = 0;
  if (!window._stageExpanded) window._stageExpanded = {};

  // ============ 主入口 ============
  window.renderTabStage = function (container) {
    if (!container) container = document.getElementById('app-content') || document.body;
    container.innerHTML = `
      <div class="card" style="padding:12px;">
        <div class="card-header" style="margin-bottom:12px;">
          <h3 style="margin:0;">🗺️ 關卡編輯器</h3>
        </div>
        <div id="stage-cat-tabs" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;"></div>
        <div id="stage-content"></div>
      </div>
    `;
    renderCategoryTabs();
    renderStageContent();
  };

  function renderCategoryTabs() {
    const box = document.getElementById('stage-cat-tabs');
    if (!box) return;
    const cur = window._currentStageCategory;
    let html = '';
    CATEGORIES.forEach(c => {
      const active = cur === c.id;
      html += `<div onclick="window.switchStageCategory('${c.id}')" style="padding:8px 18px; cursor:pointer; border-radius:6px; font-size:14px; font-weight:bold; transition:all 0.2s; background:${active ? '#e67e22' : '#1a1c29'}; color:${active ? '#fff' : '#888'}; border:1px solid ${active ? '#e67e22' : '#333'};">${c.icon} ${c.name}</div>`;
    });
    box.innerHTML = html;
  }

  window.switchStageCategory = function (cat) {
    window._currentStageCategory = cat;
    if (cat === 'tower') {
      ensureTowerFloors(50, true);
      window._currentTowerGroup = 0;
    }
    renderCategoryTabs();
    renderStageContent();
  };

  function renderStageContent() {
    const box = document.getElementById('stage-content');
    if (!box) return;

    // ★ 记录滚动位置
    const appCard = document.querySelector('#app-content > .card');
    const scrollTop = appCard ? appCard.scrollTop : 0;
    const towerList = document.getElementById('tower-floor-list');
    const towerScrollTop = towerList ? towerList.scrollTop : 0;

    const cat = window._currentStageCategory;
    if (cat === 'tower') {
      renderTowerLayout(box);
    } else {
      renderStandardLayout(box, cat);
    }

    // ★ 恢复滚动位置
    if (appCard) appCard.scrollTop = scrollTop;
    if (towerScrollTop > 0) {
      const newTowerList = document.getElementById('tower-floor-list');
      if (newTowerList) newTowerList.scrollTop = towerScrollTop;
    }
  }

  // ============ 普通分类布局 ============
  function renderStandardLayout(box, cat) {
    box.innerHTML = `
      <div style="margin-bottom:12px;">
        <button class="btn" style="background:#3498db; padding:8px 16px; font-size:13px;" onclick="window.addNewStage('${cat === 'all' ? 'main' : cat}')">➕ 新增關卡</button>
      </div>
      <div id="stage-list"></div>
    `;
    const listBox = document.getElementById('stage-list');
    if (!listBox) return;
    let html = '';
    gameLevels.forEach((lv, idx) => {
      if (cat === 'all' || lv.category === cat) {
        html += renderStageCard(idx);
      }
    });
    listBox.innerHTML = html || '<div style="color:#666; text-align:center; padding:30px;">此分類暫無關卡</div>';
    setTimeout(restoreBoards, 0);
  }

  // ============ 摘星樓布局 ============
  function renderTowerLayout(box) {
    ensureTowerFloors(50, false);
    const towers = [];
    gameLevels.forEach((lv, idx) => { if (lv.category === 'tower') towers.push({ idx, lv }); });
    towers.sort((a, b) => (a.lv.towerFloor || 0) - (b.lv.towerFloor || 0));
    let maxFloor = 50;
    towers.forEach(t => { if ((t.lv.towerFloor || 0) > maxFloor) maxFloor = t.lv.towerFloor; });
    const groupCount = Math.max(1, Math.ceil(maxFloor / 10));
    if (window._currentTowerGroup >= groupCount) window._currentTowerGroup = groupCount - 1;

    let groupHtml = '';
    for (let g = 0; g < groupCount; g++) {
      const start = g * 10 + 1;
      const end = (g + 1) * 10;
      const cntInGroup = towers.filter(t => (t.lv.towerFloor || 0) >= start && (t.lv.towerFloor || 0) <= end).length;
      const active = window._currentTowerGroup === g;
      groupHtml += `<div onclick="window.switchTowerGroup(${g})" style="padding:10px 12px; cursor:pointer; border-radius:6px; margin-bottom:6px; font-size:13px; background:${active ? '#9b59b6' : '#1a1c29'}; color:${active ? '#fff' : '#aaa'}; border:1px solid ${active ? '#9b59b6' : '#333'};">
        <div style="font-weight:bold;">第 ${start}-${end} 層</div>
        <div style="font-size:11px; color:${active ? '#ffd' : '#666'}; margin-top:2px;">已配置 ${cntInGroup}/10</div>
      </div>`;
    }

    box.innerHTML = `
      <div style="display:flex; gap:12px;">
        <div style="width:160px; flex-shrink:0; max-height:calc(80vh - 160px); overflow-y:auto; background:#0f0f1a; border:1px solid #333; border-radius:6px; padding:8px;">
          <div style="color:#f1c40f; font-size:12px; font-weight:bold; padding:4px 4px 8px 4px; margin-bottom:6px; border-bottom:1px solid #333;">🏯 樓層分組</div>
          ${groupHtml}
          <button class="btn" style="background:#2ecc71; width:100%; padding:6px; font-size:11px; margin-top:8px;" onclick="window.addTowerFloorGroup()">➕ 新增 10 層</button>
          <button class="btn" style="background:#e74c3c; width:100%; padding:6px; font-size:11px; margin-top:4px;" onclick="window.removeTowerFloorGroup()">🗑️ 刪除最後 10 層</button>
        </div>
        <div style="flex:1; max-height:calc(80vh - 160px); overflow-y:auto;" id="tower-floor-list"></div>
      </div>
    `;
    renderTowerFloorList();
  }

  window.switchTowerGroup = function (g) {
    window._currentTowerGroup = g;
    renderStageContent();
  };

  function renderTowerFloorList() {
    const box = document.getElementById('tower-floor-list');
    if (!box) return;
    const groupStart = window._currentTowerGroup * 10 + 1;
    const groupEnd = groupStart + 9;
    const towers = [];
    gameLevels.forEach((lv, idx) => {
      if (lv.category === 'tower' && (lv.towerFloor || 0) >= groupStart && (lv.towerFloor || 0) <= groupEnd) {
        towers.push({ idx, lv });
      }
    });
    towers.sort((a, b) => (a.lv.towerFloor || 0) - (b.lv.towerFloor || 0));
    let html = '';
    towers.forEach(t => { html += renderStageCard(t.idx); });
    box.innerHTML = html || '<div style="color:#666; text-align:center; padding:30px;">此分組暫無樓層</div>';
    setTimeout(restoreBoards, 0);
  }

  window.addTowerFloorGroup = function () {
    let maxFloor = 0;
    gameLevels.forEach(l => { if (l.category === 'tower' && (l.towerFloor || 0) > maxFloor) maxFloor = l.towerFloor; });
    const targetMax = Math.max(50, maxFloor) + 10;
    ensureTowerFloors(targetMax, true);
    window._currentTowerGroup = Math.ceil(targetMax / 10) - 1;
    renderStageContent();
  };

  window.removeTowerFloorGroup = function () {
    let maxFloor = 0;
    gameLevels.forEach(l => { if (l.category === 'tower' && (l.towerFloor || 0) > maxFloor) maxFloor = l.towerFloor; });
    if (maxFloor <= 10) { alert('至少保留 10 層'); return; }
    const startFloor = maxFloor - 9;
    if (!confirm(`確定刪除第 ${startFloor} 至 ${maxFloor} 層？共 10 層。`)) return;
    const toDeleteIdx = [];
    gameLevels.forEach((lv, idx) => {
      if (lv.category === 'tower' && (lv.towerFloor || 0) >= startFloor && (lv.towerFloor || 0) <= maxFloor) {
        toDeleteIdx.push(idx);
      }
    });
    toDeleteIdx.sort((a, b) => b - a).forEach(i => gameLevels.splice(i, 1));
    saveData();
    const newMax = maxFloor - 10;
    if (window._currentTowerGroup >= Math.ceil(newMax / 10)) {
      window._currentTowerGroup = Math.max(0, Math.ceil(newMax / 10) - 1);
    }
    renderStageContent();
  };

  function ensureTowerFloors(minCount, save) {
    const existing = new Set();
    gameLevels.forEach(l => { if (l.category === 'tower') existing.add(l.towerFloor); });
    let added = 0;
    for (let i = 1; i <= minCount; i++) {
      if (!existing.has(i)) {
        gameLevels.push({
          id: 'tower_' + i + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: '摘星樓 第 ' + i + ' 層',
          category: 'tower',
          towerFloor: i,
          countsForIdle: false,
          enemyList: [],
          firstClear: { exp: 0, accountExp: 0, drops: [] },
          repeatRewards: { exp: 0, accountExp: 0, drops: [] },
          rewardItemId: '',
          rewardExp: 0
        });
        added++;
      }
    }
    if (save && added > 0) saveData();
    return added;
  }

  // ============ 单个关卡卡片 ============
  function renderStageCard(stageIdx) {
    const lv = gameLevels[stageIdx];
    if (!lv) return '';
    const isTower = lv.category === 'tower';
    const enemyExpanded = !!window._stageExpanded['s' + stageIdx + '_enemy'];
    const firstExpanded = !!window._stageExpanded['s' + stageIdx + '_first'];
    const repeatExpanded = !!window._stageExpanded['s' + stageIdx + '_repeat'];

    const catOptions = [
      { id: 'main', name: '主線' }, { id: 'side', name: '支線' },
      { id: 'event', name: '活動' }, { id: 'daily', name: '日常' },
      { id: 'tower', name: '摘星樓' }
    ];
    let catSelect = '<select onchange="window.changeStageCategory(' + stageIdx + ', this.value)" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;">';
    catOptions.forEach(c => {
      catSelect += `<option value="${c.id}" ${lv.category === c.id ? 'selected' : ''}>${c.name}</option>`;
    });
    catSelect += '</select>';

    return `
      <div class="card" style="margin-bottom:14px; border-left:3px solid ${isTower ? '#9b59b6' : '#3498db'};" data-stage-idx="${stageIdx}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid #333;">
          <h4 style="margin:0; color:#f1c40f; font-size:15px;">
            ${isTower ? `🏯 第 ${lv.towerFloor} 層` : `🗡️ ${lv.name || '未命名'}`}
            <span style="font-size:11px; color:#666; margin-left:8px;">#${stageIdx}</span>
          </h4>
          <div style="display:flex; gap:6px;">
            ${isTower ? `<button style="background:#9b59b6; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="window.copyTowerFloorConfig(${stageIdx})">📋 複製上層</button>` : ''}
            <button style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="window.deleteStage(${stageIdx})">🗑️</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 120px 100px; gap:8px; margin-bottom:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">名稱</label>
            <input type="text" value="${lv.name || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;" onchange="window.updateStage(${stageIdx}, 'name', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">分類</label>
            ${catSelect}
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">掛機計入</label>
            <label style="display:flex; align-items:center; gap:4px; padding:6px 8px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer; font-size:11px; color:#2ecc71;">
              <input type="checkbox" ${lv.countsForIdle ? 'checked' : ''} onchange="window.updateStage(${stageIdx}, 'countsForIdle', this.checked)"> 計入
            </label>
          </div>
        </div>

        ${renderCollapseSection(stageIdx, 'enemy', '👹 敵人擺位', enemyExpanded, renderEnemyArea(stageIdx))}
        ${renderCollapseSection(stageIdx, 'first', '🏆 首通獎勵', firstExpanded, renderRewardArea(stageIdx, 'firstClear'))}
        ${renderCollapseSection(stageIdx, 'repeat', '🔁 重複獎勵', repeatExpanded, renderRewardArea(stageIdx, 'repeatRewards'))}
      </div>
    `;
  }

  function renderCollapseSection(stageIdx, key, title, expanded, contentHtml) {
    return `
      <div style="border-top:1px solid #2a2a35; margin-top:8px;" data-section="${key}">
        <div class="section-header" onclick="window.toggleStageSection(${stageIdx}, '${key}')" style="padding:8px 10px; cursor:pointer; color:${expanded ? '#f1c40f' : '#888'}; font-size:13px; font-weight:bold; user-select:none; display:flex; justify-content:space-between;">
          <span>${title}</span>
          <span class="section-arrow">${expanded ? '▼' : '▶'}</span>
        </div>
        <div class="section-content" style="padding:0 10px 10px 10px; ${expanded ? '' : 'display:none;'}">
          ${contentHtml}
        </div>
      </div>
    `;
  }

  // ★ 改动：不再重绘，纯 DOM 操作实现展开/折叠
  window.toggleStageSection = function (stageIdx, key) {
    const realKey = 's' + stageIdx + '_' + key;
    const willExpand = !window._stageExpanded[realKey];

    if (willExpand) window._stageExpanded[realKey] = true;
    else delete window._stageExpanded[realKey];

    const card = document.querySelector(`.card[data-stage-idx="${stageIdx}"]`);
    if (card) {
      const section = card.querySelector(`[data-section="${key}"]`);
      if (section) {
        const content = section.querySelector('.section-content');
        const arrow = section.querySelector('.section-arrow');
        const header = section.querySelector('.section-header');
        if (content) content.style.display = willExpand ? '' : 'none';
        if (arrow) arrow.innerText = willExpand ? '▼' : '▶';
        if (header) header.style.color = willExpand ? '#f1c40f' : '#888';
      }
    }
  };

  // ============ 敌人摆位区 ============
  function renderEnemyArea(stageIdx) {
    const enemyTypes = gameChars.filter(c => c.side === 'enemy');
    let poolHtml = '';
    enemyTypes.forEach(enemy => {
      poolHtml += `<div onclick="window.spawnEnemyToBoard(${stageIdx}, '${enemy.id}')" style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-bottom:1px solid #222; cursor:pointer;">
        <span style="font-size:20px;">${enemy.emoji || '👤'}</span>
        <span style="flex:1; font-size:12px;">${enemy.name}</span>
        <span style="font-size:10px; color:#666;">${enemy.sizeX || 1}x${enemy.sizeY || 1}</span>
      </div>`;
    });
    let bgCells = '';
    for (let i = 0; i < 16; i++) bgCells += '<div class="bg-cell" style="border:1px solid #222;"></div>';
    return `
      <div style="display:flex; gap:12px;">
        <div style="width:180px; background:#0a0a12; border:1px solid #333; border-radius:4px; padding:4px; max-height:280px; overflow-y:auto;">
          <div style="font-size:11px; color:#f1c40f; padding:4px; margin-bottom:4px;">點擊生成</div>
          ${poolHtml || '<div style="color:#666; font-size:11px; text-align:center; padding:10px;">暫無敵人角色</div>'}
        </div>
        <div style="flex:1;">
          <div style="text-align:center; color:#f1c40f; margin-bottom:4px; font-size:11px;">← 後排　　前排 →</div>
          <div class="board-wrapper" id="board-${stageIdx}" data-board-idx="${stageIdx}" style="position:relative; width:100%; max-width:320px; aspect-ratio:1; background:#0f0f1a; border:2px solid #333; border-radius:6px; overflow:hidden; margin:0 auto;">
            <div class="bg-grid" style="display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(4,1fr); width:100%; height:100%; position:absolute; inset:0;">${bgCells}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ============ 奖励区（首通/重复通用） ============
  function renderRewardArea(stageIdx, rewardType) {
    const lv = gameLevels[stageIdx];
    const r = lv[rewardType] || { exp: 0, accountExp: 0, drops: [] };
    if (!Array.isArray(r.drops)) r.drops = [];

    let dropsHtml = '';
    r.drops.forEach((drop, dIdx) => {
      dropsHtml += renderDropRow(stageIdx, rewardType, dIdx, drop);
    });

    return `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
        <div>
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">角色經驗</label>
          <input type="number" min="0" value="${r.exp || 0}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;" onchange="window.updateRewardField(${stageIdx}, '${rewardType}', 'exp', parseInt(this.value)||0)">
        </div>
        <div>
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">帳號經驗</label>
          <input type="number" min="0" value="${r.accountExp || 0}" style="width:100%; background:#16213e; color:#f1c40f; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;" onchange="window.updateRewardField(${stageIdx}, '${rewardType}', 'accountExp', parseInt(this.value)||0)">
        </div>
      </div>
      <div style="font-size:12px; color:#f1c40f; font-weight:bold; margin-bottom:6px;">🎁 掉落物（可多個）：</div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        ${dropsHtml || '<div style="color:#666; font-size:11px; padding:6px;">（尚無掉落）</div>'}
      </div>
      <button style="background:#2ecc71; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:11px; margin-top:6px;" onclick="window.addDrop(${stageIdx}, '${rewardType}')">➕ 新增掉落行</button>
    `;
  }

  function renderDropRow(stageIdx, rewardType, dIdx, drop) {
    const tpl = window.ITEMS && window.ITEMS[drop.itemId];
    const isEquip = tpl && ['weapon', 'armor', 'accessory'].includes(tpl.category);
    const itemOpts = buildItemSelect(drop.itemId || '');

    return `
      <div style="display:flex; gap:5px; align-items:center; background:#0a0a12; padding:6px; border-radius:4px; border:1px solid #2a2a35; flex-wrap:wrap;">
        <select style="flex:1; min-width:120px; background:#16213e; color:#fff; border:1px solid #444; padding:4px 6px; border-radius:4px; font-size:11px;" onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'itemId', this.value)">
          ${itemOpts}
        </select>
        <input type="number" min="1" value="${drop.count || 1}" placeholder="數量" style="width:55px; background:#16213e; color:#fff; border:1px solid #444; padding:4px 6px; border-radius:4px; font-size:11px;" onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'count', Math.max(1, parseInt(this.value)||1))">
        <input type="number" min="0" max="100" value="${drop.chance !== undefined ? drop.chance : 100}" placeholder="概率%" style="width:60px; background:#16213e; color:#f1c40f; border:1px solid #444; padding:4px 6px; border-radius:4px; font-size:11px; ${drop.guaranteed ? 'opacity:0.4;' : ''}" ${drop.guaranteed ? 'disabled' : ''} onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'chance', Math.max(0, Math.min(100, parseInt(this.value)||0)))">
        ${isEquip ? `
          <span style="font-size:10px; color:#888;">品質</span>
          <select style="width:50px; background:#16213e; color:#fff; border:1px solid #444; padding:3px; border-radius:4px; font-size:10px;" onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'qualityMin', this.value)">${qualityOptions(drop.qualityMin || 'white')}</select>
          <span style="font-size:10px; color:#888;">~</span>
          <select style="width:50px; background:#16213e; color:#fff; border:1px solid #444; padding:3px; border-radius:4px; font-size:10px;" onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'qualityMax', this.value)">${qualityOptions(drop.qualityMax || 'red')}</select>
        ` : '<span style="font-size:10px; color:#555;">(非裝備無品質)</span>'}
        <label style="font-size:10px; color:#2ecc71; cursor:pointer; display:flex; align-items:center; gap:3px; white-space:nowrap;">
          <input type="checkbox" ${drop.guaranteed ? 'checked' : ''} onchange="window.updateDrop(${stageIdx}, '${rewardType}', ${dIdx}, 'guaranteed', this.checked)"> 必掉
        </label>
        <button style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:10px;" onclick="window.removeDrop(${stageIdx}, '${rewardType}', ${dIdx})">✖</button>
      </div>
    `;
  }

  // ============ 辅助 ============
  function buildItemSelect(selectedId) {
    let html = '<option value="">-- 選擇物品 --</option>';
    const items = window.ITEMS || {};
    Object.keys(items).forEach(id => {
      const it = items[id];
      html += `<option value="${id}" ${selectedId === id ? 'selected' : ''}>${it.icon || '📦'} ${it.name}</option>`;
    });
    return html;
  }

  function qualityOptions(sel) {
    return QUALITY_OPTIONS.map(o => `<option value="${o.q}" ${o.q === sel ? 'selected' : ''}>${o.name}</option>`).join('');
  }

  function restoreBoards() {
    document.querySelectorAll('.board-wrapper[data-board-idx]').forEach(el => {
      const idx = parseInt(el.getAttribute('data-board-idx'));
      if (!isNaN(idx)) window.renderBoardUnits(idx);
    });
  }

  // ============ 通用操作 ============
  window.updateStage = function (index, key, value) {
    if (!gameLevels[index]) return;
    gameLevels[index][key] = value;
    saveData();
  };

  window.changeStageCategory = function (idx, newCat) {
    const lv = gameLevels[idx];
    if (!lv) return;
    lv.category = newCat;
    if (newCat === 'tower' && !lv.towerFloor) {
      let maxFloor = 0;
      gameLevels.forEach(l => { if (l.category === 'tower' && (l.towerFloor || 0) > maxFloor) maxFloor = l.towerFloor; });
      lv.towerFloor = maxFloor + 1;
      lv.name = '摘星樓 第 ' + lv.towerFloor + ' 層';
    }
    if (newCat === 'main') lv.countsForIdle = true;
    saveData();
    renderStageContent();
  };

  window.addNewStage = function (category) {
    category = category || 'main';
    const newLv = {
      id: 'lv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: '新關卡',
      category: category,
      towerFloor: 0,
      countsForIdle: category === 'main',
      enemyList: [],
      firstClear: { exp: 0, accountExp: 0, drops: [] },
      repeatRewards: { exp: 0, accountExp: 0, drops: [] },
      rewardItemId: '',
      rewardExp: 0
    };
    if (category === 'tower') {
      let maxFloor = 0;
      gameLevels.forEach(l => { if (l.category === 'tower' && (l.towerFloor || 0) > maxFloor) maxFloor = l.towerFloor; });
      newLv.towerFloor = maxFloor + 1;
      newLv.name = '摘星樓 第 ' + newLv.towerFloor + ' 層';
    }
    gameLevels.push(newLv);
    saveData();
    renderStageContent();
  };

  window.deleteStage = function (index) {
    if (!confirm('確定刪除此關卡？')) return;
    gameLevels.splice(index, 1);
    saveData();
    renderStageContent();
  };

  window.copyTowerFloorConfig = function (idx) {
    const lv = gameLevels[idx];
    if (!lv || lv.category !== 'tower') return;
    let prevFloor = null;
    gameLevels.forEach(l => {
      if (l.category === 'tower' && (l.towerFloor || 0) === lv.towerFloor - 1) prevFloor = l;
    });
    if (!prevFloor) { alert('上一層不存在'); return; }
    if (!confirm(`複製第 ${prevFloor.towerFloor} 層的敵人與獎勵到第 ${lv.towerFloor} 層？`)) return;
    lv.enemyList = JSON.parse(JSON.stringify(prevFloor.enemyList || []));
    lv.firstClear = JSON.parse(JSON.stringify(prevFloor.firstClear));
    lv.repeatRewards = JSON.parse(JSON.stringify(prevFloor.repeatRewards));
    saveData();
    renderStageContent();
  };

  window.updateRewardField = function (stageIdx, rewardType, field, value) {
    if (!gameLevels[stageIdx]) return;
    if (!gameLevels[stageIdx][rewardType]) gameLevels[stageIdx][rewardType] = { exp: 0, accountExp: 0, drops: [] };
    gameLevels[stageIdx][rewardType][field] = value;
    saveData();
  };

  window.addDrop = function (stageIdx, rewardType) {
    if (!gameLevels[stageIdx]) return;
    if (!gameLevels[stageIdx][rewardType]) gameLevels[stageIdx][rewardType] = { exp: 0, accountExp: 0, drops: [] };
    if (!Array.isArray(gameLevels[stageIdx][rewardType].drops)) gameLevels[stageIdx][rewardType].drops = [];
    gameLevels[stageIdx][rewardType].drops.push({ itemId: '', count: 1, chance: 100, qualityMin: 'white', qualityMax: 'red', guaranteed: false });
    saveData();
    renderStageContent();
  };

  window.removeDrop = function (stageIdx, rewardType, dIdx) {
    if (!gameLevels[stageIdx] || !gameLevels[stageIdx][rewardType]) return;
    gameLevels[stageIdx][rewardType].drops.splice(dIdx, 1);
    saveData();
    renderStageContent();
  };

  window.updateDrop = function (stageIdx, rewardType, dIdx, field, value) {
    if (!gameLevels[stageIdx] || !gameLevels[stageIdx][rewardType]) return;
    const drops = gameLevels[stageIdx][rewardType].drops;
    if (!drops || !drops[dIdx]) return;
    drops[dIdx][field] = value;
    saveData();
    // 只有这些字段需要重绘（因为UI结构会变），其他只需更新数据
    if (field === 'itemId' || field === 'guaranteed') renderStageContent();
  };

  // ============ 敌人拖拽（保留原逻辑） ============
  window.renderBoardUnits = function (lvIdx) {
    const board = document.getElementById(`board-${lvIdx}`); if (!board) return;
    board.querySelectorAll('.unit-block').forEach(el => el.remove());
    const lv = gameLevels[lvIdx]; if (!lv) return;
    const cellSize = board.clientWidth / 4;
    if (cellSize <= 0) return;

    (lv.enemyList || []).forEach(item => {
      const charData = gameChars.find(c => c.id === item.id); if (!charData) return;
      const w = (charData.sizeX || 1) * cellSize;
      const h = (charData.sizeY || 1) * cellSize;
      const el = document.createElement('div');
      el.className = 'unit-block';
      el.style.cssText = `position:absolute; width:${w}px; height:${h}px; left:${item.x * cellSize}px; top:${item.y * cellSize}px; background:rgba(52,152,219,0.6); border:2px solid #3498db; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:grab; touch-action:none; user-select:none; z-index:10;`;
      el.innerHTML = `<span class="block-del" onclick="event.stopPropagation(); window.removeEnemyFromBoard(${lvIdx}, '${item.uid}')" style="position:absolute; top:-8px; right:-8px; background:#e74c3c; color:white; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; cursor:pointer; z-index:11; border:2px solid #fff;">✖</span><span style="font-size:32px; pointer-events:none;">${charData.emoji}</span>`;
      window.setupDrag(el, lvIdx, item.uid, charData);
      board.appendChild(el);
    });
  };

  window.spawnEnemyToBoard = function (lvIdx, enemyId) {
    const charData = gameChars.find(c => c.id === enemyId);
    const lv = gameLevels[lvIdx]; if (!charData || !lv) return;
    if (!lv.enemyList) lv.enemyList = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (canPlaceAt(lv, x, y, charData.sizeX || 1, charData.sizeY || 1)) {
          lv.enemyList.push({
            uid: window.genUid ? window.genUid() : ('u_' + Date.now() + Math.floor(Math.random() * 1000)),
            id: enemyId, x: x, y: y
          });
          saveData();
          window.renderBoardUnits(lvIdx);
          return;
        }
      }
    }
    alert('沒有足夠的空位生成該敵人！');
  };

  function canPlaceAt(lv, startX, startY, sizeX, sizeY, ignoreUid) {
    if (startX < 0 || startY < 0 || startX + sizeX > 4 || startY + sizeY > 4) return false;
    for (let item of (lv.enemyList || [])) {
      if (item.uid === ignoreUid) continue;
      const c = gameChars.find(ch => ch.id === item.id); if (!c) continue;
      const noOverlap = startX >= item.x + (c.sizeX || 1) || startX + sizeX <= item.x || startY >= item.y + (c.sizeY || 1) || startY + sizeY <= item.y;
      if (!noOverlap) return false;
    }
    return true;
  }

  window.removeEnemyFromBoard = function (lvIdx, uid) {
    if (!gameLevels[lvIdx]) return;
    gameLevels[lvIdx].enemyList = (gameLevels[lvIdx].enemyList || []).filter(i => i.uid !== uid);
    saveData();
    window.renderBoardUnits(lvIdx);
  };

  window.setupDrag = function (el, lvIdx, uid, charData) {
    let startX, startY, isDragging = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('.block-del')) return;
      e.preventDefault();
      startX = e.clientX; startY = e.clientY; isDragging = true;
      el.style.zIndex = 999;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX; const dy = e.clientY - startY;
      const board = el.parentElement; if (!board) return;
      const cellSize = board.clientWidth / 4; const lv = gameLevels[lvIdx];
      if (!lv || cellSize <= 0) return;
      const currentLeft = el.offsetLeft + dx; const currentTop = el.offsetTop + dy;
      const targetCol = Math.round(currentLeft / cellSize); const targetRow = Math.round(currentTop / cellSize);
      if (canPlaceAt(lv, targetCol, targetRow, charData.sizeX || 1, charData.sizeY || 1, uid)) el.style.outline = '2px solid #2ecc71';
      else el.style.outline = '2px solid #e74c3c';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el._targetCol = targetCol; el._targetRow = targetRow;
    });
    el.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
      el.style.zIndex = 10; el.style.transform = ''; el.style.outline = '';
      const lv = gameLevels[lvIdx];
      if (lv && canPlaceAt(lv, el._targetCol, el._targetRow, charData.sizeX || 1, charData.sizeY || 1, uid)) {
        const item = lv.enemyList.find(i => i.uid === uid);
        if (item) { item.x = el._targetCol; item.y = el._targetRow; saveData(); }
      }
      window.renderBoardUnits(lvIdx);
    });
  };

})();
