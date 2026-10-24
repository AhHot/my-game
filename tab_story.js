// tab_story.js - 劇情與劇本配置模組 (支援完整編輯)
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
        isLocked: false,
        tag: '章節進度 57%'
      }
    ]
  };

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3>📖 劇本與篇章配置中心</h3>
        <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="saveStoryDataDirect()">💾 儲存所有劇本</button>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此編輯各大劇本篇章的標題、簡介、封面圖片與分類。修改後記得點擊儲存！
      </p>

      <div class="sub-title">劇本清單列表</div>
      <div id="editor-book-list" style="display: flex; flex-direction: column; gap: 15px; margin-top: 10px;"></div>
      
      <button class="btn" style="background:#3498db; margin-top:15px;" onclick="addStoryBook()">➕ 新增空白劇本篇章</button>
    </div>
  `;

  renderBookListEditor(storyData);
};

function renderBookListEditor(storyData) {
  const listContainer = document.getElementById('editor-book-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  storyData.books.forEach((book, index) => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:12px; border-radius:6px; margin-bottom:0;";
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="color:#f1c40f; font-weight:bold;">編號 ID: ${book.id}</span>
        <button class="btn-del" onclick="deleteStoryBook(${index})">刪除此劇本</button>
      </div>
      
      <div class="form-grid">
        <div class="form-item">
          <label>歸屬分類 Tab</label>
          <select onchange="updateBookField(${index}, 'tabId', this.value)">
            <option value="main" ${book.tabId === 'main' ? 'selected' : ''}>主線劇情</option>
            <option value="side" ${book.tabId === 'side' ? 'selected' : ''}>支線故事</option>
            <option value="event" ${book.tabId === 'event' ? 'selected' : ''}>限時活動</option>
            <option value="tower" ${book.tabId === 'tower' ? 'selected' : ''}>通天高塔</option>
          </select>
        </div>
        <div class="form-item">
          <label>標籤文字 (例如: 章節進度)</label>
          <input type="text" value="${book.tag || ''}" oninput="updateBookField(${index}, 'tag', this.value)">
        </div>
        <div class="form-item full">
          <label>劇本標題</label>
          <input type="text" value="${book.title || ''}" oninput="updateBookField(${index}, 'title', this.value)">
        </div>
        <div class="form-item full">
          <label>劇情文字簡介</label>
          <textarea rows="2" style="background:#16213e; color:#fff; border:1px solid #444; padding:6px; border-radius:4px; width:100%;" oninput="updateBookField(${index}, 'desc', this.value)">${book.desc || ''}</textarea>
        </div>
        <div class="form-item full">
          <label>封面圖片網址 (URL)</label>
          <input type="text" value="${book.cover || ''}" oninput="updateBookField(${index}, 'cover', this.value)">
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });
}

// 即時更新暫存資料
window.updateBookField = function(index, field, value) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books[index]) {
    storyData.books[index][field] = value;
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
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
    isLocked: false,
    tag: '全新解鎖'
  });
  
  localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  window.renderTabStory(document.getElementById('app-content'));
};

window.deleteStoryBook = function(index) {
  if (!confirm('⚠️ 確定要刪除這個劇本嗎？')) return;
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books) {
    storyData.books.splice(index, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    window.renderTabStory(document.getElementById('app-content'));
  }
};

window.saveStoryDataDirect = function() {
  alert('✅ 劇本資料已成功儲存！');
};
