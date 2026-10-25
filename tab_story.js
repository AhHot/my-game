// ==========================================
// 模組：全新重造的劇情與劇本編輯器 (tab_story.js)
// 支援 篇章管理、關卡串聯與對話事件架構
// ==========================================
window.renderTabStory = function(container) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || {
    tabs: [
      { id: 'main', name: '主線劇情', icon: '⚔️' },
      { id: 'side', name: '支線故事', icon: '📜' },
      { id: 'event', name: '限時活動', icon: '🔥' },
      { id: 'tower', name: '通天高塔', icon: '🏯' }
    ],
    books: [
      {
        id: 'book_01',
        tabId: 'main',
        title: '第一章：青城山變',
        desc: '青城派遭逢百年難得一見的浩劫，掌門不知去向，江湖風雲再起……',
        cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
        progress: '4/7',
        stages: ['lv_0', 'lv_1'], // 串聯的戰棋關卡 ID 列表
        tag: '章節進度 57%'
      }
    ]
  };

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📖 劇本與篇章配置中心 (重造版)</h3>
        <div>
          <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px; margin-right:8px;" onclick="window.saveStoryDataDirect()">💾 儲存所有劇本</button>
          <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px;" onclick="window.addStoryBook()">➕ 新增篇章</button>
        </div>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此全面掌控遊戲的江湖主線、支線劇本，並可直接將編輯好的戰棋關卡串聯至指定章節中。
      </p>

      <!-- 分類標籤快速過濾 -->
      <div style="display:flex; gap:10px; margin-bottom:20px;" id="story-tab-filter">
        <button class="btn active" style="background:#e67e22; font-size:13px; padding:6px 14px;" onclick="window.filterStoryTab('all', this)">全部篇章</button>
        <button class="btn" style="background:#222; border:1px solid #444; font-size:13px; padding:6px 14px;" onclick="window.filterStoryTab('main', this)">⚔️ 主線劇情</button>
        <button class="btn" style="background:#222; border:1px solid #444; font-size:13px; padding:6px 14px;" onclick="window.filterStoryTab('side', this)">📜 支線故事</button>
        <button class="btn" style="background:#222; border:1px solid #444; font-size:13px; padding:6px 14px;" onclick="window.filterStoryTab('event', this)">🔥 限時活動</button>
      </div>

      <div id="editor-book-list" style="display: flex; flex-direction: column; gap: 20px;"></div>
    </div>
  `;

  window._currentStoryFilter = 'all';
  renderBookListEditor(storyData);
};

function renderBookListEditor(storyData) {
  const listContainer = document.getElementById('editor-book-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const filter = window._currentStoryFilter || 'all';
  const filteredBooks = storyData.books.filter((b, idx) => {
    b._originalIndex = idx; // 保留原始索引以便修改
    return filter === 'all' || b.tabId === filter;
  });

  if (filteredBooks.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; color:#666; padding:30px;">沒有找到相關的劇本篇章</div>`;
    return;
  }

  filteredBooks.forEach((book) => {
    const index = book._originalIndex;
    
    // 取得現有的遊戲關卡清單供下拉選單串聯
    let levelOptions = `<option value="">-- 選擇串聯的戰棋關卡 --</option>`;
    if (typeof LEVELS !== 'undefined' && LEVELS.length > 0) {
      LEVELS.forEach((lv, lvIdx) => {
        levelOptions += `<option value="${lvIdx}">關卡 #${lvIdx+1}: ${lv.name}</option>`;
      });
    }

    let stagesHtml = '';
    if (book.stages && book.stages.length > 0) {
      book.stages.forEach((stgIdx, sIdx) => {
        let lvName = LEVELS[stgIdx] ? LEVELS[stgIdx].name : `未知關卡 (索引:${stgIdx})`;
        stagesHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#16213e; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-size:12px;">
            <span>📍 關卡 #${stgIdx}: ${lvName}</span>
            <button class="btn-del" style="font-size:10px; padding:2px 6px;" onclick="window.removeStageFromBook(${index}, ${sIdx})">移除</button>
          </div>
        `;
      });
    } else {
      stagesHtml = `<div style="color:#666; font-size:12px; font-style:italic; margin-bottom:6px;">尚未串聯任何戰棋關卡</div>`;
    }

    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:15px; border-radius:8px; margin-bottom:0;";
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #222; padding-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">${book.cover ? `<img src="${book.cover}" style="width:36px; height:36px; object-fit:cover; border-radius:4px;">` : '📖'}</span>
          <div>
            <div style="color:#f1c40f; font-weight:bold; font-size:16px;">${book.title || '未命名篇章'}</div>
            <div style="font-size:11px; color:#888;">ID: ${book.id} | 分類: ${book.tabId}</div>
          </div>
        </div>
        <button class="btn-del" onclick="window.deleteStoryBook(${index})">刪除篇章</button>
      </div>
      
      <div class="form-grid" style="margin-bottom:12px;">
        <div class="form-item">
          <label>歸屬分類 Tab</label>
          <select onchange="window.updateBookField(${index}, 'tabId', this.value)">
            <option value="main" ${book.tabId === 'main' ? 'selected' : ''}>⚔️ 主線劇情</option>
            <option value="side" ${book.tabId === 'side' ? 'selected' : ''}>📜 支線故事</option>
            <option value="event" ${book.tabId === 'event' ? 'selected' : ''}>🔥 限時活動</option>
            <option value="tower" ${book.tabId === 'tower' ? 'selected' : ''}>🏯 通天高塔</option>
          </select>
        </div>
        <div class="form-item">
          <label>標籤文字 (例如: 章節進度)</label>
          <input type="text" value="${book.tag || ''}" oninput="window.updateBookField(${index}, 'tag', this.value)">
        </div>
        <div class="form-item full">
          <label>劇本標題</label>
          <input type="text" value="${book.title || ''}" oninput="window.updateBookField(${index}, 'title', this.value)">
        </div>
        <div class="form-item full">
          <label>劇情文字簡介</label>
          <textarea rows="2" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px; width:100%;" oninput="window.updateBookField(${index}, 'desc', this.value)">${book.desc || ''}</textarea>
        </div>
        <div class="form-item full">
          <label>封面圖片網址 (URL)</label>
          <input type="text" value="${book.cover || ''}" oninput="window.updateBookField(${index}, 'cover', this.value)">
        </div>
      </div>

      <!-- 關卡節點串聯區塊 -->
      <div style="background:#141620; padding:10px; border-radius:6px; border:1px dashed #333;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; color:#3498db; font-weight:bold;">⚔️ 串聯的戰棋關卡節點</span>
          <div style="display:flex; gap:6px;">
            <select id="select-level-add-${index}" style="font-size:12px; padding:2px;">${levelOptions}</select>
            <button class="btn" style="background:#2980b9; font-size:11px; padding:2px 8px;" onclick="window.addStageToBook(${index})">＋新增節點</button>
          </div>
        </div>
        <div style="max-height:120px; overflow-y:auto;">
          ${stagesHtml}
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// 篩選分頁
window.filterStoryTab = function(tabId, btn) {
  window._currentStoryFilter = tabId;
  document.querySelectorAll('#story-tab-filter .btn').forEach(b => {
    b.classList.remove('active');
    b.style.background = '#222';
    b.style.borderColor = '#444';
  });
  btn.classList.add('active');
  btn.style.background = '#e67e22';
  btn.style.borderColor = '#e67e22';

  const storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { books: [] };
  renderBookListEditor(storyData);
};

// 即時更新欄位
window.updateBookField = function(index, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[index]) {
    storyData.books[index][field] = value;
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  }
};

// 關卡節點操作
window.addStageToBook = function(bookIndex) {
  const select = document.getElementById(`select-level-add-${bookIndex}`);
  if (!select || select.value === "") {
    alert("請先選擇要串聯的戰棋關卡！");
    return;
  }
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIndex]) {
    if (!storyData.books[bookIndex].stages) storyData.books[bookIndex].stages = [];
    storyData.books[bookIndex].stages.push(parseInt(select.value));
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    renderBookListEditor(storyData);
  }
};

window.removeStageFromBook = function(bookIndex, stageIndex) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIndex] && storyData.books[bookIndex].stages) {
    storyData.books[bookIndex].stages.splice(stageIndex, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    renderBookListEditor(storyData);
  }
};

window.addStoryBook = function() {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { tabs: [], books: [] };
  storyData.books.push({
    id: 'book_' + Date.now(),
    tabId: 'main',
    title: '新江湖篇章',
    desc: '請在此輸入該劇本的詳細江湖背景與劇情簡介...',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    progress: '0/5',
    stages: [],
    tag: '全新解鎖'
  });
  
  localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  renderBookListEditor(storyData);
};

window.deleteStoryBook = function(index) {
  if (!confirm('⚠️ 確定要刪除這個劇本篇章嗎？')) return;
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books) {
    storyData.books.splice(index, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    renderBookListEditor(storyData);
  }
};

window.saveStoryDataDirect = function() {
  alert('✅ 劇本與關卡節點串聯資料已成功儲存！');
};
