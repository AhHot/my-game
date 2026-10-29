// ==========================================
// 模組：商店編輯器 (tab_shop.js)
// ==========================================

window.renderTabShop = function(container) {
  if (!globalData.shops) {
    globalData.shops = [
      {
        id: 'shop_daily',
        name: '日常坊市',
        bgUrl: '',
        items: [
          { itemId: 'item_breakthrough_pill', price: 500, stock: 99 },
          { itemId: 'item_skill_book_low', price: 200, stock: 50 },
          { itemId: 'item_skill_book_mid', price: 600, stock: 30 }
        ]
      }
    ];
  }

  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🛒 商店與坊市系統配置</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:15px;">在此可新增或修改商店種類、背景圖、上架商品、價格與庫存數量。</p>
      <div id="shop-editor-list"></div>
      <button class="btn" style="background:#3498db; width:100%; margin-top:15px;" onclick="window.addNewShop()">➕ 新增坊市商店</button>
    </div>
    <button class="btn btn-play" style="width:100%; margin-bottom:20px;" onclick="saveData(); alert('商店配置已成功保存！');">💾 保存商店配置</button>
  `;

  renderShopList();
};

function renderShopList() {
  const list = document.getElementById('shop-editor-list');
  if (!list) return;
  list.innerHTML = '';

  globalData.shops.forEach((shop, sIdx) => {
    let itemsHtml = '';
    if (shop.items && shop.items.length > 0) {
      shop.items.forEach((item, iIdx) => {
        let itemOptions = gameItems.map(it => `<option value="${it.id}" ${it.id === item.itemId ? 'selected' : ''}>${it.name} (${it.id})</option>`).join('');
        itemsHtml += `
          <div style="display:flex; gap:10px; align-items:center; background:#0f0f1a; padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid #333;">
            <div style="flex:2;"><label style="font-size:10px; color:#aaa;">商品</label><select onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'itemId', this.value)">${itemOptions}</select></div>
            <div style="flex:1;"><label style="font-size:10px; color:#aaa;">價格 (銅幣)</label><input type="number" value="${item.price}" onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'price', parseInt(this.value))"></div>
            <div style="flex:1;"><label style="font-size:10px; color:#aaa;">庫存</label><input type="number" value="${item.stock}" onchange="window.updateShopItem(${sIdx}, ${iIdx}, 'stock', parseInt(this.value))"></div>
            <button class="btn-del" style="margin-top:14px;" onclick="window.removeShopItem(${sIdx}, ${iIdx})">刪除</button>
          </div>
        `;
      });
    }

    const div = document.createElement('div');
    div.className = 'card';
    div.style.background = '#111';
    div.innerHTML = `
      <div class="card-header">
        <h4 style="color:#3498db;">${shop.name} (ID: ${shop.id})</h4>
        <button class="btn-del" onclick="window.deleteShop(${sIdx})">刪除商店</button>
      </div>
      <div class="form-grid">
        <div class="form-item"><label>商店名稱</label><input type="text" value="${shop.name}" onchange="window.updateShop(${sIdx}, 'name', this.value)"></div>
        <div class="form-item"><label>介面背景圖 URL</label><input type="text" value="${shop.bgUrl || ''}" placeholder="圖片網址" onchange="window.updateShop(${sIdx}, 'bgUrl', this.value)"></div>
        <div class="form-item full">
          <label style="color:#f1c40f; font-weight:bold; margin-top:10px;">上架商品清單</label>
          <div style="margin-top:5px;">${itemsHtml}</div>
          <button class="btn" style="background:#2ecc71; padding:8px; font-size:13px; margin-top:8px; width:100%;" onclick="window.addShopItem(${sIdx})">➕ 上架商品</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

window.updateShop = function(sIdx, key, val) {
  globalData.shops[sIdx][key] = val;
  saveData();
};

window.updateShopItem = function(sIdx, iIdx, key, val) {
  globalData.shops[sIdx].items[iIdx][key] = val;
  saveData();
};

window.addShopItem = function(sIdx) {
  if (!globalData.shops[sIdx].items) globalData.shops[sIdx].items = [];
  globalData.shops[sIdx].items.push({ itemId: gameItems[0]?.id || '', price: 100, stock: 99 });
  saveData();
  renderShopList();
};

window.removeShopItem = function(sIdx, iIdx) {
  globalData.shops[sIdx].items.splice(iIdx, 1);
  saveData();
  renderShopList();
};

window.addNewShop = function() {
  globalData.shops.push({
    id: 'shop_' + Date.now(),
    name: '新坊市',
    bgUrl: '',
    items: []
  });
  saveData();
  renderShopList();
};

window.deleteShop = function(sIdx) {
  if (confirm('確定刪除此商店？')) {
    globalData.shops.splice(sIdx, 1);
    saveData();
    renderShopList();
  }
};
