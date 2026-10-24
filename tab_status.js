// ==========================================
// 模块：状态面板 (tab_status.js)
// ==========================================
window.renderTabStatus = function(container) {
  const statusTypes = [{ val: 'buff', label: '增益' }, { val: 'debuff', label: '减益' }, { val: 'control', label: '控制' }];
  const statusMods = [{ val: 'none', label: '无属性变化' }, { val: 'atk', label: '攻击力' }, { val: 'def', label: '防御力' }, { val: 'speed', label: '速度' }];

  container.innerHTML = `
    <div class="search-bar"><input type="text" id="search-status" placeholder="🔍 搜索状态..." oninput="window.filterStatusList()"></div>
    <div id="status-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewStatus()">➕ 新增状态</button>
  `;

  window.filterStatusList = function() {
    const list = document.getElementById('status-list'); list.innerHTML = '';
    const keyword = document.getElementById('search-status').value.toLowerCase();
    
    gameStatuses.forEach((st, index) => {
      if (keyword && !st.name.toLowerCase().includes(keyword)) return;
      const displayStatValue = Math.abs((st.statValue || 0) * 100);

      const div = document.createElement('div'); div.className = 'card';
      div.innerHTML = `
        <div class="card-header"><h3>${st.name}</h3><button class="btn-del" onclick="window.deleteStatus(${index})">删除</button></div>
        <div class="form-grid">
          <div class="form-item"><label>名称</label><input type="text" value="${st.name}" onchange="window.updateStatus(${index}, 'name', this.value)"></div>
          <div class="form-item">
            <label>分类</label>
            <select onchange="window.updateStatusType(${index}, this.value)">
              ${statusTypes.map(t => `<option value="${t.val}" ${st.type === t.val ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-item"><label>持续回合</label><input type="number" value="${st.duration}" onchange="window.updateStatus(${index}, 'duration', parseInt(this.value))"></div>
          
          <div class="sub-title">属性修改</div>
          <div class="form-item"><label>修改哪个属性</label><select onchange="window.updateStatus(${index}, 'statMod', this.value)">${statusMods.map(m => `<option value="${m.val}" ${st.statMod === m.val ? 'selected' : ''}>${m.label}</option>`).join('')}</select></div>
          <div class="form-item"><label>修改数值(%)</label><input type="number" step="1" value="${displayStatValue}" onchange="window.updateStatusPct(${index}, 'statValue', this.value)"></div>

          <div class="sub-title">特殊效果</div>
          <div class="form-item"><label>是否持续扣血(DOT)</label><select onchange="window.updateStatus(${index}, 'isDot', this.value === 'true')"><option value="false" ${!st.isDot ? 'selected' : ''}>否</option><option value="true" ${st.isDot ? 'selected' : ''}>是</option></select></div>
          <div class="form-item"><label>DOT扣血值</label><input type="number" value="${st.dotValue}" onchange="window.updateStatus(${index}, 'dotValue', parseInt(this.value))"></div>
          
          <div class="form-item full"><label>是否眩晕 (跳过下一次行动)</label><select onchange="window.updateStatus(${index}, 'isStun', this.value === 'true')"><option value="false" ${!st.isStun ? 'selected' : ''}>否</option><option value="true" ${st.isStun ? 'selected' : ''}>是</option></select></div>
        </div>`;
      list.appendChild(div);
    });
  };
  window.filterStatusList();
};

window.updateStatus = function(index, key, value) { gameStatuses[index][key] = value; saveData(); };
window.updateStatusPct = function(index, key, value) {
  const st = gameStatuses[index];
  let val = parseFloat(value) / 100;
  if (st.type === 'debuff' || st.type === 'control') val = -Math.abs(val);
  else val = Math.abs(val);
  st[key] = val; saveData();
};
window.updateStatusType = function(index, newType) {
  const st = gameStatuses[index];
  st.type = newType;
  if (st.statValue !== 0) {
    if (newType === 'debuff' || newType === 'control') st.statValue = -Math.abs(st.statValue);
    else st.statValue = Math.abs(st.statValue);
  }
  saveData(); window.renderTabStatus(document.getElementById('app-content'));
};
window.addNewStatus = function() { gameStatuses.push({ id:'status_'+Date.now(), name:'新状态', type:'debuff', duration:1, statMod:'none', statValue:0, isDot:false, dotValue:0, isStun:false }); saveData(); window.renderTabStatus(document.getElementById('app-content')); };
window.deleteStatus = function(index) { if (confirm('确定删除？')) { gameStatuses.splice(index, 1); saveData(); window.renderTabStatus(document.getElementById('app-content')); } };
