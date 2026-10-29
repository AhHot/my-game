// ==========================================
// 模組：坊市與商店系統 (tab_shop.js) - 獨立修復版
// ==========================================

window.renderTabShop = function(container) {
  if (!window.globalData.shops) {
    window.globalData.shops = [
      { id: 'shop_daily', name: '日常坊市', bgUrl: '', items: [] }
    ];
  }

  let html = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🛒 坊市與商店系統管理</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:15px;">在此管理遊戲中的各個坊市商店、背景圖、上架商品及價格庫存。</p>
      <div id="shop-editor-list" style="display:flex; flex-direction:column; gap:20px;"></div>
      <button class="btn" style="background:#3498db; width:100%; margin-top:15px;" onclick="window.addNewShop()">➕ 新增坊市商店</button>
    </div>
    <button class="btn btn-play" style="width:100%; margin-bottom:20px;" onclick="saveData(); alert('坊市配置已成功保存！');">💾 保存坊市配置</button>
  `;
  container.innerHTML = html;
  renderShopList();
};

function renderShopList() {
  const list = document.getElementById('shop-editor-list');
  if (!list) return;
  list.innerHTML = '';

  window.globalData.shops.forEach((shop, sIdx) => {
    let itemsHtml = '';
    if (shop.items && shop.items.length > 0) {
      shop.items.forEach((shopItem, iIdx) => {
        let itemTpl = (window.gameItems || []).find(i => i.id === shopItem.itemId) || { name: shopItem.itemId, icon: '📦' };
        itemsHtml += `
          <div style="background:#16213e; padding:10px; border-radius:6px; display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <span style="font-size:20px;">${itemTpl.icon || '📦'}</span>
            <div style="flex:1;">
              <label style="font-size:10px; color:#888; display:block;">商品</label>
              <select onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'itemId', this.value)" style="background:#0f0f15; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px; width:100%;">
                ${(window.gameItems || []).map(it => `<option value="${it.id}" ${it.id === shopItem.itemId ? 'selected' : ''}>${it.name} (${it.id})</option>`).join('')}
              </select>
            </div>
            <div style="width:90px;">
              <label style="font-size:10px; color:#888; display:block;">價格 (銅幣)</label>
              <input type="number" value="${shopItem.price || 100}" onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'price', parseInt(this.value))" style="background:#0f0f15; color:#f1c40f; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px; width:100%;">
            </div>
            <div style="width:80px;">
              <label style="font-size:10px; color:#888; display:block;">庫存</label>
              <input type="number" value="${shopItem.stock || 99}" onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'stock', parseInt(this.value))" style="background:#0f0f15; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px; width:100%;">
            </div>
            <button onclick="window.removeShopItem(${sIdx}, ${iIdx})" style="background:#c0392b; color:#fff; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; margin-top:14px; font-size:11px;">刪除</button>
          </div>
        `;
      });
    }

    const div = document.createElement('div');
    div.className = 'card';
    div.style.background = '#111';
    div.innerHTML = `
      <div class="card-header">
        <h4 style="color:#f1c40f;">商店名稱: ${shop.name} (ID: ${shop.id})</h4>
        <button class="btn-del" onclick="window.deleteShop(${sIdx})">刪除商店</button>
      </div>
      <div class="form-grid" style="margin-bottom:10px;">
        <div class="form-item"><label>商店 ID</label><input type="text" value="${shop.id}" onchange="window.updateShopField(${sIdx}, 'id', this.value)"></div>
        <div class="form-item"><label>商店顯示名稱</label><input type="text" value="${shop.name}" onchange="window.updateShopField(${sIdx}, 'name', this.value)"></div>
        <div class="form-item full"><label>背景圖片 URL</label><input type="text" value="${shop.bgUrl || ''}" placeholder="留空則使用預設背景" onchange="window.updateShopField(${sIdx}, 'bgUrl', this.value)"></div>
      </div>
      <div class="sub-title" style="margin-top:10px;">📦 上架商品列表</div>
      <div style="margin-top:5px;">${itemsHtml}</div>
      <button class="btn" style="background:#27ae60; margin-top:8px; font-size:12px;" onclick="window.addShopItem(${sIdx})">➕ 上架商品</button>
    `;
    list.appendChild(div);
  });
};

window.updateShopField = function(sIdx, key, val) {
  if (window.globalData.shops[sIdx]) {
    window.globalData.shops[sIdx][key] = val;
    saveData();
  }
};

window.updateShopItem = function(sIdx, iIdx, key, val) {
  if (window.globalData.shops[sIdx] && window.globalData.shops[sIdx].items[iIdx]) {
    window.globalData.shops[sIdx].items[iIdx][key] = val;
    saveData();
  }
};

window.addShopItem = function(sIdx) {
  if (!window.globalData.shops[sIdx].items) window.globalData.shops[sIdx].items = [];
  let firstItem = (window.gameItems || [])[0];
  window.globalData.shops[sIdx].items.push({
    itemId: firstItem ? firstItem.id : 'item_sword',
    price: 100,
    stock: 99
  });
  saveData();
  renderShopList();
};

window.removeShopItem = function(sIdx, iIdx) {
  window.globalData.shops[sIdx].items.splice(iIdx, 1);
  saveData();
  renderShopList();
};

window.addNewShop = function() {
  if (!window.globalData.shops) window.globalData.shops = [];
  window.globalData.shops.push({
    id: 'shop_' + Date.now(),
    name: '新坊市',
    bgUrl: '',
    items: []
  });
  saveData();
  renderShopList();
};

window.deleteShop = function(sIdx) {
  if (confirm('確定刪除此坊市商店？')) {
    window.globalData.shops.splice(sIdx, 1);
    saveData();
    renderShopList();
  }
};

// ==========================================
// 玩家端坊市商店 UI 介面
// ==========================================
window.openShopUI = function(shopId = 'shop_daily') {
  let shops = window.globalData?.shops || [];
  let shop = shops.find(s => s.id === shopId) || shops[0];
  if (!shop) {
    alert('目前沒有可用的坊市商店！');
    return;
  }

  let scaleContainer = document.getElementById('game-scale-container') || document.body;
  let oldUi = document.getElementById('shop-fullscreen-ui');
  if (oldUi) oldUi.remove();

  let bgStyle = shop.bgUrl ? `background: url('${shop.bgUrl}') center/cover;` : `background: linear-gradient(135deg, #16213e 0%, #0f0f15 100%);`;

  let uiDiv = document.createElement('div');
  uiDiv.id = 'shop-fullscreen-ui';
  uiDiv.style.cssText = `position: absolute; width: 1280px; height: 720px; ${bgStyle} z-index: 9000; color: #ddd; display: flex; flex-direction: column; padding: 30px; box-sizing: border-box; pointer-events: auto;`;

  let itemsDict = window.ITEMS || {};
  let currentCopper = window.globalData.currency?.copper || 0;

  let itemsHtml = '';
  if (shop.items && shop.items.length > 0) {
    shop.items.forEach((item, idx) => {
      let tpl = itemsDict[item.itemId];
      if (!tpl) return;
      let stockDisplay = item.stock !== undefined ? `庫存: ${item.stock}` : '庫存: 無限';
      let isSoldOut = item.stock === 0;

      itemsHtml += `
        <div style="background: rgba(15, 15, 25, 0.9); border: 2px solid ${isSoldOut ? '#444' : '#f1c40f'}; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; position: relative; opacity: ${isSoldOut ? 0.6 : 1};">
          <div style="font-size: 48px; margin-bottom: 10px;">${tpl.icon || '📦'}</div>
          <div style="font-size: 20px; font-weight: bold; color: #fff; text-align: center; margin-bottom: 5px;">${tpl.name}</div>
          <div style="font-size: 14px; color: #aaa; text-align: center; margin-bottom: 15px; height: 40px; overflow: hidden;">${tpl.desc || '暫無描述'}</div>
          <div style="font-size: 14px; color: #2ecc71; margin-bottom: 5px;">${stockDisplay}</div>
          <div style="font-size: 18px; color: #f1c40f; font-weight: bold; margin-bottom: 15px;">🪙 ${item.price} 銅幣</div>
          <button ${isSoldOut ? 'disabled' : ''} onclick="window.openBuyQuantityModal('${shop.id}', ${idx})" style="width: 100%; padding: 10px; background: ${isSoldOut ? '#555' : '#e67e22'}; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: ${isSoldOut ? 'not-allowed' : 'pointer'}; font-size: 16px;">
            ${isSoldOut ? '已售罄' : '購買'}
          </button>
        </div>
      `;
    });
  } else {
    itemsHtml = `<div style="grid-column: span 4; text-align: center; color: #888; font-size: 22px; margin-top: 100px;">坊市目前空空如也，沒有上架任何商品。</div>`;
  }

  uiDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; background: rgba(0,0,0,0.5); padding: 15px 25px; border-radius: 10px;">
      <h2 style="color: #f1c40f; margin: 0; font-size: 28px;">🛒 ${shop.name}</h2>
      <div style="display: flex; gap: 30px; align-items: center;">
        <span style="font-size: 20px; font-weight: bold; color: #f1c40f;">🪙 銅幣: <span id="shop-copper-display">${currentCopper}</span></span>
        <button onclick="window.closeShopUI()" style="background: #c0392b; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 18px; font-weight: bold; cursor: pointer;">✖ 離開坊市</button>
      </div>
    </div>
    <div style="flex: 1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; overflow-y: auto; align-content: start; padding-bottom: 20px;">
      ${itemsHtml}
    </div>

    <!-- 數量選擇與購買確認 Modal -->
    <div id="shop-buy-modal" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #16213e; border: 3px solid #f1c40f; border-radius: 12px; padding: 25px; z-index: 9800; width: 400px; text-align: center; box-shadow: 0 15px 40px rgba(0,0,0,0.9);">
      <h3 style="color: #f1c40f; margin-bottom: 15px; font-size: 22px;" id="modal-item-title">購買商品</h3>
      <div style="font-size: 40px; margin-bottom: 10px;" id="modal-item-icon">📦</div>
      <div style="color: #aaa; font-size: 14px; margin-bottom: 15px;" id="modal-item-price-info">單價: 0 銅幣</div>
      
      <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 20px;">
        <button onclick="window.adjustBuyQty(-10)" style="background:#444; color:#fff; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">-10</button>
        <button onclick="window.adjustBuyQty(-1)" style="background:#e74c3c; color:#fff; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">-1</button>
        <input type="number" id="buy-qty-input" value="1" min="1" oninput="window.onBuyQtyChange()" style="width: 70px; text-align: center; background: #0f0f15; color: #fff; border: 1px solid #f1c40f; padding: 8px; border-radius: 6px; font-size: 18px; font-weight: bold;">
        <button onclick="window.adjustBuyQty(1)" style="background:#2ecc71; color:#fff; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">+1</button>
        <button onclick="window.adjustBuyQty(10)" style="background:#444; color:#fff; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">+10</button>
      </div>

      <div style="font-size: 18px; color: #f1c40f; font-weight: bold; margin-bottom: 20px;">
        總價: <span id="modal-total-price">0</span> 銅幣
      </div>

      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="modal-confirm-buy-btn" style="flex: 1; padding: 12px; background: #27ae60; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">確認購買</button>
        <button onclick="window.closeBuyQuantityModal()" style="flex: 1; padding: 12px; background: #c0392b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">取消</button>
      </div>
    </div>
  `;

  scaleContainer.appendChild(uiDiv);
};

window.closeShopUI = function() {
  let ui = document.getElementById('shop-fullscreen-ui');
  if (ui) ui.remove();
};

let _currentShopId = '';
let _currentShopItemIdx = -1;

window.openBuyQuantityModal = function(shopId, itemIdx) {
  let shop = (window.globalData?.shops || []).find(s => s.id === shopId);
  if (!shop || !shop.items[itemIdx]) return;

  _currentShopId = shopId;
  _currentShopItemIdx = itemIdx;

  let shopItem = shop.items[itemIdx];
  let tpl = (window.ITEMS || {})[shopItem.itemId];
  if (!tpl) return;

  const modal = document.getElementById('shop-buy-modal');
  if (!modal) return;

  document.getElementById('modal-item-title').innerText = `購買 ${tpl.name}`;
  document.getElementById('modal-item-icon').innerText = tpl.icon || '📦';
  document.getElementById('modal-item-price-info').innerText = `單價: ${shopItem.price} 銅幣 | 可購數量: ${shopItem.stock !== undefined ? shopItem.stock : '無限'}`;
  
  const input = document.getElementById('buy-qty-input');
  input.value = 1;

  window.updateBuyTotalPrice();

  document.getElementById('modal-confirm-buy-btn').onclick = () => {
    let qty = parseInt(document.getElementById('buy-qty-input').value) || 1;
    window.executeBatchBuy(shop, shopItem, qty);
  };

  modal.style.display = 'block';
};

window.closeBuyQuantityModal = function() {
  const modal = document.getElementById('shop-buy-modal');
  if (modal) modal.style.display = 'none';
};

window.adjustBuyQty = function(delta) {
  const input = document.getElementById('buy-qty-input');
  if (!input) return;

  let current = parseInt(input.value) || 1;
  let shop = (window.globalData?.shops || []).find(s => s.id === _currentShopId);
  let shopItem = shop ? shop.items[_currentShopItemIdx] : null;
  let maxStock = (shopItem && shopItem.stock !== undefined) ? shopItem.stock : 9999;

  let next = current + delta;
  if (next < 1) next = 1;
  if (next > maxStock) next = maxStock;

  input.value = next;
  window.updateBuyTotalPrice();
};

window.onBuyQtyChange = function() {
  const input = document.getElementById('buy-qty-input');
  if (!input) return;

  let qty = parseInt(input.value);
  if (isNaN(qty) || qty < 1) qty = 1;

  let shop = (window.globalData?.shops || []).find(s => s.id === _currentShopId);
  let shopItem = shop ? shop.items[_currentShopItemIdx] : null;
  let maxStock = (shopItem && shopItem.stock !== undefined) ? shopItem.stock : 9999;

  if (qty > maxStock) qty = maxStock;
  input.value = qty;

  window.updateBuyTotalPrice();
};

window.updateBuyTotalPrice = function() {
  let shop = (window.globalData?.shops || []).find(s => s.id === _currentShopId);
  let shopItem = shop ? shop.items[_currentShopItemIdx] : null;
  if (!shopItem) return;

  let qty = parseInt(document.getElementById('buy-qty-input').value) || 1;
  let totalPrice = shopItem.price * qty;

  document.getElementById('modal-total-price').innerText = totalPrice;
};

window.executeBatchBuy = function(shop, shopItem, qty) {
  let tpl = (window.ITEMS || {})[shopItem.itemId];
  if (!tpl) return;

  let totalPrice = shopItem.price * qty;
  let currentCopper = window.globalData.currency?.copper || 0;

  if (shopItem.stock !== undefined && shopItem.stock < qty) {
    alert(`購買失敗：庫存不足！現有庫存僅剩 ${shopItem.stock} 個。`);
    return;
  }

  if (currentCopper < totalPrice) {
    let missingCopper = totalPrice - currentCopper;
    alert(`銅幣不足！總價需 ${totalPrice} 銅幣，還缺少 ${missingCopper} 銅幣。`);
    return;
  }

  window.globalData.currency.copper -= totalPrice;
  if (shopItem.stock !== undefined) {
    shopItem.stock -= qty;
  }

  if (!window.INVENTORY) window.INVENTORY = [];
  let isEquip = ['weapon', 'armor', 'accessory'].includes(tpl.category);

  if (isEquip) {
    for (let i = 0; i < qty; i++) {
      let inst = typeof generateRandomInstance === 'function' ? generateRandomInstance(shopItem.itemId) : { uid: 'inst_' + Date.now() + Math.random(), itemId: shopItem.itemId, quality: 'white', count: 1, equippedBy: '' };
      if (inst) window.INVENTORY.push(inst);
    }
  } else {
    let existing = window.INVENTORY.find(i => i.itemId === shopItem.itemId && !i.equippedBy);
    if (existing) {
      existing.count = (existing.count || 1) + qty;
    } else {
      window.INVENTORY.push({
        uid: 'inst_' + Date.now() + Math.floor(Math.random() * 1000),
        itemId: shopItem.itemId,
        quality: 'white',
        count: qty,
        equippedBy: ''
      });
    }
  }

  saveData();
  window.closeBuyQuantityModal();
  alert(`🎉 成功購買 ${tpl.name} x${qty}！`);
  window.openShopUI(shop.id);
};
