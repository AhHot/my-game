// ==========================================
// 模組：修復關卡讀取與串聯的劇情編輯器 (tab_story.js)
// ==========================================
window.renderTabStory = function(container) {
  if (!localStorage.getItem('my_game_story_data')) {
    const defaultStory = {
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
          stages: [0],
          tag: '章節進度 57%'
        }
      ]
    };
    localStorage.setItem('my_game_story_data', JSON.stringify(defaultStory));
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📖 劇本與篇章配置中心</h3>
        <div>
          <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px; margin-right:8px;" onclick="window.saveStoryDataDirect()">💾 儲存並同步</button>
          <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px;" onclick="window.addStoryBook()">➕ 新增篇章</button>
        </div>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此編輯各大劇本篇章，並可將左側關卡編輯器製作好的戰棋關卡直接串聯至指定章節中。
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
  reloadStoryEditorUI();
};

function reloadStoryEditorUI() {
  const storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { books: [] };
  const listContainer = document.getElementById('editor-book-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const filter = window._currentStoryFilter || 'all';
  const filteredBooks = [];
  
  storyData.books.forEach((book, idx) => {
    book._originalIndex = idx;
    if (filter === 'all' || book.tabId === filter) {
      filteredBooks.push(book);
    }
  });

  if (filteredBooks.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; color:#666; padding:30px;">目前沒有此分類的劇本篇章，點擊上方「新增篇章」來建立！</div>`;
    return;
  }

  // 取得編輯器中的關卡清單 (支援 gameLevels 或 localStorage 備份)
  let currentLevels = [];
  if (typeof gameLevels !== 'undefined' && Array.isArray(gameLevels)) {
    currentLevels = gameLevels;
  } else {
    try {
      currentLevels = JSON.parse(localStorage.getItem('my_game_levels_sync')) || [];
    } catch(e) {}
  }

  filteredBooks.forEach((book) => {
    const index = book._originalIndex;
    
    let levelOptions = `<option value="">-- 選擇要串聯的戰棋關卡 --</option>`;
    if (currentLevels.length > 0) {
      currentLevels.forEach((lv, lvIdx) => {
        levelOptions += `<option value="${lvIdx}">關卡 #${lvIdx+1}: ${lv.name || '未命名關卡'}</option>`;
      });
    } else {
      levelOptions += `<option value="" disabled>尚未建立任何戰棋關卡 (請先至關卡編輯器建立)</option>`;
    }

    let stagesHtml = '';
    if (book.stages && book.stages.length > 0) {
      book.stages.forEach((stgIdx, sIdx) => {
        let lvName = currentLevels[stgIdx] ? currentLevels[stgIdx].name : `關卡索引 [${stgIdx}]`;
        stagesHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#16213e; padding:6px 10px; border-radius:4px; margin-bottom:4px; font-size:12px; border:1px solid #333;">
            <span style="color:#2ecc71;">📍 節點 #${sIdx+1} → ${lvName}</span>
            <button class="btn-del" style="font-size:10px; padding:2px 6px;" onclick="window.removeStageFromBook(${index}, ${sIdx})">移除</button>
          </div>
        `;
      });
    } else {
      stagesHtml = `<div style="color:#666; font-size:12px; font-style:italic; margin-bottom:6px; text-align:center; padding:10px;">尚未串聯任何戰棋關卡，請從上方下拉選單新增節點</div>`;
    }

    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = "background:#0f0f1a; border:1px solid #444; padding:15px; border-radius:8px; margin-bottom:0;";
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #222; padding-bottom:8px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">${book.cover ? `<img src="${book.cover}" style="width:36px; height:36px; object-fit:cover; border-radius:4px;" onerror="this.src='https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop'">` : '📖'}</span>
          <div>
            <div style="color:#f1c40f; font-weight:bold; font-size:16px;">${book.title || '未命名篇章'}</div>
            <div style="font-size:11px; color:#888;">內部 ID: ${book.id} | 分類: ${book.tabId}</div>
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
      <div style="background:#141620; padding:12px; border-radius:6px; border:1px dashed #444;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:13px; color:#3498db; font-weight:bold;">⚔️ 串聯的戰棋關卡節點</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <select id="select-level-add-${index}" style="font-size:12px; padding:4px; background:#1e2028; color:#fff; border:1px solid #444; border-radius:4px;">${levelOptions}</select>
            <button class="btn" style="background:#2980b9; font-size:11px; padding:4px 10px;" onclick="window.addStageToBook(${index})">＋新增節點</button>
          </div>
        </div>
        <div>
          ${stagesHtml}
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

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

  reloadStoryEditorUI();
};

window.updateBookField = function(index, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[index]) {
    storyData.books[index][field] = value;
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  }
};

window.addStageToBook = function(bookIndex) {
  const select = document.getElementById(`select-level-add-${bookIndex}`);
  if (!select || select.value === "") {
    alert("⚠️ 請先選擇要串聯的戰棋關卡！");
    return;
  }
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIndex]) {
    if (!storyData.books[bookIndex].stages) storyData.books[bookIndex].stages = [];
    storyData.books[bookIndex].stages.push(parseInt(select.value));
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    reloadStoryEditorUI();
  }
};

window.removeStageFromBook = function(bookIndex, stageIndex) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIndex] && storyData.books[bookIndex].stages) {
    storyData.books[bookIndex].stages.splice(stageIndex, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    reloadStoryEditorUI();
  }
};

window.addStoryBook = function() {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { tabs: [], books: [] };
  storyData.books.push({
    id: 'book_' + Date.now(),
    tabId: window._currentStoryFilter === 'all' ? 'main' : window._currentStoryFilter,
    title: '新江湖篇章',
    desc: '請在此輸入該劇本的詳細江湖背景與劇情簡介...',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    progress: '0/1',
    stages: [],
    tag: '全新解鎖'
  });
  
  localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  reloadStoryEditorUI();
};

window.deleteStoryBook = function(index) {
  if (!confirm('⚠️ 確定要刪除這個劇本篇章嗎？')) return;
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books) {
    storyData.books.splice(index, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    reloadStoryEditorUI();
  }
};

window.saveStoryDataDirect = function() {
  alert('✅ 劇本與關卡節點串聯資料已成功儲存至本地！');
};
