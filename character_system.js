// ============================================================
// 模組：完整人物與背包系統 (character_system.js) - 放大字體與 380px 立繪版
// ============================================================
(function() {
    let selectedChar = null;
    let currentUnit = null;
    let currentTab = 'skill';
    let currentFilter = 'all';
    let globalExpTable = [];

    // 臨時加點緩存 (加點預分配機制)
    let tempAllocated = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };

    function initCharacterSystemDOM() {
        if (document.getElementById('fullscreen-ui')) return;

        const scaleContainer = document.getElementById('game-scale-container') || document.body;
        
        const uiDiv = document.createElement('div');
        uiDiv.id = 'fullscreen-ui';
        uiDiv.className = 'interactive-ui';
        uiDiv.style.cssText = "display: none; position: absolute; width: 1280px; height: 720px; background: rgba(10, 10, 15, 0.95); z-index: 9000; color: #ddd; flex-direction: row; pointer-events: auto;";
        
        uiDiv.innerHTML = `
            <div class="close-ui-btn" onclick="window.closeCharacterUI()" style="position: absolute; top: 20px; right: 30px; font-size: 36px; color: #aaa; cursor: pointer; z-index: 9999;">✖</div>

            <!-- 左側基礎面板 (寬度固定 420px) -->
            <div id="left-panel" style="width: 420px; height: 100%; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border-right: 2px solid #333; display: flex; flex-direction: column; position: relative;">
                
                <!-- 頂部銅幣顯示欄 -->
                <div id="ui-currency-bar" style="background: rgba(0,0,0,0.6); padding: 8px 15px; display: flex; justify-content: flex-end; align-items: center; gap: 15px; border-bottom: 1px solid #333; font-size: 16px; font-weight: bold; z-index: 10; flex-shrink: 0;">
                    <span style="color: #f1c40f;">🪙 銅幣: <span id="player-copper-display">0</span></span>
                </div>

                <!-- 🌟 1. 立繪區域 (調整高度為 380px) -->
                <div class="char-portrait" style="height: 380px; width: 420px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') top center/cover; position: relative; flex-shrink: 0;"></div>
                
                <!-- 左側動態內容區 (屬性與裝備槽) -->
                <div id="left-dynamic-content" style="flex: 1; padding: 10px 15px; overflow-y: auto; background: #12141c; display: flex; flex-direction: column; gap: 6px;"></div>

                <!-- 底部頭像切換列 -->
                <div class="char-list-area" id="ui-char-list" style="background: #111; padding: 10px 15px; border-top: 1px solid #333; display: flex; gap: 15px; overflow-x: auto; height: 80px; flex-shrink: 0; align-items: center;"></div>
                
                <!-- 小箭頭彈出詳細資訊按鈕 -->
                <div class="expand-btn" onclick="window.showDetailCard()" style="position: absolute; top: 45%; right: -25px; width: 25px; height: 80px; background: #2c3e50; border: 2px solid #444; border-left: none; border-radius: 0 10px 10px 0; cursor: pointer; display: flex; justify-content: center; align-items: center; color: #f1c40f; font-size: 20px; z-index: 9020; box-shadow: 4px 0 10px rgba(0,0,0,0.5);">▶</div>
            </div>

            <!-- 右側區域 -->
            <div id="right-panel" style="flex: 1; display: flex; flex-direction: column; background: rgba(20, 22, 30, 0.8); padding: 30px; overflow: hidden;">
                
                <div class="right-tabs" style="display: flex; margin-bottom: 25px; border-bottom: 1px solid #333; padding-bottom: 15px; gap: 15px; flex-shrink: 0;">
                    <div class="rt-tab active" id="rt-btn-skill" onclick="window.switchRightTab('skill')" style="flex: 1; text-align: center; padding: 15px; background: #3498db; border-radius: 8px; cursor: pointer; font-weight: bold; color: #fff; font-size: 22px;">📖 技能</div>
                    <div class="rt-tab" id="rt-btn-inv" onclick="window.switchRightTab('inv')" style="flex: 1; text-align: center; padding: 15px; background: #1a1c29; border-radius: 8px; cursor: pointer; font-weight: bold; color: #888; font-size: 22px;">🎒 背包</div>
                </div>

                <!-- 背包介面容器 -->
                <div id="inv-container" style="flex: 1; display: none; flex-direction: column; overflow: hidden;">
                    <div class="filter-bar" style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; flex-shrink: 0;">
                        <div class="filter-btn active" onclick="window.setFilter('all', this)" style="padding: 8px 20px; background: #e67e22; border: 1px solid #e67e22; border-radius: 20px; cursor: pointer; font-size: 18px; color: #fff; font-weight: bold;">全部</div>
                        <div class="filter-btn" onclick="window.setFilter('equip', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">裝備</div>
                        <div class="filter-btn" onclick="window.setFilter('consumable', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">消耗品</div>
                        <div class="filter-btn" onclick="window.setFilter('material', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">材料</div>
                        <div class="filter-btn" onclick="window.setFilter('quest', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">任務</div>
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
                <h2 style="text-align:center; color:#f1c40f; margin-bottom:15px; font-size:26px;">詳細屬性</h2>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【攻伐】</div>
                <div class="detail-grid" id="detail-atk" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【守御】</div>
                <div class="detail-grid" id="detail-def" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div class="detail-title" style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom:8px;">【克制與特殊】</div>
                <div class="detail-grid" id="detail-special" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
            </div>

            <!-- 全局確認/提示 Modal -->
            <div id="custom-confirm-modal" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #16213e; border: 3px solid #f1c40f; border-radius: 12px; padding: 30px; z-index: 9800; width: 440px; text-align: center; box-shadow: 0 15px 40px rgba(0,0,0,0.9);">
                <h3 id="confirm-title" style="color: #f1c40f; margin-bottom: 15px; font-size: 24px;">提示</h3>
                <p id="confirm-msg" style="color: #ddd; font-size: 18px; margin-bottom: 25px; line-height: 1.6;"></p>
                <div id="confirm-btn-box" style="display: flex; gap: 20px; justify-content: center;">
                    <button id="confirm-yes-btn" style="flex: 1; padding: 12px; background: #27ae60; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">是</button>
                    <button id="confirm-no-btn" onclick="window.hideConfirmDialog()" style="flex: 1; padding: 12px; background: #c0392b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">否</button>
                </div>
            </div>
        `;
        
        scaleContainer.appendChild(uiDiv);
    }

    window.showConfirmDialog = function(title, msg, onYesCallback, isAlertOnly = false) {
        const modal = document.getElementById('custom-confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-msg');
        const btnBox = document.getElementById('confirm-btn-box');
        if (!modal) return;
        
        titleEl.innerText = title;
        msgEl.innerHTML = msg;
        modal.style.display = 'block';

        if (isAlertOnly) {
            btnBox.innerHTML = `
                <button onclick="window.hideConfirmDialog()" style="width: 100%; padding: 12px; background: #e67e22; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">確定</button>
            `;
        } else {
            btnBox.innerHTML = `
                <button id="confirm-yes-btn" style="flex: 1; padding: 12px; background: #27ae60; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">是</button>
                <button id="confirm-no-btn" onclick="window.hideConfirmDialog()" style="flex: 1; padding: 12px; background: #c0392b; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 18px;">否</button>
            `;
            document.getElementById('confirm-yes-btn').onclick = () => {
                modal.style.display = 'none';
                if (onYesCallback) onYesCallback();
            };
        }
    };

    window.hideConfirmDialog = function() {
        const modal = document.getElementById('custom-confirm-modal');
        if (modal) modal.style.display = 'none';
    };

    function getFinalStatsForUI(char) {
        let baseStats = JSON.parse(JSON.stringify(char.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }));
        let gm = (window.globalData?.growthModels || []).find(m => m.id === char.growthModel) || (window.globalData?.growthModels || [])[0];
        let lv = char.level || 1;
        
        if (gm && lv > 1) {
            baseStats.fengRui += (gm.fengRui || 0) * (lv-1);
            baseStats.hunHou += (gm.hunHou || 0) * (lv-1);
            baseStats.lingDong += (gm.lingDong || 0) * (lv-1);
            baseStats.jianRen += (gm.jianRen || 0) * (lv-1);
            baseStats.guiMi += (gm.guiMi || 0) * (lv-1);
            baseStats.jueQing += (gm.jueQing || 0) * (lv-1);
        }

        if (!char.allocatedStats) char.allocatedStats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        baseStats.fengRui += (char.allocatedStats.fengRui || 0) + (tempAllocated.fengRui || 0);
        baseStats.hunHou += (char.allocatedStats.hunHou || 0) + (tempAllocated.hunHou || 0);
        baseStats.lingDong += (char.allocatedStats.lingDong || 0) + (tempAllocated.lingDong || 0);
        baseStats.jianRen += (char.allocatedStats.jianRen || 0) + (tempAllocated.jianRen || 0);
        baseStats.guiMi += (char.allocatedStats.guiMi || 0) + (tempAllocated.guiMi || 0);
        baseStats.jueQing += (char.allocatedStats.jueQing || 0) + (tempAllocated.jueQing || 0);

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
        if (char.level >= 60) return false;
        
        let maxAllowedLv = 60;
        let stage = char.breakthroughStage || 0;
        if (stage === 0) maxAllowedLv = 30;
        else if (stage === 1) maxAllowedLv = 45;
        else if (stage === 2) maxAllowedLv = 60;

        if (char.level >= maxAllowedLv) return false;

        char.exp = (char.exp || 0) + amount;
        let currentLv = char.level || 1;
        let reqExp = getExpNeeded(currentLv);
        let leveledUp = false;

        while (char.exp >= reqExp && currentLv < maxAllowedLv) {
            char.exp -= reqExp;
            currentLv++;
            char.freePoints = (char.freePoints || 0) + 3;
            reqExp = getExpNeeded(currentLv);
            leveledUp = true;
        }

        if (currentLv >= maxAllowedLv && char.exp >= reqExp) {
            char.exp = reqExp;
        }

        char.level = currentLv;
        return leveledUp;
    }

    window.handleCharacterBreakthrough = function(char) {
        let lv = char.level;
        let reqPills = 0;
        let reqCopper = 0;
        let targetStage = 0;

        if (lv === 30 && (!char.breakthroughStage || char.breakthroughStage < 1)) {
            reqPills = 50; reqCopper = 15000; targetStage = 1;
        } else if (lv === 45 && (!char.breakthroughStage || char.breakthroughStage < 2)) {
            reqPills = 1500; reqCopper = 100000; targetStage = 2;
        } else if (lv === 60 && (!char.breakthroughStage || char.breakthroughStage < 3)) {
            reqPills = 5000; reqCopper = 500000; targetStage = 3;
        } else {
            window.showConfirmDialog('提示', '當前等級無需突破！', null, true);
            return;
        }

        let pillItem = (window.INVENTORY || []).find(i => i.itemId === 'item_breakthrough_pill' && !i.equippedBy);
        let pillCount = pillItem ? (pillItem.count || 1) : 0;
        let currentCopper = window.globalData.currency?.copper || 0;

        let missingList = [];
        if (pillCount < reqPills) missingList.push(`突破丹 x${reqPills - pillCount} (需 ${reqPills}，現有 ${pillCount})`);
        if (currentCopper < reqCopper) missingList.push(`銅幣 x${reqCopper - currentCopper} (需 ${reqCopper}，現有 ${currentCopper})`);

        if (missingList.length > 0) {
            window.showConfirmDialog('突破材料不足', `<span style="color:#e74c3c;"><b>無法進行突破！缺少以下項目：</b></span><br><br>${missingList.join('<br>')}`, null, true);
            return;
        }

        window.showConfirmDialog(
            '角色突破確認',
            `確定要消耗 <span style="color:#e67e22;"><b>${reqPills}個突破丹</b></span> 及 <span style="color:#f1c40f;"><b>${reqCopper}銅幣</b></span> 進行 Lv.${lv} 突破嗎？`,
            () => {
                pillItem.count -= reqPills;
                if (pillItem.count <= 0) {
                    let idx = window.INVENTORY.indexOf(pillItem);
                    if (idx !== -1) window.INVENTORY.splice(idx, 1);
                }
                window.globalData.currency.copper -= reqCopper;

                char.breakthroughStage = targetStage;
                saveGameData();
                window.showToast(`🎉 突破成功！解鎖更高等級上限！`, '#2ecc71');
                selectCharacter(char);
            }
        );
    };

    window.upgradeCharacterSkill = function(char, skillId) {
        if (!char.skillLevels) char.skillLevels = {};
        let currentLv = char.skillLevels[skillId] || 1;

        if (currentLv >= 10) {
            window.showConfirmDialog('提示', '該技能已達到滿級 10 級！', null, true);
            return;
        }

        let reqBookId = '';
        let reqBookCount = 0;
        let needTianShu = false;

        if (currentLv >= 1 && currentLv <= 3) {
            reqBookId = 'item_skill_book_low';
            if (currentLv === 1) reqBookCount = 10;
            else if (currentLv === 2) reqBookCount = 20;
            else if (currentLv === 3) reqBookCount = 50;
        } else if (currentLv >= 4 && currentLv <= 6) {
            reqBookId = 'item_skill_book_mid';
            if (currentLv === 4) reqBookCount = 10;
            else if (currentLv === 5) reqBookCount = 30;
            else if (currentLv === 6) reqBookCount = 70;
        } else if (currentLv >= 7 && currentLv <= 9) {
            reqBookId = 'item_skill_book_high';
            if (currentLv === 7) reqBookCount = 5;
            else if (currentLv === 8) reqBookCount = 15;
            else if (currentLv === 9) {
                reqBookCount = 90;
                needTianShu = true;
            }
        }

        let bookItem = (window.INVENTORY || []).find(i => i.itemId === reqBookId && !i.equippedBy);
        let bookCount = bookItem ? (bookItem.count || 1) : 0;
        let bookName = reqBookId === 'item_skill_book_low' ? '初級秘籍' : (reqBookId === 'item_skill_book_mid' ? '中級秘籍' : '高級秘籍');

        let missingList = [];
        if (bookCount < reqBookCount) missingList.push(`${bookName} x${reqBookCount - bookCount} (需 ${reqBookCount} 本，現有 ${bookCount} 本)`);

        let tianShuItem = null;
        if (needTianShu) {
            tianShuItem = (window.INVENTORY || []).find(i => i.itemId === 'item_tian_shu' && !i.equippedBy);
            let tianShuCount = tianShuItem ? (tianShuItem.count || 1) : 0;
            if (tianShuCount < 1) missingList.push(`無字天書 x1 (缺少神書)`);
        }

        if (missingList.length > 0) {
            window.showConfirmDialog('技能升級材料不足', `<span style="color:#e74c3c;"><b>無法提升技能！缺少以下材料：</b></span><br><br>${missingList.join('<br>')}`, null, true);
            return;
        }

        let msg = `提升技能等級需消耗 <span style="color:#3498db;"><b>${reqBookCount}本${bookName}</b></span>`;
        if (needTianShu) msg += ` 及 <span style="color:#f1c40f;"><b>1本無字天書</b></span>`;
        msg += `，是否確認升級？`;

        window.showConfirmDialog('技能升級確認', msg, () => {
            bookItem.count -= reqBookCount;
            if (bookItem.count <= 0) window.INVENTORY.splice(window.INVENTORY.indexOf(bookItem), 1);

            if (needTianShu && tianShuItem) {
                tianShuItem.count -= 1;
                if (tianShuItem.count <= 0) window.INVENTORY.splice(window.INVENTORY.indexOf(tianShuItem), 1);
            }

            char.skillLevels[skillId] = currentLv + 1;
            saveGameData();
            window.showToast(`✨ 技能成功升至 Lv.${char.skillLevels[skillId]}！`, '#2ecc71');
            selectCharacter(char);
        });
    };

    window.openCharacterUI = function() {
        initCharacterSystemDOM();
        const uiContainer = document.getElementById('fullscreen-ui');
        if (uiContainer) uiContainer.style.display = 'flex';

        if (window.game && window.game.scene) {
            try {
                const activeScenes = window.game.scene.getScenes(true);
                activeScenes.forEach(s => { if(s.input) s.input.enabled = false; });
            } catch(e) {}
        }
        
        const chars = window.CHARACTERS || window.gameChars || JSON.parse(localStorage.getItem('my_game_characters') || '[]');
        if (!chars || chars.length === 0) {
            alert('找不到玩家角色數據！');
            return;
        }

        try {
            const gc = window.globalData || {};
            globalExpTable = gc.expTable || [];
        } catch(e) {}

        renderCharList();
        const players = chars.filter(c => c.side === 'player');
        if(players.length > 0) selectCharacter(players[0]);
        } else if(chars.length > 0) {
            selectCharacter(chars[0]);
        }
    };

    window.closeCharacterUI = function() {
        tempAllocated = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
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
        const chars = window.CHARACTERS || window.gameChars || [];
        const players = chars.filter(c => c.side === 'player');
        
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
        tempAllocated = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        
        let tempCharForUnit = JSON.parse(JSON.stringify(charData));
        let finalStats = getFinalStatsForUI(charData);
        tempCharForUnit.stats = finalStats;
        
        if (typeof Unit !== 'undefined') {
            currentUnit = new Unit(tempCharForUnit);
        } else {
            currentUnit = tempCharForUnit;
        }
        
        document.querySelectorAll('.char-avatar-btn').forEach(b => b.classList.remove('active'));
        const chars = window.CHARACTERS || window.gameChars || [];
        const idx = chars.filter(c=>c.side==='player').findIndex(c=>c.id === charData.id);
        const listEl = document.getElementById('ui-char-list');
        if(idx !== -1 && listEl && listEl.children[idx]) {
            listEl.children[idx].classList.add('active');
        }

        refreshLeftPanel();
        refreshRightPanel();
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

    function refreshLeftPanel() {
        const copperSpan = document.getElementById('player-copper-display');
        if (copperSpan) {
            if (!window.globalData.currency) window.globalData.currency = { copper: 50000, sycee: 100 };
            copperSpan.innerText = window.globalData.currency.copper;
        }

        const portraitEl = document.querySelector('.char-portrait');
        if (portraitEl) {
            const bgImg = selectedChar.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop';
            // 🌟 1. 將立繪高度調整為 380px
            portraitEl.style.height = '380px';
            portraitEl.style.background = `url('${bgImg}') top center/cover`;
            
            let infoOverlay = document.getElementById('portrait-info-overlay');
            if (!infoOverlay) {
                infoOverlay = document.createElement('div');
                infoOverlay.id = 'portrait-info-overlay';
                infoOverlay.style.cssText = "position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 15px; background: linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.6) 60%, transparent 100%); display: flex; flex-direction: column; gap: 4px;";
                portraitEl.appendChild(infoOverlay);
            }

            const cLv = selectedChar.level || 1;
            const cExp = selectedChar.exp || 0;
            const reqExp = getExpNeeded(cLv);
            const pct = Math.min(100, (cExp / reqExp) * 100);

            let stage = selectedChar.breakthroughStage || 0;
            let needBreakthrough = (cLv === 30 && stage < 1) || (cLv === 45 && stage < 2) || (cLv === 60 && stage < 3);
            let breakthroughBtnHtml = '';
            if (needBreakthrough) {
                let pillNeed = cLv === 30 ? 50 : (cLv === 45 ? 1500 : 5000);
                let copperNeed = cLv === 30 ? '1.5萬' : (cLv === 45 ? '10萬' : '50萬');
                breakthroughBtnHtml = `
                    <button onclick="window.handleCharacterBreakthrough(selectedChar)" style="background: linear-gradient(135deg, #e67e22, #d35400); color: #fff; border: none; border-radius: 6px; padding: 6px 12px; font-weight: bold; cursor: pointer; font-size: 14px; margin-top: 4px;">
                        🔥 進行 Lv.${cLv} 突破 (需突破丹x${pillNeed}, 銅幣${copperNeed})
                    </button>
                `;
            }

            infoOverlay.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h2 style="color: #f1c40f; font-size: 22px; margin:0; text-shadow:0 2px 4px rgba(0,0,0,0.8);">${selectedChar.name}</h2>
                    <span style="color: #2ecc71; font-weight: bold; font-size: 15px;">Lv. ${cLv} ${stage > 0 ? `(突破段位 ${stage})` : ''}</span>
                </div>
                <div>
                    <div style="font-size: 11px; color: #aaa; text-align: right; margin-bottom: 2px;">${cLv >= 60 && stage >= 3 ? '已滿級' : `${cExp} / ${reqExp}`}</div>
                    <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.5); border-radius: 3px; overflow: hidden;"><div style="width: ${pct}%; height: 100%; background: #3498db;"></div></div>
                </div>
                ${breakthroughBtnHtml}
            `;
        }

        let dynamicBox = document.getElementById('left-dynamic-content');
        if (!dynamicBox) return;

        if (currentTab === 'skill') {
            let sumTemp = Object.values(tempAllocated).reduce((a, b) => a + b, 0);
            const remainingPoints = (selectedChar.freePoints || 0) - sumTemp;
            const stats = getFinalStatsForUI(selectedChar);
            const statNames = { fengRui: '锋锐', hunHou: '浑厚', lingDong: '灵动', jianRen: '坚韧', guiMi: '诡秘', jueQing: '绝情' };
            
            let confirmBtnHtml = '';
            if (sumTemp > 0) {
                confirmBtnHtml = `
                    <button onclick="window.confirmPointAllocation()" style="background: linear-gradient(135deg, #27ae60, #2ea043); color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 13px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
                        ✅ 確認分配 (+${sumTemp})
                    </button>
                `;
            }

            // 🌟 2. 加大字體與意境加減點按鈕 (寬高由 16px 改為 26px，字體改為 15px)
            let statsHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <div style="color: #f1c40f; font-size: 15px; font-weight: bold;">剩余点数: <span style="color:${remainingPoints > 0 ? '#2ecc71' : '#fff'}">${remainingPoints}</span></div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${confirmBtnHtml}
                        <button onclick="window.resetCharacterStats()" style="background: #c0392b; color: #fff; border: none; border-radius: 5px; padding: 5px 10px; font-size: 12px; cursor: pointer; font-weight: bold;">重置意境</button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            `;
            Object.keys(statNames).forEach(k => {
                let tempAdded = tempAllocated[k] || 0;
                let tempStr = tempAdded > 0 ? `<span style="color:#2ecc71; font-size:12px; font-weight:bold;">(+${tempAdded})</span>` : '';

                statsHtml += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 8px; border: 1px solid #333;">
                        <div>
                            <span style="color: #aaa; font-size: 13px;">${statNames[k]}</span>
                            <b style="color: #fff; margin-left: 6px; font-size: 15px;">${stats[k] || 0}</b> ${tempStr}
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button ${tempAdded > 0 ? '' : 'disabled'} onclick="window.adjustTempPoint('${k}', -1)" style="background: #e74c3c; color: #fff; border: none; border-radius: 5px; width: 26px; height: 26px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 16px;">-</button>
                            <button ${remainingPoints > 0 ? '' : 'disabled'} onclick="window.adjustTempPoint('${k}', 1)" style="background: #2ecc71; color: #fff; border: none; border-radius: 5px; width: 26px; height: 26px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; font-size: 16px;">+</button>
                        </div>
                    </div>
                `;
            });
            statsHtml += `</div>`;

            let coreFourHtml = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px;">
                    <div style="background: #1a1c29; padding: 6px; border-radius: 8px; border: 1px solid #333; text-align: center;"><span style="font-size:11px; color:#888;">气血</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top: 2px;">${currentUnit.maxHp || 1000}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 8px; border: 1px solid #333; text-align: center;"><span style="font-size:11px; color:#888;">攻击</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top: 2px;">${currentUnit.atk || 100}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 8px; border: 1px solid #333; text-align: center;"><span style="font-size:11px; color:#888;">防御</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top: 2px;">${currentUnit.def || 50}</b></div>
                    <div style="background: #1a1c29; padding: 6px; border-radius: 8px; border: 1px solid #333; text-align: center;"><span style="font-size:11px; color:#888;">速度</span><b style="display: block; color: #e74c3c; font-size: 13px; margin-top: 2px;">${(currentUnit.speed || 8).toFixed(1)}</b></div>
                </div>
            `;
            dynamicBox.innerHTML = statsHtml + coreFourHtml;
        } else {
            dynamicBox.innerHTML = `
                <div style="color: #3498db; font-size: 15px; font-weight: bold; margin-bottom: 8px;">📦 角色裝備槽位</div>
                <div id="ui-equip-slots" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;"></div>
            `;
            renderEquipSlots();
        }

        document.getElementById('detail-atk').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">暴击率</span> <b style="color: #fff;">${((currentUnit.critRate || 0.05) * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">暴击伤害</span> <b style="color: #fff;">${((currentUnit.critDmg || 1.5) * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">命中率</span> <b style="color: #fff;">${((currentUnit.hitRate || 0) * 100).toFixed(1)}%</b></div>
        `;
        document.getElementById('detail-def').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">闪避率</span> <b style="color: #fff;">${((currentUnit.dodgeRate || 0) * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">韧性(抗暴)</span> <b style="color: #fff;">${((currentUnit.critResist || 0) * 100).toFixed(1)}%</b></div>
        `;
        document.getElementById('detail-special').innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">吸血</span> <b style="color: #fff;">${((currentUnit.lifesteal || 0) * 100).toFixed(1)}%</b></div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #2a2a35; padding-bottom: 5px;"><span style="color: #888;">内力恢复</span> <b style="color: #fff;">+10% / 回合</b></div>
        `;
    }

    window.adjustTempPoint = function(statKey, delta) {
        let sumTemp = Object.values(tempAllocated).reduce((a, b) => a + b, 0);
        let remaining = (selectedChar.freePoints || 0) - sumTemp;

        if (delta > 0 && remaining <= 0) return;
        if (delta < 0 && (tempAllocated[statKey] || 0) <= 0) return;

        tempAllocated[statKey] = (tempAllocated[statKey] || 0) + delta;
        refreshLeftPanel();
    };

    window.confirmPointAllocation = function() {
        let sumTemp = Object.values(tempAllocated).reduce((a, b) => a + b, 0);
        if (sumTemp <= 0) return;

        selectedChar.freePoints -= sumTemp;
        if (!selectedChar.allocatedStats) selectedChar.allocatedStats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        
        Object.keys(tempAllocated).forEach(k => {
            selectedChar.allocatedStats[k] = (selectedChar.allocatedStats[k] || 0) + (tempAllocated[k] || 0);
        });

        tempAllocated = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        saveGameData();
        selectCharacter(selectedChar);
        window.showToast('✅ 意境屬性點數分配成功！', '#2ecc71');
    };

    window.resetCharacterStats = function() {
        if (!selectedChar) return;
        if (!selectedChar.allocatedStats) return;

        let totalAllocated = 0;
        Object.keys(selectedChar.allocatedStats).forEach(k => {
            totalAllocated += (selectedChar.allocatedStats[k] || 0);
        });

        if (totalAllocated <= 0) {
            window.showConfirmDialog('提示', '當前沒有已分配的意境點數！', null, true);
            return;
        }

        window.showConfirmDialog(
            '重置意境確認',
            `確定要重置所有已分配的意境點數嗎？<br>將全額返還 <span style="color:#f1c40f;"><b>${totalAllocated} 點意境點</b></span>。`,
            () => {
                Object.keys(selectedChar.allocatedStats).forEach(k => {
                    selectedChar.allocatedStats[k] = 0;
                });
                selectedChar.freePoints = (selectedChar.freePoints || 0) + totalAllocated;
                tempAllocated = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
                saveGameData();
                selectCharacter(selectedChar);
                window.showToast('已成功重置意境加點，點數已全部返還！', '#e67e22');
            }
        );
    };

    function renderEquipSlots() {
        const container = document.getElementById('ui-equip-slots');
        if(!container) return;
        container.innerHTML = '';
        
        const slots = [
            { key: 'weapon', name: '武器' },
            { key: 'head', name: '頭部' },
            { key: 'body', name: '衣服' },
            { key: 'legs', name: '腿部' },
            { key: 'ring', name: '戒指' },
            { key: 'necklace', name: '項鏈' }
        ];
        const qColors = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
        const itemsDict = window.ITEMS || {};

        slots.forEach(slot => {
            const uid = selectedChar.equipment ? selectedChar.equipment[slot.key] : '';
            const inst = uid ? (window.INVENTORY || []).find(i => i.uid === uid) : null;
            const tpl = inst ? itemsDict[inst.itemId] : null;

            const div = document.createElement('div');
            div.className = 'equip-slot' + (inst ? '' : ' empty');
            div.style.cssText = "height: 65px; background: #1a1c29; border: 2px solid #333; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";
            
            if (inst && tpl) {
                div.innerHTML = `
                    <div class="eq-icon" style="font-size: 24px;">${tpl.icon || '📦'}</div>
                    <div class="eq-name" style="color:${qColors[inst.quality]}; font-size: 12px; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: absolute; bottom: 3px;">${tpl.name}</div>
                `;
                div.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, tpl, true); };
                div.style.borderColor = qColors[inst.quality];
            } else {
                div.innerHTML = `<span style="font-size:13px; color:#777;">${slot.name}</span>`;
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
        
        const inv = window.INVENTORY || [];
        const allItems = inv.filter(i => !i.equippedBy || i.equippedBy === '');
        const itemsDict = window.ITEMS || {};
        
        const filteredItems = allItems.filter(inst => {
            const tpl = itemsDict[inst.itemId];
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
                const itemTpl = itemsDict[inst.itemId];
                if (itemTpl) {
                    const countStr = (inst.count && inst.count > 1) ? `<div class="item-count" style="position: absolute; bottom: 4px; right: 4px; font-size: 14px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 6px;">x${inst.count}</div>` : '';
                    slot.innerHTML = `
                        <div class="item-icon" style="font-size: 32px; margin-bottom: 3px; border-bottom: 2px solid ${qColors[inst.quality] || '#fff'}">${itemTpl.icon || '📦'}</div>
                        <div class="item-name" style="color:${qColors[inst.quality] || '#fff'}; font-size: 13px; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px;">${itemTpl.name}</div>
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
        const slotNames = { normal: '普攻', skill: '招式', ultimate: '絕技', followup: '追打', learned: '學習' };
        if (!selectedChar.skillLevels) selectedChar.skillLevels = {};
        
        const skillsDict = window.SKILLS || {};
        const statusesDict = window.STATUSES || {};

        let hasSkill = false;
        for (let key in slots) {
            if (!slots[key]) continue;
            const sk = skillsDict[slots[key]];
            if (!sk) continue;
            hasSkill = true;

            let skillId = sk.id;
            let currentSkillLv = selectedChar.skillLevels[skillId] || 1;

            const div = document.createElement('div');
            div.className = 'skill-card';
            div.style.cssText = "background: #1a1c29; border: 1px solid #333; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 8px;";
            
            let desc = '';
            if (sk.multiplier > 0) desc += `造成 ${(sk.multiplier * 100).toFixed(0)}% 攻擊力傷害。 `;
            if (sk.healMultiplier > 0) desc += `恢復 ${(sk.healMultiplier * 100).toFixed(0)}% 攻擊力的生命。 `;
            if (sk.mpCost > 0) desc += `消耗內力: ${sk.mpCost}%。 `;
            if (sk.cooldown > 0) desc += `冷卻: ${sk.cooldown} 回合。 `;
            
            let effectsStr = '';
            if (sk.effects && sk.effects.length > 0) {
                sk.effects.forEach(e => {
                    if (e.type === 'status') effectsStr += `附加[${statusesDict[e.value]?.name || e.value}] `;
                });
            }

            let upgradeCostInfo = '';
            if (currentSkillLv < 10) {
                let reqText = '';
                if (currentSkillLv === 1) reqText = '10本初級秘籍';
                else if (currentSkillLv === 2) reqText = '20本初級秘籍';
                else if (currentSkillLv === 3) reqText = '50本初級秘籍';
                else if (currentSkillLv === 4) reqText = '10本中級秘籍';
                else if (currentSkillLv === 5) reqText = '30本中級秘籍';
                else if (currentSkillLv === 6) reqText = '70本中級秘籍';
                else if (currentSkillLv === 7) reqText = '5本高級秘籍';
                else if (currentSkillLv === 8) reqText = '15本高級秘籍';
                else if (currentSkillLv === 9) reqText = '90本高級秘籍 + 無字天書x1';

                upgradeCostInfo = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px dashed #333; padding-top: 8px;">
                        <span style="font-size: 13px; color: #aaa;">升級消耗: <b style="color: #f1c40f;">${reqText}</b></span>
                        <button onclick="window.upgradeCharacterSkill(selectedChar, '${skillId}')" style="background: #27ae60; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 15px;">🔼 提升技能等級</button>
                    </div>
                `;
            } else {
                upgradeCostInfo = `<div style="margin-top: 8px; border-top: 1px dashed #333; padding-top: 8px; color: #f1c40f; font-weight: bold; text-align: center;">⭐ 技能已達最高 10 級</div>`;
            }

            div.innerHTML = `
                <div class="skill-header" style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #f1c40f; font-size: 18px;">
                    <span>[${slotNames[key] || key}] ${sk.name}</span>
                    <span style="color:#2ecc71; font-size:15px; background: rgba(46,204,113,0.1); padding: 2px 8px; border-radius: 4px;">Lv. ${currentSkillLv} / 10</span>
                </div>
                <div class="skill-desc" style="font-size: 15px; color: #bbb; line-height: 1.4;">${desc}<br>${effectsStr}</div>
                ${upgradeCostInfo}
            `;
            box.appendChild(div);
        }
        
        if (!hasSkill) box.innerHTML = '<div style="color:#888; text-align:center; margin-top:50px; font-size:20px;">該角色尚未裝備技能</div>';
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
            html += `<div style="margin:20px 0; font-size:20px; color:#ccc; text-align:center;">${itemTpl.desc || '暫無描述'}</div>`;
            content.innerHTML = html;

            if (itemTpl.category === 'consumable' && itemTpl.useEffect && itemTpl.useEffect !== 'None') {
                btn.innerText = '使用';
                btn.className = 'btn-action btn-use';
                btn.style.background = '#2ecc71';
                btn.onclick = () => window.useItem(inst, itemTpl);
            } else {
                btn.innerText = '關閉';
                btn.className = 'btn-action btn-close';
                btn.style.background = '#555';
                btn.onclick = window.hideTooltip;
            }
        } else {
            let slotKey = itemTpl.equipSlot || (itemTpl.category === 'weapon' ? 'weapon' : (itemTpl.category === 'armor' ? 'body' : 'ring'));
            let equippedInst = null;
            if (selectedChar.equipment && selectedChar.equipment[slotKey]) {
                equippedInst = (window.INVENTORY || []).find(i => i.uid === selectedChar.equipment[slotKey]);
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

            if (inst.baseAtk || equippedInst?.baseAtk) html += compareStats('攻擊力', equippedInst?.baseAtk || 0, inst.baseAtk || 0);
            if (inst.baseDef || equippedInst?.baseDef) html += compareStats('防禦力', equippedInst?.baseDef || 0, inst.baseDef || 0);
            if (inst.baseHp || equippedInst?.baseHp) html += compareStats('生命值', equippedInst?.baseHp || 0, inst.baseHp || 0);

            let allExtraStats = new Set();
            if (inst.extras) inst.extras.forEach(ex => allExtraStats.add(ex.stat));
            if (equippedInst && equippedInst.extras) equippedInst.extras.forEach(ex => allExtraStats.add(ex.stat));

            if (allExtraStats.size > 0) {
                html += `<div style="border-top:1px dashed #444; margin:15px 0;"></div>`;
                const statNames = { atkPercent: '攻擊力%', defPercent: '防禦力%', hpPercent: '生命值%', critRate: '暴擊率', critDmg: '暴擊傷害', critResist: '抗暴率', hitRate: '命中率', dodgeRate: '閃避率', lifesteal: '吸血', speed: '速度', atkFlat:'攻擊力', defFlat:'防禦力', hpFlat:'生命值' };
                
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
                btn.innerText = '脫下';
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
                btn.innerText = equippedInst ? '替換' : '穿戴';
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
        window.showConfirmDialog(
            '使用道具確認',
            `確定要使用 <span style="color:#f1c40f;"><b>${itemTpl.name}</b></span> 嗎？`,
            () => {
                let leveledUp = false;
                
                if (itemTpl.useEffect === 'AddExp') {
                    leveledUp = addCharacterExp(selectedChar, itemTpl.useValue || 0);
                    window.showToast(`獲得 ${itemTpl.useValue} 點經驗！`, '#3498db');
                } 
                else if (itemTpl.useEffect === 'AddStat') {
                    if (!selectedChar.stats) selectedChar.stats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
                    const key = itemTpl.useStatKey;
                    if (key) {
                        selectedChar.stats[key] = (selectedChar.stats[key] || 0) + (itemTpl.useValue || 1);
                        const statName = {fengRui:'鋒銳', hunHou:'渾厚', lingDong:'靈動', jianRen:'堅韌', guiMi:'詭秘', jueQing:'絕情'}[key] || key;
                        window.showToast(`${statName} 永久 +${itemTpl.useValue || 1}`, '#f1c40f');
                    }
                }

                const inv = window.INVENTORY || [];
                if (inst.count && inst.count > 1) {
                    inst.count -= 1;
                } else {
                    const idx = inv.findIndex(i => i.uid === inst.uid);
                    if (idx !== -1) inv.splice(idx, 1);
                }

                saveGameData();
                window.hideTooltip();
                selectCharacter(selectedChar);
                
                if(leveledUp) {
                    setTimeout(() => window.showToast(`LEVEL UP! 升級到 Lv.${selectedChar.level}，獲得 3 點意境點！`, '#f1c40f'), 1000);
                }
            }
        );
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
        localStorage.setItem('my_game_characters', JSON.stringify(window.CHARACTERS || window.gameChars));
        localStorage.setItem('my_game_inventory_sync', JSON.stringify(window.INVENTORY || []));
    }
})();
