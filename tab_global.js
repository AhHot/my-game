// ==========================================
// 模块：全局设置 (tab_global.js)
// ==========================================
let affixPoolTab = 'weapon';

window.switchAffixTab = function(poolType) {
  affixPoolTab = poolType;
  window.renderTabGlobal(document.getElementById('app-content'));
};

window.renderTabGlobal = function(container) {
  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">⚔️ 战斗基础参数 & 意境转化系数</h3>
      <div id="global-config-fields" class="form-grid"></div>
    </div>
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">📊 词条数值波动池</h3>
      <div class="sub-title">固定数值类</div><div class="form-grid" id="affix-vals-flat"></div>
      <div class="sub-title">基础百分比类</div><div class="form-grid" id="affix-vals-basic"></div>
      <div class="sub-title">高级属性类</div><div class="form-grid" id="affix-vals-advanced"></div>
    </div>
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🎒 装备掉落配置</h3>
      <div id="drop-rate-fields"></div>
      <button class="btn" style="background:#e74c3c; width:100%; margin-top:15px;" onclick="window.resetDropRates()">恢复掉落默认值</button>
    </div>
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🎲 随机词条池配置</h3>
      <div class="affix-pool-tabs">
        <div class="affix-pool-tab ${affixPoolTab === 'weapon' ? 'active' : ''}" onclick="window.switchAffixTab('weapon')">武器</div>
        <div class="affix-pool-tab ${affixPoolTab === 'armor' ? 'active' : ''}" onclick="window.switchAffixTab('armor')">防具</div>
        <div class="affix-pool-tab ${affixPoolTab === 'accessory' ? 'active' : ''}" onclick="window.switchAffixTab('accessory')">饰品</div>
      </div>
      <div id="affix-pool-box" class="checkbox-group"></div>
    </div>
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">🎨 元素管理</h3>
      <table><thead><tr><th>ID</th><th>显示名</th><th>图标</th><th>颜色</th><th>操作</th></tr></thead><tbody id="global-elements-body"></tbody></table>
      <button class="btn" style="background:#3498db; width:100%;" onclick="window.addElement()">➕ 新增元素</button>
    </div>
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">⚔️ 元素克制矩阵</h3>
      <div style="overflow-x:auto;"><table id="global-matrix-table" style="text-align:center;"></table></div>
    </div>
    <div style="display:flex; gap:10px; margin-bottom:20px;">
      <button class="btn btn-play" onclick="saveData(); alert('全局设置已保存！')">💾 保存全局设置</button>
      <button class="btn btn-reset" onclick="if(confirm('恢复默认？')){ localStorage.removeItem('my_game_config'); location.reload(); }">⚠️ 恢复全部默认</button>
    </div>
  `;

  renderGlobalFields();
};

function renderGlobalFields() {
  const fieldsBox = document.getElementById('global-config-fields');
  const fieldSchema = [
    { key: 'WIDTH', label: '游戏宽(px)', step: 10, min: 400 }, { key: 'HEIGHT', label: '游戏高(px)', step: 10, min: 400 },
    { key: 'MAX_ROUNDS', label: '回合上限', step: 1, min: 1 }, { key: 'ACTION_DELAY', label: '行动间隔(ms)', step: 50, min: 0 },
    { key: 'GRID_SIZE', label: '网格边长', step: 1, min: 1 }, { key: 'CELL_SIZE', label: '格子像素', step: 5, min: 20 },
    { key: 'START_MP_RATIO', label: '开局MP比例', step: 0.05, min: 0, max: 1 }, { key: 'MP_REGEN_PER_ROUND', label: '每回合回复MP比例', step: 0.05, min: 0, max: 1 },
    { key: 'DEF_CONSTANT', label: '防御常数', step: 50, min: 1 }, { key: 'MIN_DAMAGE_RATIO', label: '最低伤害比例', step: 0.01, min: 0, max: 1 },
    { key: 'CRIT_RATE_CAP', label: '暴击率上限', step: 0.1, min: 0, max: 1 }, { key: 'HIT_RATE_MIN', label: '命中率下限', step: 0.1, min: 0, max: 1 },
    { key: 'HIT_RATE_MAX', label: '命中率上限', step: 0.1, min: 0, max: 1 },
    { key: 'fengRuiToAtk', label: '锋锐转化攻击', step: 0.1 }, { key: 'hunHouToHp', label: '浑厚转化气血', step: 1 },
    { key: 'lingDongToSpd', label: '灵动转化速度', step: 0.1 }, { key: 'lingDongToEva', label: '灵动转化闪避(%)', step: 0.01 },
    { key: 'maxEvaFromStats', label: '升级闪避上限(%)', step: 1 }, { key: 'jianRenToDef', label: '坚韧转化防御', step: 0.1 },
    { key: 'jianRenToRes', label: '坚韧转化韧性(%)', step: 0.01 }, { key: 'guiMiToHit', label: '诡秘转化命中(%)', step: 0.01 },
    { key: 'guiMiToCritDmg', label: '诡秘转化暴伤(%)', step: 0.1 }, { key: 'jueQingToCrit', label: '绝情转化暴击(%)', step: 0.01 },
    { key: 'maxCritFromStats', label: '升级暴击上限(%)', step: 1 }
  ];
  
  fieldsBox.innerHTML = fieldSchema.map(f => {
    const val = globalData.config[f.key] !== undefined ? globalData.config[f.key] : DEFAULT_GLOBAL_CONFIG.config[f.key];
    return `<div class="form-item"><label>${f.label}</label><input type="number" step="${f.step}" value="${val}" onchange="globalData.config['${f.key}'] = parseFloat(this.value)"></div>`;
  }).join('');

  document.getElementById('affix-vals-flat').innerHTML = ['atkFlat', 'defFlat', 'hpFlat', 'speed'].map(k => renderAffixValItem(k)).join('');
  document.getElementById('affix-vals-basic').innerHTML = ['atkPercent', 'defPercent', 'hpPercent'].map(k => renderAffixValItem(k)).join('');
  document.getElementById('affix-vals-advanced').innerHTML = ['critRate', 'critDmg', 'critResist', 'dodgeRate', 'hitRate', 'lifesteal'].map(k => renderAffixValItem(k)).join('');

  document.getElementById('drop-rate-fields').innerHTML = globalData.dropRates.map((d, i) => {
    const prob = Math.max(0, d.max - d.min);
    return `
      <div class="drop-rate-row">
        <div class="drop-rate-label">${d.q}</div>
        <div class="form-item" style="flex:1;"><label>下限</label><input type="number" value="${d.min}" onchange="globalData.dropRates[${i}].min = parseFloat(this.value); window.renderTabGlobal(document.getElementById('app-content'))"></div>
        <div class="form-item" style="flex:1;"><label>上限</label><input type="number" value="${d.max}" onchange="globalData.dropRates[${i}].max = parseFloat(this.value); window.renderTabGlobal(document.getElementById('app-content'))"></div>
        <div class="form-item" style="flex:1;"><label>倍率</label><input type="number" step="0.1" value="${d.m}" onchange="globalData.dropRates[${i}].m = parseFloat(this.value)"></div>
        <div class="form-item" style="flex:1;"><label>词条数</label><input type="number" value="${d.n}" onchange="globalData.dropRates[${i}].n = parseInt(this.value)"></div>
        <div class="drop-rate-calc">实际: ${prob}%</div>
      </div>`;
  }).join('');

  const currentPool = globalData.affixPools[affixPoolTab] || [];
  document.getElementById('affix-pool-box').innerHTML = Object.keys(AFFIX_NAMES).map(k => `
    <label class="checkbox-item">
      <input type="checkbox" ${currentPool.includes(k) ? 'checked' : ''} onchange="window.toggleAffixPool('${affixPoolTab}', '${k}', this.checked)">
      ${AFFIX_NAMES[k]}
    </label>
  `).join('');

  document.getElementById('global-elements-body').innerHTML = globalData.elements.map((el, idx) => `
    <tr>
      <td><input type="text" value="${el.id}" readonly style="background:#333;"></td>
      <td><input type="text" value="${el.name || ''}" onchange="globalData.elements[${idx}].name = this.value"></td>
      <td><input type="text" value="${el.icon || ''}" maxlength="4" style="width:50px;" onchange="globalData.elements[${idx}].icon = this.value"></td>
      <td><input type="color" value="${el.color || '#888888'}" onchange="globalData.elements[${idx}].color = this.value"></td>
      <td><button class="btn-del" onclick="window.deleteElement(${idx})">删除</button></td>
    </tr>
  `).join('');

  let mHtml = '<thead><tr><th>攻↓ 守→</th>';
  globalData.elements.forEach(def => { mHtml += `<th>${def.name}</th>`; });
  mHtml += '</tr></thead><tbody>';
  globalData.elements.forEach(atk => {
    mHtml += `<tr><th>${atk.name}</th>`;
    globalData.elements.forEach(def => {
      if (atk.id === def.id) mHtml += `<td style="background:#222;">—</td>`;
      else {
        const row = globalData.elementMatrix[atk.id] || {};
        mHtml += `<td><input type="number" step="0.1" value="${row[def.id] || ''}" placeholder="1.0" style="width:60px;" onchange="window.updateMatrix('${atk.id}', '${def.id}', this.value)"></td>`;
      }
    });
    mHtml += '</tr>';
  });
  document.getElementById('global-matrix-table').innerHTML = mHtml + '</tbody>';
}

function renderAffixValItem(k) {
  const cfg = globalData.affixValues[k] || DEFAULT_AFFIX_VALUES[k];
  return `
    <div class="form-item" style="background:#0f0f1a; padding:8px; border-radius:4px;">
      <label style="color:#3498db; font-weight:bold;">${AFFIX_NAMES[k]}</label>
      <div style="display:flex; gap:10px;">
        <div style="flex:1;"><label>下限</label><input type="number" step="0.1" value="${cfg.min}" onchange="globalData.affixValues['${k}'].min = parseFloat(this.value)"></div>
        <div style="flex:1;"><label>上限</label><input type="number" step="0.1" value="${cfg.max}" onchange="globalData.affixValues['${k}'].max = parseFloat(this.value)"></div>
      </div>
    </div>
  `;
}

window.toggleAffixPool = function(poolType, statId, isChecked) {
  const pools = globalData.affixPools[poolType];
  if (isChecked && !pools.includes(statId)) pools.push(statId);
  else if (!isChecked) globalData.affixPools[poolType] = pools.filter(id => id !== statId);
};
window.updateMatrix = function(atkId, defId, val) {
  const nv = parseFloat(val);
  if (!globalData.elementMatrix[atkId]) globalData.elementMatrix[atkId] = {};
  if (!isNaN(nv) && nv > 0 && nv !== 1.0) globalData.elementMatrix[atkId][defId] = nv;
  else { delete globalData.elementMatrix[atkId][defId]; if (Object.keys(globalData.elementMatrix[atkId]).length === 0) delete globalData.elementMatrix[atkId]; }
};
window.resetDropRates = function() { if(confirm('恢复默认？')) { globalData.dropRates = JSON.parse(JSON.stringify(DEFAULT_DROP_RATES)); window.renderTabGlobal(document.getElementById('app-content')); } };
window.addElement = function() {
  const id = prompt('元素 ID（英文/数字）：'); if (!id) return;
  const name = prompt('显示名：', id) || id;
  const icon = prompt('图标 emoji：', '') || '';
  globalData.elements.push({ id, name, icon, color: '#888888' });
  window.renderTabGlobal(document.getElementById('app-content'));
};
window.deleteElement = function(idx) {
  if (!confirm('确定删除？')) return;
  const el = globalData.elements[idx];
  globalData.elements.splice(idx, 1);
  delete globalData.elementMatrix[el.id];
  Object.values(globalData.elementMatrix).forEach(row => delete row[el.id]);
  window.renderTabGlobal(document.getElementById('app-content'));
};
