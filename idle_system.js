// ============================================================
// 模組：放置型掛機資源系統 (idle_system.js) - 計時與浮窗版
// 完全獨立，只透過 window.IdleSystem.* 對外
// ============================================================
(function () {
  'use strict';

  const DATA_KEY = 'my_game_idle_data';
  const CONFIG_KEY = 'my_game_idle_config';

  const DEFAULT_CONFIG = {
    maxOfflineHours: 24,
    baseRates:      { copper: 100, expPill: 1,    breakthroughPill: 0.20, equipment: 0.05 },
    perStageGrowth: { copper: 20,  expPill: 0.20, breakthroughPill: 0.05, equipment: 0.01 },
    itemMappings: { expPill: 'item_exp_pill', breakthroughPill: 'item_breakthrough_pill' },
    equipmentPool: ['item_sword']
  };

  // ---------------- 讀寫 ----------------
  function getConfig() {
    let c = {};
    try { c = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch (e) { c = {}; }
    return {
      maxOfflineHours: c.maxOfflineHours ?? DEFAULT_CONFIG.maxOfflineHours,
      baseRates:      { ...DEFAULT_CONFIG.baseRates,      ...(c.baseRates || {}) },
      perStageGrowth: { ...DEFAULT_CONFIG.perStageGrowth, ...(c.perStageGrowth || {}) },
      itemMappings:   { ...DEFAULT_CONFIG.itemMappings,   ...(c.itemMappings || {}) },
      equipmentPool: Array.isArray(c.equipmentPool) && c.equipmentPool.length
                      ? c.equipmentPool : [...DEFAULT_CONFIG.equipmentPool]
    };
  }

  function saveConfig(cfg) { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); }

  function getData() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); } catch (e) { d = {}; }
    return {
      lastCollectTime: typeof d.lastCollectTime === 'number' ? d.lastCollectTime : Date.now(),
      clearedCount:    typeof d.clearedCount    === 'number' ? d.clearedCount    : 0,
      pendingFractions: d.pendingFractions || {}
    };
  }

  function saveData(d) { localStorage.setItem(DATA_KEY, JSON.stringify(d)); }

  // ---------------- 計算 ----------------
  function calcRates(cfg, data) {
    const n = data.clearedCount || 0;
    return {
      copper:           cfg.baseRates.copper           + n * cfg.perStageGrowth.copper,
      expPill:          cfg.baseRates.expPill          + n * cfg.perStageGrowth.expPill,
      breakthroughPill: cfg.baseRates.breakthroughPill + n * cfg.perStageGrowth.breakthroughPill,
      equipment:        cfg.baseRates.equipment        + n * cfg.perStageGrowth.equipment
    };
  }

  function calcPending(cfg, data, now) {
    now = now || Date.now();
    let lastT = data.lastCollectTime;
    if (lastT > now) lastT = now;                              // 防手動改時間
    const elapsedMs = Math.min(now - lastT, cfg.maxOfflineHours * 3600000);
    const hours = Math.max(0, elapsedMs / 3600000);
    const rates = calcRates(cfg, data);
    const f = data.pendingFractions || {};
    return {
      hours, rates,
      copper:           hours * rates.copper           + (f.copper           || 0),
      expPill:          hours * rates.expPill          + (f.expPill          || 0),
      breakthroughPill: hours * rates.breakthroughPill + (f.breakthroughPill || 0),
      equipment:        hours * rates.equipment        + (f.equipment        || 0)
    };
  }

  // ---------------- 發放工具 ----------------
  function grantCopper(amount) {
    if (!window.globalData) window.globalData = {};
    if (!window.globalData.currency) window.globalData.currency = { copper: 0, sycee: 0 };
    window.globalData.currency.copper = (window.globalData.currency.copper || 0) + amount;
    try { localStorage.setItem('my_game_config', JSON.stringify(window.globalData)); } catch (e) {}
  }

  function getItemTpl(itemId) {
    if (window.ITEMS && window.ITEMS[itemId]) return window.ITEMS[itemId];
    if (window.gameItems) return window.gameItems.find(i => i.id === itemId);
    return null;
  }

  function grantItem(itemId, count) {
    const tpl = getItemTpl(itemId);
    if (!tpl || count <= 0) return;
    if (!window.INVENTORY) window.INVENTORY = [];
    const maxStack = tpl.maxStack || 99;
    const existing = window.INVENTORY.find(i => i.itemId === itemId && !i.equippedBy);
    if (existing) existing.count = (existing.count || 1) + count;
    else window.INVENTORY.push({
      uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1e4),
      itemId, quality: 'white', count, equippedBy: ''
    });
    // 處理超過堆疊上限
    let idx = 0;
    while (idx < window.INVENTORY.length) {
      const it = window.INVENTORY[idx];
      if (it.itemId === itemId && !it.equippedBy && (it.count || 1) > maxStack) {
        const overflow = it.count - maxStack;
        it.count = maxStack;
        window.INVENTORY.push({
          uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1e4) + '_' + idx,
          itemId, quality: 'white', count: overflow, equippedBy: ''
        });
      }
      idx++;
    }
    try { localStorage.setItem('my_game_inventory_sync', JSON.stringify(window.INVENTORY)); } catch (e) {}
  }

  function grantEquipment(count, pool) {
    if (!pool || !pool.length || count <= 0) return;
    if (!window.INVENTORY) window.INVENTORY = [];
    for (let i = 0; i < count; i++) {
      const tplId = pool[Math.floor(Math.random() * pool.length)];
      let inst = null;
      try {
        if (typeof window.generateRandomInstance === 'function') inst = window.generateRandomInstance(tplId);
      } catch (e) { inst = null; }
      if (!inst) {
        if (!getItemTpl(tplId)) continue;
        inst = {
          uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1e4) + '_' + i,
          itemId: tplId, quality: 'white', baseAtk: 0, baseDef: 0, baseHp: 0,
          extras: [], equippedBy: '', count: 1
        };
      }
      window.INVENTORY.push(inst);
    }
    try { localStorage.setItem('my_game_inventory_sync', JSON.stringify(window.INVENTORY)); } catch (e) {}
  }

  // ---------------- 對外：領取 ----------------
  function collect() {
    const cfg = getConfig();
    const data = getData();
    const now = Date.now();
    const pending = calcPending(cfg, data, now);

    // ★ 新增：不足 15 分鐘 (0.25小時) 無法領取
    if (pending.hours < 0.25) {
      return { ok: false, msg: '累計少於15分鐘無法領取' };
    }

    const grants = {
      copper:           Math.floor(pending.copper),
      expPill:          Math.floor(pending.expPill),
      breakthroughPill: Math.floor(pending.breakthroughPill),
      equipment:        Math.floor(pending.equipment)
    };
    const total = grants.copper + grants.expPill + grants.breakthroughPill + grants.equipment;
    if (total <= 0) return { ok: false, msg: '暫無資源可領取，先去冒險吧！' };

    // 更新小數尾數、上次領取時間
    data.pendingFractions = {
      copper:           pending.copper           - grants.copper,
      expPill:          pending.expPill          - grants.expPill,
      breakthroughPill: pending.breakthroughPill - grants.breakthroughPill,
      equipment:        pending.equipment        - grants.equipment
    };
    data.lastCollectTime = now;
    saveData(data);

    // 實際發放
    if (grants.copper > 0)           grantCopper(grants.copper);
    if (grants.expPill > 0)          grantItem(cfg.itemMappings.expPill,          grants.expPill);
    if (grants.breakthroughPill > 0) grantItem(cfg.itemMappings.breakthroughPill, grants.breakthroughPill);
    if (grants.equipment > 0)        grantEquipment(grants.equipment, cfg.equipmentPool);

    // 通知其他系統刷新
    if (window.IdleSystem && window.IdleSystem.onReward) window.IdleSystem.onReward(grants);

    return { ok: true, grants };
  }

  // ---------------- 對外：通關獎勵 ----------------
  function onStageCleared(stageIndex) {
    if (typeof stageIndex !== 'number') return;
    const data = getData();
    const need = stageIndex + 1;
    if (need > data.clearedCount) {
      data.clearedCount = need;
      saveData(data);
      console.log('[IdleSystem] 通關 +1，當前 clearedCount =', data.clearedCount);
    }
  }

  // ---------------- UI ----------------
  let _refreshTimer = null;

  function toast(msg, color) {
    if (typeof window.showToast === 'function' && window.showToast !== toast) {
      window.showToast(msg, color);
      return;
    }
    let t = document.getElementById('global-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'global-toast';
      t.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);padding:15px 30px;border-radius:10px;font-size:20px;font-weight:bold;z-index:99999;color:#fff;display:none;';
      document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.background = color || '#2ecc71';
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
  }

  function initUI() {
    if (document.getElementById('idle-panel')) return;

    // ★ 檢查當前頁面是否有主畫面的容器，沒有則不顯示
    if (!document.getElementById('game-scale-container')) return; 

    const parent = document.getElementById('game-scale-container') || document.body;

    // ★ 插入浮窗的 CSS
    if (!document.getElementById('idle-system-styles')) {
      let style = document.createElement('style');
      style.id = 'idle-system-styles';
      style.innerHTML = `
        #idle-tooltip {
          position: fixed;
          display: none;
          background: rgba(22, 33, 62, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-size: 14px;
          z-index: 9999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.6);
          pointer-events: none;
          line-height: 1.8;
          font-family: "Microsoft YaHei", sans-serif;
          white-space: nowrap;
        }
        #idle-panel .idle-title {
          cursor: pointer;
          color: #f1c40f;
          font-size: 16px;
          font-weight: bold;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        #idle-panel .idle-title:hover { color: #f39c12; }
      `;
      document.head.appendChild(style);
    }

    const panel = document.createElement('div');
    panel.id = 'idle-panel';
    panel.className = 'interactive-ui';
    panel.style.cssText = `
      position: absolute;
      right: 30px;
      bottom: 30px;
      width: 280px;
      background: rgba(22, 33, 62, 0.92);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      color: #fff;
      font-family: "Microsoft YaHei", sans-serif;
      z-index: 100;
    `;
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:8px;">
        <div class="idle-title" id="idle-title-btn" title="點擊查看每小時產出">⏳ 江湖歷練</div>
        <div id="idle-progress-tag" style="font-size:13px; color:#2ecc71; background:rgba(46,204,113,0.15); padding:2px 8px; border-radius:10px; font-family: monospace; font-weight: bold;">00:00:00</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:6px;"><span>🪙</span><span id="idle-copper" style="color:#f1c40f; font-weight:bold;">0</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><span>💊</span><span id="idle-expPill" style="color:#3498db; font-weight:bold;">0</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><span>🧪</span><span id="idle-breakthroughPill" style="color:#2ecc71; font-weight:bold;">0</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><span>⚔️</span><span id="idle-equipment" style="color:#e67e22; font-weight:bold;">0</span></div>
      </div>
      <button id="idle-collect-btn"
        style="width:100%; padding:10px; background:linear-gradient(135deg,#e67e22,#d35400); border:none; border-radius:6px; color:#fff; font-size:15px; font-weight:bold; cursor:pointer; transition:all .2s;">
        📦 領取資源
      </button>
    `;
    parent.appendChild(panel);

    // 添加浮窗元素
    if (!document.getElementById('idle-tooltip')) {
      const tooltip = document.createElement('div');
      tooltip.id = 'idle-tooltip';
      document.body.appendChild(tooltip); // 添加到 body 擺脫縮放影響
    }

    // 綁定浮窗點擊事件
    const titleBtn = panel.querySelector('#idle-title-btn');
    const tooltip = document.getElementById('idle-tooltip');
    
    titleBtn.onclick = function(e) {
      e.stopPropagation(); // 阻止冒泡
      const cfg = getConfig();
      const data = getData();
      const rates = calcRates(cfg, data);

      tooltip.innerHTML = `
        <div style="color:#f1c40f; font-weight:bold; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:4px;">📊 每小時產出總量</div>
        <div>🪙 銅幣：<span style="color:#f1c40f;">${rates.copper.toFixed(1)}</span></div>
        <div>💊 經驗丹：<span style="color:#3498db;">${rates.expPill.toFixed(2)}</span></div>
        <div>🧪 突破丹：<span style="color:#2ecc71;">${rates.breakthroughPill.toFixed(2)}</span></div>
        <div>⚔️ 裝備：<span style="color:#e67e22;">${rates.equipment.toFixed(2)}</span></div>
      `;

      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY + 15) + 'px';
      
      // 防超出螢幕邊界
      const rect = tooltip.getBoundingClientRect();
      if (rect.right > window.innerWidth) tooltip.style.left = (e.clientX - rect.width - 15) + 'px';
      if (rect.bottom > window.innerHeight) tooltip.style.top = (e.clientY - rect.height - 15) + 'px';
    };

    // 點擊其他地方關閉浮窗
    document.addEventListener('click', function() {
      if (tooltip && tooltip.style.display === 'block') {
        tooltip.style.display = 'none';
      }
    });

    panel.querySelector('#idle-collect-btn').onclick = () => {
      const res = collect();
      if (!res.ok) { toast(res.msg, '#e67e22'); return; }
      const g = res.grants, parts = [];
      if (g.copper)           parts.push(`銅幣+${g.copper}`);
      if (g.expPill)          parts.push(`經驗丹+${g.expPill}`);
      if (g.breakthroughPill) parts.push(`突破丹+${g.breakthroughPill}`);
      if (g.equipment)        parts.push(`裝備+${g.equipment}`);
      toast(`✅ 收穫：${parts.join('，')}`, '#2ecc71');
      refreshUI();
    };

    refreshUI();
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(refreshUI, 1000);
  }

  function refreshUI() {
    const panel = document.getElementById('idle-panel');
    if (!panel) return;
    const cfg = getConfig();
    const data = getData();
    const pending = calcPending(cfg, data);

    // 將小時轉換為 HH:MM:SS
    const totalSeconds = Math.floor(pending.hours * 3600);
    const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');

    const set = (id, v) => { const el = panel.querySelector('#' + id); if (el) el.innerText = v; };
    set('idle-progress-tag', `${hh}:${mm}:${ss}`);
    set('idle-copper',           Math.floor(pending.copper).toLocaleString());
    set('idle-expPill',          Math.floor(pending.expPill).toString());
    set('idle-breakthroughPill', Math.floor(pending.breakthroughPill).toString());
    set('idle-equipment',        Math.floor(pending.equipment).toString());

    const btn = panel.querySelector('#idle-collect-btn');
    // 確保按鈕永遠是可點擊狀態，讓玩家自己點擊看提示
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  }

  // ---------------- 對外 API ----------------
  window.IdleSystem = {
    getConfig, saveConfig,
    getData, saveData,
    calcRates, calcPending,
    collect, onStageCleared,
    refreshUI, init: initUI,
    DEFAULT_CONFIG
  };

  // 自動初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
