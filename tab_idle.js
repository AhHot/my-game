// ============================================================
// 編輯器：掛機產出配置 (tab_idle.js)
// ============================================================
window.renderTabIdle = function (container) {
  if (!window.IdleSystem) {
    container.innerHTML = '<div class="card" style="color:#e74c3c;">❌ idle_system.js 未載入</div>';
    return;
  }
  const cfg  = window.IdleSystem.getConfig();
  const data = window.IdleSystem.getData();
  const rates = {
    copper:           cfg.baseRates.copper           + data.clearedCount * cfg.perStageGrowth.copper,
    expPill:          cfg.baseRates.expPill          + data.clearedCount * cfg.perStageGrowth.expPill,
    breakthroughPill: cfg.baseRates.breakthroughPill + data.clearedCount * cfg.perStageGrowth.breakthroughPill,
    equipment:        cfg.baseRates.equipment        + data.clearedCount * cfg.perStageGrowth.equipment
  };

  const allItems = window.gameItems || [];
  const itemOpts = (id) => allItems.map(it =>
    `<option value="${it.id}" ${id === it.id ? 'selected' : ''}>${it.icon || '📦'} ${it.name}</option>`
  ).join('');

  const equipItems  = allItems.filter(it => ['weapon','armor','accessory'].includes(it.category));
  const equipChecks = equipItems.map(it => `
    <label class="checkbox-item">
      <input type="checkbox" ${cfg.equipmentPool.includes(it.id) ? 'checked' : ''}
        onchange="window._toggleEquipPool('${it.id}', this.checked)">
      ${it.icon || '⚔️'} ${it.name}
    </label>`).join('') || '<span style="color:#888;">尚無裝備模板</span>';

  const elapsed = Math.min(
    Date.now() - data.lastCollectTime,
    cfg.maxOfflineHours * 3600000
  ) / 3600000;

  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:10px;">⏳ 掛機資源產出配置</h3>
      <p style="color:#aaa; font-size:13px; margin-bottom:15px;">
        主畫面右下角「江湖歷練」面板會依下列公式產出資源：
        <br>每小時產出 = <b style="color:#2ecc71;">基礎速率 + 已通關關卡數 × 每關成長</b>
        <br>玩家點擊領取時，以「實際經過時間 × 每小時產出」結算。
      </p>

      <div class="form-grid">
        <div class="form-item">
          <label>離線累計上限（小時）</label>
          <input type="number" min="1" step="1" value="${cfg.maxOfflineHours}"
            onchange="window._saveIdleTop('maxOfflineHours', parseFloat(this.value))">
        </div>
      </div>

      <div class="sub-title">📈 基礎產出速率（每小時）</div>
      <div class="form-grid">
        <div class="form-item"><label>🪙 銅幣 / 小時</label>
          <input type="number" step="0.1" value="${cfg.baseRates.copper}"
            onchange="window._saveIdleRate('baseRates','copper',parseFloat(this.value))"></div>
        <div class="form-item"><label>💊 經驗丹 / 小時</label>
          <input type="number" step="0.01" value="${cfg.baseRates.expPill}"
            onchange="window._saveIdleRate('baseRates','expPill',parseFloat(this.value))"></div>
        <div class="form-item"><label>🧪 突破丹 / 小時</label>
          <input type="number" step="0.01" value="${cfg.baseRates.breakthroughPill}"
            onchange="window._saveIdleRate('baseRates','breakthroughPill',parseFloat(this.value))"></div>
        <div class="form-item"><label>⚔️ 裝備 / 小時</label>
          <input type="number" step="0.01" value="${cfg.baseRates.equipment}"
            onchange="window._saveIdleRate('baseRates','equipment',parseFloat(this.value))"></div>
      </div>

      <div class="sub-title">📊 每通關一關的額外提升</div>
      <div class="form-grid">
        <div class="form-item"><label>🪙 銅幣 / 小時</label>
          <input type="number" step="0.1" value="${cfg.perStageGrowth.copper}"
            onchange="window._saveIdleRate('perStageGrowth','copper',parseFloat(this.value))"></div>
        <div class="form-item"><label>💊 經驗丹 / 小時</label>
          <input type="number" step="0.01" value="${cfg.perStageGrowth.expPill}"
            onchange="window._saveIdleRate('perStageGrowth','expPill',parseFloat(this.value))"></div>
        <div class="form-item"><label>🧪 突破丹 / 小時</label>
          <input type="number" step="0.01" value="${cfg.perStageGrowth.breakthroughPill}"
            onchange="window._saveIdleRate('perStageGrowth','breakthroughPill',parseFloat(this.value))"></div>
        <div class="form-item"><label>⚔️ 裝備 / 小時</label>
          <input type="number" step="0.01" value="${cfg.perStageGrowth.equipment}"
            onchange="window._saveIdleRate('perStageGrowth','equipment',parseFloat(this.value))"></div>
      </div>

      <div class="sub-title">🎁 資源對應物品 ID</div>
      <div class="form-grid">
        <div class="form-item">
          <label>💊 經驗丹對應物品</label>
          <select onchange="window._saveIdleItem('expPill', this.value)">${itemOpts(cfg.itemMappings.expPill)}</select>
        </div>
        <div class="form-item">
          <label>🧪 突破丹對應物品</label>
          <select onchange="window._saveIdleItem('breakthroughPill', this.value)">${itemOpts(cfg.itemMappings.breakthroughPill)}</select>
        </div>
      </div>

      <div class="sub-title">⚔️ 裝備掉落池（從以下模板隨機抽取）</div>
      <div class="checkbox-group" style="margin-bottom:10px;">${equipChecks}</div>

      <hr style="border:none;border-top:1px solid #333;margin:20px 0;">

      <div class="sub-title">📊 當前狀態預覽</div>
      <div class="preview-box" style="grid-template-columns:1fr; padding:15px;">
        <div>已通關關卡數：<span>${data.clearedCount}</span> 關</div>
        <div>每小時產出：
          銅幣 <span>${rates.copper.toFixed(1)}</span> ·
          經驗丹 <span>${rates.expPill.toFixed(2)}</span> ·
          突破丹 <span>${rates.breakthroughPill.toFixed(2)}</span> ·
          裝備 <span>${rates.equipment.toFixed(2)}</span>
        </div>
        <div>距上次領取：<span>${elapsed.toFixed(2)} 小時</span></div>
      </div>

      <div style="display:flex; gap:10px; margin-top:15px;">
        <button class="btn" style="background:#e74c3c;" onclick="window._resetIdleProgress()">🔄 重置掛機進度</button>
        <button class="btn" style="background:#2ecc71;" onclick="window._testIdlePreview()">🧪 模擬領取預覽</button>
      </div>
    </div>
  `;
};

// ---------------- 儲存輔助 ----------------
window._saveIdleTop = function (key, val) {
  const c = window.IdleSystem.getConfig(); c[key] = val; window.IdleSystem.saveConfig(c);
};

window._saveIdleRate = function (group, key, val) {
  const c = window.IdleSystem.getConfig(); c[group][key] = val;
  window.IdleSystem.saveConfig(c);
  window.renderTabIdle(document.getElementById('app-content'));
};

window._saveIdleItem = function (key, val) {
  const c = window.IdleSystem.getConfig(); c.itemMappings[key] = val;
  window.IdleSystem.saveConfig(c);
};

window._toggleEquipPool = function (itemId, checked) {
  const c = window.IdleSystem.getConfig();
  let pool = c.equipmentPool.filter(x => x !== itemId);
  if (checked) pool.push(itemId);
  c.equipmentPool = pool;
  window.IdleSystem.saveConfig(c);
};

window._resetIdleProgress = function () {
  if (!confirm('確定要重置掛機進度嗎？（會清空已通關計數並重置計時）')) return;
  const d = window.IdleSystem.getData();
  d.clearedCount = 0;
  d.lastCollectTime = Date.now();
  d.pendingFractions = {};
  window.IdleSystem.saveData(d);
  window.renderTabIdle(document.getElementById('app-content'));
};

window._testIdlePreview = function () {
  const cfg = window.IdleSystem.getConfig();
  const data = window.IdleSystem.getData();
  const rates = {
    copper:           cfg.baseRates.copper           + data.clearedCount * cfg.perStageGrowth.copper,
    expPill:          cfg.baseRates.expPill          + data.clearedCount * cfg.perStageGrowth.expPill,
    breakthroughPill: cfg.baseRates.breakthroughPill + data.clearedCount * cfg.perStageGrowth.breakthroughPill,
    equipment:        cfg.baseRates.equipment        + data.clearedCount * cfg.perStageGrowth.equipment
  };
  const h = 2;
  alert(
    `📊 模擬掛機 ${h} 小時可獲得：\n\n` +
    `🪙 銅幣 x${Math.floor(h * rates.copper)}\n` +
    `💊 經驗丹 x${Math.floor(h * rates.expPill)}\n` +
    `🧪 突破丹 x${Math.floor(h * rates.breakthroughPill)}\n` +
    `⚔️ 裝備 x${Math.floor(h * rates.equipment)}`
  );
};
