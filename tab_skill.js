// ==========================================
// 模块：技能面板 (tab_skill.js)
// ==========================================
let currentSkillSubTab = 'active';

window.switchSkillSubTab = function(sub) {
  currentSkillSubTab = sub;
  ['active', 'followup', 'passive'].forEach(s => {
    document.getElementById(`tab-skill-${s}`).classList.toggle('active', sub === s);
  });
  window.renderTabSkill(document.getElementById('app-content'));
};

window.renderTabSkill = function(container) {
  const skillTypes = [{ val: 'normal', label: '普攻' }, { val: 'skill', label: '招式' }, { val: 'ultimate', label: '绝技' }, { val: 'followup', label: '追打' }, { val: 'passive', label: '被动' }];
  
  // ★★★ 核心修改：大幅擴充目標選取規則 ★★★
  const targetRules = [
    { val: 'frontRow', label: '前排整排' }, 
    { val: 'backRow', label: '後排整排' }, 
    { val: 'frontRowSingle', label: '前方單體' }, 
    { val: 'backRowSingle', label: '後排單體' }, 
    { val: 'lowestHp', label: '血量最低' }, 
    { val: 'highestHp', label: '血量最高' }, 
    { val: 'highestAtk', label: '攻擊力最高' },
    { val: 'lowestAtk', label: '攻擊力最低' },
    { val: 'highestDef', label: '防禦力最高' },
    { val: 'lowestDef', label: '防禦力最低' },
    { val: 'random', label: '隨機目標' }, 
    { val: 'all', label: '群體(全體)' },
    { val: 'splash1', label: '濺射(主目標周圍1格)' },
    { val: 'splash2', label: '轟炸(主目標周圍2格)' },
    { val: 'line', label: '直線貫穿(面前整列)' },
    { val: 'pierce', label: '穿透(主目標+背後1人)' }
  ];
  
  const passiveTypes = [{ val: 'atkAdd', label: '攻击力(%)' }, { val: 'hpAdd', label: '生命值(%)' }, { val: 'defAdd', label: '防御力(%)' }, { val: 'speedAdd', label: '速度(%)' }];

  container.innerHTML = `
    <div class="search-bar"><input type="text" id="search-skill" placeholder="🔍 搜索技能..." oninput="window.filterSkillList()"></div>
    <div class="sub-tabs">
      <div class="sub-tab ${currentSkillSubTab==='active'?'active':''}" id="tab-skill-active" onclick="window.switchSkillSubTab('active')">主动/治疗</div>
      <div class="sub-tab ${currentSkillSubTab==='followup'?'active':''}" id="tab-skill-followup" onclick="window.switchSkillSubTab('followup')">追打</div>
      <div class="sub-tab ${currentSkillSubTab==='passive'?'active':''}" id="tab-skill-passive" onclick="window.switchSkillSubTab('passive')">被动/光环</div>
    </div>
    <div id="skill-list"></div>
    <button class="btn" style="background:#3498db; width:100%; margin-bottom:20px;" onclick="window.addNewSkill()">➕ 新增技能</button>
  `;

  window.filterSkillList = function() {
    const list = document.getElementById('skill-list'); list.innerHTML = '';
    const keyword = document.getElementById('search-skill').value.toLowerCase();

    gameSkills.forEach((skill, index) => {
      if (currentSkillSubTab === 'active' && ['followup', 'passive'].includes(skill.type)) return;
      if (currentSkillSubTab === 'followup' && skill.type !== 'followup') return;
      if (currentSkillSubTab === 'passive' && skill.type !== 'passive') return;
      if (keyword && !skill.name.toLowerCase().includes(keyword)) return;

      const isPassive = skill.type === 'passive';
      
      // 效果渲染
      let effectsHtml = '';
      if (skill.effects && skill.effects.length > 0) {
        skill.effects.forEach((eff, effIdx) => {
          effectsHtml += `
            <div class="effect-box">
              <div class="effect-title">
                <span>🔴 效果 ${effIdx + 1}</span>
                <button class="btn-remove-effect" onclick="window.removeSkillEffect(${index}, ${effIdx})">✖ 删除</button>
              </div>
              <div class="form-grid" style="grid-template-columns: 1fr 1fr;">
                <div class="form-item">
                  <label>类型</label>
                  <select onchange="window.updateSkillEffect(${index}, ${effIdx}, 'type', this.value)">
                    <option value="status" ${eff.type==='status'?'selected':''}>附加状态</option>
                    <option value="heal_pct" ${eff.type==='heal_pct'?'selected':''}>恢复生命(倍率)</option>
                    <option value="heal_flat" ${eff.type==='heal_flat'?'selected':''}>恢复生命(固定)</option>
                    <option value="shield_pct" ${eff.type==='shield_pct'?'selected':''}>附加护盾(倍率)</option>
                    <option value="shield_flat" ${eff.type==='shield_flat'?'selected':''}>附加护盾(固定)</option>
                    <option value="mp" ${eff.type==='mp'?'selected':''}>恢复MP(%)</option>
                  </select>
                </div>
                <div class="form-item">
                  <label>对象阵营</label>
                  <select onchange="window.updateSkillEffect(${index}, ${effIdx}, 'targetSide', this.value)">
                    <option value="sameAsMain" ${eff.targetSide==='sameAsMain'?'selected':''}>跟随主目标</option>
                    <option value="enemy" ${eff.targetSide==='enemy'?'selected':''}>敌方</option>
                    <option value="player" ${eff.targetSide==='player'?'selected':''}>我方</option>
                    <option value="self" ${eff.targetSide==='self'?'selected':''}>自身</option>
                  </select>
                </div>
                <div class="form-item">
                  <label>选取规则</label>
                  <select onchange="window.updateSkillEffect(${index}, ${effIdx}, 'targetRule', this.value)">
                    <option value="sameAsMain" ${eff.targetRule==='sameAsMain'?'selected':''}>跟随主目标</option>
                    <option value="lowestHp" ${eff.targetRule==='lowestHp'?'selected':''}>血量最低</option>
                    <option value="all" ${eff.targetRule==='all'?'selected':''}>全体</option>
                    <option value="random" ${eff.targetRule==='random'?'selected':''}>随机</option>
                  </select>
                </div>
                ${eff.type === 'status' ? `
                <div class="form-item">
                  <label>状态ID</label>
                  <select onchange="window.updateSkillEffect(${index}, ${effIdx}, 'value', this.value)">
                    ${gameStatuses.map(st => `<option value="${st.id}" ${eff.value === st.id ? 'selected':''}>${st.name}</option>`).join('')}
                  </select>
                </div>` : `
                <div class="form-item">
                  <label>数值(倍率/固定值/百分比)</label>
                  <input type="number" step="0.1" value="${eff.value || 1}" onchange="window.updateSkillEffect(${index}, ${effIdx}, 'value', parseFloat(this.value))">
                </div>`}
                <div class="form-item">
                  <label>触发概率(%)</label>
                  <input type="number" step="1" value="${(eff.chance||1)*100}" onchange="window.updateSkillEffect(${index}, ${effIdx}, 'chance', parseFloat(this.value)/100)">
                </div>
              </div>
            </div>
          `;
        });
      }

      const div = document.createElement('div'); div.className = 'card';
      div.innerHTML = `
        <div class="card-header"><h3>${skill.name}</h3><button class="btn-del" onclick="window.deleteSkill(${index})">删除</button></div>
        <div class="form-grid">
          <div class="form-item"><label>名称</label><input type="text" value="${skill.name}" onchange="window.updateSkill(${index}, 'name', this.value)"></div>
          <div class="form-item"><label>分类</label><select onchange="window.updateSkill(${index}, 'type', this.value)">${skillTypes.map(t => `<option value="${t.val}" ${skill.type === t.val ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
          
          <div class="form-item full"><label>技能图标 (Icon URL)</label><input type="text" value="${skill.iconImg||''}" onchange="window.updateSkill(${index}, 'iconImg', this.value)"></div>
          <div class="form-item full"><label>技能详细介绍 (Desc)</label><textarea rows="2" onchange="window.updateSkill(${index}, 'desc', this.value)">${skill.desc||''}</textarea></div>

          <div class="form-item" style="grid-column: span 2;">
            <label style="color:#f1c40f; font-weight:bold;">技能元素属性</label>
            <select onchange="window.updateSkill(${index}, 'element', this.value)">${window.getElementOptions(skill.element)}</select>
          </div>

          <div class="form-item" style="display:${isPassive?'none':'flex'};">
            <label>施法对象</label>
            <select onchange="window.updateSkill(${index}, 'targetSide', this.value)">
              <option value="enemy" ${skill.targetSide==='enemy'?'selected':''}>敌方</option>
              <option value="player" ${skill.targetSide==='player'?'selected':''}>我方</option>
              <option value="self" ${skill.targetSide==='self'?'selected':''}>自身</option>
            </select>
          </div>
          <div class="form-item" style="display:${isPassive?'none':'flex'};">
            <label>选取规则</label>
            <select onchange="window.updateSkill(${index}, 'targetRule', this.value)">${targetRules.map(r => `<option value="${r.val}" ${skill.targetRule === r.val ? 'selected' : ''}>${r.label}</option>`).join('')}</select>
          </div>

          <div class="form-item" style="display:${isPassive?'none':'flex'};"><label>伤害倍率</label><input type="number" step="0.1" value="${skill.multiplier || 0}" onchange="window.updateSkill(${index}, 'multiplier', parseFloat(this.value))"></div>
          <div class="form-item" style="display:${isPassive?'none':'flex'};"><label>主目标治疗/护盾</label><input type="number" step="0.1" value="${skill.healMultiplier || 0}" onchange="window.updateSkill(${index}, 'healMultiplier', parseFloat(this.value))"></div>

          <div class="form-item" style="display:${isPassive?'none':'flex'};"><label>耗蓝(%)</label><input type="number" value="${skill.mpCost || 0}" onchange="window.updateSkill(${index}, 'mpCost', parseInt(this.value))"></div>
          <div class="form-item" style="display:${isPassive?'none':'flex'};"><label>冷却</label><input type="number" value="${skill.cooldown || 0}" onchange="window.updateSkill(${index}, 'cooldown', parseInt(this.value))"></div>
          
          <div class="form-item full" style="display: ${isPassive ? 'block' : 'none'}; background:#1e1e2e; border:1px solid #e67e22; padding:10px; border-radius:4px; margin-top:10px;">
            <label style="color:#e67e22;">被动效果</label>
            <div style="display:flex; gap:10px; margin-top:5px;">
              <select style="flex:1;" onchange="window.updateSkill(${index}, 'passiveType', this.value)">${passiveTypes.map(p => `<option value="${p.val}" ${skill.passiveType === p.val ? 'selected' : ''}>${p.label}</option>`).join('')}</select>
              <input type="number" step="0.1" style="flex:1;" value="${skill.passiveValue || 0}" onchange="window.updateSkill(${index}, 'passiveValue', parseFloat(this.value))">
            </div>
            
            <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
              <label style="color:#f1c40f;">是否光环(周围有效)</label>
              <select onchange="window.updateSkill(${index}, 'isAura', this.value === 'true')">
                <option value="false" ${!skill.isAura ? 'selected' : ''}>否 (仅自身)</option>
                <option value="true" ${skill.isAura ? 'selected' : ''}>是 (群体光环)</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:10px; margin-top:10px; display:${skill.isAura ? 'flex' : 'none'};">
              <label style="color:#f1c40f;">光环范围(格)</label>
              <input type="number" value="${skill.auraRange || 0}" onchange="window.updateSkill(${index}, 'auraRange', parseInt(this.value))">
            </div>
          </div>

          <div class="form-item full" style="display: ${isPassive ? 'none' : 'block'}; border-top:1px dashed #444; padding-top:10px; margin-top:10px;">
            <label style="color:#f1c40f; font-size:14px;">多重后续效果</label>
            <div id="effects-container-${index}">${effectsHtml}</div>
            <button class="btn-add-effect" onclick="window.addSkillEffect(${index})">➕ 添加后续效果</button>
          </div>

          <div class="form-item full" style="display: ${isPassive ? 'none' : 'block'}; background:#1e1e2e; border:1px solid #e74c3c; padding:10px; border-radius:4px; margin-top:10px;">
            <label style="color:#e74c3c;">⚔️ 追打标签机制</label>
            <div style="display:flex; gap:10px; margin-top:5px; flex-direction:column;">
              <div class="form-item">
                <label style="color:#2ecc71;">发起标签 (comboTagOut)</label>
                <select onchange="window.updateSkill(${index}, 'comboTagOut', this.value)">
                  ${FOLLOWUP_TAGS.map(t => `<option value="${t.val}" ${skill.comboTagOut===t.val?'selected':''}>${t.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-item">
                <label style="color:#e74c3c;">响应标签 (comboTagIn)</label>
                <select onchange="window.updateSkill(${index}, 'comboTagIn', this.value)">
                  ${FOLLOWUP_TAGS.map(t => `<option value="${t.val}" ${skill.comboTagIn===t.val?'selected':''}>${t.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-item">
                <label>最大触发次数</label>
                <input type="number" value="${skill.maxTriggers || 1}" onchange="window.updateSkill(${index}, 'maxTriggers', parseInt(this.value))">
              </div>
            </div>
          </div>
        </div>`;
      list.appendChild(div);
    });
  };
  window.filterSkillList();
};

window.updateSkill = function(index, key, value) {
  gameSkills[index][key] = value; saveData();
  if (['name', 'type', 'isAura', 'element'].includes(key)) window.filterSkillList();
};
window.addNewSkill = function() {
  let type = currentSkillSubTab === 'followup' ? 'followup' : currentSkillSubTab === 'passive' ? 'passive' : 'skill';
  gameSkills.push({ id:'skill_'+Date.now(), name:'新招式', type:type, element:'fire', targetSide:'enemy', targetRule:'frontRow', multiplier:1.0, healMultiplier:0, mpCost:10, cooldown:0, comboTagOut:'', comboTagIn:'', maxTriggers:1, passiveType:'atkAdd', passiveValue:0, isAura:false, auraRange:0, effects:[] }); 
  saveData(); window.renderTabSkill(document.getElementById('app-content'));
};
window.deleteSkill = function(index) { if (confirm('确定删除？')) { gameSkills.splice(index, 1); saveData(); window.renderTabSkill(document.getElementById('app-content')); } };
window.addSkillEffect = function(skillIdx) {
  if (!gameSkills[skillIdx].effects) gameSkills[skillIdx].effects = [];
  gameSkills[skillIdx].effects.push({ type: 'status', value: gameStatuses[0]?.id || '', chance: 1.0, targetSide: 'sameAsMain', targetRule: 'sameAsMain' });
  saveData(); window.renderTabSkill(document.getElementById('app-content'));
};
window.removeSkillEffect = function(skillIdx, effIdx) {
  gameSkills[skillIdx].effects.splice(effIdx, 1);
  saveData(); window.renderTabSkill(document.getElementById('app-content'));
};
window.updateSkillEffect = function(skillIdx, effIdx, key, value) {
  gameSkills[skillIdx].effects[effIdx][key] = value;
  saveData();
  if (key === 'type') window.renderTabSkill(document.getElementById('app-content')); 
};
