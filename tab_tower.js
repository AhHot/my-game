// ==========================================
// 模組：摘星樓外觀配置編輯器 + 配置應用器 (tab_tower.js)
// - 編輯器：renderTabTower(container)
// - 應用器：applyTowerConfig() 自動在 tower.html 上生效
// ==========================================
(function () {
  'use strict';

  const STORAGE_KEY = 'my_game_tower_config';

  // ============ 默认配置 ============
  const DEFAULT_CONFIG = {
    bgUrl: '',
    topBar: {
      bgColor: 'rgba(15, 17, 23, 0.9)',
      titleColor: '#f1c40f',
      titleText: '🏯 摘星樓'
    },
    cards: {
      width: 330,
      height: 42,
      gap: 6,
      fontSize: 14,
      currentFontSize: 16,
      current:   { bg: 'linear-gradient(135deg, rgba(230,126,34,0.9), rgba(211,84,0,0.9))', border: '#e67e22', color: '#ffffff' },
      cleared:   { bg: 'rgba(50, 50, 50, 0.4)',    border: 'rgba(80, 80, 80, 0.4)',  color: '#888888' },
      unreached: { bg: 'rgba(26, 26, 26, 0.6)',    border: 'rgba(100, 100, 100, 0.3)', color: '#666666' }
    },
    detail: {
      bg: 'linear-gradient(135deg, rgba(26, 28, 41, 0.95), rgba(15, 15, 21, 0.95))',
      border: '#e67e22',
      titleColor: '#f1c40f'
    },
    challengeBtn: {
      bg: 'linear-gradient(135deg, #e67e22, #d35400)',
      color: '#ffffff',
      text: '⚔️ 挑 戰'
    },
    sweepBtn: {
      bg: 'linear-gradient(135deg, #e67e22, #d35400)',
      color: '#ffffff'
    }
  };

  // ============ 深度合并 ============
  function deepMerge(target, src) {
    if (!src || typeof src !== 'object') return target;
    Object.keys(src).forEach(k => {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        deepMerge(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    });
    return target;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      if (raw) deepMerge(merged, JSON.parse(raw));
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // ============ 应用器（在 tower.html 上生效） ============
  function applyTowerConfig() {
    if (!document.getElementById('tower-scale-container')) return;

    const cfg = loadConfig();

    // 1) 全螢幕背景
    const bgEl = document.getElementById('tower-bg');
    if (bgEl) {
      if (cfg.bgUrl) bgEl.style.backgroundImage = `url('${cfg.bgUrl}')`;
      else bgEl.style.backgroundImage = '';
    }

    // 2) 顶栏标题文字与颜色
    const titleEl = document.querySelector('#tower-top-bar > div:first-child > div:nth-child(2)');
    if (titleEl) {
      if (cfg.topBar.titleText && titleEl.innerText !== cfg.topBar.titleText) {
        titleEl.innerText = cfg.topBar.titleText;
      }
      if (cfg.topBar.titleColor) titleEl.style.color = cfg.topBar.titleColor;
    }

    // 3) 挑战按钮文字
    const challengeBtn = document.querySelector('.challenge-btn');
    if (challengeBtn && cfg.challengeBtn.text) {
      if (challengeBtn.innerText !== cfg.challengeBtn.text) {
        challengeBtn.innerText = cfg.challengeBtn.text;
      }
    }

    // 4) 注入/更新样式表
    let styleEl = document.getElementById('tower-config-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'tower-config-style';
      document.head.appendChild(styleEl);
    }

    const c = cfg.cards;
    const cur = c.current, clr = c.cleared, unr = c.unreached;
    const newCss = [
      `#tower-top-bar { background: ${cfg.topBar.bgColor || 'rgba(15, 17, 23, 0.9)'} !important; }`,
      `#tower-left { width: ${(c.width || 330) + 30}px !important; }`,
      `.floor-card {`,
      `  width: ${c.width || 330}px !important;`,
      `  min-height: ${c.height || 42}px !important;`,
      `  margin-bottom: ${c.gap || 6}px !important;`,
      `  font-size: ${c.fontSize || 14}px !important;`,
      `}`,
      `.floor-card.current {`,
      `  background: ${cur.bg} !important;`,
      `  border-color: ${cur.border} !important;`,
      `  color: ${cur.color} !important;`,
      `  font-size: ${c.currentFontSize || 16}px !important;`,
      `}`,
      `.floor-card.cleared {`,
      `  background: ${clr.bg} !important;`,
      `  border-color: ${clr.border} !important;`,
      `  color: ${clr.color} !important;`,
      `}`,
      `.floor-card.unreached {`,
      `  background: ${unr.bg} !important;`,
      `  border-color: ${unr.border} !important;`,
      `  color: ${unr.color} !important;`,
      `}`,
      `#detail-card {`,
      `  background: ${cfg.detail.bg} !important;`,
      `  border-color: ${cfg.detail.border} !important;`,
      `}`,
      `.detail-title { color: ${cfg.detail.titleColor} !important; }`,
      `.challenge-btn {`,
      `  background: ${cfg.challengeBtn.bg} !important;`,
      `  color: ${cfg.challengeBtn.color} !important;`,
      `}`,
      `.sweep-btn:not(:disabled) {`,
      `  background: ${cfg.sweepBtn.bg} !important;`,
      `  color: ${cfg.sweepBtn.color} !important;`,
      `}`
    ].join('\n');

    if (styleEl.textContent !== newCss) styleEl.textContent = newCss;
  }

  // ============ 自动应用（仅 tower.html） ============
  function autoApplyOnTower() {
    if (!document.getElementById('tower-scale-container')) return;

    const applyNow = () => {
      try { applyTowerConfig(); } catch (e) { console.warn('摘星樓配置應用失敗:', e); }
    };

    // 立即与延迟多次（等待 tower.html 初次渲染完成）
    applyNow();
    setTimeout(applyNow, 100);
    setTimeout(applyNow, 400);
    setTimeout(applyNow, 1000);

    // MutationObserver：每次 tower.html 重绘（render / renderLeftPanel / renderRightPanel / updateSweepButton）后重新应用
    const observer = new MutationObserver(() => {
      if (window._towerRafPending) return;
      window._towerRafPending = true;
      requestAnimationFrame(() => {
        window._towerRafPending = false;
        applyNow();
      });
    });

    ['tower-left', 'tower-right', 'tower-top-bar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: false });
    });
  }

  // ============ 编辑器 Tab ============
  window.renderTabTower = function (container) {
    if (!container) container = document.getElementById('app-content') || document.body;
    const cfg = loadConfig();

    container.innerHTML = `
      <div class="card" style="max-height: 82vh; overflow-y: auto; padding-right: 5px;">
        <div class="card-header" style="position: sticky; top: 0; background: #1a1c29; z-index: 10; padding-bottom: 10px;">
          <h3>🏯 摘星樓外觀配置</h3>
          <div style="display:flex; gap:8px;">
            <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px;" onclick="window.__towerPreview()">👁️ 預覽摘星樓</button>
            <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="window.__towerSave()">💾 保存</button>
          </div>
        </div>

        <div style="background: rgba(241,196,15,0.08); border: 1px solid rgba(241,196,15,0.25); padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 12px; color: #ddd; line-height: 1.7;">
          <b style="color:#f1c40f;">💡 生效方式：</b>本頁配置會自動寫入 localStorage。只需在 <code style="background:#000; padding:1px 5px; border-radius:3px;">tower.html</code> 中引用本文件（只需加一次，不必改其他代碼）：
          <div style="background:#000; padding: 6px 10px; border-radius: 4px; margin-top: 5px; font-family: monospace; color: #2ecc71; font-size: 11px;">&lt;script src="tab_tower.js"&gt;&lt;/script&gt;</div>
          加在 <code style="background:#000; padding:1px 5px; border-radius:3px;">account_system.js</code> 下方即可。之後所有修改即時生效。
        </div>

        <!-- 🖼️ 背景圖 -->
        <div class="sub-title">🖼️ 全螢幕背景圖</div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px;">
          <input type="text" value="${cfg.bgUrl || ''}" placeholder="背景圖 URL（留空則用預設純黑背景）"
            style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:6px 8px; border-radius:4px; font-size:12px;"
            oninput="window.__towerUpdateField('bgUrl', this.value)">
        </div>

        <!-- 🧭 顶栏 -->
        <div class="sub-title">🧭 頂欄樣式</div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">標題文字</label>
            <input type="text" value="${cfg.topBar.titleText || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('topBar.titleText', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">標題顏色</label>
            <input type="color" value="${toColorInput(cfg.topBar.titleColor)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
              oninput="window.__towerUpdateField('topBar.titleColor', this.value)">
          </div>
          <div style="grid-column: span 2;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">頂欄背景（可用 rgba 或漸變）</label>
            <input type="text" value="${cfg.topBar.bgColor || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('topBar.bgColor', this.value)">
            <span style="font-size:10px; color:#666;">例：rgba(15, 17, 23, 0.9) 或 linear-gradient(90deg, #1a1c29, #0f0f15)</span>
          </div>
        </div>

        <!-- 📐 卡片尺寸 -->
        <div class="sub-title">📐 卡片尺寸</div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:repeat(5, 1fr); gap:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">寬 (px)</label>
            <input type="number" value="${cfg.cards.width || 330}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('cards.width', parseInt(this.value)||330)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">高 (px)</label>
            <input type="number" value="${cfg.cards.height || 42}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('cards.height', parseInt(this.value)||42)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">間距 (px)</label>
            <input type="number" value="${cfg.cards.gap || 6}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('cards.gap', parseInt(this.value)||6)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">字號 (px)</label>
            <input type="number" value="${cfg.cards.fontSize || 14}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('cards.fontSize', parseInt(this.value)||14)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">當前層字號</label>
            <input type="number" value="${cfg.cards.currentFontSize || 16}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('cards.currentFontSize', parseInt(this.value)||16)">
          </div>
        </div>

        <!-- 🎨 三状态卡片 -->
        ${renderCardStateBlock('🎨 當前待挑戰層', 'cards.current', cfg.cards.current)}
        ${renderCardStateBlock('🎨 已通關層', 'cards.cleared', cfg.cards.cleared)}
        ${renderCardStateBlock('🎨 未到達層', 'cards.unreached', cfg.cards.unreached)}

        <!-- 📋 详情卡 -->
        <div class="sub-title">📋 右側詳情卡樣式</div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div style="grid-column: span 3;">
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">背景（可用漸變）</label>
            <input type="text" value="${cfg.detail.bg || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('detail.bg', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">邊框色</label>
            <input type="color" value="${toColorInput(cfg.detail.border)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
              oninput="window.__towerUpdateField('detail.border', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">標題色</label>
            <input type="color" value="${toColorInput(cfg.detail.titleColor)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
              oninput="window.__towerUpdateField('detail.titleColor', this.value)">
          </div>
          <div></div>
        </div>

        <!-- ⚔️ 挑战按钮 -->
        <div class="sub-title">⚔️ 挑戰按鈕樣式</div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">按鈕文字</label>
            <input type="text" value="${cfg.challengeBtn.text || ''}" placeholder="例：⚔️ 挑 戰" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:12px;"
              oninput="window.__towerUpdateField('challengeBtn.text', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">文字色</label>
            <input type="color" value="${toColorInput(cfg.challengeBtn.color)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
              oninput="window.__towerUpdateField('challengeBtn.color', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">背景（可用漸變）</label>
            <input type="text" value="${cfg.challengeBtn.bg || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:11px;"
              oninput="window.__towerUpdateField('challengeBtn.bg', this.value)">
          </div>
        </div>

        <!-- 🌀 扫荡按钮 -->
        <div class="sub-title">🌀 掃蕩按鈕樣式 <span style="font-size:11px; color:#888; font-weight:normal;">（按鈕文字由遊戲邏輯動態顯示，只可改配色）</span></div>
        <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">文字色</label>
            <input type="color" value="${toColorInput(cfg.sweepBtn.color)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
              oninput="window.__towerUpdateField('sweepBtn.color', this.value)">
          </div>
          <div>
            <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">背景（可用漸變）</label>
            <input type="text" value="${cfg.sweepBtn.bg || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:11px;"
              oninput="window.__towerUpdateField('sweepBtn.bg', this.value)">
          </div>
        </div>

        <div style="text-align:center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
          <button class="btn" style="background:#e74c3c; padding:8px 20px; font-size:13px;" onclick="window.__towerResetDefault()">🔄 恢復預設</button>
        </div>
      </div>
    `;
  };

  // 三状态卡片编辑器（可复用）
  function renderCardStateBlock(title, pathPrefix, data) {
    return `
      <div class="sub-title">${title}</div>
      <div style="background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
        <div style="grid-column: span 3;">
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">背景（可用漸變 / rgba）</label>
          <input type="text" value="${data.bg || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:11px;"
            oninput="window.__towerUpdateField('${pathPrefix}.bg', this.value)">
        </div>
        <div style="grid-column: span 2;">
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">邊框色（可用 rgba）</label>
          <input type="text" value="${data.border || ''}" style="width:100%; background:#16213e; color:#fff; border:1px solid #444; padding:5px 8px; border-radius:4px; font-size:11px;"
            oninput="window.__towerUpdateField('${pathPrefix}.border', this.value)">
        </div>
        <div>
          <label style="font-size:11px; color:#888; display:block; margin-bottom:2px;">文字色</label>
          <input type="color" value="${toColorInput(data.color)}" style="width:100%; height:32px; background:#16213e; border:1px solid #444; border-radius:4px; cursor:pointer;"
            oninput="window.__towerUpdateField('${pathPrefix}.color', this.value)">
        </div>
      </div>
    `;
  }

  // color input 只接受 #rrggbb 或 #rgb，其他一律返回白色兜底
  function toColorInput(c) {
    if (!c || typeof c !== 'string') return '#ffffff';
    const v = c.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    }
    return '#ffffff';
  }

  // ============ 全局编辑操作 ============
  window.__towerUpdateField = function (path, value) {
    const cfg = loadConfig();
    setPath(cfg, path, value);
    saveConfig(cfg);
  };

  window.__towerSave = function () {
    if (confirm('✅ 外觀配置已自動保存。\n\n如需立即看到效果，是否現在打開摘星樓頁面預覽？')) {
      window.open('tower.html?t=' + Date.now(), '_blank');
    }
  };

  window.__towerPreview = function () {
    window.open('tower.html?t=' + Date.now(), '_blank');
  };

  window.__towerResetDefault = function () {
    if (!confirm('⚠️ 確定要恢復所有摘星樓外觀為預設值嗎？')) return;
    saveConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    window.renderTabTower(document.getElementById('app-content'));
  };

  // ============ 初始化：若在 tower.html 上，自动应用配置 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoApplyOnTower);
  } else {
    autoApplyOnTower();
  }

  // 也把 applyTowerConfig 挂到全局，方便其他脚本手动调用
  window.applyTowerConfig = applyTowerConfig;
})();
