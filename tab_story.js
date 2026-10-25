// ==========================================
// 模組：全新升級的多型節點劇本編輯器 (tab_story.js)
// 支援：戰鬥關卡隨時更換/排序、劇情對話、背景圖片、CG過場與獎勵
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
          tag: '章節進度 57%',
          nodes: [
            { type: 'dialogue', bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop', lines: [{ speaker: '神秘人', avatar: '', text: '這山林間殺氣重重，大家小心！' }] },
            { type: 'battle', levelIndex: 0 },
            { type: 'reward', exp: 100, rewardItemId: '' }
          ]
        }
      ]
    };
    localStorage.setItem('my_game_story_data', JSON.stringify(defaultStory));
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📖 劇本與篇章配置中心 (多型節點版)</h3>
        <div>
          <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px; margin-right:8px;" onclick="window.saveStoryDataDirect()">💾 儲存並同步</button>
          <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px;" onclick="window.addStoryBook()">➕ 新增篇章</button>
        </div>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此編排江湖篇章！您可以自由為每個章節添加「對話劇情」、「戰棋戰鬥」、「插畫CG」與「獎勵」，並可隨時調整順序與更換關卡。
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

  // 讀取現有戰棋關卡清單
  let currentLevels = [];
  if (typeof gameLevels !== 'undefined' && Array.isArray(gameLevels)) {
    currentLevels = gameLevels;
  } else {
    try { currentLevels = JSON.parse(localStorage.getItem('my_game_levels_sync')) || []; } catch(e) {}
  }

  filteredBooks.forEach((book) => {
    const bookIdx = book._originalIndex;
    if (!book.nodes) book.nodes = [];

    // 相容舊資料格式 (若只有 stages 陣列則自動轉為 nodes)
    if (book.stages && book.stages.length > 0 && book.nodes.length === 0) {
      book.stages.forEach(stg => book.nodes.push({ type: 'battle', levelIndex: stg }));
      delete book.stages;
      window.updateBookDataRaw(storyData);
    }

    // 渲染節點清單 HTML
    let nodesHtml = '';
    if (book.nodes.length === 0) {
      nodesHtml = `<div style="color:#666; font-size:12px; font-style:italic; text-align:center; padding:15px;">尚未建立任何劇情/戰鬥節點，請點擊下方按鈕新增！</div>`;
    } else {
      book.nodes.forEach((node, nIdx) => {
        nodesHtml += renderSingleNodeCard(bookIdx, nIdx, node, currentLevels, book.nodes.length);
      });
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
            <div style="font-size:11px; color:#888;">ID: ${book.id} | 分類: ${book.tabId} | 總節點: ${book.nodes.length}</div>
          </div>
        </div>
        <button class="btn-del" onclick="window.deleteStoryBook(${bookIdx})">刪除篇章</button>
      </div>
      
      <div class="form-grid" style="margin-bottom:15px;">
        <div class="form-item">
          <label>歸屬分類 Tab</label>
          <select onchange="window.updateBookField(${bookIdx}, 'tabId', this.value)">
            <option value="main" ${book.tabId === 'main' ? 'selected' : ''}>⚔️ 主線劇情</option>
            <option value="side" ${book.tabId === 'side' ? 'selected' : ''}>📜 支線故事</option>
            <option value="event" ${book.tabId === 'event' ? 'selected' : ''}>🔥 限時活動</option>
            <option value="tower" ${book.tabId === 'tower' ? 'selected' : ''}>🏯 通天高塔</option>
          </select>
        </div>
        <div class="form-item">
          <label>標籤文字 (例如: 章節進度)</label>
          <input type="text" value="${book.tag || ''}" oninput="window.updateBookField(${bookIdx}, 'tag', this.value)">
        </div>
        <div class="form-item full">
          <label>劇本標題</label>
          <input type="text" value="${book.title || ''}" oninput="window.updateBookField(${bookIdx}, 'title', this.value)">
        </div>
        <div class="form-item full">
          <label>劇情簡介</label>
          <textarea rows="2" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px; width:100%;" oninput="window.updateBookField(${bookIdx}, 'desc', this.value)">${book.desc || ''}</textarea>
        </div>
        <div class="form-item full">
          <label>封面圖片網址 (URL)</label>
          <input type="text" value="${book.cover || ''}" oninput="window.updateBookField(${bookIdx}, 'cover', this.value)">
        </div>
      </div>

      <!-- 時間軸節點編排區塊 -->
      <div style="background:#141620; padding:12px; border-radius:6px; border:1px dashed #444;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #222; padding-bottom:6px;">
          <span style="font-size:14px; color:#3498db; font-weight:bold;">📍 章節推進時間軸節點 (Timeline Nodes)</span>
          <div style="display:flex; gap:6px;">
            <button class="btn" style="background:#e67e22; font-size:11px; padding:3px 8px;" onclick="window.addNodeToBook(${bookIdx}, 'battle')">＋戰鬥節點</button>
            <button class="btn" style="background:#9b59b6; font-size:11px; padding:3px 8px;" onclick="window.addNodeToBook(${bookIdx}, 'dialogue')">＋對話劇情</button>
            <button class="btn" style="background:#1abc9c; font-size:11px; padding:3px 8px;" onclick="window.addNodeToBook(${bookIdx}, 'cg')">＋全螢幕CG</button>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${nodesHtml}
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// 渲染單一節點控制卡片
function renderSingleNodeCard(bookIdx, nIdx, node, currentLevels, totalNodes) {
  let typeLabel = { battle: '⚔️ 戰棋戰鬥', dialogue: '💬 劇情對話', cg: '🖼️ 全螢幕CG', reward: '🎁 獎勵派發' }[node.type] || node.type;
  let typeColor = { battle: '#e67e22', dialogue: '#9b59b6', cg: '#1abc9c', reward: '#2ecc71' }[node.type] || '#fff';

  let bodyHtml = '';

  if (node.type === 'battle') {
    let levelOptions = `<option value="">-- 選擇關卡 --</option>`;
    if (currentLevels.length > 0) {
      currentLevels.forEach((lv, lvIdx) => {
        levelOptions += `<option value="${lvIdx}" ${node.levelIndex === lvIdx ? 'selected' : ''}>關卡 #${lvIdx+1}: ${lv.name || '未命名關卡'}</option>`;
      });
    } else {
      levelOptions += `<option value="" disabled>尚未建立任何關卡</option>`;
    }

    bodyHtml = `
      <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
        <label style="font-size:12px; color:#aaa;">指定關卡：</label>
        <select style="flex:1; background:#1e2028; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px;" onchange="window.updateNodeField(${bookIdx}, ${nIdx}, 'levelIndex', parseInt(this.value))">
          ${levelOptions}
        </select>
      </div>
    `;
  } 
  else if (node.type === 'dialogue') {
    let linesHtml = '';
    (node.lines || []).forEach((line, lIdx) => {
      linesHtml += `
        <div style="background:#0f0f1a; padding:8px; border-radius:4px; margin-bottom:6px; border:1px solid #333;">
          <div style="display:flex; gap:8px; margin-bottom:4px;">
            <input type="text" placeholder="說話者名字" value="${line.speaker || ''}" style="width:120px; font-size:11px; padding:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'speaker', this.value)">
            <input type="text" placeholder="立繪圖片 URL (選填)" value="${line.avatar || ''}" style="flex:1; font-size:11px; padding:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'avatar', this.value)">
            <button class="btn-del" style="font-size:10px; padding:1px 5px;" onclick="window.removeDialogueLine(${bookIdx}, ${nIdx}, ${lIdx})">✖</button>
          </div>
          <textarea rows="1" placeholder="對話台詞文字..." style="width:100%; background:#16213e; color:#fff; border:1px solid #444; font-size:11px; padding:3px; border-radius:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'text', this.value)">${line.text || ''}</textarea>
        </div>
      `;
    });

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:11px; color:#aaa; width:70px;">背景圖URL:</label>
          <input type="text" value="${node.bgUrl || ''}" style="flex:1; font-size:11px; padding:3px;" placeholder="對話背景大圖網址..." oninput="window.updateNodeField(${bookIdx}, ${nIdx}, 'bgUrl', this.value)">
        </div>
        <div style="border-top:1px dashed #333; margin:4px 0;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#f1c40f;">對話台詞列表：</span>
          <button class="btn" style="background:#3498db; font-size:10px; padding:2px 6px;" onclick="window.addDialogueLine(${bookIdx}, ${nIdx})">＋新增一句對話</button>
        </div>
        ${linesHtml}
      </div>
    `;
  }
  else if (node.type === 'cg') {
    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:11px; color:#aaa; width:70px;">CG圖片URL:</label>
          <input type="text" value="${node.cgUrl || ''}" style="flex:1; font-size:11px; padding:3px;" placeholder="插畫圖片網址..." oninput="window.updateNodeField(${bookIdx}, ${nIdx}, 'cgUrl', this.value)">
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:11px; color:#aaa; width:70px;">旁白字幕:</label>
          <input type="text" value="${node.caption || ''}" style="flex:1; font-size:11px; padding:3px;" placeholder="浮現在CG上的文字..." oninput="window.updateNodeField(${bookIdx}, ${nIdx}, 'caption', this.value)">
        </div>
      </div>
    `;
  }

  return `
    <div style="background:#1a1c29; border:1px solid #333; border-left:4px solid ${typeColor}; padding:10px; border-radius:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:bold; color:${typeColor}; font-size:13px;">節點 #${nIdx+1} 【${typeLabel}】</span>
        <div style="display:flex; gap:4px;">
          <button class="btn" style="background:#333; font-size:10px; padding:2px 6px;" ${nIdx === 0 ? 'disabled' : ''} onclick="window.moveNode(${bookIdx}, ${nIdx}, -1)">▲ 上移</button>
          <button class="btn" style="background:#333; font-size:10px; padding:2px 6px;" ${nIdx === totalNodes - 1 ? 'disabled' : ''} onclick="window.moveNode(${bookIdx}, ${nIdx}, 1)">▼ 下移</button>
          <button class="btn-del" style="font-size:10px; padding:2px 6px;" onclick="window.removeNodeFromBook(${bookIdx}, ${nIdx})">✖ 刪除</button>
        </div>
      </div>
      ${bodyHtml}
    </div>
  `;
}

// 節點陣列增刪改與排序
window.addNodeToBook = function(bookIdx, type) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    if (!storyData.books[bookIdx].nodes) storyData.books[bookIdx].nodes = [];
    
    let newNode = { type };
    if (type === 'battle') newNode.levelIndex = 0;
    else if (type === 'dialogue') newNode.lines = [{ speaker: '主角', avatar: '', text: '請輸入對話...' }];
    else if (type === 'cg') { newNode.cgUrl = ''; newNode.caption = ''; }

    storyData.books[bookIdx].nodes.push(newNode);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.removeNodeFromBook = function(bookIdx, nodeIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes) {
    storyData.books[bookIdx].nodes.splice(nodeIdx, 1);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.moveNode = function(bookIdx, nodeIdx, direction) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes) {
    const nodes = storyData.books[bookIdx].nodes;
    const targetIdx = nodeIdx + direction;
    if (targetIdx >= 0 && targetIdx < nodes.length) {
      const temp = nodes[nodeIdx];
      nodes[nodeIdx] = nodes[targetIdx];
      nodes[targetIdx] = temp;
      window.updateBookDataRaw(storyData);
      reloadStoryEditorUI();
    }
  }
};

window.updateNodeField = function(bookIdx, nodeIdx, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes[nodeIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx][field] = value;
    window.updateBookDataRaw(storyData);
  }
};

// 對話台詞子屬性更新
window.addDialogueLine = function(bookIdx, nodeIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes[nodeIdx]) {
    if (!storyData.books[bookIdx].nodes[nodeIdx].lines) storyData.books[bookIdx].nodes[nodeIdx].lines = [];
    storyData.books[bookIdx].nodes[nodeIdx].lines.push({ speaker: 'NPC', avatar: '', text: '新台詞...' });
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.removeDialogueLine = function(bookIdx, nodeIdx, lineIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes[nodeIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx].lines.splice(lineIdx, 1);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.updateDialogueLine = function(bookIdx, nodeIdx, lineIdx, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx] && storyData.books[bookIdx].nodes[nodeIdx] && storyData.books[bookIdx].nodes[nodeIdx].lines[lineIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx].lines[lineIdx][field] = value;
    window.updateBookDataRaw(storyData);
  }
};

// 工具函式
window.updateBookField = function(index, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[index]) {
    storyData.books[index][field] = value;
    window.updateBookDataRaw(storyData);
  }
};

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

window.addStoryBook = function() {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { tabs: [], books: [] };
  storyData.books.push({
    id: 'book_' + Date.now(),
    tabId: window._currentStoryFilter === 'all' ? 'main' : window._currentStoryFilter,
    title: '新江湖篇章',
    desc: '請在此輸入該劇本的詳細江湖背景與劇情簡介...',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
    tag: '全新解鎖',
    nodes: []
  });
  window.updateBookDataRaw(storyData);
  reloadStoryEditorUI();
};

window.deleteStoryBook = function(index) {
  if (!confirm('⚠️ 確定要刪除這個劇本篇章嗎？')) return;
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books) {
    storyData.books.splice(index, 1);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.updateBookDataRaw = function(data) {
  localStorage.setItem('my_game_story_data', JSON.stringify(data));
};

window.saveStoryDataDirect = function() {
  alert('✅ 劇本篇章與多型時間軸節點資料已成功儲存！');
};
