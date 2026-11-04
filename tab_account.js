// ==========================================
// 模組：帳號等級與經驗編輯器 (tab_account.js)
// ==========================================
(function () {
  'use strict';

  function ensureAccountConfig() {
    if (!window.globalData) window.globalData = {};
    if (!window.globalData.account) window.globalData.account = {};

    const acc = window.globalData.account;
    if (!Array.isArray(acc.expTable) || acc.expTable.length === 0) {
      acc.expTable = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];
    }
    if (typeof acc.expGrowthFactor !== 'number' || acc.expGrowthFactor <= 0) {
      acc.expGrowthFactor = 1.8;
    }
    if (typeof acc.idleAccountExpFlat !== 'number') {
      acc.idleAccountExpFlat = 10;
    }
    if (typeof acc.towerUnlockLevel !== 'number') {
      acc.towerUnlockLevel = 10;
    }
    if (!acc.levelRewards || typeof acc.levelRewards !== 'object') {
      acc.levelRewards = {};
    }
    return acc;
  }

  function persistAccountConfig() {
    try {
      localStorage.setItem('my_game_config', JSON.stringify(window.globalData));
    } catch (e) {
      console.warn('保存账号配置失败:', e);
    }
  }

  function buildItemSelect(selectedId) {
    let html = `<option value="">-- 選擇物品 --</option>`;
    const items = window.ITEMS || {};
    Object.keys(items).forEach(id => {
      const it = items[id];
      html += `<option value="${id}" ${selectedId === id ? 'selected' : ''}>${it.icon || '📦'} ${it.name}</option>`;
    });
    return html;
  }

  if (!window._expandedRewardLevels) window._expandedRewardLevels = {};

  // ==================== 主渲染 ====================
  window.renderTabAccount = function (container) {
    if (!container) container = document.getElementById('app-content') || document.body;
    const acc = ensureAccountConfig();

    let maxRewardLv = 0;
    Object.keys(acc.levelRewards).forEach(k => {
      const n = parseInt(k);
      if (!isNaN(n) && n > maxRewardLv) maxRewardLv = n;
    });
    const tableLen = acc.expTable.length;
    const maxLevel = Math.max(tableLen, maxRewardLv);

    container.innerHTML = `
      <div class="card" style="max-height: 82vh; overflow-y: auto; padding-right: 5px;">
        <div class="card-header" style="position: sticky; top: 0; background: #1a1c29; z-index: 10; padding-bottom: 10px;">
          <h3>🎖️ 帳號等級與經驗配置</h3>
          <button class="btn" style="background:#2ecc71; padding:6px 14px; font-size:12px;" onclick="window.saveAccountConfigNow()">💾 手動儲存</button>
        </div>
        <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
          本頁配置「帳號等級」的所有內容。所有修改會自動持久化（無需手動保存）。<br>
          <span style="color:#f1c40f;">※ 帳號等級獨立於角色等級，僅通過「關卡首通」「掛機收資源」「摘星樓通關」獲得經驗。</span>
        </p>

        <!-- 1. 基礎設定 -->
        <div class="sub-title">⚙️ 基礎設定</div>
        <div class="form-grid" style="margin-bottom:20px;">
          <div class="form-item">
            <label style="color:#2ecc71;">掛機每小時獲得帳號經驗</label>
            <input type="number" min="0" value="${acc.idleAccountExpFlat}" 
              oninput="window.updateAccountBase('idleAccountExpFlat', parseFloat(this.value)||0)">
            <span style="font-size:11px; color:#888; margin-top:2px;">玩家掛機時，每小時產出此數值的經驗（與掛機產出編輯器互通）</span>
          </div>
          <div class="form-item">
            <label style="color:#e67e22;">摘星樓解鎖等級</label>
            <input type="number" min="1" value="${acc.towerUnlockLevel}" 
              oninput="window.updateAccountBase('towerUnlockLevel', parseInt(this.value)||1)">
            <span style="font-size:11px; color:#888; margin-top:2px;">帳號達到此等級時解鎖摘星樓（默認 10）</span>
          </div>
          <div class="form-item">
            <label style="color:#3498db;">超出經驗表後每級遞增係數</label>
            <input type="number" min="1.01" step="0.1" value="${acc.expGrowthFactor}" 
              oninput="window.updateAccountBase('expGrowthFactor', parseFloat(this.value)||1.8)">
            <span style="font-size:11px; color:#888; margin-top:2px;">例：1.8 表示每級需求為上一級的 1.8 倍（無上限）</span>
          </div>
          <div class="form-item">
            <label style="color:#f1c40f;">當前設定最高等級</label>
            <div style="padding:8px 12px; background:transparent; border:1px dashed #555; border-radius:4px; color:#f1c40f; font-weight:bold; font-size:16px;">
              Lv.${maxLevel}${maxRewardLv > tableLen ? '（包含表外獎勵）' : ''}
            </div>
            <span style="font-size:11px; color:#888; margin-top:2px;">此數值自動計算，若要增加請在下方生成或手動新增</span>
          </div>
        </div>

        <!-- 2. 批量生成經驗表 -->
        <div class="sub-title">⚡ 批量生成經驗表</div>
        <div style="background:#0f0f1a; border:1px solid #333; border-radius:6px; padding:12px; margin-bottom:20px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:10px; align-items:end;">
            <div>
              <label style="font-size:11px; color:#888; display:block; margin-bottom:3px;">Lv.1 升級所需（首項）</label>
              <input type="number" id="batch-first" min="1" value="${acc.expTable[0] || 100}" 
                style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;">
            </div>
            <div>
              <label style="font-size:11px; color:#888; display:block; margin-bottom:3px;">每級遞增係數</label>
              <input type="number" id="batch-factor" min="1.01" step="0.1" value="${acc.expGrowthFactor}" 
                style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;">
            </div>
            <div>
              <label style="font-size:11px; color:#888; display:block; margin-bottom:3px;">生成級數</label>
              <input type="number" id="batch-count" min="1" max="500" value="${tableLen}" 
                style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px;">
            </div>
            <button class="btn" style="background:#e67e22; padding:8px 16px; font-size:13px; white-space:nowrap;" 
              onclick="window.batchGenerateExpTable()">⚡ 重新生成</button>
          </div>
          <p style="font-size:11px; color:#e74c3c; margin-top:8px;">
            ⚠️ 點擊「重新生成」會覆蓋當前經驗表（已配的獎勵不會被刪除）。如需精細修改請用下方表格逐行調整。
          </p>
        </div>

        <!-- 3. 每級經驗表 -->
        <div class="sub-title">📈 每級升級所需經驗（每級獨立經驗條）</div>
        <div style="background:#0f0f1a; border:1px solid #333; border-radius:6px; overflow:hidden; margin-bottom:20px;">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#16213e;">
                <th style="padding:10px; color:#f1c40f; text-align:left; width:90px;">等級</th>
                <th style="padding:10px; color:#f1c40f; text-align:left; width:180px;">升級所需經驗</th>
                <th style="padding:10px; color:#f1c40f; text-align:left;">升級獎勵</th>
                <th style="padding:10px; color:#f1c40f; text-align:center; width:90px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${renderExpTableRows(acc, tableLen, maxRewardLv)}
            </tbody>
          </table>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <button class="btn" style="background:#3498db; font-size:13px; padding:8px 16px;" 
            onclick="window.addExpTableRow()">➕ 新增一級</button>
          <button class="btn" style="background:#e74c3c; font-size:13px; padding:8px 16px;" 
            onclick="window.removeLastExpTableRow()">🗑️ 刪除最後一級</button>
        </div>

        <!-- 4. 表外等級獎勵 -->
        <div class="sub-title">🎁 表外等級額外獎勵（可選）</div>
        <p style="font-size:12px; color:#aaa; margin-bottom:10px;">
          對於超過經驗表長度的等級（自動按倍率計算），若想給它們配置獎勵，可在此追加。
        </p>
        <div style="background:#0f0f1a; border:1px solid #333; border-radius:6px; padding:12px;">
          ${renderExtraRewardsList(acc, tableLen)}
        </div>

      </div>
    `;
  };

  function renderExpTableRows(acc, tableLen, maxRewardLv) {
    const totalRows = Math.max(tableLen, maxRewardLv);
    let html = '';

    for (let lv = 1; lv <= totalRows; lv++) {
      const idx = lv - 1;
      const inTable = idx < tableLen;
      const expVal = inTable ? acc.expTable[idx] : null;
      const reward = acc.levelRewards[lv] || null;
      const isExpanded = !!window._expandedRewardLevels[lv];

      let rewardSummary = '<span style="color:#555;">（無）</span>';
      if (reward) {
        const parts = [];
        if (reward.copper > 0) parts.push(`<span style="color:#f1c40f;">🪙 ${reward.copper}</span>`);
        if (Array.isArray(reward.items)) {
          reward.items.forEach(it => {
            const tpl = (window.ITEMS && window.ITEMS[it.itemId]) || null;
            const nm = tpl ? `${tpl.icon || '📦'} ${tpl.name}` : it.itemId;
            parts.push(`<span style="color:#3498db;">${nm} ×${it.count || 1}</span>`);
          });
        }
        if (parts.length) rewardSummary = parts.join('　');
      }

      html += `
        <tr style="border-bottom:1px solid #222; ${isExpanded ? 'background:rgba(241,196,15,0.04);' : ''}">
          <td style="padding:8px 10px; color:#f1c40f; font-weight:bold;">Lv.${lv}</td>
          <td style="padding:8px 10px;">
            ${inTable ? `
              <input type="number" min="1" value="${expVal}" 
                style="width:120px; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:13px;"
                onchange="window.updateExpValue(${lv}, parseInt(this.value)||1)">
            ` : `
              <span style="color:#888; font-size:12px; font-style:italic;">自動（×${acc.expGrowthFactor}）</span>
            `}
          </td>
          <td style="padding:8px 10px; font-size:13px;">${rewardSummary}</td>
          <td style="padding:8px 10px; text-align:center;">
            <button class="btn" style="background:${isExpanded ? '#e74c3c' : '#3498db'}; padding:4px 12px; font-size:12px;" 
              onclick="window.toggleRewardEditor(${lv})">${isExpanded ? '收起' : '編輯獎勵'}</button>
          </td>
        </tr>
      `;

      if (isExpanded) {
        const r = acc.levelRewards[lv] || { copper: 0, items: [] };
        if (!Array.isArray(r.items)) r.items = [];
        const items = r.items;

        let itemsHtml = '';
        items.forEach((it, iIdx) => {
          itemsHtml += `
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
              <select style="flex:1; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:13px;" 
                onchange="window.updateRewardItem(${lv}, ${iIdx}, 'itemId', this.value)">
                ${buildItemSelect(it.itemId)}
              </select>
              <label style="font-size:12px; color:#aaa;">數量</label>
              <input type="number" min="1" value="${it.count || 1}" 
                style="width:70px; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:13px;"
                onchange="window.updateRewardItem(${lv}, ${iIdx}, 'count', parseInt(this.value)||1)">
              <button class="btn-del" style="background:#e74c3c; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;" 
                onclick="window.removeRewardItem(${lv}, ${iIdx})">✖</button>
            </div>
          `;
        });

        html += `
          <tr style="background:rgba(0,0,0,0.3);">
            <td colspan="4" style="padding:12px 20px;">
              <div style="border-left:3px solid #f1c40f; padding-left:15px;">
                <div style="margin-bottom:10px;">
                  <label style="font-size:12px; color:#f1c40f; font-weight:bold; margin-right:10px;">🪙 銅幣：</label>
                  <input type="number" min="0" value="${r.copper || 0}" 
                    style="width:140px; background:#16213e; color:#f1c40f; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:13px;"
                    onchange="window.updateLevelCopper(${lv}, parseInt(this.value)||0)">
                </div>
                <div style="margin-bottom:8px;">
                  <label style="font-size:12px; color:#3498db; font-weight:bold;">🎁 物品獎勵：</label>
                </div>
                ${itemsHtml || '<div style="color:#555; font-size:12px; margin-bottom:6px;">（暫無物品）</div>'}
                <button class="btn" style="background:#2ecc71; padding:5px 12px; font-size:12px;" 
                  onclick="window.addRewardItem(${lv})">➕ 新增物品獎勵</button>
                <button class="btn" style="background:#e74c3c; padding:5px 12px; font-size:12px; margin-left:10px;" 
                  onclick="window.clearLevelReward(${lv})">🗑️ 清空此等級獎勵</button>
              </div>
            </td>
          </tr>
        `;
      }
    }
    return html;
  }

  function renderExtraRewardsList(acc, tableLen) {
    const extras = [];
    Object.keys(acc.levelRewards).forEach(k => {
      const lv = parseInt(k);
      if (!isNaN(lv) && lv > tableLen) extras.push(lv);
    });
    extras.sort((a, b) => a - b);

    if (extras.length === 0) {
      return `
        <div style="color:#666; font-size:13px; text-align:center; padding:12px; margin-bottom:10px;">
          目前沒有表外等級獎勵
        </div>
        <button class="btn" style="background:#3498db; font-size:13px; padding:8px 16px;" 
          onclick="window.addExtraLevelReward()">➕ 新增表外等級獎勵</button>
      `;
    }

    let html = '';
    extras.forEach(lv => {
      const r = acc.levelRewards[lv] || { copper: 0, items: [] };
      const parts = [];
      if (r.copper > 0) parts.push(`🪙 ${r.copper}`);
      if (Array.isArray(r.items)) {
        r.items.forEach(it => {
          const tpl = (window.ITEMS && window.ITEMS[it.itemId]) || null;
          const nm = tpl ? `${tpl.icon || '📦'} ${tpl.name}` : it.itemId;
          parts.push(`${nm} ×${it.count || 1}`);
        });
      }
      html += `
        <div style="display:flex; align-items:center; gap:12px; background:#16213e; border:1px solid #333; padding:8px 12px; border-radius:4px; margin-bottom:6px;">
          <span style="color:#f1c40f; font-weight:bold; min-width:60px;">Lv.${lv}</span>
          <span style="flex:1; font-size:13px; color:#ddd;">${parts.length ? parts.join('　') : '<span style="color:#555;">（無內容）</span>'}</span>
          <button class="btn" style="background:#3498db; padding:4px 12px; font-size:12px;" 
            onclick="window.toggleRewardEditor(${lv})">編輯</button>
          <button class="btn-del" style="background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;" 
            onclick="window.removeExtraLevelReward(${lv})">刪除</button>
        </div>
      `;
    });
    html += `
      <button class="btn" style="background:#3498db; font-size:13px; padding:8px 16px; margin-top:8px;" 
        onclick="window.addExtraLevelReward()">➕ 新增表外等級獎勵</button>
    `;
    return html;
  }

  // ============ 全局操作 ============
  window.updateAccountBase = function (field, value) {
    ensureAccountConfig();
    window.globalData.account[field] = value;
    persistAccountConfig();
    if (field === 'expGrowthFactor') {
      window.renderTabAccount(document.getElementById('app-content'));
    }
  };

  window.updateExpValue = function (lv, value) {
    const acc = ensureAccountConfig();
    const idx = lv - 1;
    if (idx >= 0 && idx < acc.expTable.length) {
      acc.expTable[idx] = Math.max(1, value);
      persistAccountConfig();
    }
  };

  window.addExpTableRow = function () {
    const acc = ensureAccountConfig();
    const last = acc.expTable[acc.expTable.length - 1] || 100;
    const next = Math.floor(last * (acc.expGrowthFactor || 1.8));
    acc.expTable.push(next);
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.removeLastExpTableRow = function () {
    const acc = ensureAccountConfig();
    if (acc.expTable.length <= 1) {
      alert('至少保留一級');
      return;
    }
    if (!confirm(`確定刪除經驗表的最後一級（Lv.${acc.expTable.length}）？\n注意：若該等級有配獎勵，獎勵仍會保留（顯示為表外獎勵）`)) return;
    acc.expTable.pop();
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.batchGenerateExpTable = function () {
    const first = parseInt(document.getElementById('batch-first').value) || 100;
    const factor = parseFloat(document.getElementById('batch-factor').value) || 1.8;
    const count = Math.max(1, Math.min(500, parseInt(document.getElementById('batch-count').value) || 10));
    const acc = ensureAccountConfig();
    const newTable = [Math.max(1, first)];
    for (let i = 1; i < count; i++) {
      newTable.push(Math.floor(newTable[i - 1] * factor));
    }
    acc.expTable = newTable;
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.toggleRewardEditor = function (lv) {
    const acc = ensureAccountConfig();
    if (window._expandedRewardLevels[lv]) {
      delete window._expandedRewardLevels[lv];
    } else {
      window._expandedRewardLevels[lv] = true;
      if (!acc.levelRewards[lv]) {
        acc.levelRewards[lv] = { copper: 0, items: [] };
        persistAccountConfig();
      }
    }
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.updateLevelCopper = function (lv, value) {
    const acc = ensureAccountConfig();
    if (!acc.levelRewards[lv]) acc.levelRewards[lv] = { copper: 0, items: [] };
    acc.levelRewards[lv].copper = Math.max(0, value);
    persistAccountConfig();
  };

  window.addRewardItem = function (lv) {
    const acc = ensureAccountConfig();
    if (!acc.levelRewards[lv]) acc.levelRewards[lv] = { copper: 0, items: [] };
    if (!Array.isArray(acc.levelRewards[lv].items)) acc.levelRewards[lv].items = [];
    acc.levelRewards[lv].items.push({ itemId: '', count: 1 });
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.removeRewardItem = function (lv, idx) {
    const acc = ensureAccountConfig();
    if (acc.levelRewards[lv] && Array.isArray(acc.levelRewards[lv].items)) {
      acc.levelRewards[lv].items.splice(idx, 1);
      persistAccountConfig();
      window.renderTabAccount(document.getElementById('app-content'));
    }
  };

  window.updateRewardItem = function (lv, idx, field, value) {
    const acc = ensureAccountConfig();
    if (acc.levelRewards[lv] && Array.isArray(acc.levelRewards[lv].items) && acc.levelRewards[lv].items[idx]) {
      acc.levelRewards[lv].items[idx][field] = value;
      persistAccountConfig();
    }
  };

  window.clearLevelReward = function (lv) {
    if (!confirm(`確定清空 Lv.${lv} 的所有獎勵？`)) return;
    const acc = ensureAccountConfig();
    delete acc.levelRewards[lv];
    delete window._expandedRewardLevels[lv];
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.addExtraLevelReward = function () {
    const acc = ensureAccountConfig();
    const input = prompt('請輸入要新增獎勵的等級（例如 50）：');
    if (!input) return;
    const lv = parseInt(input);
    if (isNaN(lv) || lv < 1) { alert('請輸入有效的正整數等級'); return; }
    if (lv <= acc.expTable.length) {
      alert(`該等級（Lv.${lv}）已在經驗表內，請直接在上方表格點「編輯獎勵」`);
      return;
    }
    if (!acc.levelRewards[lv]) acc.levelRewards[lv] = { copper: 0, items: [] };
    window._expandedRewardLevels[lv] = true;
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.removeExtraLevelReward = function (lv) {
    if (!confirm(`確定刪除 Lv.${lv} 的表外獎勵？`)) return;
    const acc = ensureAccountConfig();
    delete acc.levelRewards[lv];
    delete window._expandedRewardLevels[lv];
    persistAccountConfig();
    window.renderTabAccount(document.getElementById('app-content'));
  };

  window.saveAccountConfigNow = function () {
    persistAccountConfig();
    if (typeof saveData === 'function') {
      try { saveData(); } catch (e) {}
    }
    alert('✅ 帳號配置已成功儲存！');
  };
})();
