// ==========================================
// 模組：帳號等級與升級獎勵系統 (account_system.js)
// - 帳號經驗/升級判定（無上限）
// - 升級獎勵領取彈窗 UI
// - 摘星樓解鎖提示
// ==========================================
(function () {
  'use strict';

  const UNLOCK_SHOWN_KEY = 'my_game_tower_unlock_shown';
  const IS_EDITOR = window.location.pathname.includes('editor.html') || window.location.href.includes('editor.html');

  // ============== 核心：經驗/升級 ==============
  function getAccountExpNeeded(level) {
    const gd = window.globalData || {};
    const accCfg = gd.account || {};
    const table = Array.isArray(accCfg.expTable) && accCfg.expTable.length
      ? accCfg.expTable
      : [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200];
    const factor = typeof accCfg.expGrowthFactor === 'number' && accCfg.expGrowthFactor > 0
      ? accCfg.expGrowthFactor
      : 1.8;

    // 表內直接取
    if (level - 1 >= 0 && level - 1 < table.length) return table[level - 1];

    // 超出表長度，等比遞增
    let lastVal = table[table.length - 1] || 100;
    const outOfRange = level - table.length;
    for (let i = 0; i < outOfRange; i++) {
      lastVal = Math.floor(lastVal * factor);
    }
    return lastVal;
  }

  function addAccountExp(amount) {
    if (!window.gameAccount) return { leveledUp: false, levelsGained: 0, newLevel: 0 };
    amount = Math.floor(Number(amount) || 0);
    if (amount <= 0) return { leveledUp: false, levelsGained: 0, newLevel: window.gameAccount.level };

    const acc = window.gameAccount;
    acc.exp = (acc.exp || 0) + amount;
    let levelsGained = 0;
    let safety = 0;
    while (safety++ < 9999) {
      const need = getAccountExpNeeded(acc.level);
      if (acc.exp < need) break;
      acc.exp -= need;
      acc.level += 1;
      levelsGained++;
    }
    try { localStorage.setItem('my_game_account', JSON.stringify(acc)); } catch (e) {}

    if (levelsGained > 0) {
      updateTopLeftDisplay();
      checkTowerUnlock();
    }
    return { leveledUp: levelsGained > 0, levelsGained, newLevel: acc.level };
  }

  // ============== 摘星樓解鎖 ==============
  function checkTowerUnlock() {
    if (IS_EDITOR) return;
    if (!window.gameAccount || !window.globalData) return;
    const accCfg = window.globalData.account || {};
    const unlockLv = accCfg.towerUnlockLevel || 10;
    if (window.gameAccount.level < unlockLv) return;
    if (localStorage.getItem(UNLOCK_SHOWN_KEY) === '1') return;
    localStorage.setItem(UNLOCK_SHOWN_KEY, '1');
    showTowerUnlockDialog(unlockLv);
  }

  // ============== 升級獎勵領取 ==============
  function claimLevelReward(level) {
    level = parseInt(level);
    if (!window.gameAccount) return { ok: false, msg: '帳號數據缺失' };
    if (isNaN(level)) return { ok: false, msg: '參數錯誤' };
    const acc = window.gameAccount;
    if (acc.level < level) return { ok: false, msg: '等級不足' };
    if (acc.claimedRewards && acc.claimedRewards[level]) return { ok: false, msg: '已領取' };
    const cfg = (window.globalData && window.globalData.account) || {};
    const rewards = (cfg.levelRewards && cfg.levelRewards[level]) || null;
    if (!rewards) return { ok: false, msg: '該等級無獎勵' };

    // 發放銅幣
    if (rewards.copper) {
      if (!window.globalData) window.globalData = {};
      if (!window.globalData.currency) window.globalData.currency = { copper: 0, sycee: 0 };
      window.globalData.currency.copper = (window.globalData.currency.copper || 0) + Math.floor(rewards.copper);
    }
    // 發放物品
    if (Array.isArray(rewards.items) && window.INVENTORY) {
      rewards.items.forEach(it => {
        if (!it || !it.itemId) return;
        const tpl = window.ITEMS && window.ITEMS[it.itemId];
        if (!tpl) return;
        const cnt = Math.max(1, parseInt(it.count) || 1);
        const stackable = (tpl.maxStack || 1) > 1;
        if (stackable) {
          const existing = window.INVENTORY.find(i => i.itemId === it.itemId && !i.equippedBy);
          if (existing) existing.count = (existing.count || 1) + cnt;
          else window.INVENTORY.push({
            uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1e4),
            itemId: it.itemId, quality: 'white', count: cnt, equippedBy: ''
          });
        } else {
          for (let i = 0; i < cnt; i++) {
            window.INVENTORY.push({
              uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1e4) + '_' + i,
              itemId: it.itemId, quality: 'white', count: 1, equippedBy: ''
            });
          }
        }
      });
    }

    if (!acc.claimedRewards) acc.claimedRewards = {};
    acc.claimedRewards[level] = true;

    try {
      localStorage.setItem('my_game_account', JSON.stringify(acc));
      if (window.globalData) localStorage.setItem('my_game_config', JSON.stringify(window.globalData));
      if (window.INVENTORY) localStorage.setItem('my_game_inventory_sync', JSON.stringify(window.INVENTORY));
    } catch (e) {}

    updateTopLeftDisplay();
    return { ok: true };
  }

  function claimAllAvailable() {
    const acc = window.gameAccount;
    if (!acc) return 0;
    const cfg = (window.globalData && window.globalData.account) || {};
    const rewards = cfg.levelRewards || {};
    let claimed = 0;
    for (let lv = 1; lv <= acc.level; lv++) {
      if (rewards[lv] && !(acc.claimedRewards && acc.claimedRewards[lv])) {
        const res = claimLevelReward(lv);
        if (res.ok) claimed++;
      }
    }
    return claimed;
  }

  function getClaimableCount() {
    const acc = window.gameAccount;
    if (!acc) return 0;
    const cfg = (window.globalData && window.globalData.account) || {};
    const rewards = cfg.levelRewards || {};
    let count = 0;
    for (let lv = 1; lv <= acc.level; lv++) {
      if (rewards[lv] && !(acc.claimedRewards && acc.claimedRewards[lv])) count++;
    }
    return count;
  }

  function hasAnyRewards() {
    const cfg = (window.globalData && window.globalData.account) || {};
    return Object.keys(cfg.levelRewards || {}).length > 0;
  }

  // ============== 主頁左上角更新 ==============
  function updateTopLeftDisplay() {
    if (!window.gameAccount) return;
    // 頂欄文字
    const el = document.getElementById('account-level-display');
    if (el) {
      el.innerText = `Lv.${window.gameAccount.level}`;
      el.title = `帳號等級 ${window.gameAccount.level}`;
    }
    // 可領取紅點
    const badge = document.getElementById('account-reward-badge');
    if (badge) {
      const cnt = getClaimableCount();
      badge.style.display = cnt > 0 ? 'flex' : 'none';
      badge.innerText = cnt > 99 ? '99+' : cnt;
    }
  }

  // ============== 升級獎勵彈窗 UI ==============
  function ensureUI() {
    let modal = document.getElementById('account-reward-modal');
    if (modal) return modal;
    const parent = document.getElementById('game-scale-container') || document.body;
    modal = document.createElement('div');
    modal.id = 'account-reward-modal';
    modal.className = 'interactive-ui';
    modal.style.cssText = [
      'display: none;',
      'position: absolute; top: 0; left: 0;',
      'width: 1280px; height: 720px;',
      'background: rgba(5, 5, 10, 0.92);',
      'z-index: 9500;',
      'justify-content: center; align-items: center;',
      'font-family: "Microsoft YaHei", sans-serif;'
    ].join(' ');
    modal.innerHTML = [
      '<div style="width:800px; max-height:640px;',
      'background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%);',
      'border: 2px solid #f1c40f; border-radius: 12px;',
      'box-shadow: 0 15px 50px rgba(0,0,0,0.9);',
      'display: flex; flex-direction: column; overflow: hidden;">',

        '<div style="padding:18px 25px; background: linear-gradient(90deg, rgba(241,196,15,0.15), transparent); border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">',
          '<div>',
            '<div style="color:#f1c40f; font-size:22px; font-weight:bold;">🎁 帳號升級獎勵</div>',
            '<div id="account-modal-progress" style="color:#aaa; font-size:13px; margin-top:4px;"></div>',
          '</div>',
          '<button id="account-modal-close" style="background:transparent; border:none; color:#aaa; font-size:28px; cursor:pointer; padding:0 8px; line-height:1;">×</button>',
        '</div>',

        '<div id="account-modal-body" style="flex:1; overflow-y:auto; padding:15px 20px;"></div>',

        '<div style="padding:12px 20px; border-top: 1px solid #333; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3);">',
          '<div id="account-modal-hint" style="color:#888; font-size:13px;"></div>',
          '<button id="account-modal-claim-all" style="background:#2ecc71; color:#fff; border:none; padding:8px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px;">一鍵領取</button>',
        '</div>',

      '</div>'
    ].join('');
    parent.appendChild(modal);

    modal.querySelector('#account-modal-close').onclick = () => { modal.style.display = 'none'; };
    modal.querySelector('#account-modal-claim-all').onclick = () => {
      const n = claimAllAvailable();
      if (n > 0) { toast(`✅ 成功領取 ${n} 項獎勵！`, '#2ecc71'); }
      else { toast('目前沒有可領取的獎勵', '#e67e22'); }
      renderAccountModalBody();
    };
    return modal;
  }

  function renderAccountModalBody() {
    const body = document.getElementById('account-modal-body');
    if (!body) return;
    const acc = window.gameAccount;
    const progressEl = document.getElementById('account-modal-progress');
    const hintEl = document.getElementById('account-modal-hint');
    const claimAllBtn = document.getElementById('account-modal-claim-all');

    if (!acc) {
      body.innerHTML = '<div style="color:#888; text-align:center; padding:40px;">帳號數據缺失</div>';
      if (claimAllBtn) claimAllBtn.style.display = 'none';
      return;
    }
    const need = getAccountExpNeeded(acc.level);
    const cur = acc.exp || 0;
    if (progressEl) progressEl.innerText = `當前等級：Lv.${acc.level}　|　經驗：${cur} / ${need}`;

    const cfg = (window.globalData && window.globalData.account) || {};
    const rewards = cfg.levelRewards || {};
    const levelKeys = Object.keys(rewards).map(k => parseInt(k)).filter(k => !isNaN(k)).sort((a, b) => a - b);
    const claimable = getClaimableCount();
    if (hintEl) hintEl.innerText = claimable > 0 ? `可領取 ${claimable} 項獎勵` : '暫無可領取獎勵';
    if (claimAllBtn) claimAllBtn.style.display = claimable > 0 ? 'inline-block' : 'none';

    if (levelKeys.length === 0) {
      body.innerHTML = '<div style="color:#888; text-align:center; padding:40px; font-size:15px;">尚未設定任何等級獎勵<br><span style="font-size:13px; color:#666;">（可在編輯器「帳號與經驗」Tab 中配置）</span></div>';
      return;
    }

    let html = '';
    levelKeys.forEach(lv => {
      const r = rewards[lv];
      const reached = acc.level >= lv;
      const claimed = !!(acc.claimedRewards && acc.claimedRewards[lv]);

      let statusTag = '', statusColor = '#666', tagBg = '#333';
      if (claimed) { statusTag = '已領取'; statusColor = '#666'; tagBg = 'rgba(80,80,80,0.3)'; }
      else if (reached) { statusTag = '可領取'; statusColor = '#2ecc71'; tagBg = 'rgba(46,204,113,0.15)'; }
      else { statusTag = '未達成'; statusColor = '#999'; tagBg = 'rgba(80,80,80,0.3)'; }

      let rewardLines = '';
      if (r.copper) {
        rewardLines += `<span style="display:inline-block; background:rgba(241,196,15,0.15); color:#f1c40f; padding:4px 10px; border-radius:4px; margin-right:8px; margin-bottom:4px; font-size:13px;">🪙 銅幣 ×${r.copper}</span>`;
      }
      if (Array.isArray(r.items) && r.items.length) {
        r.items.forEach(it => {
          const tpl = window.ITEMS && window.ITEMS[it.itemId];
          const nm = tpl ? `${tpl.icon || '📦'} ${tpl.name}` : it.itemId;
          rewardLines += `<span style="display:inline-block; background:rgba(52,152,219,0.15); color:#3498db; padding:4px 10px; border-radius:4px; margin-right:8px; margin-bottom:4px; font-size:13px;">${nm} ×${it.count || 1}</span>`;
        });
      }
      if (!rewardLines) rewardLines = '<span style="color:#666; font-size:13px;">（無獎勵內容）</span>';

      let actionHtml = '';
      if (reached && !claimed) {
        actionHtml = `<button onclick="window.AccountSystem.claimLevelReward(${lv}); window.AccountSystem.renderAccountModalBody();" style="background:#2ecc71; color:#fff; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px; margin-left:10px;">領取</button>`;
      } else if (claimed) {
        actionHtml = `<span style="color:#555; font-size:13px; margin-left:10px;">✔ 已領</span>`;
      }

      const borderColor = reached && !claimed ? '#2ecc71' : (claimed ? '#555' : '#444');
      const bgColor = reached && !claimed ? 'rgba(46,204,113,0.06)' : 'rgba(255,255,255,0.03)';

      html += [
        `<div style="background:${bgColor}; border:1px solid ${reached && !claimed ? 'rgba(46,204,113,0.4)' : '#333'}; border-left:4px solid ${borderColor}; border-radius:6px; padding:12px 16px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">`,
          '<div style="flex:1;">',
            `<div style="display:flex; align-items:center; margin-bottom:6px;">`,
              `<span style="color:${reached ? '#f1c40f' : '#888'}; font-weight:bold; font-size:16px; margin-right:10px;">Lv.${lv}</span>`,
              `<span style="background:${tagBg}; color:${statusColor}; padding:2px 8px; border-radius:10px; font-size:11px;">${statusTag}</span>`,
            `</div>`,
            `<div>${rewardLines}</div>`,
          '</div>',
          `<div>${actionHtml}</div>`,
        '</div>'
      ].join('');
    });
    body.innerHTML = html;
  }

  function openAccountRewardUI() {
    ensureUI();
    const modal = document.getElementById('account-reward-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderAccountModalBody();
    if (window.game && window.game.scene) {
      try {
        const activeScenes = window.game.scene.getScenes(true);
        activeScenes.forEach(s => { if (s.input) s.input.enabled = false; });
      } catch (e) {}
    }
  }

  function closeAccountRewardUI() {
    const modal = document.getElementById('account-reward-modal');
    if (modal) modal.style.display = 'none';
    if (window.game && window.game.scene) {
      try {
        const activeScenes = window.game.scene.getScenes(true);
        activeScenes.forEach(s => { if (s.input) s.input.enabled = true; });
      } catch (e) {}
    }
  }

  // ============== 摘星樓解鎖提示彈框 ==============
  function showTowerUnlockDialog(unlockLv) {
    const existing = document.getElementById('tower-unlock-dialog');
    if (existing) existing.remove();
    const parent = document.getElementById('game-scale-container') || document.body;
    const dlg = document.createElement('div');
    dlg.id = 'tower-unlock-dialog';
    dlg.className = 'interactive-ui';
    dlg.style.cssText = [
      'position: absolute; top:0; left:0;',
      'width: 1280px; height: 720px;',
      'background: rgba(5, 5, 10, 0.85);',
      'z-index: 9700;',
      'display: flex; justify-content: center; align-items: center;'
    ].join(' ');
    dlg.innerHTML = [
      '<style>@keyframes towerUnlockPop { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }</style>',
      '<div style="width:480px; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border: 3px solid #f1c40f; border-radius: 12px; box-shadow: 0 20px 60px rgba(241,196,15,0.4); padding: 30px; text-align: center; animation: towerUnlockPop 0.5s ease-out;">',
        '<div style="font-size:60px; margin-bottom:10px;">🏯</div>',
        '<div style="color:#f1c40f; font-size:26px; font-weight:bold; margin-bottom:12px;">摘星樓已解鎖！</div>',
        '<div style="color:#ddd; font-size:15px; line-height:1.8; margin-bottom:20px;">',
          `恭喜您達到帳號 Lv.${unlockLv}！<br>神秘的摘星樓已向您敞開大門。<br>挑戰高塔，贏取豐厚獎勵吧！`,
        '</div>',
        '<button id="tower-unlock-ok" style="background: linear-gradient(135deg, #e67e22, #d35400); color:#fff; border:none; padding:12px 40px; border-radius:8px; font-size:16px; font-weight:bold; cursor:pointer; box-shadow: 0 6px 20px rgba(230,126,34,0.5);">我知道了</button>',
      '</div>'
    ].join('');
    parent.appendChild(dlg);
    dlg.querySelector('#tower-unlock-ok').onclick = () => dlg.remove();
  }

  // ============== 輕量 Toast ==============
  function toast(msg, color) {
    let t = document.getElementById('account-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'account-toast';
      t.style.cssText = [
        'position: fixed; top: 20%; left: 50%; transform: translateX(-50%);',
        'padding: 12px 24px; border-radius: 8px; color: #fff;',
        'font-size: 18px; font-weight: bold; z-index: 99999;',
        'box-shadow: 0 8px 25px rgba(0,0,0,0.6); display: none;',
        'white-space: nowrap;'
      ].join(' ');
      document.body.appendChild(t);
    }
    t.style.background = color || '#2ecc71';
    t.innerText = msg;
    t.style.display = 'block';
    if (t._timer) clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.display = 'none'; }, 2000);
  }

  // ============== 載入時檢查（首次達成解鎖） ==============
  function initCheck() {
    if (IS_EDITOR) return;
    try {
      if (!window.gameAccount || !window.globalData) return;
      const accCfg = window.globalData.account || {};
      const unlockLv = accCfg.towerUnlockLevel || 10;
      if (window.gameAccount.level >= unlockLv && localStorage.getItem(UNLOCK_SHOWN_KEY) !== '1') {
        setTimeout(() => {
          localStorage.setItem(UNLOCK_SHOWN_KEY, '1');
          showTowerUnlockDialog(unlockLv);
        }, 800);
      }
    } catch (e) {}
  }

  // ============== 掛載全局 ==============
  window.AccountSystem = {
    getAccountExpNeeded: getAccountExpNeeded,
    addAccountExp: addAccountExp,
    claimLevelReward: claimLevelReward,
    claimAllAvailable: claimAllAvailable,
    getClaimableCount: getClaimableCount,
    hasAnyRewards: hasAnyRewards,
    openAccountRewardUI: openAccountRewardUI,
    closeAccountRewardUI: closeAccountRewardUI,
    updateTopLeftDisplay: updateTopLeftDisplay,
    checkTowerUnlock: checkTowerUnlock,
    renderAccountModalBody: renderAccountModalBody,
    showTowerUnlockDialog: showTowerUnlockDialog,
    toast: toast
  };

  // 便捷全局方法
  window.openAccountRewardUI = openAccountRewardUI;
  window.closeAccountRewardUI = closeAccountRewardUI;
  window.addAccountExp = addAccountExp;
  window.getAccountExpNeeded = getAccountExpNeeded;
  window.getClaimableAccountRewards = getClaimableCount;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateTopLeftDisplay();
      initCheck();
    });
  } else {
    updateTopLeftDisplay();
    initCheck();
  }
})();
