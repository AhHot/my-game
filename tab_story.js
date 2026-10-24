// tab_story.js - 劇情與劇本配置模組
window.renderTabStory = function(container) {
  // 從 localStorage 讀取或使用預設資料
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
        <h3>📖 劇情與章節配置中心</h3>
        <button class="btn" style="background:#2ecc71; padding:6px 12px; font-size:12px;" onclick="saveStoryData()">💾 保存劇情資料</button>
      </div>
      <p style="font-size:13px; color:#aaa; margin-bottom:15px;">
        在此管理遊戲中的各大篇章與分類。未來玩家將在主介面中透過「左側分類 Tab + 右側橫向滑動卡片」來選擇劇本。
      </p>

      <div class="sub-title">當前劇本列表概覽</div>
      <div id="editor-book-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"></div>
      
      <button class="btn" style="background:#3498db; margin-top:15px;" onclick="addStoryBookModal()">➕ 新增劇本篇章</button>
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
    item.style.cssText = "background:#0f0f1a; border:1px solid #333; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;";
    item.innerHTML = `
      <div>
        <strong style="color:#f1c40f;">[${book.tabId}]</strong> 
        <span style="color:#3498db; font-weight:bold; margin-left:8px;">${book.title}</span>
        <div style="font-size:12px; color:#888; margin-top:2px;">${book.desc}</div>
      </div>
      <button class="btn-del" onclick="deleteStoryBook(${index})">刪除</button>
    `;
    listContainer.appendChild(item);
  });
}

window.saveStoryData = function() {
  alert('✅ 劇情數據已暫存至記憶體，點擊底部的「保存並返回遊戲」將完整寫入！');
};

window.deleteStoryBook = function(index) {
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data'));
  if (storyData && storyData.books) {
    storyData.books.splice(index, 1);
    localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
    window.renderTabStory(document.getElementById('app-content'));
  }
};

window.addStoryBookModal = function() {
  const title = prompt("請輸入新劇本篇章標題：", "第三章：塞外狂沙");
  if (!title) return;
  
  let storyData = JSON.parse(localStorage.getItem('my_game_story_data')) || { tabs: [], books: [] };
  storyData.books.push({
    id: 'book_' + Date.now(),
    tabId: 'main',
    title: title,
    desc: '新解鎖的江湖冒險章節...',
    cover: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=600&auto=format&fit=crop',
    progress: '0/5',
    isLocked: false,
    tag: '全新篇章'
  });
  
  localStorage.setItem('my_game_story_data', JSON.stringify(storyData));
  window.renderTabStory(document.getElementById('app-content'));
};
