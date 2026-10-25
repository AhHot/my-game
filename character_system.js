// character_system.js - 獨立強韌版 (防崩潰、全域預設初始化、直接開啟)

// 1. 在腳本最頂層立即掛載，確保全域一定能呼叫到
window.openCharacterUI = function() {
    try {
        // 確保基本資料結構存在
        initDefaultCharacterData();
        
        // 確保 DOM 介面已建立
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

        // 讀取配置
        try {
            const gc = JSON.parse(localStorage.getItem('my_game_config') || '{}');
            window.globalExpTable = gc.expTable || [];
            window.GROWTH_MODELS = gc.growthModels || [];
        } catch(e) {}

        renderCharList();
        
        // 選取第一個玩家角色
        const chars = window.CHARACTERS || [];
        const players = chars.filter(c => c.side === 'player');
        if (players.length > 0) {
            selectCharacter(players[0]);
        }
    } catch (err) {
        alert('開啟人物介面時發生錯誤：\n' + err.message + '\n' + err.stack);
    }
};

window.closeCharacterUI = function() {
    const uiContainer = document.getElementById('fullscreen-ui');
    if (uiContainer) uiContainer.style.display = 'none';
    if (typeof window.hideTooltip === 'function') window.hideTooltip();
    
    if (window.game && window.game.scene) {
        try {
            const activeScenes = window.game.scene.getScenes(true);
            activeScenes.forEach(s => { if(s.input) s.input.enabled = true; });
        } catch(e){}
    }
};

// 安全初始化預設角色與背包資料（防止 CHARACTERS 未定義導致崩潰）
function initDefaultCharacterData() {
    if (typeof window.CHARACTERS === 'undefined' || !Array.isArray(window.CHARACTERS)) {
        const savedChars = localStorage.getItem('my_game_characters');
        if (savedChars) {
            try { window.CHARACTERS = JSON.parse(savedChars); } catch(e){}
        }
    }
    if (!window.CHARACTERS || !Array.isArray(window.CHARACTERS) || window.CHARACTERS.length === 0) {
        window.CHARACTERS = [
            { id: 'hero_01', name: '主角', emoji: '⚔️', side: 'player', level: 1, hp: 3000, maxHp: 3000, atk: 400, def: 200, speed: 10, freePoints: 5, stats: { fengRui: 5, hunHou: 5, lingDong: 5, jianRen: 5, guiMi: 0, jueQing: 0 }, equipment: {} }
        ];
    }

    if (typeof window.INVENTORY === 'undefined' || !Array.isArray(window.INVENTORY)) {
        const savedInv = localStorage.getItem('my_game_inventory_sync');
        if (savedInv) {
            try { window.INVENTORY = JSON.parse(savedInv); } catch(e){}
        }
    }
    if (!window.INVENTORY) window.INVENTORY = [];

    if (typeof window.ITEMS === 'undefined') {
        window.ITEMS = {
            'wep_01': { id: 'wep_01', name: '鐵劍', category: 'weapon', icon: '🗡️' }
        };
    }
}

let selectedChar = null;
let currentUnit = null;
let currentTab = 'inv';
let currentFilter = 'all';

function initCharacterSystemDOM() {
    if (document.getElementById('fullscreen-ui')) return;

    const uiContainer = document.createElement('div');
    uiContainer.id = 'fullscreen-ui';
    uiContainer.className = 'interactive-ui';
    uiContainer.style.cssText = "display: none; position: fixed; inset: 0; width: 100vw; height: 100vh; background: rgba(10, 10, 15, 0.98); z-index: 99999; color: #ddd; flex-direction: row; pointer-events: auto;";
    uiContainer.onclick = (e) => e.stopPropagation();

    uiContainer.innerHTML = `
        <div class="close-ui-btn" onclick="window.closeCharacterUI()" style="position: absolute; top: 20px; right: 30px; font-size: 36px; color: #aaa; cursor: pointer; z-index: 99999;">✖</div>

        <!-- 左側面板 -->
        <div style="width: 380px; height: 100%; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border-right: 2px solid #333; display: flex; flex-direction: column; position: relative;">
            <div style="height: 160px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') center/cover; position: relative;"></div>
            <div style="flex: 1; padding: 15px 20px; display: flex; flex-direction: column; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
                    <h2 id="ui-char-name" style="color: #f1c40f; font-size: 24px; margin:0;">角色</h2>
                    <span id="ui-char-level" style="color: #2ecc71; font-weight: bold; font-size: 16px;">Lv. 1</span>
                </div>

                <div id="ui-equip-slots" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 10px 0;"></div>

                <div id="ui-free-points" style="color: #f1c40f; font-size: 13px; margin-bottom: 6px; font-weight: bold; text-align: center;">剩餘點數: 0</div>
                <div id="ui-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 13px; margin-bottom: 10px;"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; font-weight: bold;">
                    <div style="background: #1e2028; padding: 8px; border-radius: 6px; border: 1px solid #333; text-align: center;">氣血(HP)<b id="ui-hp" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 16px;">3000</b></div>
                    <div style="background: #1e2028; padding: 8px; border-radius: 6px; border: 1px solid #333; text-align: center;">攻擊(ATK)<b id="ui-atk" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 16px;">400</b></div>
                    <div style="background: #1e2028; padding: 8px; border-radius: 6px; border: 1px solid #333; text-align: center;">防禦(DEF)<b id="ui-def" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 16px;">200</b></div>
                    <div style="background: #1e2028; padding: 8px; border-radius: 6px; border: 1px solid #333; text-align: center;">速度(SPD)<b id="ui-spd" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 16px;">10</b></div>
                </div>
            </div>
            <div id="ui-char-list" style="background: #111; padding: 8px; border-top: 1px solid #333; display: flex; gap: 8px; overflow-x: auto; height: 75px; flex-shrink: 0;"></div>
        </div>

        <!-- 右側面板 -->
        <div style="flex: 1; display: flex; flex-direction: column; background: rgba(20, 22, 30, 0.95); padding: 20px;">
            <div style="display: flex; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; gap: 10px;">
                <div id="rt-btn-inv" onclick="window.switchRightTab('inv')" style="flex: 1; text-align: center; padding: 10px; background: #3498db; border-radius: 6px; cursor: pointer; font-weight: bold; color: #fff; font-size: 16px;">🎒 背包</div>
                <div id="rt-btn-skill" onclick="window.switchRightTab('skill')" style="flex: 1; text-align: center; padding: 10px; background: #1a1c29; border-radius: 6px; cursor: pointer; font-weight: bold; color: #888; font-size: 16px;">📖 技能</div>
            </div>

            <div id="inv-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                    <div class="filter-btn active" onclick="window.setFilter('all', this)" style="padding: 4px 12px; background: #e67e22; border: 1px solid #e67e22; border-radius: 12px; cursor: pointer; font-size: 12px; color: #fff; font-weight: bold;">全部</div>
                    <div class="filter-btn" onclick="window.setFilter('equip', this)" style="padding: 4px 12px; background: #222; border: 1px solid #444; border-radius: 12px; cursor: pointer; font-size: 12px; color: #aaa;">裝備</div>
                    <div class="filter-btn" onclick="window.setFilter('consumable', this)" style="padding: 4px 12px; background: #222; border: 1px solid #444; border-radius: 12px; cursor: pointer; font-size: 12px; color: #aaa;">消耗品</div>
                </div>
                <div id="inventory-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(65px, 1fr)); gap: 8px; align-content: start; padding-bottom: 20px;"></div>
            </div>

            <div id="skill-container" style="flex: 1; display: none; flex-direction: column; overflow-y: auto; gap: 10px; padding-bottom: 20px;"></div>
        </div>

        <!-- 彈窗：物品詳情 -->
        <div id="item-tooltip" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 2px solid #f1c40f; border-radius: 10px; padding: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 99999; width: 320px;">
            <div onclick="window.hideTooltip()" style="position: absolute; top: 10px; right: 15px; cursor: pointer; color: #aaa; font-size: 20px;">✖</div>
            <div id="tooltip-content"></div>
        </div>
    </div>
    `;

    document.body.appendChild(uiContainer);
}

function renderCharList() {
    const box = document.getElementById('ui-char-list');
    if (!box) return;
    box.innerHTML = '';
    const chars = window.CHARACTERS || [];
    const players = chars.filter(c => c.side === 'player');
    
    players.forEach(p => {
        const btn = document.createElement('div');
        btn.style.cssText = "width: 50px; height: 50px; flex-shrink: 0; border-radius: 8px; background: #222; border: 2px solid #444; display: flex; justify-content: center; align-items: center; font-size: 22px; cursor: pointer; transition: all 0.2s;";
        btn.innerHTML = p.emoji || '👤';
        btn.onclick = () => selectCharacter(p);
        if (selectedChar && selectedChar.id === p.id) {
            btn.style.borderColor = '#f1c40f';
            btn.style.background = '#333';
        }
        box.appendChild(btn);
    });
}

function selectCharacter(charData) {
    selectedChar = charData;
    renderCharList();
    refreshLeftPanel();
    refreshRightPanel();
}

function refreshLeftPanel() {
    if (!selectedChar) return;
    document.getElementById('ui-char-name').innerText = selectedChar.name || '未命名';
    document.getElementById('ui-char-level').innerText = `Lv. ${selectedChar.level || 1}`;

    document.getElementById('ui-hp').innerText = selectedChar.hp || selectedChar.maxHp || 3000;
    document.getElementById('ui-atk').innerText = selectedChar.atk || 400;
    document.getElementById('ui-def').innerText = selectedChar.def || 200;
    document.getElementById('ui-spd').innerText = selectedChar.speed || 10;

    const fp = selectedChar.freePoints || 0;
    document.getElementById('ui-free-points').innerText = `剩餘點數: ${fp}`;
    
    const stats = selectedChar.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
    const statNames = { fengRui: '鋒銳', hunHou: '渾厚', lingDong: '靈動', jianRen: '堅韌', guiMi: '詭秘', jueQing: '絕情' };
    
    let statsHtml = '';
    Object.keys(statNames).forEach(k => {
        statsHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #333; padding-bottom: 2px;">
                <div><span style="color: #888;">${statNames[k]}</span> <b style="color: #fff; margin-right: 4px;">${stats[k] || 0}</b></div>
                <button ${fp > 0 ? '' : 'disabled'} onclick="window.allocatePoint('${k}')" style="background: #2ecc71; color: #fff; border: none; border-radius: 3px; width: 18px; height: 18px; font-weight: bold; cursor: pointer; line-height: 1;">+</button>
            </div>
        `;
    });
    document.getElementById('ui-stats-grid').innerHTML = statsHtml;
    renderEquipSlots();
}

window.allocatePoint = function(statKey) {
    if (!selectedChar || !selectedChar.freePoints || selectedChar.freePoints <= 0) return;
    selectedChar.freePoints--;
    if(!selectedChar.stats) selectedChar.stats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
    selectedChar.stats[statKey] = (selectedChar.stats[statKey] || 0) + 1;
    saveGameData();
    selectCharacter(selectedChar);
};

function renderEquipSlots() {
    const container = document.getElementById('ui-equip-slots');
    if (!container) return;
    container.innerHTML = '';
    const slots = [
        { key: 'weapon', name: '武器' }, { key: 'head', name: '頭部' }, { key: 'body', name: '衣服' },
        { key: 'legs', name: '腿部' }, { key: 'ring', name: '戒指' }, { key: 'necklace', name: '項鏈' }
    ];

    slots.forEach(slot => {
        const div = document.createElement('div');
        div.style.cssText = "height: 45px; background: #1a1c29; border: 1px solid #333; border-radius: 4px; display: flex; justify-content: center; align-items: center; cursor: pointer;";
        div.innerHTML = `<span style="color: #555; font-size: 11px;">${slot.name}</span>`;
        container.appendChild(div);
    });
}

function refreshRightPanel() {
    if (currentTab === 'inv') {
        document.getElementById('inv-container').style.display = 'flex';
        document.getElementById('skill-container').style.display = 'none';
        renderInventory();
    } else {
        document.getElementById('inv-container').style.display = 'none';
        document.getElementById('skill-container').style.display = 'flex';
        renderSkills();
    }
}

window.switchRightTab = function(tab) {
    currentTab = tab;
    document.getElementById('rt-btn-inv').style.background = tab === 'inv' ? '#3498db' : '#1a1c29';
    document.getElementById('rt-btn-inv').style.color = tab === 'inv' ? '#fff' : '#888';
    document.getElementById('rt-btn-skill').style.background = tab === 'skill' ? '#3498db' : '#1a1c29';
    document.getElementById('rt-btn-skill').style.color = tab === 'skill' ? '#fff' : '#888';
    refreshRightPanel();
};

window.setFilter = function(type, btn) {
    currentFilter = type;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.background = '#222'; b.style.borderColor = '#444'; b.style.color = '#aaa';
    });
    btn.style.background = '#e67e22'; btn.style.borderColor = '#e67e22'; btn.style.color = '#fff';
    renderInventory();
};

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const inv = window.INVENTORY || [];
    const items = window.ITEMS || {};

    for (let i = 0; i < 40; i++) {
        const slot = document.createElement('div');
        slot.style.cssText = "aspect-ratio: 1; background: #1a1c29; border: 1px solid #333; border-radius: 4px; display: flex; justify-content: center; align-items: center; cursor: pointer;";

        if (inv[i]) {
            const itemTpl = items[inv[i].itemId];
            if (itemTpl) {
                slot.innerHTML = `<div style="font-size: 22px;">${itemTpl.icon || '📦'}</div>`;
            }
        } else {
            slot.innerHTML = `<div style="color:#222; font-size:10px;">空</div>`;
        }
        grid.appendChild(slot);
    }
}

function renderSkills() {
    const box = document.getElementById('skill-container');
    if (!box) return;
    box.innerHTML = '<div style="color:#888; text-align:center; margin-top:20px;">技能系統開放中</div>';
}

window.hideTooltip = function() {
    const tooltip = document.getElementById('item-tooltip');
    if (tooltip) tooltip.style.display = 'none';
};

function saveGameData() {
    if (window.CHARACTERS) localStorage.setItem('my_game_characters', JSON.stringify(window.CHARACTERS));
    if (window.INVENTORY) localStorage.setItem('my_game_inventory_sync', JSON.stringify(window.INVENTORY));
}
