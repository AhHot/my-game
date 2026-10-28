// ============================================================
// 模組：完整人物與背包系統 (character_system.js)
// 完整支援：立繪 top center 置頂對齊、精準重置手動加點邏輯
// ============================================================
(function() {
    let selectedChar = null;
    let currentUnit = null;
    let currentTab = 'skill';
    let currentFilter = 'all';
    let globalExpTable = [];

    function initCharacterSystemDOM() {
        if (document.getElementById('fullscreen-ui')) return;

        const scaleContainer = document.getElementById('game-scale-container') || document.body;
        
        const uiDiv = document.createElement('div');
        uiDiv.id = 'fullscreen-ui';
        uiDiv.className = 'interactive-ui';
        uiDiv.style.cssText = "display: none; position: absolute; width: 1280px; height: 720px; background: rgba(10, 10, 15, 0.95); z-index: 9000; color: #ddd; flex-direction: row; pointer-events: auto;";
        
        uiDiv.innerHTML = `
            <div class="close-ui-btn" onclick="window.closeCharacterUI()" style="position: absolute; top: 30px; right: 40px; font-size: 40px; color: #aaa; cursor: pointer; z-index: 9999;">✖</div>

            <!-- 左侧基础面板 (宽度固定 420px) -->
            <div id="left-panel" style="width: 420px; height: 100%; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border-right: 2px solid #333; display: flex; flex-direction: column; position: relative;">
                
                <!-- 🌟 立繪高度 380px，對齊改為 top center（上方貼邊、左右置中） -->
                <div class="char-portrait" style="height: 380px; width: 420px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') top center/cover; position: relative; flex-shrink: 0;"></div>
                
                <!-- 底部头像切换列 -->
                <div class="char-list-area" id="ui-char-list" style="background: #111; padding: 10px 15px; border-top: 1px solid #333; display: flex; gap: 15px; overflow-x: auto; height: 85px; flex-shrink: 0; align-items: center;"></div>
                
                <!-- 小箭头弹出详细信息按鈕保持不变 -->
                <div class="expand-btn" onclick="window.showDetailCard()" style="position: absolute; top: 40%; right: -25px; width: 25px; height: 80px; background: #2c3e50; border: 2px solid #444; border-left: none; border-radius: 0 10px 10px 0; cursor: pointer; display: flex; justify-content: center; align-items: center; color: #f1c40f; font-size: 20px; z-index: 9020;">▶</div>
            </div>

            <!-- 右侧区域 -->
            <div id="right-panel" style="flex: 1; display: flex; flex-direction: column; background: rgba(20, 22, 30, 0.8); padding: 30px;">
                
                <!-- Tab 顺序 -->
                <div class="right-tabs" style="display: flex; margin-bottom: 25px; border-bottom: 1px solid #333; padding-bottom: 15px; gap: 15px;">
                    <div class="rt-tab active" id="rt-btn-skill" onclick="window.switchRightTab('skill')" style="flex: 1; text-align: center; padding: 15px; background: #3498db; border-radius: 8px; cursor: pointer; font-weight: bold; color: #fff; font-size: 22px;">📖 技能</div>
                    <div class="rt-tab" id="rt-btn-inv" onclick="window.switchRightTab('inv')" style="flex: 1; text-align: center; padding: 15px; background: #1a1c29; border-radius: 8px; cursor: pointer; font-weight: bold; color: #888; font-size: 22px;">🎒 背包</div>
                </div>

                <!-- 背包介面容器 -->
                <div id="inv-container" style="flex: 1; display: none; flex-direction: column; overflow: hidden;">
                    <div class="filter-bar" style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div class="filter-btn active" onclick="window.setFilter('all', this)" style="padding: 8px 20px; background: #e67e22; border: 1px solid #e67e22; border-radius: 20px; cursor: pointer; font-size: 18px; color: #fff; font-weight: bold;">全部</div>
                        <div class="filter-btn" onclick="window.setFilter('equip', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">装备</div>
                        <div class="filter-btn" onclick="window.setFilter('consumable', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">消耗品</div>
                        <div class="filter-btn" onclick="window.setFilter('material', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">材料</div>
                        <div class="filter-btn" onclick="window.setFilter('quest', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">任务</div>
                    </div>
                    <div id="inventory-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 15px; align-content: start; padding-bottom: 20px;"></div>
                </div>

                <!-- 技能介面容器 -->
                <div id="skill-container" style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; gap: 15px; padding-bottom: 20px;"></div>
            </div>

            <!-- 彈窗：物品詳情 -->
            <div id="item-tooltip" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 3px solid #f1c40f; border-radius: 12px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 9600; width: 500px; max-height: 85vh; overflow-y: auto;">
                <div class="card-close" onclick="window.hideTooltip()" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #aaa; font-size: 28px;">✖</div>
                <div id="tooltip-content"></div>
                <button class="btn-action btn-equip" id="btn-item-action" style="display: block; width: 100%; padding: 15px; margin-top: 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 22px; color: #fff; background: #e67e22;">穿戴</button>
            </div>

            <!-- 彈窗：詳細屬性 -->
            <div id="detail-card" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 3px solid #f1c40f; border-radius: 12px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 9600; width: 500px; max-height: 85vh; overflow-y: auto;">
                <div class="card-close" onclick="window.hideDetailCard()" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #aaa; font-size: 28px;">✖</div>
                <h2 style="text-align:center; color:#f1c40f; margin-bottom:15px; font-size:26px;">详细属性</h2>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【攻伐】</div>
                <div class="detail-grid" id="detail-atk" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【守御】</div>
                <div class="detail-grid" id="detail-def" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【克制与特殊】</div>
                <div class="detail-grid" id="detail-special" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
            </div>
        `;
        
        scaleContainer.appendChild(uiDiv);
    }

    function getFinalStatsForUI(char) {
        let baseStats = JSON.parse(JSON.stringify(char.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }));
        let gm = (window.GROWTH_MODELS || []).find(m => m.id === char.growthModel) || (window.GROWTH_MODELS || [])[0];
        let lv = char.level || 1;
        
        // 1. 加上成長模型隨等級增加的數值
        if (gm && lv > 1) {
            baseStats.fengRui += (gm.fengRui || 0) * (lv-1);
            baseStats.hunHou += (gm.hunHou || 0) * (lv-1);
            baseStats.lingDong += (gm.lingDong || 0) * (lv-1);
            baseStats.jianRen += (gm.jianRen || 0) * (lv-1);
            baseStats.guiMi += (gm.guiMi || 0) * (lv-1);
            baseStats.jueQing += (gm.jueQing || 0) * (lv-1);
        }

        // 2. 🌟 加上玩家手動自由加點的數值 (allocatedStats)
        if (!char.allocatedStats) char.allocatedStats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        baseStats.fengRui += char.allocatedStats.fengRui || 0;
        baseStats.hunHou += char.allocatedStats.hunHou || 0;
        baseStats.lingDong += char.allocatedStats.lingDong || 0;
        baseStats.jianRen += char.allocatedStats.jianRen || 0;
        baseStats.guiMi += char.allocatedStats.guiMi || 0;
        baseStats.jueQing += char.allocatedStats.jueQing || 0;

        return {
            fengRui: Math.floor(baseStats.fengRui),
            hunHou: Math.floor(baseStats.hunHou),
            lingDong: Math.floor(baseStats.lingDong),
            jianRen: Math.floor(baseStats.jianRen),
            guiMi: Math.floor(baseStats.guiMi),
            jueQing: Math.floor(baseStats.jueQing)
        };
    }

    function getExpNeeded(level) {
        if(level >= 60) return 9999999;
        return globalExpTable[level - 1] || 100;
    }

    function addCharacterExp(char, amount) {
        if (char.level >= 60) return;
        char.exp = (char.exp || 0) + amount;
        let currentLv = char.level || 1;
        let reqExp = getExpNeeded(currentLv);
        let leveledUp = false;
        while (char.exp >= reqExp && currentLv < 60) {
            char.exp -= reqExp;
            currentLv++;
            char.freePoints = (char.freePoints || 0) + 3;
            reqExp = getExpNeeded(currentLv);
            leveledUp = true;
        }
        char.level = currentLv;
        return leveledUp;
    }

    window.openCharacterUI = function() {
        initCharacterSystemDOM();
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) uiContainer.style.display = 'flex';

        if (window.game && window.game.scene) {
            const activeScenes = window.game.scene.getScenes(true);
            activeScenes.forEach(s => { if(s.input) s.input.enabled = false; });
        }
        
        if (typeof CHARACTERS === 'undefined') return;

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
        window.hideTooltip();
        window.hideDetailCard();
        if (window.game && window.game.scene) {
            const activeScenes = window.game.scene.getScenes(true);
            activeScenes.forEach(s => { if(s.input) s.input.enabled = true; });
        }
    };

    function renderCharList() {
        const box = document.getElementById('ui-char-list');
        if(!box) return;
        box.innerHTML = '';
        const players = CHARACTERS.filter(c => c.side === 'player');
        
        players.forEach(p => {
            const btn = document.createElement('div');
            btn.className = 'char-avatar-btn';
            btn.style.cssText = "width: 65px; height: 65px; flex-shrink: 0; border-radius: 10px; background: #222; border: 2px solid #444; display: flex; justify-content: center; align-items: center; font-size: 32px; cursor: pointer; transition: all 0.2s; overflow: hidden;";
            
            if (p.avatarUrl) {
                btn.style.background = `url('${p.avatarUrl}') center/cover`;
                btn.innerHTML = '';
            } else {
                btn.innerHTML = p.emoji || '👤';
            }

            btn.onclick = () => selectCharacter(p);
            if (selectedChar && selectedChar.id === p.id) btn.classList.add('active');
            box.appendChild(btn);
        });
    }

    function selectCharacter(charData) {
        selectedChar = charData;
        currentUnit = new Unit(selectedChar); 
        
        document.querySelectorAll('.char-avatar-btn').forEach(b => b.classList.remove('active'));
        const idx = CHARACTERS.filter(c=>c.side==='player').findIndex(c=>c.id === charData.id);
        const listEl = document.getElementById('ui-char-list');
        if(idx !== -1 && listEl && listEl.children[idx]) {
            listEl.children[idx].classList.add('active');
        }

        refreshLeftPanel();
        refreshRightPanel();
    }

    function refreshLeftPanel() {
        // 1. 動態更新大立繪背景：設定高度 380px，對齊改為 top center（上方貼邊、左右置中）
        const portraitEl = document.querySelector('.char-portrait');
        if (portraitEl) {
            const bgImg = selectedChar.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop';
            portraitEl.style.height = '380px';
            portraitEl.style.background = `url('${bgImg}') top center/cover`;
            
            let infoOverlay = document.getElementById('portrait-info-overlay');
            if (!infoOverlay) {
                infoOverlay = document.createElement('div');
                infoOverlay.id = 'portrait-info-overlay';
                infoOverlay.style.cssText = "position: absolute; bottom: 0; left: 0; right: 0; padding: 15px 20px; background: linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.6) 60%, transparent 100%); display: flex; flex-direction: column; gap: 6px;";
                portraitEl.appendChild(infoOverlay);
            }

            const cLv = selectedChar.level || 1;
            const cExp = selectedChar.exp || 0;
            const reqExp = getExpNeeded(cLv);
            const pct = Math.min(100, (cExp / reqExp) * 100);

            infoOverlay.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h2 style="color: #f1c40f; font-size: 24px; margin:0; text-shadow:0 2px 4px rgba(0,0,0,0.8);">${selectedChar.name}</h2>
                    <span style="color: #2ecc71; font-weight: bold; font-size: 16px;">Lv. ${cLv}</span>
                </div>
                <div>
                    <div style="font-size: 10px; color: #aaa; text-align: right; margin-bottom: 2px;">${cLv >= 60 ? '已满级' : `${cExp} / ${reqExp}`}</div>
                    <div style="width: 100%; height: 5px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden;"><div style="width: ${pct}%; height: 100%; background: #3498db;"></div></div>
                </div>
            `;
        }

        // 2. 動態控制容器
        let dynamicBox = document.getElementById('left-dynamic-content');
        if (!dynamicBox) {
            dynamicBox = document.createElement('div');
            dynamicBox.id = 'left-dynamic-content';
            dynamicBox.style.cssText = "flex: 1; padding: 12px 15px; overflow-y: auto; background: #12141c; display: flex; flex-direction: column; gap: 10px;";
            const leftPanel = document.getElementById('left-panel');
            const charListArea = document.getElementById('ui-char-list');
            leftPanel.insertBefore(dynamicBox, charListArea);
        }

        // 3. 根據右側 Tab 動態切換左側內容
        if (currentTab === 'skill') {
            const fp = selectedChar.freePoints || 0;
            const stats = getFinalStatsForUI(selectedChar);
            const statNames = { fengRui: '锋锐', hunHou: '浑厚', lingDong: '灵动', jianRen: '坚韧', guiMi: '诡秘', jueQing: '绝情' };
            
            let statsHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="color: #f1c40f; font-size: 13px; font-weight: bold;">剩余点数: ${fp}</div>
                    <button onclick="window.resetCharacterStats()" style="background: #c0392b; color: #fff; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-weight: bold;">重置意境</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            `;
            Object.keys(statNames).forEach(k => {
                statsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 5px 8px; border-radius: 6px; border: 1px solid #333;">
                        <div><span style="color: #888; font-size: 12px;">${statNames[k]}</span><b style="color: #fff; margin-left: 4px; font-size: 13px;">${stats[k] || 0}</b></div>
                        <button ${fp > 0 ? '' : 'disabled'} onclick="window.allocatePoint('${k}')" style="background: #2ecc71; color: #fff; border: none; border-radius: 4px; width: 20px; height: 20px; font-weight: bold; cursor: pointer; line-height: 1; font-size: 12px;">+</button>
                    </div>
                `;
            });
            statsHtml += `</div>`;

            let coreFourHtml = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 2px;">
                    <div style="background: #1a1c29; padding: 6px; border-radius: 6px; border: 1px solid #333; text-align: center;"><span style="font-size:10px; color:#888;">气血</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top:2px;">${currentUnit.maxHp}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 6px; border: 1px solid #333; text-align: center;"><span style="font-size:10px; color:#888;">攻击</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top:2px;">${currentUnit.atk}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 6px; border: 1px solid #333; text-align: center;"><span style="font-size:10px; color:#888;">防御</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top:2px;">${currentUnit.def}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 6px; border: 1px solid #333; text-align: center;"><span style="font-size:10px; color:#888;">速度</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top:2px;">${currentUnit.speed.toFixed(1)}</b></div>
                </div>
            `;

            dynamicBox.innerHTML = statsHtml + coreFourHtml;

        } else {
            dynamicBox.innerHTML = `<div style="color: #3498db; font-size: 13px; font-weight: bold; margin-bottom: 2px;">📦 装备槽位</div><div id="ui-equip-slots" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;"></div>`;
            renderEquipSlots();
        }

        // 4. 更新詳細屬性大卡片數據
        document.getElementById('detail-atk').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">暴击率</span> <b style="color: #fff;">${(currentUnit.critRate * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">暴击伤害</span> <b style="color: #fff;">${(currentUnit.critDmg * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">命中率</span> <b style="color: #fff;">${(currentUnit.hitRate * 100).toFixed(1)}%</b></div>
        `;
        document.getElementById('detail-def').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">闪避率</span> <b style="color: #fff;">${(currentUnit.dodgeRate * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">韧性(抗暴)</span> <b style="color: #fff;">${(currentUnit.critResist * 100).toFixed(1)}%</b></div>
        `;
        document.getElementById('detail-special').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">吸血</span> <b style="color: #fff;">${(currentUnit.lifesteal * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">内力恢复</span> <b style="color: #fff;">+10% / 回合</b></div>
        `;
    }

    window.allocatePoint = function(statKey) {
        if (!selectedChar.freePoints || selectedChar.freePoints <= 0) return;
        
        selectedChar.freePoints--;
        
        // 🌟 記錄到專門的手動分配欄位中
        if (!selectedChar.allocatedStats) selectedChar.allocatedStats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        selectedChar.allocatedStats[statKey] = (selectedChar.allocatedStats[statKey] || 0) + 1;
        
        saveGameData();
        selectCharacter(selectedChar);
    };

    // 🌟 核心修正：只重置手動加點（allocatedStats），保留初始底子與等級成長數值
    window.resetCharacterStats = function() {
        if (!selectedChar) return;
        if (!selectedChar.allocatedStats) return;

        let totalAllocated = 0;
        Object.keys(selectedChar.allocatedStats).forEach(k => {
            totalAllocated += (selectedChar.allocatedStats[k] || 0);
            selectedChar.allocatedStats[k] = 0;
        });

        if (totalAllocated > 0) {
            selectedChar.freePoints = (selectedChar.freePoints || 0) + totalAllocated;
            saveGameData();
            selectCharacter(selectedChar);
            window.showToast('已成功重置意境加点，点数已全部返还！', '#e67e22');
        } else {
            window.showToast('当前没有手动分配的意境点数', '#888');
        }
    };

    function renderEquipSlots() {
        const container = document.getElementById('ui-equip-slots');
        if(!container) return;
        container.innerHTML = '';
        
        const slots = [
            { key: 'weapon', name: '武器' },
            { key: 'head', name: '头部' },
            { key: 'body', name: '衣服' },
            { key: 'legs', name: '腿部' },
            { key: 'ring', name: '戒指' },
            { key: 'necklace', name: '项链' }
        ];
        const qColors = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };

        slots.forEach(slot => {
            const uid = selectedChar.equipment ? selectedChar.equipment[slot.key] : '';
            const inst = uid ? INVENTORY.find(i => i.uid === uid) : null;
            const tpl = inst ? ITEMS[inst.itemId] : null;

            const div = document.createElement('div');
            div.className = 'equip-slot' + (inst ? '' : ' empty');
            div.style.cssText = "height: 50px; background: #1a1c29; border: 2px solid #333; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";
            
            if (inst && tpl) {
                div.innerHTML = `
                    <div class="eq-icon" style="font-size: 20px;">${tpl.icon || '📦'}</div>
                    <div class="eq-name" style="color:${qColors[inst.quality]}; font-size: 10px; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: absolute; bottom: 2px;">${tpl.name}</div>
                `;
                div.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, tpl, true); };
                div.style.borderColor = qColors[inst.quality];
            } else {
                div.innerHTML = `<span style="font-size:11px; color:#777;">${slot.name}</span>`;
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
        document.getElementById('rt-btn-inv').classList.remove('active');
        document.getElementById('rt-btn-skill').classList.remove('active');
        document.getElementById('rt-btn-inv').style.background = '#1a1c29';
        document.getElementById('rt-btn-inv').style.color = '#888';
        document.getElementById('rt-btn-skill').style.background = '#1a1c29';
        document.getElementById('rt-btn-skill').style.color = '#888';

        if(tab === 'inv') {
            document.getElementById('rt-btn-inv').classList.add('active');
            document.getElementById('rt-btn-inv').style.background = '#3498db';
            document.getElementById('rt-btn-inv').style.color = '#fff';
        } else {
            document.getElementById('rt-btn-skill').classList.add('active');
            document.getElementById('rt-btn-skill').style.background = '#3498db';
            document.getElementById('rt-btn-skill').style.color = '#fff';
        }
        
        refreshLeftPanel();
        refreshRightPanel();
    };

    window.setFilter = function(type, btn) {
        currentFilter = type;
        document.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = '#222';
            b.style.borderColor = '#444';
            b.style.color = '#aaa';
            b.style.fontWeight = 'normal';
        });
        btn.classList.add('active');
        btn.style.background = '#e67e22';
        btn.style.borderColor = '#e67e22';
        btn.style.color = '#fff';
        btn.style.fontWeight = 'bold';
        renderInventory();
    };

    function renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const allItems = INVENTORY.filter(i => !i.equippedBy || i.equippedBy === '');
        
        const filteredItems = allItems.filter(inst => {
            const tpl = ITEMS[inst.itemId];
            if(!tpl) return false;
            if(currentFilter === 'all') return true;
            if(currentFilter === 'equip') return ['weapon', 'armor', 'accessory'].includes(tpl.category);
            return tpl.category === currentFilter;
        });

        const qColors = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };

        for (let i = 0; i < 200; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.style.cssText = "aspect-ratio: 1; background: #1a1c29; border: 2px solid #333; border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative; transition: border-color 0.2s;";

            if (filteredItems[i]) {
                const inst = filteredItems[i];
                const itemTpl = ITEMS[inst.itemId];
                if (itemTpl) {
                    const countStr = (inst.count && inst.count > 1) ? `<div class="item-count" style="position: absolute; bottom: 4px; right: 4px; font-size: 14px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 6px;">x${inst.count}</div>` : '';
                    slot.innerHTML = `
                        <div class="item-icon" style="font-size: 36px; margin-bottom: 5px; border-bottom: 2px solid ${qColors[inst.quality] || '#fff'}">${itemTpl.icon || '📦'}</div>
                        <div class="item-name" style="color:${qColors[inst.quality] || '#fff'}; font-size: 14px; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${itemTpl.name}</div>
                        ${countStr}
                    `;
                    slot.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, itemTpl, false); };
                }
            } else {
                slot.innerHTML = `<div style="color:#222; font-size:16px;">空</div>`;
            }
            grid.appendChild(slot);
        }
    }

    function renderSkills() {
        const box = document.getElementById('skill-container');
        if(!box) return;
        box.innerHTML = '';
        
        const slots = selectedChar.skillSlots || {};
        const slotNames = { normal: '普攻', skill: '招式', ultimate: '绝技', followup: '追打', learned: '学习' };
        
        let hasSkill = false;
        for (let key in slots) {
            if (!slots[key]) continue;
            const sk = SKILLS[slots[key]];
            if (!sk) continue;
            hasSkill = true;

            const div = document.createElement('div');
            div.className = 'skill-card';
            div.style.cssText = "background: #1a1c29; border: 1px solid #333; border-radius: 10px; padding: 20px;";
            
            let desc = '';
            if (sk.multiplier > 0) desc += `造成 ${(sk.multiplier * 100).toFixed(0)}% 攻击力伤害。 `;
            if (sk.healMultiplier > 0) desc += `恢复 ${(sk.healMultiplier * 100).toFixed(0)}% 攻击力的生命。 `;
            if (sk.mpCost > 0) desc += `消耗内力: ${sk.mpCost}%。 `;
            if (sk.cooldown > 0) desc += `冷却: ${sk.cooldown} 回合。 `;
            
            let effectsStr = '';
            if (sk.effects && sk.effects.length > 0) {
                sk.effects.forEach(e => {
                    if (e.type === 'status') effectsStr += `附加[${STATUSES[e.value]?.name || e.value}] `;
                });
            }

            div.innerHTML = `
                <div class="skill-header" style="display: flex; justify-content: space-between; font-weight: bold; color: #f1c40f; margin-bottom: 10px; font-size: 22px;">
                    <span>[${slotNames[key] || key}] ${sk.name}</span>
                    <span style="color:#888; font-size:18px;">${sk.element ? sk.element : ''}</span>
                </div>
                <div class="skill-desc" style="font-size: 18px; color: #bbb; line-height: 1.6;">${desc}<br>${effectsStr}</div>
            `;
            box.appendChild(div);
        }
        
        if (!hasSkill) box.innerHTML = '<div style="color:#888; text-align:center; margin-top:50px; font-size:20px;">该角色尚未装备技能</div>';
    }

    window.showTooltip = function(inst, itemTpl, isEquipped) {
        const tooltip = document.getElementById('item-tooltip');
        const content = document.getElementById('tooltip-content');
        const btn = document.getElementById('btn-item-action');
        
        let html = `
            <div class="tt-title" style="font-size: 26px; font-weight: bold; margin-bottom: 8px; text-align: center; color:${getQualityColor(inst.quality)}">${itemTpl.name}</div>
            <div class="tt-sub" style="font-size: 18px; color: #888; text-align: center; margin-bottom: 20px;">${itemTpl.category}</div>
        `;

        if (!['weapon', 'armor', 'accessory'].includes(itemTpl.category)) {
            html += `<div style="margin:20px 0; font-size:20px; color:#ccc; text-align:center;">${itemTpl.desc || '暂无描述'}</div>`;
            content.innerHTML = html;

            if (itemTpl.category === 'consumable' && itemTpl.useEffect && itemTpl.useEffect !== 'None') {
                btn.innerText = '使用';
                btn.className = 'btn-action btn-use';
                btn.style.background = '#2ecc71';
                btn.onclick = () => window.useItem(inst, itemTpl);
            } else {
                btn.innerText = '关闭';
                btn.className = 'btn-action btn-close';
                btn.style.background = '#555';
                btn.onclick = window.hideTooltip;
            }
        } else {
            let slotKey = itemTpl.equipSlot || (itemTpl.category === 'weapon' ? 'weapon' : (itemTpl.category === 'armor' ? 'body' : 'ring'));
            let equippedInst = null;
            if (selectedChar.equipment && selectedChar.equipment[slotKey]) {
                equippedInst = INVENTORY.find(i => i.uid === selectedChar.equipment[slotKey]);
            }

            html += `<div class="tt-stats" style="font-size: 20px; margin-top: 15px;">`;
            const compareStats = (statName, currentVal, newVal, isPercent = false) => {
                let diff = newVal - currentVal;
                if (inst.uid === equippedInst?.uid) diff = 0;
                
                let diffStr = '';
                if (diff > 0) diffStr = ` <span class="tt-diff-up" style="color: #2ecc71; font-weight: bold;">(▲ +${isPercent ? (diff*100).toFixed(1)+'%' : diff})</span>`;
                else if (diff < 0) diffStr = ` <span class="tt-diff-down" style="color: #e74c3c; font-weight: bold;">(▼ ${isPercent ? (diff*100).toFixed(1)+'%' : diff})</span>`;
                
                let newValStr = isPercent ? (newVal*100).toFixed(1)+'%' : newVal;
                return `<div class="tt-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span style="color: #888;">${statName}</span> <span class="tt-base" style="color: #fff;">${newValStr}${diffStr}</span></div>`;
            };

            if (inst.baseAtk || equippedInst?.baseAtk) html += compareStats('攻击力', equippedInst?.baseAtk || 0, inst.baseAtk || 0);
            if (inst.baseDef || equippedInst?.baseDef) html += compareStats('防御力', equippedInst?.baseDef || 0, inst.baseDef || 0);
            if (inst.baseHp || equippedInst?.baseHp) html += compareStats('生命值', equippedInst?.baseHp || 0, inst.baseHp || 0);

            let allExtraStats = new Set();
            if (inst.extras) inst.extras.forEach(ex => allExtraStats.add(ex.stat));
            if (equippedInst && equippedInst.extras) equippedInst.extras.forEach(ex => allExtraStats.add(ex.stat));

            if (allExtraStats.size > 0) {
                html += `<div style="border-top:1px dashed #444; margin:15px 0;"></div>`;
                const statNames = { atkPercent: '攻击力%', defPercent: '防御力%', hpPercent: '生命值%', critRate: '暴击率', critDmg: '暴击伤害', critResist: '抗暴率', hitRate: '命中率', dodgeRate: '闪避率', lifesteal: '吸血', speed: '速度', atkFlat:'攻击力', defFlat:'防御力', hpFlat:'生命值' };
                
                allExtraStats.forEach(stat => {
                    let newVal = inst.extras ? (inst.extras.find(e => e.stat === stat)?.value || 0) : 0;
                    let oldVal = equippedInst?.extras ? (equippedInst.extras.find(e => e.stat === stat)?.value || 0) : 0;
                    let isPct = stat.includes('Percent') || ['critRate','critDmg','critResist','hitRate','dodgeRate','lifesteal'].includes(stat);
                    html += compareStats(statNames[stat] || stat, oldVal, newVal, isPct);
                });
            }
            html += `</div>`;
            content.innerHTML = html;

            if (isEquipped) {
                btn.innerText = '脱下';
                btn.className = 'btn-action btn-unequip';
                btn.style.background = '#e74c3c';
                btn.onclick = () => {
                    inst.equippedBy = '';
                    selectedChar.equipment[slotKey] = '';
                    saveGameData();
                    window.hideTooltip();
                    selectCharacter(selectedChar);
                };
            } else {
                btn.innerText = equippedInst ? '替换' : '穿戴';
                btn.className = 'btn-action btn-equip';
                btn.style.background = '#e67e22';
                btn.onclick = () => {
                    if (equippedInst) equippedInst.equippedBy = ''; 
                    inst.equippedBy = selectedChar.id;
                    if(!selectedChar.equipment) selectedChar.equipment = {};
                    selectedChar.equipment[slotKey] = inst.uid;

                    saveGameData();
                    window.hideTooltip();
                    selectCharacter(selectedChar);
                };
            }
        }
        tooltip.style.display = 'block';
    };

    window.useItem = function(inst, itemTpl) {
        let leveledUp = false;
        
        if (itemTpl.useEffect === 'AddExp') {
            leveledUp = addCharacterExp(selectedChar, itemTpl.useValue || 0);
            window.showToast(`获得 ${itemTpl.useValue} 点经验！`, '#3498db');
        } 
        else if (itemTpl.useEffect === 'AddStat') {
            if (!selectedChar.stats) selectedChar.stats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
            const key = itemTpl.useStatKey;
            if (key) {
                selectedChar.stats[key] = (selectedChar.stats[key] || 0) + (itemTpl.useValue || 1);
                const statName = {fengRui:'锋锐', hunHou:'浑厚', lingDong:'灵动', jianRen:'坚韧', guiMi:'诡秘', jueQing:'绝情'}[key] || key;
                window.showToast(`${statName} 永久 +${itemTpl.useValue || 1}`, '#f1c40f');
            }
        }
        else if (itemTpl.useEffect === 'PackageEquip' || itemTpl.useEffect === 'RandomEquip') {
            alert('该道具功能暂未开放');
            return; 
        }

        if (inst.count && inst.count > 1) {
            inst.count -= 1;
        } else {
            const idx = INVENTORY.findIndex(i => i.uid === inst.uid);
            if (idx !== -1) INVENTORY.splice(idx, 1);
        }

        saveGameData();
        window.hideTooltip();
        selectCharacter(selectedChar);
        
        if(leveledUp) {
            setTimeout(() => window.showToast(`LEVEL UP! 升级到 Lv.${selectedChar.level}，获得 3 点意境点！`, '#f1c40f'), 1000);
        }
    };

    window.hideTooltip = function() {
        const tt = document.getElementById('item-tooltip');
        if(tt) tt.style.display = 'none';
    };

    window.showDetailCard = function() {
        const dc = document.getElementById('detail-card');
        if(dc) dc.style.display = 'block';
    };

    window.hideDetailCard = function() {
        const dc = document.getElementById('detail-card');
        if(dc) dc.style.display = 'none';
    };

    function getQualityColor(q) {
        const qc = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
        return qc[q] || '#fff';
    }

    window.showToast = function(msg, color = '#2ecc71') {
        const toast = document.getElementById('global-toast');
        if(!toast) return;
        toast.innerText = msg;
        toast.style.background = color;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    };

    function saveGameData() {
        localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
        localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    }
})();
