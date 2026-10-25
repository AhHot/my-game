// character_system.js - 完整獨立人物與背包系統 (1280x720 等比縮放適配、5大Tab、屬性彈窗、技能連動)
(function() {
    let selectedChar = null;
    let activeFilter = 'all';
    let activeRightTab = 'inv';

    // 1. 全域掛載開啟函數供 index.html 呼叫
    window.openCharacterUI = function() {
        syncDataFromStorage();
        initCharacterSystemDOM();
        
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) {
            uiContainer.style.display = 'flex';
        }

        // 停止 Phaser 背景輸入（若有）
        if (window.game && window.game.scene) {
            try {
                const activeScenes = window.game.scene.getScenes(true);
                activeScenes.forEach(s => { if(s.input) s.input.enabled = false; });
            } catch(e){}
        }

        const chars = window.CHARACTERS || [];
        const players = chars.filter(c => c.side === 'player' || !c.side);
        if (players.length > 0) {
            selectCharacter(players[0]);
        }
    };

    window.closeCharacterUI = function() {
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) uiContainer.style.display = 'none';
        
        const popover = document.getElementById('detail-stats-popover');
        if (popover) popover.style.display = 'none';

        if (window.game && window.game.scene) {
            try {
                const activeScenes = window.game.scene.getScenes(true);
                activeScenes.forEach(s => { if(s.input) s.input.enabled = true; });
            } catch(e){}
        }
    };

    function syncDataFromStorage() {
        try {
            const savedChars = localStorage.getItem('my_game_characters');
            if (savedChars) window.CHARACTERS = JSON.parse(savedChars);

            const savedInv = localStorage.getItem('my_game_inventory_sync');
            if (savedInv) window.INVENTORY = JSON.parse(savedInv);

            const savedItems = localStorage.getItem('my_game_items');
            if (savedItems) window.ITEMS = JSON.parse(savedItems);
        } catch(e) {}
    }

    // 2. 初始化完整的 UI DOM 結構（掛載於 1280x720 容器內部，解決溢出問題）
    function initCharacterSystemDOM() {
        if (document.getElementById('fullscreen-ui')) return;

        const container = document.getElementById('game-scale-container') || document.body;

        const uiContainer = document.createElement('div');
        uiContainer.id = 'fullscreen-ui';
        uiContainer.className = 'interactive-ui';
        uiContainer.style.cssText = "position: absolute; inset: 0; width: 1280px; height: 720px; background: rgba(10, 10, 15, 0.96); backdrop-filter: blur(15px); z-index: 1000; color: #ddd; display: none; flex-direction: row; pointer-events: auto;";
        
        uiContainer.innerHTML = `
            <div onclick="window.closeCharacterUI()" style="position: absolute; top: 15px; right: 25px; font-size: 32px; color: #aaa; cursor: pointer; z-index: 1050;">✖</div>

            <!-- 左側角色與屬性 -->
            <div style="width: 440px; height: 100%; background: linear-gradient(135deg, #161824 0%, #0d0e15 100%); border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; position: relative;">
                <div style="height: 180px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') center/cover; position: relative;"></div>
                
                <div style="flex: 1; padding: 15px 20px; display: flex; flex-direction: column; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                        <h2 id="full-char-name" style="color: #f1c40f; font-size: 24px; margin:0;">角色</h2>
                        <span id="full-char-level" style="color: #2ecc71; font-weight: bold; font-size: 16px;">Lv. 1</span>
                    </div>

                    <!-- 6大裝備槽位 -->
                    <div id="full-equip-slots" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;"></div>

                    <!-- 自由配點屬性 -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span id="full-free-points" style="color: #f1c40f; font-size: 13px; font-weight: bold;">剩餘可分配點數: 0</span>
                    </div>
                    <div id="full-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; margin-bottom: 12px;"></div>

                    <!-- 基礎戰鬥面板 + 右中詳細屬性按鈕 -->
                    <div style="position: relative; background: #181a24; border: 1px solid #333; border-radius: 8px; padding: 10px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; font-weight: bold;">
                            <div>氣血(HP): <b id="full-hp" style="color: #e74c3c; font-size: 15px;">3000</b></div>
                            <div>攻擊(ATK): <b id="full-atk" style="color: #e74c3c; font-size: 15px;">400</b></div>
                            <div>防禦(DEF): <b id="full-def" style="color: #e74c3c; font-size: 15px;">200</b></div>
                            <div>速度(SPD): <b id="full-spd" style="color: #e74c3c; font-size: 15px;">10</b></div>
                        </div>
                        <button onclick="window.toggleDetailStatsPopover()" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: #f1c40f; color: #000; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold; cursor: pointer;" title="詳細屬性面板">詳情 ➔</button>
                    </div>
                </div>

                <!-- 底部角色頭像選擇切換列表 -->
                <div id="full-char-list" style="background: #0b0c10; padding: 10px; border-top: 1px solid #222; display: flex; gap: 10px; overflow-x: auto; height: 75px; flex-shrink: 0;"></div>
            </div>

            <!-- 右側背包與技能 -->
            <div style="flex: 1; height: 100%; display: flex; flex-direction: column; background: rgba(18, 20, 28, 0.85); padding: 20px 30px;">
                <div style="display: flex; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; gap: 15px;">
                    <div id="tab-btn-inv" onclick="window.switchRightFullTab('inv')" style="flex: 1; text-align: center; padding: 10px; background: #3498db; border-radius: 6px; cursor: pointer; font-weight: bold; color: #fff; font-size: 16px;">🎒 背包</div>
                    <div id="tab-btn-skill" onclick="window.switchRightFullTab('skill')" style="flex: 1; text-align: center; padding: 10px; background: #161824; border-radius: 6px; cursor: pointer; font-weight: bold; color: #888; font-size: 16px;">📖 技能</div>
                </div>

                <!-- 5大背包分類 Tab -->
                <div id="full-inv-view" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <button class="filter-tab-btn active" onclick="window.setFullFilter('all', this)">全部</button>
                        <button class="filter-tab-btn" onclick="window.setFullFilter('equip', this)">裝備</button>
                        <button class="filter-tab-btn" onclick="window.setFullFilter('consumable', this)">消耗品</button>
                        <button class="filter-tab-btn" onclick="window.setFullFilter('material', this)">材料</button>
                        <button class="filter-tab-btn" onclick="window.setFullFilter('quest', this)">任務</button>
                    </div>
                    <div id="full-inventory-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; align-content: start; padding-bottom: 15px;"></div>
                </div>

                <!-- 技能編輯器連動面板 -->
                <div id="full-skill-view" style="flex: 1; display: none; flex-direction: column; overflow-y: auto; gap: 10px; padding-bottom: 15px;"></div>
            </div>

            <!-- 詳細屬性側彈窗 -->
            <div id="detail-stats-popover" style="position: absolute; left: 440px; top: 80px; width: 280px; background: rgba(15, 17, 26, 0.98); border: 1px solid #f1c40f; border-radius: 8px; padding: 15px; z-index: 1100; display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                <div style="display: flex; justify-content: space-between; font-weight: bold; color: #f1c40f; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">
                    <span>詳細戰鬥加成</span>
                    <span onclick="window.toggleDetailStatsPopover()" style="cursor: pointer; color: #aaa;">✖</span>
                </div>
                <div id="detail-stats-content" style="font-size: 12px; color: #ccc; display: flex; flex-direction: column; gap: 6px;"></div>
            </div>
        </div>
    `;

    container.appendChild(uiContainer);
}

function selectCharacter(charObj) {
    selectedChar = charObj;
    renderCharList();
    renderLeftStats();
    renderRightContent();
}

function renderCharList() {
    const listEl = document.getElementById('full-char-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const chars = (window.CHARACTERS || []).filter(c => c.side === 'player' || !c.side);

    chars.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = "width: 50px; height: 50px; flex-shrink: 0; border-radius: 8px; background: #1f2230; border: 2px solid #3a3d52; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer;";
        item.innerHTML = c.emoji || '👤';
        if (selectedChar && selectedChar.id === c.id) {
            item.style.borderColor = '#f1c40f';
            item.style.background = '#2a2e42';
        }
        item.onclick = () => selectCharacter(c);
        listEl.appendChild(item);
    });
}

function renderLeftStats() {
    if (!selectedChar) return;
    document.getElementById('full-char-name').innerText = selectedChar.name || '未命名';
    document.getElementById('full-char-level').innerText = `Lv. ${selectedChar.level || 1}`;
    document.getElementById('full-hp').innerText = selectedChar.hp || selectedChar.maxHp || 3000;
    document.getElementById('full-atk').innerText = selectedChar.atk || 400;
    document.getElementById('full-def').innerText = selectedChar.def || 200;
    document.getElementById('full-spd').innerText = selectedChar.speed || 10;

    const fp = selectedChar.freePoints || 0;
    document.getElementById('full-free-points').innerText = `剩餘可分配點數: ${fp}`;

    const stats = selectedChar.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
    const statNames = { fengRui: '鋒銳', hunHou: '渾厚', lingDong: '靈動', jianRen: '堅韌', guiMi: '詭秘', jueQing: '絕情' };

    let statsHtml = '';
    Object.keys(statNames).forEach(k => {
        statsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #1a1c29; padding: 4px 8px; border-radius: 4px;">
                <span><span style="color: #aaa;">${statNames[k]}</span> <b style="color: #fff; margin-left: 4px;">${stats[k] || 0}</b></span>
                <button ${fp > 0 ? '' : 'disabled'} onclick="window.addStatPoint('${k}')" style="background: #2ecc71; color: #fff; border: none; border-radius: 3px; width: 18px; height: 18px; font-weight: bold; cursor: pointer; line-height: 1;">+</button>
            </div>
        `;
    });
    document.getElementById('full-stats-grid').innerHTML = statsHtml;

    const slots = [
        { key: 'weapon', name: '武器' }, { key: 'head', name: '頭部' }, { key: 'body', name: '衣服' },
        { key: 'legs', name: '腿部' }, { key: 'ring', name: '戒指' }, { key: 'necklace', name: '項鏈' }
    ];
    let slotsHtml = '';
    slots.forEach(s => {
        slotsHtml += `<div style="height: 42px; background: #1a1c29; border: 1px dashed #3a3d52; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #666;">${s.name}</div>`;
    });
    document.getElementById('full-equip-slots').innerHTML = slotsHtml;

    document.getElementById('detail-stats-content').innerHTML = `
        <div>💥 暴擊率: <b>${(selectedChar.critRate || 5)}%</b></div>
        <div>⚡ 暴擊傷害: <b>${(selectedChar.critDmg || 150)}%</b></div>
        <div>🛡️ 格擋率: <b>${(selectedChar.blockRate || 0)}%</b></div>
        <div>🌀 閃避率: <b>${(selectedChar.evadeRate || 0)}%</b></div>
        <div>🗡️ 破勢增傷: <b>+${(selectedChar.poShiDmg || 0)}%</b></div>
        <div>❄️ 滯氣增傷: <b>+${(selectedChar.zhiQiDmg || 0)}%</b></div>
    `;
}

window.addStatPoint = function(statKey) {
    if (!selectedChar || !selectedChar.freePoints || selectedChar.freePoints <= 0) return;
    selectedChar.freePoints--;
    if (!selectedChar.stats) selectedChar.stats = {};
    selectedChar.stats[statKey] = (selectedChar.stats[statKey] || 0) + 1;
    localStorage.setItem('my_game_characters', JSON.stringify(window.CHARACTERS));
    renderLeftStats();
};

window.toggleDetailStatsPopover = function() {
    const popover = document.getElementById('detail-stats-popover');
    if (popover) {
        popover.style.display = (popover.style.display === 'block') ? 'none' : 'block';
    }
};

window.switchRightFullTab = function(tab) {
    activeRightTab = tab;
    document.getElementById('tab-btn-inv').style.background = tab === 'inv' ? '#3498db' : '#161824';
    document.getElementById('tab-btn-inv').style.color = tab === 'inv' ? '#fff' : '#888';
    document.getElementById('tab-btn-skill').style.background = tab === 'skill' ? '#3498db' : '#161824';
    document.getElementById('tab-btn-skill').style.color = tab === 'skill' ? '#fff' : '#888';
    renderRightContent();
};

window.setFullFilter = function(filterType, btn) {
    activeFilter = filterType;
    document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderRightContent();
};

function renderRightContent() {
    const invView = document.getElementById('full-inv-view');
    const skillView = document.getElementById('full-skill-view');

    if (activeRightTab === 'inv') {
        invView.style.display = 'flex';
        skillView.style.display = 'none';

        const grid = document.getElementById('full-inventory-grid');
        grid.innerHTML = '';
        const invList = window.INVENTORY || [];
        const itemsTpl = window.ITEMS || {};

        const filtered = invList.filter(inst => {
            const tpl = itemsTpl[inst.itemId] || inst;
            if (activeFilter === 'all') return true;
            if (activeFilter === 'equip') return ['weapon', 'armor', 'accessory', 'head', 'body', 'legs'].includes(tpl.category);
            return tpl.category === activeFilter;
        });

        for (let i = 0; i < 48; i++) {
            const cell = document.createElement('div');
            cell.style.cssText = "aspect-ratio: 1; background: #161824; border: 1px solid #2a2e42; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;";

            if (filtered[i]) {
                const inst = filtered[i];
                const tpl = itemsTpl[inst.itemId] || inst;
                cell.innerHTML = `<div style="font-size: 26px;">${tpl.icon || '📦'}</div>`;
                if (inst.count > 1) {
                    cell.innerHTML += `<span style="position: absolute; right: 4px; bottom: 2px; font-size: 10px; color: #f1c40f; font-weight: bold;">${inst.count}</span>`;
                }
            } else {
                cell.innerHTML = `<span style="color: #222; font-size: 11px;">空</span>`;
            }
            grid.appendChild(cell);
        }
    } else {
        invView.style.display = 'none';
        skillView.style.display = 'flex';
        skillView.innerHTML = '';

        let globalConfig = {};
        try { globalConfig = JSON.parse(localStorage.getItem('my_game_config') || '{}'); } catch(e){}
        const skills = globalConfig.skills || (selectedChar ? selectedChar.skills : null) || [
            { name: '太極劍法', icon: '🗡️', type: '主動', desc: '對敵方單體造成 150% 物理傷害，並附加滯氣效果。' },
            { name: '純陽無極功', icon: '✨', type: '被動', desc: '提升自身 15% 攻擊力與 10% 暴擊率。' }
        ];

        skills.forEach(s => {
            const card = document.createElement('div');
            card.style.cssText = "background: #161824; border: 1px solid #2a2e42; border-radius: 8px; padding: 12px; display: flex; gap: 12px; align-items: center;";
            card.innerHTML = `
                <div style="font-size: 32px; background: #222; padding: 8px; border-radius: 6px;">${s.icon || '📖'}</div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <b style="color: #f1c40f; font-size: 15px;">${s.name}</b>
                        <span style="font-size: 11px; background: #e67e22; color: #fff; padding: 2px 6px; border-radius: 4px;">${s.type || '主動'}</span>
                    </div>
                    <div style="font-size: 12px; color: #aaa; line-height: 1.4;">${s.desc || '無描述'}</div>
                </div>
            `;
            skillView.appendChild(card);
        });
    }
}
})();
