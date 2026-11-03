// ==========================================
// 模块：状态面板 (tab_status.js) —— 四分类数据驱动版
// 未来新增状态，直接编辑器操作，不改任何代码
// ==========================================
let currentStatusSubTab = 'buff';

window.switchStatusSubTab = function(sub) {
  currentStatusSubTab = sub;
  ['buff', 'debuff', 'control', 'dot'].forEach(s => {
    const el = document.getElementById(`tab-status-${s}`);
    if (el) el.classList.toggle('active', s === sub);
  });
  window.renderTabStatus(document.getElementById('app-content'));
};

window.renderTabStatus = function(container) {
  const statModOptions = [
    { val: 'none',     label: '无属性变化' },
    { val: 'hp',       label: '最大生命(%)' },
    { val: 'atk',      label: '攻击力(%)' },
    { val: 'def',      label: '防御力(%)' },
    { val: 'speed',    label: '速度(%)' },
    { val: 'cooldown', label: '技能冷却(回合)' }
  ];
  const dotSourceOptions = [
    { val: 'fixed',       label: '固定值' },
    { val: 'casterAtk',   label: '施法者攻击力%' },
    { val: 'casterDef',   label: '施法者防御力%' },
    { val: 'casterHp',    label: '施法者生命上限%' },
    { val: 'targetMaxHp', label: '目标最大生命%' },
    { val: 'targetCurHp', label: '目标当前生命%' }
  ];

  container.innerHTML = `
    <div class="search-bar">
      <input type="text" id="search-status" placeholder="🔍 搜索状态..." oninput="window.filterStatusList()">
    </div>
    <div class="sub-tabs">
      <div class="sub-tab ${currentStatusSubTab==='buff'?'active':''}"    id="tab-status-buff"    onclick="window.switchStatusSubTab('buff')">增益 Buff</div>
      <div class="sub-tab ${currentStatusSubTab==='debuff'?'active':''}"  id="tab-status-debuff"  onclick="window.switchStatusSubTab('debuff')">减益 Debuff</div>
      <div class="sub-tab ${currentStatusSubTab==='control'?'active':''}" id="tab-status-control" onclick="window.switchStatusSubTab('control')">控制 Control</div>
      <div class="sub-tab ${currentStatusSubTab==='dot'?'active':''}"     id="tab-status-dot"     onclick="window.switchStatusSubTab('dot')">持续伤害 DOT</div>
    </div>
    <div id="status-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewStatus()">➕ 新增状态</button>
  `;

  window.filterStatusList = function() {
    const list = document.getElementById('status-list');
    if (!list) return;
    list.innerHTML = '';
    const keyword = document.getElementById('search-status').value.toLowerCase();

    gameStatuses.forEach((st, index) => {
      if (st.type !== currentStatusSubTab) return;
      if (keyword && !st.name.toLowerCase().includes(keyword)) return;

      let bodyHtml = '';

      // ---------- 增益 / 减益 ----------
      if (currentStatusSubTab === 'buff' || currentStatusSubTab === 'debuff') {
        const isCooldown = st.statMod === 'cooldown';
        bodyHtml = `
          <div class="form-item">
            <label>修改属性</label>
            <select onchange="window.updateStatus(${index}, 'statMod', this.value)">
              ${statModOptions.map(o => `<option value="${o.val}" ${st.statMod === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>${isCooldown ? '冷却变化(回合)' : '变化数值(%)'}</label>
            ${isCooldown
              ? `<input type="number" step="1" value="${Math.abs(st.statValue || 0)}" onchange="window.updateStatusCooldown(${index}, this.value)">`
              : `<input type="number" step="1" value="${(Math.abs(st.statValue || 0) * 100).toFixed(1)}" onchange="window.updateStatusPct(${index}, this.value)">`
            }
          </div>
        `;
      }
      // ---------- 控制 ----------
      else if (currentStatusSubTab === 'control') {
        bodyHtml = `
          <div class="form-item full" style="grid-column:span 2;">
            <label style="color:#e67e22; font-weight:bold;">禁用行动（可多选，勾了就不能用）</label>
          </div>
          <div class="form-item">
            <label>
              <input type="checkbox" ${st.disableNormal ? 'checked' : ''} onchange="window.updateStatus(${index}, 'disableNormal', this.checked)">
              禁止普通攻击
            </label>
          </div>
          <div class="form-item">
            <label>
              <input type="checkbox" ${st.disableSkill ? 'checked' : ''} onchange="window.updateStatus(${index}, 'disableSkill', this.checked)">
              禁止招式
            </label>
          </div>
          <div class="form-item">
            <label>
              <input type="checkbox" ${st.disableUltimate ? 'checked' : ''} onchange="window.updateStatus(${index}, 'disableUltimate', this.checked)">
              禁止绝技
            </label>
          </div>
          <div class="form-item">
            <label>
              <input type="checkbox" ${st.disableFollowup ? 'checked' : ''} onchange="window.updateStatus(${index}, 'disableFollowup', this.checked)">
              禁止追打（不响应追击）
            </label>
          </div>
        `;
      }
      // ---------- 持续伤害 ----------
      else if (currentStatusSubTab === 'dot') {
        const isFixed = st.dotSource === 'fixed';
        bodyHtml = `
          <div class="form-item">
            <label>伤害来源</label>
            <select onchange="window.updateStatus(${index}, 'dotSource', this.value)">
              ${dotSourceOptions.map(o => `<option value="${o.val}" ${st.dotSource === o.val ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-item">
            <label>${isFixed ? '固定伤害值' : '伤害百分比(%)'}</label>
            ${isFixed
              ? `<input type="number" step="1" value="${st.dotValue || 0}" onchange="window.updateStatus(${index}, 'dotValue', parseFloat(this.value) || 0)">`
              : `<input type="number" step="1" value="${((st.dotValue || 0) * 100).toFixed(1)}" onchange="window.updateStatusDotPct(${index}, this.value)">`
            }
          </div>
        `;
      }

      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <div class="card-header">
          <h3>${st.name} <span style="font-size:12px; color:#f1c40f;">[${currentStatusSubTab.toUpperCase()}]</span></h3>
          <button class="btn-del" onclick="window.deleteStatus(${index})">删除</button>
        </div>
        <div class="form-grid">
          <div class="form-item">
            <label>名称</label>
            <input type="text" value="${st.name}" onchange="window.updateStatus(${index}, 'name', this.value)">
          </div>
          <div class="form-item">
            <label>持续回合</label>
            <input type="number" value="${st.duration}" onchange="window.updateStatus(${index}, 'duration', parseInt(this.value) || 1)">
          </div>
          ${bodyHtml}
        </div>
      `;
      list.appendChild(div);
    });
  };
  window.filterStatusList();
};

window.updateStatus = function(index, key, value) {
  gameStatuses[index][key] = value;
  saveData();
  if (['statMod', 'dotSource'].includes(key)) {
    window.filterStatusList();
  }
};

// 增益/减益 —— 百分比（自动按正负号）
window.updateStatusPct = function(index, value) {
  const st = gameStatuses[index];
  const num = Math.abs(parseFloat(value) || 0) / 100;
  st.statValue = (st.type === 'debuff') ? -num : num;
  saveData();
};

// 增益/减益 —— 冷却回合
window.updateStatusCooldown = function(index, value) {
  const st = gameStatuses[index];
  const num = Math.abs(parseFloat(value) || 0);
  st.statValue = (st.type === 'debuff') ? -num : num;
  saveData();
};

// DOT —— 百分比
window.updateStatusDotPct = function(index, value) {
  const st = gameStatuses[index];
  st.dotValue = (parseFloat(value) || 0) / 100;
  saveData();
};

window.addNewStatus = function() {
  const now = Date.now();
  const base = {
    id: 'status_' + now,
    name: '新状态',
    type: currentStatusSubTab,
    duration: 1,
    statMod: 'none',
    statValue: 0,
    disableNormal: false,
    disableSkill: false,
    disableUltimate: false,
    disableFollowup: false,
    dotSource: '',
    dotValue: 0
  };
  if (currentStatusSubTab === 'dot') base.dotSource = 'casterAtk';
  gameStatuses.push(base);
  saveData();
  window.filterStatusList();
};

window.deleteStatus = function(index) {
  if (confirm('确定删除？')) {
    gameStatuses.splice(index, 1);
    saveData();
    window.filterStatusList();
  }
};
