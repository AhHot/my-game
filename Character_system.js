// character_system.js - 獨立的人物養成、背包與裝備管理系統 (全域即時掛載版)
(function() {
    let selectedChar = null;
    let currentUnit = null;
    let currentTab = 'inv';
    let currentFilter = 'all';
    let globalExpTable = [];

    // 全域確保掛載，無論何時呼叫都能開啟
    window.openCharacterUI = function() {
        initCharacterSystemDOM();
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) {
            uiContainer.style.display = 'flex';
        }

        // 停止 Phaser 遊戲背景輸入（若有）
        if (window.game && window.game.scene) {
            try {
                const activeScenes = window.game.scene.getScenes(true);
                activeScenes.forEach(s => { if(s.input) s.input.enabled = false; });
            } catch(e){}
        }
        
        if (typeof CHARACTERS === 'undefined' || !Array.isArray(CHARACTERS)) {
            console.warn('CHARACTERS 尚未載入');
            return;
        }

        try {
            const gc = JSON.parse(localStorage.getItem('my_game_config') || '{}');
            globalExpTable = gc.expTable || [];
            window.GROWTH_MODELS = gc.growthModels || [];
        } catch(e) {}

        renderCharList();
        const players = CHARACTERS.filter(c => c.side === 'player');
        if(players.length > 0) selectCharacter(players[0]);
    };

    window.closeCharacterUI = function() {
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) uiContainer.style.display = 'none';
        if (typeof window.hideTooltip === 'function') window.hideTooltip();
        if (typeof window.hideDetailCard === 'function') window.hideDetailCard();
        
        if (window.game && window.game.scene) {
            try {
                const activeScenes = window.game.scene.getScenes(true);
                activeScenes.forEach(s => { if(s.input) s.input.enabled = true; });
            } catch(e){}
        }
    };

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
            <div style="width: 420px; height: 100%; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border-right: 2px solid #333; display: flex; flex-direction: column; position: relative;">
                <div style="height: 200px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') center/cover; position: relative;"></div>
                <div style="flex: 1; padding: 20px 25px; display: flex; flex-direction: column; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
                        <h2 id="ui-char-name" style="color: #f1c40f; font-size: 26px; margin:0;">角色</h2>
                        <span id="ui-char-level" style="color: #2ecc71; font-weight: bold; font-size: 18px;">Lv. 1</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <div id="ui-exp-text" style="font-size: 12px; color: #888; text-align: right; margin-bottom: 4px;">0 / 100</div>
                        <div style="width: 100%; height: 6px; background: #222; border-radius: 3px; overflow: hidden;"><div id="ui-exp-fill" style="width: 0%; height: 100%; background: #3498db; transition: width 0.3s ease;"></div></div>
                    </div>

                    <div id="ui-equip-slots" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;"></div>

                    <div id="ui-free-points" style="color: #f1c40f; font-size: 14px; margin-bottom: 8px; font-weight: bold; text-align: center;">剩餘點數: 0</div>
                    <div id="ui-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px; margin-bottom: 15px;"></div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; font-weight: bold;">
                        <div style="background: #1e2028; padding: 10px; border-radius: 8px; border: 1px solid #333; text-align: center;">氣血(HP)<b id="ui-hp" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 18px;">3000</b></div>
                        <div style="background: #1e2028; padding: 10px; border-radius: 8px; border: 1px solid #333; text-align: center;">攻擊(ATK)<b id="ui-atk" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 18px;">400</b></div>
                        <div style="background: #1e2028; padding: 10px; border-radius: 8px; border: 1px solid #333; text-align: center;">防禦(DEF)<b id="ui-def" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 18px;">200</b></div>
                        <div style="background: #1e2028; padding: 10px; border-radius: 8px; border: 1px solid #333; text-align: center;">速度(SPD)<b id="ui-spd" style="display: block; color: #e74c3c; margin-top: 2px; font-size: 18px;">10</b></div>
                    </div>
                </div>
                <div id="ui-char-list" style="background: #111; padding: 10px; border-top: 1px solid #333; display: flex; gap: 10px; overflow-x: auto; height: 85px; flex-shrink: 0;"></div>
            </div>

            <!-- 右側面板 -->
            <div style="flex: 1; display: flex; flex-direction: column; background: rgba(20, 22, 30, 0.95); padding: 25px;">
                <div style="display: flex; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; gap: 15px;">
                    <div id="rt-btn-inv" onclick="window.switchRightTab('inv')" style="flex: 1; text-align: center; padding: 12px; background: #3498db; border-radius: 8px; cursor: pointer; font-weight: bold; color: #fff; font-size: 18px;">🎒 背包</div>
                    <div id="rt-btn-skill" onclick="window.switchRightTab('skill')" style="flex: 1; text-align: center; padding: 12px; background: #1a1c29; border-radius: 8px; cursor: pointer; font-weight: bold; color: #888; font-size: 18px;">📖 技能</div>
                </div>

                <div id="inv-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        <div class="filter-btn active" onclick="window.setFilter('all', this)" style="padding: 6px 16px; background: #e67e22; border: 1px solid #e67e22; border-radius: 15px; cursor: pointer; font-size: 14px; color: #fff; font-weight: bold;">全部</div>
                        <div class="filter-btn" onclick="window.setFilter('equip', this)" style="padding: 6px 16px; background: #222; border: 1px solid #444; border-radius: 15px; cursor: pointer; font-size: 14px; color: #aaa;">裝備</div>
                        <div class="filter-btn" onclick="window.setFilter('consumable', this)" style="padding: 6px 16px; background: #222; border: 1px solid #444; border-radius: 15px; cursor: pointer; font-size: 14px; color: #aaa;">消耗品</div>
                        <div class="filter-btn" onclick="window.setFilter('material', this)" style="padding: 6px 16px; background: #222; border: 1px solid #444; border-radius: 15px; cursor: pointer; font-size: 14px; color: #aaa;">材料</div>
                    </div>
                    <div id="inventory-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); gap: 10px; align-content: start; padding-bottom: 20px;"></div>
                </div>

                <div id="skill-container" style="flex: 1; display: none; flex-direction: column; overflow-y: auto; gap: 10px; padding-bottom: 20px;"></div>
            </div>

            <!-- 彈窗：物品詳情 -->
            <div id="item-tooltip" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 2px solid #f1c40f; border-radius: 10px; padding: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 99999; width: 400px;">
                <div onclick="window.hideTooltip()" style="position: absolute; top: 10px; right: 15px; cursor: pointer; color: #aaa; font-size: 24px;">✖</div>
                <div id="tooltip-content"></div>
                <button id="btn-item-action" style="display: block; width: 100%; padding: 10px; margin-top: 15px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; color: #fff; background: #e67e22;">穿戴</button>
            </div>
        </div>
    `;

        document.body.appendChild(uiContainer);
    }

    function getFinalStatsForUI(char) {
        let baseStats = JSON.parse(JSON.stringify(char.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }));
        let gm = (window.GROWTH_MODELS || []).find(m => m.id === char.growthModel) || (window.GROWTH_MODELS || [])[0];
        let lv = char.level || 1;
        
        if (gm && lv > 1) {
            baseStats.fengRui += (gm.fengRui || 0) * (lv-1);
            baseStats.hunHou += (gm.hunHou || 0) * (lv-1);
            baseStats.lingDong += (gm.lingDong || 0) * (lv-1);
            baseStats.jianRen += (gm.jianRen || 0) * (lv-1);
            baseStats.guiMi += (gm.guiMi || 0) * (lv-1);
            baseStats.jueQing += (gm.jueQing || 0) * (lv-1);
        }
        return baseStats;
    }

    function renderCharList() {
        const box = document.getElementById('ui-char-list');
        if (!box) return;
        box.innerHTML = '';
        if (typeof CHARACTERS === 'undefined') return;
        const players = CHARACTERS.filter(c => c.side === 'player');
        
        players.forEach(p => {
            const btn = document.createElement('div');
            btn.style.cssText = "width: 55px; height: 55px; flex-shrink: 0; border-radius: 8px; background: #222; border: 2px solid #444; display: flex; justify-content: center; align-items: center; font-size: 26px; cursor: pointer; transition: all 0.2s;";
            btn.innerHTML = p.emoji || '👤';
            btn.onclick = () => selectCharacter(p);
            if (selectedChar && selectedChar.id === p.id) {
                btn.style.borderColor = '#f1c40f';
                btn.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.5)';
                btn.style.background = '#333';
            }
            box.appendChild(btn);
        });
    }

    function selectCharacter(charData) {
        selectedChar = charData;
        if (typeof Unit !== 'undefined') {
            currentUnit = new Unit(selectedChar);
        }
        renderCharList();
        refreshLeftPanel();
        refreshRightPanel();
    }

    function refreshLeftPanel() {
        if (!selectedChar) return;
        document.getElementById('ui-char-name').innerText = selectedChar.name || '未命名';
        document.getElementById('ui-char-level').innerText = `Lv. ${selectedChar.level || 1}`;

        if (currentUnit) {
            document.getElementById('ui-hp').innerText = currentUnit.maxHp || 0;
            document.getElementById('ui-atk').innerText = currentUnit.atk || 0;
            document.getElementById('ui-def').innerText = currentUnit.def || 0;
            document.getElementById('ui-spd').innerText = (currentUnit.speed || 0).toFixed(1);
        }

        const fp = selectedChar.freePoints || 0;
        document.getElementById('ui-free-points').innerText = `剩餘點數: ${fp}`;
        
        const stats = getFinalStatsForUI(selectedChar);
        const statNames = { fengRui: '鋒銳', hunHou: '渾厚', lingDong: '靈動', jianRen: '堅韌', guiMi: '詭秘', jueQing: '絕情' };
        
        let statsHtml = '';
        Object.keys(statNames).forEach(k => {
            statsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #333; padding-bottom: 4px;">
                    <div><span style="color: #888;">${statNames[k]}</span> <b style="color: #fff; margin-right: 5px;">${stats[k] || 0}</b></div>
                    <button ${fp > 0 ? '' : 'disabled'} onclick="window.allocatePoint('${k}')" style="background: #2ecc71; color: #fff; border: none; border-radius: 3px; width: 20px; height: 20px; font-weight: bold; cursor: pointer; line-height: 1;">+</button>
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
            const uid = selectedChar.equipment ? selectedChar.equipment[slot.key] : '';
            const inst = (uid && typeof INVENTORY !== 'undefined') ? INVENTORY.find(i => i.uid === uid) : null;
            const tpl = (inst && typeof ITEMS !== 'undefined') ? ITEMS[inst.itemId] : null;

            const div = document.createElement('div');
            div.style.cssText = "height: 55px; background: #1a1c29; border: 1px solid #333; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";
            
            if (inst && tpl) {
                div.innerHTML = `<div style="font-size: 22px;">${tpl.icon || '📦'}</div>`;
                div.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, tpl, true); };
            } else {
                div.innerHTML = `<span style="color: #555; font-size: 12px;">${slot.name}</span>`;
            }
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
            b.style.background = '#222'; b.style.borderColor = '#444'; b.style.color = '#aaa'; b.style.fontWeight = 'normal';
        });
        btn.style.background = '#e67e22'; btn.style.borderColor = '#e67e22'; btn.style.color = '#fff'; btn.style.fontWeight = 'bold';
        renderInventory();
    };

    function renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (typeof INVENTORY === 'undefined' || typeof ITEMS === 'undefined') return;

        const allItems = INVENTORY.filter(i => !i.equippedBy || i.equippedBy === '');
        const filteredItems = allItems.filter(inst => {
            const tpl = ITEMS[inst.itemId];
            if(!tpl) return false;
            if(currentFilter === 'all') return true;
            if(currentFilter === 'equip') return ['weapon', 'armor', 'accessory'].includes(tpl.category);
            return tpl.category === currentFilter;
        });

        for (let i = 0; i < 60; i++) {
            const slot = document.createElement('div');
            slot.style.cssText = "aspect-ratio: 1; background: #1a1c29; border: 1px solid #333; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";

            if (filteredItems[i]) {
                const inst = filteredItems[i];
                const itemTpl = ITEMS[inst.itemId];
                if (itemTpl) {
                    slot.innerHTML = `<div style="font-size: 28px;">${itemTpl.icon || '📦'}</div>`;
                    slot.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, itemTpl, false); };
                }
            } else {
                slot.innerHTML = `<div style="color:#222; font-size:12px;">空</div>`;
            }
            grid.appendChild(slot);
        }
    }

    function renderSkills() {
        const box = document.getElementById('skill-container');
        if (!box) return;
        box.innerHTML = '<div style="color:#888; text-align:center; margin-top:30px;">技能面板</div>';
    }

    window.showTooltip = function(inst, itemTpl, isEquipped) {
        const tooltip = document.getElementById('item-tooltip');
        const content = document.getElementById('tooltip-content');
        if (!tooltip || !content) return;
        
        content.innerHTML = `
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px; text-align: center; color:#f1c40f">${itemTpl.name}</div>
            <div style="font-size: 14px; color: #888; text-align: center;">${itemTpl.category}</div>
        `;
        tooltip.style.display = 'block';
    };

    window.hideTooltip = function() {
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    };

    function saveGameData() {
        if (typeof CHARACTERS !== 'undefined') localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
        if (typeof INVENTORY !== 'undefined') localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    }
})();
