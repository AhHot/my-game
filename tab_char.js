// ==========================================
// 模块：角色面板 (tab_char.js)
// ==========================================

let currentCharSubTab = 'player';

// 工具：切换角色子面板
function switchCharSubTab(sub) {
  currentCharSubTab = sub;
  document.getElementById('tab-char-player').classList.toggle('active', sub === 'player');
  document.getElementById('tab-char-enemy').classList.toggle('active', sub === 'enemy');
  window.renderTabChar(document.getElementById('app-content'));
}

// 工具：计算最终属性 (包含等级成长 + 基础 + 装备)
function calcPreviewStats(char) {
  let baseStats = JSON.parse(JSON.stringify(char.stats || { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }));
  let gm = globalData.growthModels.find(m => m.id === char.growthModel) || globalData.growthModels[0];
  let lv = char.level || 1;
  
  // 1. 加上成长属性
  if (lv > 1) {
    baseStats.fengRui += (gm.fengRui || 0) * (lv-1);
    baseStats.hunHou += (gm.hunHou || 0) * (lv-1);
    baseStats.lingDong += (gm.lingDong || 0) * (lv-1);
    baseStats.jianRen += (gm.jianRen || 0) * (lv-1);
    baseStats.guiMi += (gm.guiMi || 0) * (lv-1);
    baseStats.jueQing += (gm.jueQing || 0) * (lv-1);
  }
  
  const cfg = globalData.config;
  let maxHp = (char.maxHp || 0) + baseStats.hunHou * cfg.hunHouToHp;
  let atk = (char.atk || 0) + baseStats.fengRui * cfg.fengRuiToAtk;
  let def = (char.def || 0) + baseStats.jianRen * cfg.jianRenToDef;
  let speed = (char.speed || 0) + baseStats.lingDong * cfg.lingDongToSpd;
  
  let critRate = (char.critRate || 0) + Math.min(baseStats.jueQing * cfg.jueQingToCrit / 100, cfg.maxCritFromStats / 100);
  let dodgeRate = (char.dodgeRate || 0) + Math.min(baseStats.lingDong * cfg.lingDongToEva / 100, cfg.maxEvaFromStats / 100);
  let hitRate = (char.hitRate || 0) + baseStats.guiMi * cfg.guiMiToHit / 100;
  let critResist = (char.critResist || 0) + baseStats.jianRen * cfg.jianRenToRes / 100;
  let critDmg = (char.critDmg || 1.5) + baseStats.guiMi * cfg.guiMiToCritDmg / 100;

  return { baseStats, maxHp, atk, def, speed, critRate, dodgeRate, hitRate, critResist, critDmg };
}

// 工具：实时刷新预览面板的 DOM (不重绘整个卡片)
function updatePreviewUI(idx) {
  const char = gameChars[idx];
  const preview = calcPreviewStats(char);
  const box = document.getElementById(`preview-${idx}`);
  if (!box) return;
  box.innerHTML = `
    <div>气血: <span>${preview.maxHp}</span></div>
    <div>攻击: <span>${preview.atk}</span></div>
    <div>防御: <span>${preview.def}</span></div>
    <div>速度: <span>${preview.speed.toFixed(1)}</span></div>
    <div>暴击: <span>${(preview.critRate*100).toFixed(1)}%</span></div>
    <div>闪避: <span>${(preview.dodgeRate*100).toFixed(1)}%</span></div>
    <div>命中: <span>${(preview.hitRate*100).toFixed(1)}%</span></div>
    <div>抗暴: <span>${(preview.critResist*100).toFixed(1)}%</span></div>
    <div>暴伤: <span>${(preview.critDmg*100).toFixed(1)}%</span></div>
  `;
}

// 工具：一键升级测试
window.testLevelUpAll = function(amount) {
  let log = "";
  gameChars.filter(c => c.side === 'player').forEach(c => { 
    let oldLv = c.level || 1;
    c.level = Math.min(60, oldLv + amount); 
    let actualAdded = c.level - oldLv;
    c.freePoints = (c.freePoints || 0) + (actualAdded * 3); 
    c.exp = 0; 
    log += `${c.name}: Lv.${oldLv} -> Lv.${c.level}，获得 ${actualAdded * 3} 点\n`;
  });
  saveData(); window.renderTabChar(document.getElementById('app-content')); 
  alert(`✅ 升级成功！\n${log}\n请去角色页面查看数值变化。`);
};

window.testResetLevel = function() {
  gameChars.filter(c => c.side === 'player').forEach(c => { 
    c.level = 1; c.exp = 0; c.freePoints = 0; 
  });
  saveData(); window.renderTabChar(document.getElementById('app-content')); 
  alert(`✅ 已重置所有玩家角色至 Lv.1，点数归零！`);
};

// 核心渲染函数
window.renderTabChar = function(container) {
  container.innerHTML = `
    <div class="search-bar"><input type="text" id="search-char" placeholder="🔍 搜索角色..." oninput="window.filterCharList()"></div>
    <div class="sub-tabs">
      <div class="sub-tab ${currentCharSubTab==='player'?'active':''}" id="tab-char-player" onclick="switchCharSubTab('player')">我方</div>
      <div class="sub-tab ${currentCharSubTab==='enemy'?'active':''}" id="tab-char-enemy" onclick="switchCharSubTab('enemy')">敌方</div>
    </div>
    <div id="char-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewChar()">➕ 新增角色</button>
  `;
  window.filterCharList();
};

window.filterCharList = function() {
  const list = document.getElementById('char-list'); 
  list.innerHTML = '';
  const keyword = document.getElementById('search-char').value.toLowerCase();
  
  gameChars.forEach((char, index) => {
    if (char.side !== currentCharSubTab) return;
    if (keyword && !char.name.toLowerCase().includes(keyword)) return;
    
    // 初始化兼容字段
    if (!char.skillSlots) char.skillSlots = { normal: '', skill: '', ultimate: '', followup: '', learned: '' };
    if (!char.equipment) char.equipment = { weapon: '', head: '', body: '', legs: '', ring: '', necklace: '' };
    if (!char.level) char.level = 1;
    if (!char.exp) char.exp = 0;
    if (!char.freePoints) char.freePoints = 0;
    if (!char.growthModel) char.growthModel = 'm1';

    const preview = calcPreviewStats(char);
    let gmOptions = globalData.growthModels.map(m => `<option value="${m.id}" ${char.growthModel === m.id ? 'selected' : ''}>${m.name}</option>`).join('');

    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `
      <div class="card-header">
        <h3>${char.emoji} ${char.name} <span style="font-size:14px; color:#f1c40f;">Lv.${char.level}</span></h3>
        <button class="btn-del" onclick="window.deleteChar(${index})">删除</button>
      </div>
      <div class="form-grid">
        <div class="form-item"><label>姓名</label><input type="text" value="${char.name}" onchange="window.updateChar(${index}, 'name', this.value)"></div>
        <div class="form-item"><label>图标</label><input type="text" value="${char.emoji}" onchange="window.updateChar(${index}, 'emoji', this.value)"></div>
        
        <div class="form-item"><label>等级 (Lv)</label><input type="number" min="1" max="60" value="${char.level}" oninput="window.updateCharRealTime(${index}, 'level', this.value)"></div>
        <div class="form-item"><label>当前经验</label><input type="number" value="${char.exp}" onchange="window.updateChar(${index}, 'exp', parseInt(this.value))"></div>
        
        <div class="form-item full">
          <label style="color:#e67e22; font-weight:bold;">成长模型 (随等级自动加属性)</label>
          <select onchange="window.updateCharRealTime(${index}, 'growthModel', this.value)">${gmOptions}</select>
        </div>

        <div class="form-item full">
          <label style="color:#2ecc71; font-weight:bold;">自由点数 (请手动加到下方的六大意境里)</label>
          <input type="number" value="${char.freePoints}" onchange="window.updateChar(${index}, 'freePoints', parseInt(this.value))">
        </div>

        <div class="form-item" style="grid-column: span 2;">
          <label style="color:#f1c40f; font-weight:bold;">元素属性</label>
          <select onchange="window.updateChar(${index}, 'element', this.value)">${window.getElementOptions(char.element)}</select>
        </div>

        <!-- 🔥 新增：基础面板属性 -->
        <div class="sub-title" style="color:#00ff00;">基础面板属性 (不随等级变化，作为初始底子)</div>
        <div class="form-item"><label style="color:#e74c3c;">初始气血 (HP)</label><input type="number" value="${char.maxHp || 0}" oninput="window.updateCharRealTime(${index}, 'maxHp', this.value)"></div>
        <div class="form-item"><label style="color:#e67e22;">初始攻击 (ATK)</label><input type="number" value="${char.atk || 0}" oninput="window.updateCharRealTime(${index}, 'atk', this.value)"></div>
        <div class="form-item"><label style="color:#3498db;">初始防御 (DEF)</label><input type="number" value="${char.def || 0}" oninput="window.updateCharRealTime(${index}, 'def', this.value)"></div>
        <div class="form-item"><label style="color:#2ecc71;">初始速度 (SPD)</label><input type="number" step="0.1" value="${char.speed || 0}" oninput="window.updateCharRealTime(${index}, 'speed', this.value)"></div>

        <div class="sub-title">六大意境 (基础值)</div>
        <div class="form-item"><label style="color:#e67e22;">锋锐 (攻击)</label><input type="number" value="${char.stats.fengRui || 0}" oninput="window.updateCharStatRealTime(${index}, 'fengRui', this.value)"></div>
        <div class="form-item"><label style="color:#e74c3c;">浑厚 (气血)</label><input type="number" value="${char.stats.hunHou || 0}" oninput="window.updateCharStatRealTime(${index}, 'hunHou', this.value)"></div>
        <div class="form-item"><label style="color:#2ecc71;">灵动 (速度/闪避)</label><input type="number" value="${char.stats.lingDong || 0}" oninput="window.updateCharStatRealTime(${index}, 'lingDong', this.value)"></div>
        <div class="form-item"><label style="color:#3498db;">坚韧 (防御/韧性)</label><input type="number" value="${char.stats.jianRen || 0}" oninput="window.updateCharStatRealTime(${index}, 'jianRen', this.value)"></div>
        <div class="form-item"><label style="color:#9b59b6;">诡秘 (命中/暴伤)</label><input type="number" value="${char.stats.guiMi || 0}" oninput="window.updateCharStatRealTime(${index}, 'guiMi', this.value)"></div>
        <div class="form-item"><label style="color:#f1c40f;">绝情 (暴击)</label><input type="number" value="${char.stats.jueQing || 0}" oninput="window.updateCharStatRealTime(${index}, 'jueQing', this.value)"></div>

        <div class="sub-title" style="color:#00ff00;">🔍 当前面板实时预览 (基础 + 成长)</div>
        <div class="preview-box full" id="preview-${index}"></div>

        <div class="sub-title">旧属性面板 (保留不删)</div>
        <div class="form-item"><label>暴击(%)</label><input type="number" step="0.1" value="${(char.critRate*100).toFixed(1)}" oninput="window.updateCharRealTime(${index}, 'critRate', parseFloat(this.value)/100)"></div>
        <div class="form-item"><label>暴伤(倍)</label><input type="number" step="0.1" value="${char.critDmg||1.5}" oninput="window.updateCharRealTime(${index}, 'critDmg', parseFloat(this.value))"></div>
        <div class="form-item"><label>抗暴(%)</label><input type="number" step="0.1" value="${(char.critResist*100).toFixed(1)}" oninput="window.updateCharRealTime(${index}, 'critResist', parseFloat(this.value)/100)"></div>
        <div class="form-item"><label>命中(%)</label><input type="number" step="0.1" value="${(char.hitRate*100).toFixed(1)}" oninput="window.updateCharRealTime(${index}, 'hitRate', parseFloat(this.value)/100)"></div>
        <div class="form-item"><label>闪避(%)</label><input type="number" step="0.1" value="${(char.dodgeRate*100).toFixed(1)}" oninput="window.updateCharRealTime(${index}, 'dodgeRate', parseFloat(this.value)/100)"></div>
        <div class="form-item"><label>吸血(%)</label><input type="number" step="0.1" value="${(char.lifesteal*100).toFixed(1)}" oninput="window.updateCharRealTime(${index}, 'lifesteal', parseFloat(this.value)/100)"></div>
        
        <div class="form-item full">
          <label>技能装配</label>
          <div class="skill-slot">
            <div style="display:flex; gap:5px; margin-bottom:5px;"><span style="width:50px;">普攻:</span><select style="flex:1;" onchange="window.updateSkillSlot(${index}, 'normal', this.value)">${window.getSkillOptions(char.skillSlots.normal)}</select></div>
            <div style="display:flex; gap:5px; margin-bottom:5px;"><span style="width:50px;">招式:</span><select style="flex:1;" onchange="window.updateSkillSlot(${index}, 'skill', this.value)">${window.getSkillOptions(char.skillSlots.skill)}</select></div>
            <div style="display:flex; gap:5px; margin-bottom:5px;"><span style="width:50px;">绝技:</span><select style="flex:1;" onchange="window.updateSkillSlot(${index}, 'ultimate', this.value)">${window.getSkillOptions(char.skillSlots.ultimate)}</select></div>
            <div style="display:flex; gap:5px; margin-bottom:5px;"><span style="width:50px; color:#e74c3c;">追打:</span><select style="flex:1; border-color:#e74c3c;" onchange="window.updateSkillSlot(${index}, 'followup', this.value)">${window.getSkillOptions(char.skillSlots.followup)}</select></div>
            <div style="display:flex; gap:5px; margin-bottom:5px;"><span style="width:50px; color:#f1c40f;">学习:</span><select style="flex:1;" onchange="window.updateSkillSlot(${index}, 'learned', this.value)">${window.getSkillOptions(char.skillSlots.learned)}</select></div>
          </div>
        </div>
      </div>`;
    list.appendChild(div);
    
    // 渲染初始预览
    updatePreviewUI(index);
  });
};

// --- 数据修改与实时绑定 ---
window.updateChar = function(index, key, value) {
  gameChars[index][key] = value;
  saveData();
};

window.updateCharRealTime = function(index, key, value) {
  if (['level', 'maxHp', 'atk', 'def'].includes(key)) value = parseInt(value) || 0;
  else if (key === 'speed') value = parseFloat(value) || 0;
  
  gameChars[index][key] = value;
  saveData();
  updatePreviewUI(index);
};

window.updateCharStatRealTime = function(index, statKey, value) {
  if (!gameChars[index].stats) gameChars[index].stats = { fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 };
  gameChars[index].stats[statKey] = parseFloat(value) || 0;
  saveData();
  updatePreviewUI(index);
};

window.updateSkillSlot = function(c, s, v) {
  gameChars[c].skillSlots[s] = v;
  saveData();
};

window.addNewChar = function() {
  gameChars.push({ id: 'char_'+Date.now(), name:'新角色', side: currentCharSubTab, level:1, exp:0, freePoints:0, growthModel:'m1', emoji:'🙂', element:'fire', maxHp:1000, atk:100, def:50, speed:10, sizeX:1, sizeY:1, critRate:0.1, critDmg:1.5, stats:{ fengRui:0, hunHou:0, lingDong:0, jianRen:0, guiMi:0, jueQing:0 }, skillSlots:{normal:'',skill:'',ultimate:'',followup:'',learned:''}, equipment:{weapon:'',head:'',body:'',legs:'',ring:'',necklace:''} }); 
  saveData(); window.renderTabChar(document.getElementById('app-content'));
};

window.deleteChar = function(index) { 
  if (confirm('确定删除？')) { gameChars.splice(index, 1); saveData(); window.renderTabChar(document.getElementById('app-content')); } 
};
