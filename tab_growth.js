// ==========================================
// 模块：成长与经验 (tab_growth.js)
// ==========================================
window.renderTabGrowth = function(container) {
  container.innerHTML = `
    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">📈 10大成长模型 (每级增加)</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:10px;">配置各种流派的每级属性成长，支持小数。角色升级时会自动累加这些属性。</p>
      <div id="growth-models-list" class="form-grid"></div>
    </div>

    <div class="card">
      <h3 style="color:#f1c40f; margin-bottom:15px;">📊 等级经验表 (Lv.1 - Lv.60)</h3>
      <p style="color:#aaa; font-size:12px; margin-bottom:10px;">升级所需经验。已预设 1-30 平滑，31-50 中幅，51-60 大幅。</p>
      <div id="exp-table-list" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; max-height:400px; overflow-y:auto; padding-right:10px;"></div>
    </div>
    
    <button class="btn btn-play" style="width:100%; margin-bottom:20px;" onclick="saveData(); alert('成长与经验配置已保存！');">💾 保存成长与经验配置</button>
  `;

  // 渲染 10 大成长模型
  const gmBox = document.getElementById('growth-models-list');
  gmBox.innerHTML = globalData.growthModels.map((m, i) => `
    <div class="form-item" style="background:#111; padding:10px; border-radius:6px; border:1px solid #333; grid-column: span 2;">
      <div style="color:#f1c40f; font-weight:bold; margin-bottom:8px;">${m.name}</div>
      <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap:5px;">
        <div><label style="font-size:10px;">锋</label><input type="number" step="0.1" value="${m.fengRui}" onchange="globalData.growthModels[${i}].fengRui = parseFloat(this.value)"></div>
        <div><label style="font-size:10px;">浑</label><input type="number" step="0.1" value="${m.hunHou}" onchange="globalData.growthModels[${i}].hunHou = parseFloat(this.value)"></div>
        <div><label style="font-size:10px;">灵</label><input type="number" step="0.1" value="${m.lingDong}" onchange="globalData.growthModels[${i}].lingDong = parseFloat(this.value)"></div>
        <div><label style="font-size:10px;">坚</label><input type="number" step="0.1" value="${m.jianRen}" onchange="globalData.growthModels[${i}].jianRen = parseFloat(this.value)"></div>
        <div><label style="font-size:10px;">诡</label><input type="number" step="0.1" value="${m.guiMi}" onchange="globalData.growthModels[${i}].guiMi = parseFloat(this.value)"></div>
        <div><label style="font-size:10px;">绝</label><input type="number" step="0.1" value="${m.jueQing}" onchange="globalData.growthModels[${i}].jueQing = parseFloat(this.value)"></div>
      </div>
    </div>
  `).join('');

  // 渲染经验表
  const expBox = document.getElementById('exp-table-list');
  expBox.innerHTML = globalData.expTable.map((val, i) => `
    <div class="form-item" style="background:#111; padding:5px; border:1px solid #333; border-radius:4px;">
      <label>Lv.${i+1} 升 ${i+2} 需</label>
      <input type="number" value="${val}" onchange="globalData.expTable[${i}] = parseInt(this.value)">
    </div>
  `).join('');
};
