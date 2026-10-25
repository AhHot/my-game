// character_system.js - 獨立的人物養成、背包與裝備管理系統 (強固防禦版)
(function() {
    let selectedChar = null;
    let currentUnit = null;
    let currentTab = 'inv';
    let currentFilter = 'all';
    let globalExpTable = [];

    function initCharacterSystemDOM() {
        if (document.getElementById('fullscreen-ui')) return;

        const uiContainer = document.createElement('div');
        uiContainer.id = 'fullscreen-ui';
        uiContainer.className = 'interactive-ui';
        uiContainer.style.cssText = "display: none; position: absolute; inset: 0; width: 1280px; height: 720px; background: rgba(10, 10, 15, 0.98); z-index: 99999; color: #ddd; flex-direction: row; pointer-events: auto;";
        uiContainer.onclick = (e) => e.stopPropagation();

        uiContainer.innerHTML = `
            <div class="close-ui-btn" onclick="window.closeCharacterUI()" style="position: absolute; top: 30px; right: 40px; font-size: 40px; color: #aaa; cursor: pointer; z-index: 99999;">✖</div>

            <!-- 左侧面板 -->
            <div style="width: 420px; height: 100%; background: linear-gradient(135deg, #1a1c29 0%, #0f0f15 100%); border-right: 2px solid #333; display: flex; flex-direction: column; position: relative;">
                <div style="height: 230px; background: url('https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=600&auto=format&fit=crop') center/cover; position: relative;"></div>
                <div style="flex: 1; padding: 20px 25px; display: flex; flex-direction: column; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
                        <h2 id="ui-char-name" style="color: #f1c40f; font-size: 28px; margin:0;">战士</h2>
                        <span id="ui-char-level" style="color: #2ecc71; font-weight: bold; font-size: 20px;">Lv. 1</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <div id="ui-exp-text" style="font-size: 12px; color: #888; text-align: right; margin-bottom: 4px;">0 / 100</div>
                        <div style="width: 100%; height: 8px; background: #222; border-radius: 4px; overflow: hidden;"><div id="ui-exp-fill" style="width: 0%; height: 100%; background: #3498db; transition: width 0.3s ease;"></div></div>
                    </div>

                    <div id="ui-equip-slots" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;"></div>

                    <div id="ui-free-points" style="color: #f1c40f; font-size: 16px; margin-bottom: 10px; font-weight: bold; text-align: center;">剩余点数: 0</div>
                    <div id="ui-stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 16px; margin-bottom: 20px;"></div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 16px; font-weight: bold;">
                        <div style="background: #1e2028; padding: 12px; border-radius: 10px; border: 1px solid #333; text-align: center;">气血(HP)<b id="ui-hp" style="display: block; color: #e74c3c; margin-top: 4px; font-size: 20px;">3000</b></div>
                        <div style="background: #1e2028; padding: 12px; border-radius: 10px; border: 1px solid #333; text-align: center;">攻击(ATK)<b id="ui-atk" style="display: block; color: #e74c3c; margin-top: 4px; font-size: 20px;">400</b></div>
                        <div style="background: #1e2028; padding: 12px; border-radius: 10px; border: 1px solid #333; text-align: center;">防御(DEF)<b id="ui-def" style="display: block; color: #e74c3c; margin-top: 4px; font-size: 20px;">200</b></div>
                        <div style="background: #1e2028; padding: 12px; border-radius: 10px; border: 1px solid #333; text-align: center;">速度(SPD)<b id="ui-spd" style="display: block; color: #e74c3c; margin-top: 4px; font-size: 20px;">10</b></div>
                    </div>
                </div>
                <div id="ui-char-list" style="background: #111; padding: 15px; border-top: 1px solid #333; display: flex; gap: 15px; overflow-x: auto; height: 95px; flex-shrink: 0;"></div>
                <div onclick="window.showDetailCard()" style="position: absolute; top: 40%; right: -25px; width: 25px; height: 80px; background: #2c3e50; border: 2px solid #444; border-left: none; border-radius: 0 10px 10px 0; cursor: pointer; display: flex; justify-content: center; align-items: center; color: #f1c40f; font-size: 20px; z-index: 9020;">▶</div>
            </div>

            <!-- 右侧面板 -->
            <div style="flex: 1; display: flex; flex-direction: column; background: rgba(20, 22, 30, 0.95); padding: 30px;">
                <div style="display: flex; margin-bottom: 25px; border-bottom: 1px solid #333; padding-bottom: 15px; gap: 15px;">
                    <div id="rt-btn-inv" onclick="window.switchRightTab('inv')" style="flex: 1; text-align: center; padding: 15px; background: #3498db; border-radius: 8px; cursor: pointer; font-weight: bold; color: #fff; font-size: 22px;">🎒 背包</div>
                    <div id="rt-btn-skill" onclick="window.switchRightTab('skill')" style="flex: 1; text-align: center; padding: 15px; background: #1a1c29; border-radius: 8px; cursor: pointer; font-weight: bold; color: #888; font-size: 22px;">📖 技能</div>
                </div>

                <div id="inv-container" style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div class="filter-btn active" onclick="window.setFilter('all', this)" style="padding: 8px 20px; background: #e67e22; border: 1px solid #e67e22; border-radius: 20px; cursor: pointer; font-size: 18px; color: #fff; font-weight: bold;">全部</div>
                        <div class="filter-btn" onclick="window.setFilter('equip', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">装备</div>
                        <div class="filter-btn" onclick="window.setFilter('consumable', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">消耗品</div>
                        <div class="filter-btn" onclick="window.setFilter('material', this)" style="padding: 8px 20px; background: #222; border: 1px solid #444; border-radius: 20px; cursor: pointer; font-size: 18px; color: #aaa;">材料</div>
                    </div>
                    <div id="inventory-grid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 15px; align-content: start; padding-bottom: 20px;"></div>
                </div>

                <div id="skill-container" style="flex: 1; display: none; flex-direction: column; overflow-y: auto; gap: 15px; padding-bottom: 20px;"></div>
            </div>

            <!-- 弹窗：物品详情 -->
            <div id="item-tooltip" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 3px solid #f1c40f; border-radius: 12px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 99999; width: 500px; max-height: 85vh; overflow-y: auto;">
                <div onclick="window.hideTooltip()" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #aaa; font-size: 28px;">✖</div>
                <div id="tooltip-content"></div>
                <button id="btn-item-action" style="display: block; width: 100%; padding: 15px; margin-top: 25px; border-radius: 8px; font-weight: bold; cursor: pointer; border: none; font-size: 22px; color: #fff; background: #e67e22;">穿戴</button>
            </div>

            <!-- 弹窗：详细属性 -->
            <div id="detail-card" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #0f0f15; border: 3px solid #f1c40f; border-radius: 12px; padding: 30px; box-shadow: 0 15px 40px rgba(0,0,0,0.9); z-index: 99999; width: 500px; max-height: 85vh; overflow-y: auto;">
                <div onclick="window.hideDetailCard()" style="position: absolute; top: 15px; right: 20px; cursor: pointer; color: #aaa; font-size: 28px;">✖</div>
                <h2 style="text-align:center; color:#f1c40f; margin-bottom:15px; font-size:26px;">详细属性</h2>
                <div style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom: 8px;">【攻伐】</div>
                <div id="detail-atk" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom: 8px;">【守御】</div>
                <div id="detail-def" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
                <div style="font-size: 22px; color: #f1c40f; border-bottom: 2px solid #333; margin: 20px 0 15px 0; padding-bottom: 8px;">【克制与特殊】</div>
                <div id="detail-special" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 20px;"></div>
            </div>
        </div>
    `;

        document.body.appendChild(uiContainer);
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

    function getExpNeeded(level) {
        if(level >= 60) return 9999999;
        return globalExpTable[level - 1] || 100;
    }

    function renderCharList() {
        const box = document.getElementById('ui-char-list');
        if (!box) return;
        box.innerHTML = '';
        const players = CHARACTERS.filter(c => c.side === 'player');
        
        players.forEach(p => {
            const btn = document.createElement('div');
            btn.style.cssText = "width: 65px; height: 65px; flex-shrink: 0; border-radius: 10px; background: #222; border: 2px solid #444; display: flex; justify-content: center; align-items: center; font-size: 32px; cursor: pointer; transition: all 0.2s;";
            btn.innerHTML = p.emoji || '👤';
            btn.onclick = () => selectCharacter(p);
            if (selectedChar && selectedChar.id === p.id) {
                btn.style.borderColor = '#f1c40f';
                btn.style.boxShadow = '0 0 15px rgba(241, 196, 15, 0.5)';
                btn.style.background = '#333';
            }
            box.appendChild(btn);
        });
    }

    function selectCharacter(charData) {
        selectedChar = charData;
        currentUnit = new Unit(selectedChar); 
        renderCharList();
        refreshLeftPanel();
        refreshRightPanel();
    }

    function refreshLeftPanel() {
        document.getElementById('ui-char-name').innerText = selectedChar.name;
        document.getElementById('ui-char-level').innerText = `Lv. ${selectedChar.level || 1}`;
        
        const cLv = selectedChar.level || 1;
        const cExp = selectedChar.exp || 0;
        const reqExp = getExpNeeded(cLv);
        const pct = Math.min(100, (cExp / reqExp) * 100);
        
        document.getElementById('ui-exp-text').innerText = cLv >= 60 ? '已满级' : `${cExp} / ${reqExp}`;
        document.getElementById('ui-exp-fill').style.width = `${pct}%`;

        document.getElementById('ui-hp').innerText = currentUnit.maxHp;
        document.getElementById('ui-atk').innerText = currentUnit.atk;
        document.getElementById('ui-def').innerText = currentUnit.def;
        document.getElementById('ui-spd').innerText = currentUnit.speed.toFixed(1);

        const fp = selectedChar.freePoints || 0;
        document.getElementById('ui-free-points').innerText = `剩余点数: ${fp}`;
        
        const stats = getFinalStatsForUI(selectedChar);
        const statNames = { fengRui: '锋锐', hunHou: '浑厚', lingDong: '灵动', jianRen: '坚韧', guiMi: '诡秘', jueQing: '绝情' };
        
        let statsHtml = '';
        Object.keys(statNames).forEach(k => {
            statsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #333; padding-bottom: 6px;">
                    <div><span style="color: #888;">${statNames[k]}</span> <b style="color: #fff; margin-right: 5px;">${stats[k] || 0}</b></div>
                    <button ${fp > 0 ? '' : 'disabled'} onclick="window.allocatePoint('${k}')" style="background: #2ecc71; color: #fff; border: none; border-radius: 4px; width: 24px; height: 24px; font-weight: bold; cursor: pointer; line-height: 1;">+</button>
                </div>
            `;
        });
        document.getElementById('ui-stats-grid').innerHTML = statsHtml;

        renderEquipSlots();

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
        if(!selectedChar.stats) selectedChar.stats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
        selectedChar.stats[statKey] = (selectedChar.stats[statKey] || 0) + 1;
        saveGameData();
        selectCharacter(selectedChar);
    };

    function renderEquipSlots() {
        const container = document.getElementById('ui-equip-slots');
        container.innerHTML = '';
        const slots = [
            { key: 'weapon', name: '武器' }, { key: 'head', name: '头部' }, { key: 'body', name: '衣服' },
            { key: 'legs', name: '腿部' }, { key: 'ring', name: '戒指' }, { key: 'necklace', name: '项链' }
        ];
        const qColors = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };

        slots.forEach(slot => {
            const uid = selectedChar.equipment ? selectedChar.equipment[slot.key] : '';
            const inst = uid ? INVENTORY.find(i => i.uid === uid) : null;
            const tpl = inst ? ITEMS[inst.itemId] : null;

            const div = document.createElement('div');
            div.style.cssText = "height: 65px; background: #1a1c29; border: 2px solid #333; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";
            
            if (inst && tpl) {
                div.innerHTML = `
                    <div style="font-size: 28px;">${tpl.icon || '📦'}</div>
                    <div style="font-size: 13px; color:${qColors[inst.quality]}; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: absolute; bottom: 4px;">${tpl.name}</div>
                `;
                div.onclick = (e) => { e.stopPropagation(); window.showTooltip(inst, tpl, true); };
                div.style.borderColor = qColors[inst.quality];
            } else {
                div.innerHTML = `<span style="color: #555; font-size: 16px;">${slot.name}</span>`;
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
            slot.style.cssText = "aspect-ratio: 1; background: #1a1c29; border: 2px solid #333; border-radius: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; position: relative;";

            if (filteredItems[i]) {
                const inst = filteredItems[i];
                const itemTpl = ITEMS[inst.itemId];
                if (itemTpl) {
                    const countStr = (inst.count && inst.count > 1) ? `<div style="position: absolute; bottom: 4px; right: 4px; font-size: 14px; font-weight: bold; color: #fff; background: rgba(0,0,0,0.8); padding: 2px 6px; border-radius: 6px;">x${inst.count}</div>` : '';
                    slot.innerHTML = `
                        <div style="font-size: 36px; margin-bottom: 5px; border-bottom: 2px solid ${qColors[inst.quality] || '#fff'}">${itemTpl.icon || '📦'}</div>
                        <div style="font-size: 14px; color:${qColors[inst.quality] || '#fff'}; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 5px;">${itemTpl.name}</div>
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
            div.style.cssText = "background: #1a1c29; border: 1px solid #333; border-radius: 10px; padding: 20px;";
            div.innerHTML = `
                <div style="font-weight: bold; color: #f1c40f; margin-bottom: 10px; font-size: 22px;">[${slotNames[key] || key}] ${sk.name}</div>
                <div style="font-size: 18px; color: #bbb; line-height: 1.6;">造成伤害倍率: ${(sk.multiplier * 100).toFixed(0)}%</div>
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
            <div style="font-size: 26px; font-weight: bold; margin-bottom: 8px; text-align: center; color:${getQualityColor(inst.quality)}">${itemTpl.name}</div>
            <div style="font-size: 18px; color: #888; text-align: center; margin-bottom: 20px;">${itemTpl.category}</div>
        `;

        if (!['weapon', 'armor', 'accessory'].includes(itemTpl.category)) {
            html += `<div style="margin:20px 0; font-size:20px; color:#ccc; text-align:center;">${itemTpl.desc || '暂无描述'}</div>`;
            content.innerHTML = html;
            btn.innerText = '使用';
            btn.onclick = () => useItem(inst, itemTpl);
        } else {
            let slotKey = itemTpl.equipSlot || (itemTpl.category === 'weapon' ? 'weapon' : 'body');
            let equippedInst = selectedChar.equipment?.[slotKey] ? INVENTORY.find(i => i.uid === selectedChar.equipment[slotKey]) : null;

            html += `<div style="font-size: 20px; margin-top: 15px;">`;
            if (inst.baseAtk) html += `<div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>攻击力</span> <span style="color: #fff;">${inst.baseAtk}</span></div>`;
            if (inst.baseDef) html += `<div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>防御力</span> <span style="color: #fff;">${inst.baseDef}</span></div>`;
            html += `</div>`;
            content.innerHTML = html;

            if (isEquipped) {
                btn.innerText = '脱下';
                btn.onclick = () => {
                    inst.equippedBy = '';
                    selectedChar.equipment[slotKey] = '';
                    saveGameData(); window.hideTooltip(); selectCharacter(selectedChar);
                };
            } else {
                btn.innerText = equippedInst ? '替换' : '穿戴';
                btn.onclick = () => {
                    if (equippedInst) equippedInst.equippedBy = ''; 
                    inst.equippedBy = selectedChar.id;
                    if(!selectedChar.equipment) selectedChar.equipment = {};
                    selectedChar.equipment[slotKey] = inst.uid;
                    saveGameData(); window.hideTooltip(); selectCharacter(selectedChar);
                };
            }
        }
        tooltip.style.display = 'block';
    };

    function useItem(inst, itemTpl) {
        if (itemTpl.useEffect === 'AddExp') {
            selectedChar.exp = (selectedChar.exp || 0) + (itemTpl.useValue || 0);
        }
        if (inst.count && inst.count > 1) inst.count -= 1;
        else {
            const idx = INVENTORY.findIndex(i => i.uid === inst.uid);
            if (idx !== -1) INVENTORY.splice(idx, 1);
        }
        saveGameData(); window.hideTooltip(); selectCharacter(selectedChar);
    }

    window.hideTooltip = function() { document.getElementById('item-tooltip').style.display = 'none'; };
    window.showDetailCard = function() { document.getElementById('detail-card').style.display = 'block'; };
    window.hideDetailCard = function() { document.getElementById('detail-card').style.display = 'none'; };
    
    function getQualityColor(q) {
        const qc = { white: '#fff', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6', orange: '#e67e22', red: '#e74c3c' };
        return qc[q] || '#fff';
    }

    function saveGameData() {
        localStorage.setItem('my_game_characters', JSON.stringify(CHARACTERS));
        localStorage.setItem('my_game_inventory_sync', JSON.stringify(INVENTORY));
    }
})();
