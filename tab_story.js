// ==========================================
// 模組：支援音效與氛圍特效的劇本編輯器 (tab_story.js)
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
            { 
              type: 'dialogue', 
              bgUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop', 
              bgmUrl: '',
              lines: [
                { speaker: '赫卡蒂', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop', text: '太危險了。局長，來這邊！', sfxUrl: '', effect: 'none' }
              ] 
            },
            { type: 'battle', levelIndex: 0 }
          ]
        }
      ]
    };
    localStorage.setItem('my_game_story_data', JSON.stringify(defaultStory));
  }

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📖 劇本與篇章配置中心 (沉浸式影音版)</h3>
        <div>
          <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px; margin-right:8px;" onclick="window.saveStoryDataDirect()">💾 儲存並同步</button>
          <button class="btn" style="background:#3498db; padding:6px 12px; font-size:12px;" onclick="window.addStoryBook()">➕ 新增篇章</button>
        </div>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此編排江湖篇章，並可為對話設定專屬 BGM、SFX音效與畫面變紅等沉浸式特效！
      </p>

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
    if (filter === 'all' || book.tabId === filter) filteredBooks.push(book);
  });

  if (filteredBooks.length === 0) {
    listContainer.innerHTML = `<div style="text-align:center; color:#666; padding:30px;">目前沒有此分類的劇本篇章！</div>`;
    return;
  }

  let currentLevels = [];
  if (typeof gameLevels !== 'undefined' && Array.isArray(gameLevels)) currentLevels = gameLevels;
  else { try { currentLevels = JSON.parse(localStorage.getItem('my_game_levels_sync')) || []; } catch(e) {} }

  filteredBooks.forEach((book) => {
    const bookIdx = book._originalIndex;
    if (!book.nodes) book.nodes = [];

    let nodesHtml = '';
    if (book.nodes.length === 0) {
      nodesHtml = `<div style="color:#666; font-size:12px; font-style:italic; text-align:center; padding:15px;">尚未建立節點</div>`;
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
          <span style="font-size:24px;">📖</span>
          <div>
            <div style="color:#f1c40f; font-weight:bold; font-size:16px;">${book.title || '未命名篇章'}</div>
            <div style="font-size:11px; color:#888;">ID: ${book.id} | 分類: ${book.tabId}</div>
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
          </select>
        </div>
        <div class="form-item">
          <label>標籤文字</label>
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

      <div style="background:#141620; padding:12px; border-radius:6px; border:1px dashed #444;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #222; padding-bottom:6px;">
          <span style="font-size:14px; color:#3498db; font-weight:bold;">📍 劇情時間軸節點</span>
          <div style="display:flex; gap:6px;">
            <button class="btn" style="background:#e67e22; font-size:11px; padding:3px 8px;" onclick="window.addNodeToBook(${bookIdx}, 'battle')">＋戰鬥節點</button>
            <button class="btn" style="background:#9b59b6; font-size:11px; padding:3px 8px;" onclick="window.addNodeToBook(${bookIdx}, 'dialogue')">＋對話劇情</button>
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

function renderSingleNodeCard(bookIdx, nIdx, node, currentLevels, totalNodes) {
  let typeLabel = node.type === 'battle' ? '⚔️ 戰棋戰鬥' : '💬 劇情對話';
  let typeColor = node.type === 'battle' ? '#e67e22' : '#9b59b6';
  let bodyHtml = '';

  if (node.type === 'battle') {
    let levelOptions = `<option value="">-- 選擇關卡 --</option>`;
    currentLevels.forEach((lv, lvIdx) => {
      levelOptions += `<option value="${lvIdx}" ${node.levelIndex === lvIdx ? 'selected' : ''}>關卡 #${lvIdx+1}: ${lv.name}</option>`;
    });
    bodyHtml = `
      <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
        <label style="font-size:12px; color:#aaa;">指定關卡：</label>
        <select style="flex:1; background:#1e2028; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:12px;" onchange="window.updateNodeField(${bookIdx}, ${nIdx}, 'levelIndex', parseInt(this.value))">
          ${levelOptions}
        </select>
      </div>
    `;
  } else if (node.type === 'dialogue') {
    let linesHtml = '';
    (node.lines || []).forEach((line, lIdx) => {
      linesHtml += `
        <div style="background:#0f0f1a; padding:8px; border-radius:4px; margin-bottom:6px; border:1px solid #333;">
          <div style="display:flex; gap:8px; margin-bottom:4px;">
            <input type="text" placeholder="說話者" value="${line.speaker || ''}" style="width:100px; font-size:11px; padding:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'speaker', this.value)">
            <input type="text" placeholder="立繪圖片URL" value="${line.avatar || ''}" style="flex:1; font-size:11px; padding:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'avatar', this.value)">
            <select style="font-size:11px;" onchange="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'effect', this.value)">
              <option value="none" ${line.effect==='none'?'selected':''}>無特效</option>
              <option value="flash-red" ${line.effect==='flash-red'?'selected':''}>💥 畫面閃紅</option>
              <option value="shake" ${line.effect==='shake'?'selected':''}>📳 畫面震動</option>
            </select>
            <button class="btn-del" style="font-size:10px; padding:1px 5px;" onclick="window.removeDialogueLine(${bookIdx}, ${nIdx}, ${lIdx})">✖</button>
          </div>
          <div style="display:flex; gap:8px; margin-bottom:4px;">
            <input type="text" placeholder="SFX音效URL (選填)" value="${line.sfxUrl || ''}" style="flex:1; font-size:11px; padding:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'sfxUrl', this.value)">
          </div>
          <textarea rows="1" placeholder="台詞文字..." style="width:100%; background:#16213e; color:#fff; border:1px solid #444; font-size:11px; padding:3px; border-radius:3px;" oninput="window.updateDialogueLine(${bookIdx}, ${nIdx}, ${lIdx}, 'text', this.value)">${line.text || ''}</textarea>
        </div>
      `;
    });

    bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:11px; color:#aaa; width:70px;">背景圖URL:</label>
          <input type="text" value="${node.bgUrl || ''}" style="flex:1; font-size:11px; padding:3px;" placeholder="背景大圖..." oninput="window.updateNodeField(${bookIdx}, ${nIdx}, 'bgUrl', this.value)">
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:11px; color:#aaa; width:70px;">BGM網址:</label>
          <input type="text" value="${node.bgmUrl || ''}" style="flex:1; font-size:11px; padding:3px;" placeholder="背景音樂網址..." oninput="window.updateNodeField(${bookIdx}, ${nIdx}, 'bgmUrl', this.value)">
        </div>
        <div style="border-top:1px dashed #333; margin:4px 0;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; color:#f1c40f;">對話台詞：</span>
          <button class="btn" style="background:#3498db; font-size:10px; padding:2px 6px;" onclick="window.addDialogueLine(${bookIdx}, ${nIdx})">＋新增一句</button>
        </div>
        ${linesHtml}
      </div>
    `;
  }

  return `
    <div style="background:#1a1c29; border:1px solid #333; border-left:4px solid ${typeColor}; padding:10px; border-radius:6px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:bold; color:${typeColor}; font-size:13px;">節點 #${nIdx+1} 【${typeLabel}】</span>
        <div style="display:flex; gap:4px;">
          <button class="btn" style="background:#333; font-size:10px; padding:2px 6px;" ${nIdx === 0 ? 'disabled' : ''} onclick="window.moveNode(${bookIdx}, ${nIdx}, -1)">▲</button>
          <button class="btn" style="background:#333; font-size:10px; padding:2px 6px;" ${nIdx === totalNodes - 1 ? 'disabled' : ''} onclick="window.moveNode(${bookIdx}, ${nIdx}, 1)">▼</button>
          <button class="btn-del" style="font-size:10px; padding:2px 6px;" onclick="window.removeNodeFromBook(${bookIdx}, ${nIdx})">✖</button>
        </div>
      </div>
      ${bodyHtml}
    </div>
  `;
};

window.addNodeToBook = function(bookIdx, type) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    if (!storyData.books[bookIdx].nodes) storyData.books[bookIdx].nodes = [];
    let newNode = { type };
    if (type === 'battle') newNode.levelIndex = 0;
    else if (type === 'dialogue') newNode.lines = [{ speaker: '主角', avatar: '', text: '請輸入...', sfxUrl: '', effect: 'none' }];
    storyData.books[bookIdx].nodes.push(newNode);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.removeNodeFromBook = function(bookIdx, nodeIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    storyData.books[bookIdx].nodes.splice(nodeIdx, 1);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.moveNode = function(bookIdx, nodeIdx, direction) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
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
  if (storyData && storyData.books[bookIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx][field] = value;
    window.updateBookDataRaw(storyData);
  }
};

window.addDialogueLine = function(bookIdx, nodeIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx].lines.push({ speaker: 'NPC', avatar: '', text: '新台詞...', sfxUrl: '', effect: 'none' });
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.removeDialogueLine = function(bookIdx, nodeIdx, lineIdx) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx].lines.splice(lineIdx, 1);
    window.updateBookDataRaw(storyData);
    reloadStoryEditorUI();
  }
};

window.updateDialogueLine = function(bookIdx, nodeIdx, lineIdx, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[bookIdx]) {
    storyData.books[bookIdx].nodes[nodeIdx].lines[lineIdx][field] = value;
    window.updateBookDataRaw(storyData);
  }
};

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
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { books: [] };
  storyData.books.push({
    id: 'book_' + Date.now(),
    tabId: window._currentStoryFilter === 'all' ? 'main' : window._currentStoryFilter,
    title: '新江湖篇章',
    desc: '劇情簡介...',
    cover: '',
    tag: '新解鎖',
    nodes: []
  });
  window.updateBookDataRaw(storyData);
  reloadStoryEditorUI();
};

window.deleteStoryBook = function(index) {
  if (!confirm('⚠️ 確定要刪除這個劇本篇章嗎？')) return;
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  storyData.books.splice(index, 1);
  window.updateBookDataRaw(storyData);
  reloadStoryEditorUI();
};

window.updateBookDataRaw = function(data) {
  localStorage.setItem('my_game_story_data', JSON.stringify(data));
};

window.saveStoryDataDirect = function() {
  alert('✅ 劇本與特效音效資料已成功儲存！');
};
