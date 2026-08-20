// ============================================================
// Prospera – app.js  (Page Renderers + Routing + UI Logic)
// ============================================================

// ── Toast notification system ─────────────────────────────
const Toast = {
  show(message, type = 'success') {
    const colors = { success:'bg-surface border-l-4 border-success text-success', error:'bg-surface border-l-4 border-error text-error', info:'bg-surface border-l-4 border-primary text-primary', warning:'bg-surface border-l-4 border-warning text-warning' };
    const icons  = { success:'check_circle', error:'error', info:'info', warning:'warning' };
    const el = document.createElement('div');
    el.className = `fixed bottom-24 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 translate-y-4 opacity-0 ${colors[type]||colors.info}`;
    el.innerHTML = `<span class="material-symbols-outlined text-[20px]">${icons[type]||'info'}</span><span class="font-medium" style="font-size:14px">${message}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-y-4','opacity-0'));
    setTimeout(() => { el.classList.add('translate-y-4','opacity-0'); setTimeout(()=>el.remove(),300); }, 3200);
  }
};

// ── AI Copilot ────────────────────────────────────────────
const AICopilot = {
  responses: [
    "Q3 revenue is up **12.5%** vs Q2. North America leads with +15.2% YoY growth. EMEA is on track at 92% of target.",
    "**12 critical inventory depletions** detected in the next 14 days. Quantum Processor Core X9 is most urgent — only 3 days of stock remaining.",
    "The **Champions cohort** (2,405 customers) is 3.2× more responsive to early-access campaigns. I recommend targeting them for the Q4 product launch.",
    "Forecast accuracy stands at **94.2%**. 14 at-risk opportunities flagged, mostly in APAC where seasonal demand variance is highest.",
    "System health is at **99.9%** uptime. The Payment Gateway API is approaching its rate limit — consider increasing quota.",
    "I can help you build a custom report. Which dataset — Inventory, Revenue, Customers, or Forecasts?",
    "Sales trend shows a consistent upward curve. I predict **$148,200 revenue** next month if current velocity holds."
  ],
  _idx: 0,
  getResponse() { return this.responses[this._idx++ % this.responses.length]; },
  init() {
    const container = document.getElementById('ai-chat-container');
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    if (!container || !input || !sendBtn) return;

    const addMessage = (text, isUser) => {
      const div = document.createElement('div');
      div.className = `flex flex-col ${isUser?'items-end':'items-start'} gap-1 animate-fade-in`;
      const bubble = document.createElement('div');
      bubble.className = isUser
        ? 'bg-surface-container text-on-surface px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm'
        : 'bg-primary/5 border border-primary/20 text-on-surface px-4 py-3 rounded-2xl rounded-tl-sm max-w-[95%] shadow-sm';
      bubble.style.fontSize = '14px';
      bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      div.appendChild(bubble);
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    };

    const send = () => {
      const msg = input.value.trim();
      if (!msg) return;
      addMessage(msg, true);
      input.value = '';
      const loader = document.createElement('div');
      loader.className = 'flex items-center gap-2 p-3 bg-surface-container-low rounded-2xl rounded-tl-sm w-fit';
      loader.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:#4f46e5;animation:bounce .6s infinite 0ms"></div><div style="width:8px;height:8px;border-radius:50%;background:#4f46e5;animation:bounce .6s infinite 150ms"></div><div style="width:8px;height:8px;border-radius:50%;background:#4f46e5;animation:bounce .6s infinite 300ms"></div>`;
      container.appendChild(loader);
      container.scrollTop = container.scrollHeight;
      setTimeout(() => { loader.remove(); addMessage(AICopilot.getResponse(), false); }, 1200);
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} });

    // Auto-resize textarea
    input.addEventListener('input', () => { input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,128)+'px'; });

    // Suggestion chips
    document.addEventListener('click', e => {
      const chip = e.target.closest('.ai-suggestion');
      if (chip) { input.value = chip.textContent.trim(); send(); }
    });
  }
};

// ── Routing ───────────────────────────────────────────────
let activeChart = null;

function navigate(route, pushState = true) {
  if (pushState) history.pushState({}, '', route);
  closeDropdowns(); closeMobileMenu();
  const renderers = {
    '/': renderDashboard, '/analytics': renderAnalytics, '/forecasts': renderForecasts,
    '/inventory': renderInventory, '/strategy': renderStrategy, '/reports': renderReports, '/settings': renderSettings
  };
  (renderers[route] || renderDashboard)();
  updateNavState(route);
  window.scrollTo({ top: 0, left: 0 });
}

function updateNavState(route) {
  const pageMap = { '/':'dashboard','/analytics':'analytics','/forecasts':'forecasts','/inventory':'inventory','/strategy':'strategy','/reports':'reports','/settings':'settings' };
  const active = pageMap[route] || 'dashboard';
  document.querySelectorAll('.nav-link, .mobile-bottom-link').forEach(el => {
    const isActive = el.dataset.page === active;
    el.classList.toggle('bg-surface-container', isActive);
    el.classList.toggle('text-primary', isActive);
    el.classList.toggle('font-bold', isActive);
    el.classList.toggle('text-on-surface-variant', !isActive);
  });
}

document.addEventListener('click', e => {
  const link = e.target.closest('[data-route]');
  if (link && link.dataset.route !== undefined) { e.preventDefault(); navigate(link.dataset.route); }
});
window.addEventListener('popstate', () => navigate(location.pathname, false));

// ── Helpers ───────────────────────────────────────────────
function statusDot(s){ return {Critical:'bg-error','Low Stock':'bg-warning',Healthy:'bg-success'}[s]||'bg-outline'; }
function statusTextClass(s){ return {Critical:'text-error','Low Stock':'text-warning',Healthy:'text-success'}[s]||'text-outline'; }
function destroyChart(){ if(activeChart){ activeChart.destroy(); activeChart=null; } }
const defaultChartOptions = (yLabel = 'Value') => ({
  responsive:true, maintainAspectRatio:false,
  plugins:{ legend:{ display:false }, tooltip:{ backgroundColor:'#191c1d', titleFont:{family:"'Inter',sans-serif",size:12}, bodyFont:{family:"'Inter',sans-serif",size:14}, padding:12, cornerRadius:8 } },
  scales:{ y:{ grid:{color:'#f3f4f5'}, ticks:{font:{family:"'Inter',sans-serif",size:11},color:'#777587'}, border:{display:false} }, x:{ grid:{display:false}, ticks:{font:{family:"'Inter',sans-serif",size:11},color:'#777587'}, border:{display:false} } },
  interaction:{intersect:false,mode:'index'}
});

// ── Page: Dashboard ───────────────────────────────────────
function renderDashboard() {
  const { kpis, activity } = ProspecraData;
  const kpiList = [kpis.revenue, kpis.users, kpis.conversion, kpis.health];
  const kpiCards = kpiList.map(k => `
    <div class="bg-surface rounded-xl p-5 shadow-sm border border-surface-container-lowest flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group" onclick="handleKPIClick('${k.label}')">
      <div class="flex justify-between items-start mb-4">
        <span style="font-size:11px;letter-spacing:.05em;font-weight:700" class="text-outline uppercase tracking-wider">${k.label}</span>
        <div class="p-2 rounded-lg bg-surface-container-low text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">${k.icon}</span></div>
      </div>
      <div>
        <div style="font-size:24px;font-weight:600;line-height:32px" class="text-on-surface">${k.value}</div>
        <div class="flex items-center gap-2 mt-2">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full ${k.up?'bg-success/10 text-success':'bg-error/10 text-error'}" style="font-size:12px;font-weight:500">
            <span class="material-symbols-outlined" style="font-size:14px">${k.up?'trending_up':'trending_down'}</span>${k.trend}
          </span>
          <span style="font-size:14px" class="text-outline">vs last month</span>
        </div>
      </div>
    </div>`).join('');

  const actItems = activity.map(a => `
    <div class="flex gap-3 items-start hover:bg-surface-container-low p-2 rounded-lg transition-colors cursor-pointer" onclick="Toast.show('${a.title}','info')">
      <div class="w-8 h-8 rounded-full bg-${a.color}/10 flex items-center justify-center text-${a.color} shrink-0 mt-0.5"><span class="material-symbols-outlined text-[16px]">${a.icon}</span></div>
      <div class="flex-1"><p class="text-body-sm text-on-surface font-medium">${a.title}</p><p class="text-body-sm text-on-surface-variant" style="font-size:13px">${a.sub}</p><p style="font-size:11px" class="text-outline mt-0.5">${a.time}</p></div>
    </div>`).join('');

  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-6">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface hidden md:block">Overview</h2>
        <h2 style="font-size:30px;font-weight:700;line-height:38px;letter-spacing:-.02em" class="text-on-surface md:hidden">Overview</h2>
        <p style="font-size:16px" class="text-outline mt-1">Real-time performance metrics for today.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-4 py-2 rounded-lg border border-surface-container-high text-on-surface bg-surface hover:bg-surface-container-low transition-colors flex items-center gap-2" style="font-size:12px;font-weight:500" onclick="showDatePicker()"><span class="material-symbols-outlined text-[18px]">calendar_today</span>Today</button>
        <button class="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary transition-colors shadow-sm" style="font-size:12px;font-weight:500" onclick="exportReport()">Export Report</button>
      </div>
    </div>
    <!-- AI Banner -->
    <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors" onclick="openAICopilot()">
      <div class="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shrink-0"><span class="material-symbols-outlined">tips_and_updates</span></div>
      <div class="flex-1"><h3 style="font-size:18px;font-weight:600" class="text-on-surface">Predictive Insight</h3><p style="font-size:14px" class="text-on-surface-variant mt-0.5">3 items restock recommended based on current velocity. Click to ask AI for details.</p></div>
      <button class="shrink-0 px-4 py-2 rounded-lg bg-surface text-primary border border-primary/20 hover:bg-primary/5 transition-colors whitespace-nowrap" style="font-size:12px;font-weight:500">Review Actions</button>
    </div>
    <!-- KPI Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${kpiCards}</div>
    <!-- Bento -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-surface rounded-xl p-6 shadow-sm border border-surface-container-lowest" style="min-height:380px">
        <div class="flex justify-between items-center mb-6">
          <div><h3 style="font-size:18px;font-weight:600" class="text-on-surface">Sales Trend</h3><p style="font-size:14px" class="text-outline mt-0.5">Monthly performance view</p></div>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors" style="font-size:12px;font-weight:500" onclick="changePeriod(this,'weekly')">W</button>
            <button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container" style="font-size:12px;font-weight:500" onclick="changePeriod(this,'monthly')">M</button>
            <button class="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors" style="font-size:12px;font-weight:500" onclick="changePeriod(this,'quarterly')">Q</button>
          </div>
        </div>
        <div style="position:relative;height:260px"><canvas id="sales-chart"></canvas></div>
      </div>
      <div class="bg-surface rounded-xl p-6 shadow-sm border border-surface-container-lowest flex flex-col" style="min-height:380px">
        <div class="flex justify-between items-center mb-6">
          <h3 style="font-size:18px;font-weight:600" class="text-on-surface">Recent Activity</h3>
          <button class="text-primary hover:underline" style="font-size:14px;font-weight:500" onclick="navigate('/reports')">View All</button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-2">${actItems}</div>
      </div>
    </div>
    <!-- Quick actions -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${[
        {icon:'warning',bg:'error',label:'12 Critical Alerts',sub:'View Inventory',route:'/inventory'},
        {icon:'trending_up',bg:'success',label:'Revenue +12.5%',sub:'View Analytics',route:'/analytics'},
        {icon:'query_stats',bg:'primary',label:'Demand Forecast',sub:'View Forecasts',route:'/forecasts'},
        {icon:'description',bg:'warning',label:'4 Reports Ready',sub:'View Reports',route:'/reports'}
      ].map(a=>`
      <button class="bg-surface rounded-xl p-4 shadow-sm border border-surface-container-lowest hover:shadow-md hover:border-primary/20 transition-all flex flex-col items-start gap-3 group" onclick="navigate('${a.route}')">
        <div class="w-10 h-10 rounded-lg bg-${a.bg}/10 flex items-center justify-center text-${a.bg} group-hover:scale-110 transition-transform"><span class="material-symbols-outlined">${a.icon}</span></div>
        <div><p class="text-on-surface font-semibold" style="font-size:12px">${a.label}</p><p class="text-outline" style="font-size:14px">${a.sub}</p></div>
      </button>`).join('')}
    </div>
  </div>`;

  requestAnimationFrame(() => {
    destroyChart();
    const ctx = document.getElementById('sales-chart');
    if (!ctx) return;
    activeChart = new Chart(ctx, {
      type: 'line',
      data: { labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], datasets:[{ label:'Revenue', data:[42000,55000,48000,72000,68000,95000,88000,124500], borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,0.08)', borderWidth:2.5, tension:0.4, fill:true, pointBackgroundColor:'#4f46e5', pointBorderColor:'#fff', pointRadius:4, pointHoverRadius:6 }] },
      options: { ...defaultChartOptions(), plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#191c1d', padding:12, cornerRadius:8, callbacks:{ label:ctx=>'$'+ctx.parsed.y.toLocaleString() } } }, scales:{ y:{ beginAtZero:false, grid:{color:'#f3f4f5'}, ticks:{ callback:v=>'$'+(v/1000)+'k', font:{family:"'Inter',sans-serif",size:11}, color:'#777587' }, border:{display:false} }, x:{ grid:{display:false}, ticks:{font:{family:"'Inter',sans-serif",size:11},color:'#777587'}, border:{display:false} } } }
    });
  });
}

// ── Page: Analytics ───────────────────────────────────────
function renderAnalytics() {
  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-outline mb-1"><span style="font-size:12px;font-weight:500">Analytics</span><span class="material-symbols-outlined text-[14px]">chevron_right</span><span style="font-size:12px;font-weight:500" class="text-primary">Revenue Reports</span></div>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface">Revenue Performance</h2>
        <p style="font-size:16px" class="text-on-surface-variant mt-2">Comprehensive breakdown of Q3 fiscal performance across global regions.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-surface rounded-lg shadow-sm p-1 flex items-center border border-outline-variant/20">
          <button id="q3-btn" class="px-4 py-1.5 rounded-md text-on-surface bg-surface-container-low" style="font-size:12px;font-weight:500" onclick="switchQuarter(this,'Q3')">Q3 2023</button>
          <button class="px-4 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface transition-colors" style="font-size:12px;font-weight:500" onclick="switchQuarter(this,'Q2')">Q2 2023</button>
        </div>
        <button class="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm" style="font-size:12px;font-weight:500" onclick="exportPDF()"><span class="material-symbols-outlined text-[18px]">download</span>Export PDF</button>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      ${[{label:'Total Revenue',val:'$4.2M',trend:'+12.5%',up:true,icon:'payments'},{label:'Avg Deal Size',val:'$124K',trend:'+4.2%',up:true,icon:'request_quote'},{label:'Customer Churn',val:'1.8%',trend:'+0.3%',up:false,icon:'person_remove'}].map(k=>`
      <div class="bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-4"><h3 style="font-size:11px;font-weight:700;letter-spacing:.05em" class="text-outline uppercase tracking-wider">${k.label}</h3><div class="w-8 h-8 rounded-full bg-${k.up?'primary':'error'}/10 flex items-center justify-center text-${k.up?'primary':'error'}"><span class="material-symbols-outlined text-[18px]">${k.icon}</span></div></div>
        <div style="font-size:30px;font-weight:700;line-height:38px" class="text-on-surface mb-1">${k.val}</div>
        <div class="flex items-center gap-2"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${k.up?'bg-success/10 text-success':'bg-error/10 text-error'}" style="font-size:12px;font-weight:500"><span class="material-symbols-outlined text-[14px]">${k.up?'trending_up':'trending_down'}</span>${k.trend}</span><span style="font-size:14px" class="text-outline">vs last quarter</span></div>
      </div>`).join('')}
    </div>
    <div class="bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/10">
      <div class="flex justify-between items-center mb-6">
        <div><h3 style="font-size:18px;font-weight:600" class="text-on-surface">Regional Revenue Trajectory</h3><p style="font-size:14px" class="text-on-surface-variant">Monthly breakdown across primary markets.</p></div>
        <button class="p-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors" onclick="Toast.show('Chart options','info')"><span class="material-symbols-outlined text-[20px]">more_vert</span></button>
      </div>
      <div style="height:380px"><canvas id="revenue-chart"></canvas></div>
    </div>
    <div class="bg-surface rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
      <div class="p-6 border-b border-outline-variant/10 flex justify-between items-center">
        <h3 style="font-size:18px;font-weight:600" class="text-on-surface">Performance Breakdown</h3>
        <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span><input class="bg-surface-container-low border-none rounded-lg py-1.5 pl-9 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary outline-none" style="font-size:14px" placeholder="Filter regions…" type="text" oninput="filterRegions(this.value)"/></div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead><tr class="bg-surface-container-lowest border-b border-outline-variant/10">
            ${['Region','Revenue (Q3)','Target Attainment','YoY Growth','Status','Action'].map(h=>`<th class="py-4 px-6 text-outline uppercase tracking-wider font-semibold" style="font-size:11px;letter-spacing:.05em;font-weight:700">${h}</th>`).join('')}
          </tr></thead>
          <tbody class="divide-y divide-outline-variant/10" style="font-size:14px" id="regions-tbody">
            ${[
              {region:'North America',dot:'bg-primary',rev:'$1.8M',pct:104,growth:'+15.2%',gc:'text-success',status:'Exceeding',sc:'bg-success/10 text-success'},
              {region:'EMEA',dot:'bg-tertiary',rev:'$1.4M',pct:92,growth:'+8.4%',gc:'text-success',status:'On Track',sc:'bg-warning/10 text-warning'},
              {region:'APAC',dot:'bg-outline-variant',rev:'$1.0M',pct:78,growth:'-2.1%',gc:'text-error',status:'At Risk',sc:'bg-error/10 text-error'}
            ].map(r=>`
            <tr class="hover:bg-surface-container-lowest/50 transition-colors region-row" data-region="${r.region.toLowerCase()}">
              <td class="py-4 px-6 font-medium"><div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full ${r.dot}"></div>${r.region}</div></td>
              <td class="py-4 px-6">${r.rev}</td>
              <td class="py-4 px-6"><div class="flex items-center gap-2"><div class="w-24 bg-surface-container h-1.5 rounded-full overflow-hidden"><div class="bg-primary h-full rounded-full" style="width:${r.pct}%"></div></div><span class="text-on-surface-variant" style="font-size:12px;font-weight:500">${r.pct}%</span></div></td>
              <td class="py-4 px-6 font-medium ${r.gc}">${r.growth}</td>
              <td class="py-4 px-6"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full ${r.sc}" style="font-size:12px;font-weight:500">${r.status}</span></td>
              <td class="py-4 px-6"><button class="text-primary hover:underline" style="font-size:12px;font-weight:500" onclick="Toast.show('Drilling into ${r.region}…','info')">View Details</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>`;

  requestAnimationFrame(() => {
    destroyChart();
    const ctx = document.getElementById('revenue-chart');
    if(!ctx) return;
    activeChart = new Chart(ctx, {
      type:'line',
      data:{ labels:['Jul','Aug','Sep','Oct','Nov','Dec'], datasets:[
        {label:'North America',data:[400,430,480,520,550,600],borderColor:'#4f46e5',backgroundColor:'rgba(79,70,229,0.1)',borderWidth:2,tension:0.4,fill:true,pointBackgroundColor:'#4f46e5',pointBorderColor:'#fff',pointRadius:4,pointHoverRadius:6},
        {label:'EMEA',data:[350,360,375,410,430,460],borderColor:'#414855',backgroundColor:'transparent',borderWidth:2,tension:0.4,pointBackgroundColor:'#414855',pointBorderColor:'#fff',pointRadius:4,pointHoverRadius:6},
        {label:'APAC',data:[280,270,290,305,310,320],borderColor:'#c7c4d8',backgroundColor:'transparent',borderWidth:2,tension:0.4,pointBackgroundColor:'#c7c4d8',pointBorderColor:'#fff',pointRadius:4,pointHoverRadius:6}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',align:'end',labels:{usePointStyle:true,boxWidth:6,boxHeight:6,font:{family:"'Inter',sans-serif",size:12},color:'#464555'}},tooltip:{backgroundColor:'#191c1d',padding:12,cornerRadius:8,callbacks:{label:ctx=>`${ctx.dataset.label}: $${ctx.parsed.y}k`}}},scales:{y:{beginAtZero:true,grid:{color:'#e1e3e4'},ticks:{callback:v=>'$'+v+'k',font:{family:"'Inter',sans-serif",size:12},color:'#777587'},border:{display:false}},x:{grid:{display:false},ticks:{font:{family:"'Inter',sans-serif",size:12},color:'#777587'},border:{display:false}}},interaction:{intersect:false,mode:'index'}}
    });
  });
}

// ── Page: Forecasts ───────────────────────────────────────
function renderForecasts() {
  const d = ProspecraData.forecasting;
  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface hidden md:block">Sales & Demand Forecasts</h2>
        <h2 style="font-size:30px;font-weight:700;line-height:38px" class="text-on-surface md:hidden">Forecasts</h2>
        <p style="font-size:16px" class="text-on-surface-variant mt-1">Predictive models based on historical trends and ML analysis.</p>
      </div>
      <div class="flex gap-3">
        <button class="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors" style="font-size:12px;font-weight:500" onclick="exportForecast()"><span class="material-symbols-outlined text-[18px]">download</span>Export Forecast</button>
        <button class="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm" style="font-size:12px;font-weight:500" onclick="newForecastModel()"><span class="material-symbols-outlined text-[18px]">add</span>New Model</button>
      </div>
    </div>
    <div class="bg-surface rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between border border-surface-container">
      <div class="w-full md:w-1/3"><label class="block text-on-surface-variant mb-2" style="font-size:11px;letter-spacing:.05em;font-weight:700">PRODUCT LINES</label><div class="relative"><select class="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-primary pr-10 outline-none" style="font-size:14px" onchange="updateForecast()"><option>All Products</option><option>Enterprise Suite</option><option>Cloud Infrastructure</option><option>Security Appliances</option></select><span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span></div></div>
      <div class="w-full md:w-1/4"><label class="block text-on-surface-variant mb-2" style="font-size:11px;letter-spacing:.05em;font-weight:700">TIME HORIZON</label><div class="relative"><select class="w-full bg-surface-container-low border-none rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-primary pr-10 outline-none" style="font-size:14px" onchange="updateForecast()"><option>Next 6 Months</option><option>Next 12 Months</option><option>Next 24 Months</option></select><span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span></div></div>
      <div class="flex items-center gap-4 p-3 bg-surface-container-lowest rounded-lg border border-surface-container">
        <span style="font-size:12px;font-weight:500" class="text-on-surface">Show Confidence Interval</span>
        <button class="relative w-10 h-5 rounded-full bg-primary outline-none border-0 transition-colors" id="ci-toggle" onclick="toggleCI(this)"><div class="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div></button>
      </div>
    </div>
    <div class="bg-surface rounded-xl shadow-sm border border-surface-container p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 style="font-size:18px;font-weight:600" class="text-on-surface">Demand Projection vs Historical</h3>
          <div class="flex gap-4 mt-2">
            <div class="flex items-center gap-2"><div class="w-4 h-0.5 bg-primary rounded"></div><span style="font-size:12px;font-weight:500" class="text-on-surface-variant">Historical</span></div>
            <div class="flex items-center gap-2"><div class="w-4 border-t-2 border-dashed border-primary" style="height:0"></div><span style="font-size:12px;font-weight:500" class="text-on-surface-variant">ML Forecast</span></div>
            <div class="flex items-center gap-2"><div class="w-4 h-3 bg-primary opacity-20 rounded-sm"></div><span style="font-size:12px;font-weight:500" class="text-on-surface-variant">95% Confidence</span></div>
          </div>
        </div>
        <button class="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors" onclick="Toast.show('Chart options','info')"><span class="material-symbols-outlined">more_vert</span></button>
      </div>
      <div style="height:380px"><canvas id="forecast-chart"></canvas></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${[
        {label:'PROJECTED REVENUE (Q3)',val:d.projectedRevenue,badge:'+12.4%',bc:'text-success',badgeBg:'bg-success/10',icon:'trending_up',iconColor:'text-primary',sub:'vs previous quarter'},
        {label:'FORECAST ACCURACY',val:d.forecastAccuracy,badge:'+1.1%',bc:'text-success',badgeBg:'bg-success/10',icon:'fact_check',iconColor:'text-primary',sub:'model confidence'},
        {label:'AT-RISK OPPORTUNITIES',val:d.atRiskOpportunities.toString(),badge:'High Variance',bc:'text-warning',badgeBg:'bg-warning/10',icon:'warning',iconColor:'text-warning',sub:'requires review'}
      ].map(s=>`
      <div class="bg-surface rounded-xl shadow-sm border border-surface-container p-4 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start mb-2"><span style="font-size:11px;letter-spacing:.05em;font-weight:700" class="text-on-surface-variant uppercase">${s.label}</span><span class="material-symbols-outlined ${s.iconColor} text-[20px]">${s.icon}</span></div>
        <div style="font-size:24px;font-weight:600;line-height:32px" class="text-on-surface">${s.val}</div>
        <div class="mt-4 flex items-center gap-2"><span class="px-2 py-0.5 ${s.badgeBg} ${s.bc} rounded-full" style="font-size:12px;font-weight:500">${s.badge}</span><span style="font-size:14px" class="text-on-surface-variant">${s.sub}</span></div>
      </div>`).join('')}
    </div>
  </div>`;

  requestAnimationFrame(() => {
    destroyChart();
    const ctx = document.getElementById('forecast-chart');
    if(!ctx) return;
    activeChart = new Chart(ctx, {
      type:'line',
      data:{ labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], datasets:[
        {label:'Historical',data:[320,350,380,410,440,480,null,null,null,null,null,null],borderColor:'#4f46e5',borderWidth:2.5,tension:0.4,pointRadius:4,pointBackgroundColor:'#4f46e5',pointBorderColor:'#fff'},
        {label:'ML Forecast',data:[null,null,null,null,480,510,540,580,620,670,700,750],borderColor:'#4f46e5',borderDash:[6,4],borderWidth:2.5,tension:0.4,pointRadius:4,pointBackgroundColor:'#4f46e5',pointBorderColor:'#fff'},
        {label:'Upper Band',data:[null,null,null,null,510,545,580,625,680,740,770,820],borderColor:'rgba(79,70,229,0.2)',backgroundColor:'rgba(79,70,229,0.07)',borderWidth:1,fill:'+1',tension:0.4,pointRadius:0},
        {label:'Lower Band',data:[null,null,null,null,450,475,500,535,560,600,630,680],borderColor:'rgba(79,70,229,0.2)',backgroundColor:'rgba(79,70,229,0.07)',borderWidth:1,fill:false,tension:0.4,pointRadius:0}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#191c1d',padding:12,cornerRadius:8,callbacks:{label:ctx=>ctx.dataset.label+': $'+ctx.parsed.y+'k'}}},scales:{y:{grid:{color:'#f3f4f5'},ticks:{callback:v=>'$'+v+'k',color:'#777587',font:{family:"'Inter',sans-serif",size:12}},border:{display:false}},x:{grid:{display:false},ticks:{color:'#777587',font:{family:"'Inter',sans-serif",size:12}},border:{display:false}}},interaction:{intersect:false,mode:'index'}}
    });
  });
}

// ── Page: Inventory ───────────────────────────────────────
function renderInventory() {
  const { inventory } = ProspecraData;
  const rows = inventory.map((item,i) => `
    <tr class="border-b border-surface-container hover:bg-surface-container-low transition-colors group">
      <td class="p-4 font-medium text-on-surface" style="font-size:14px">${item.name}</td>
      <td class="p-4 text-on-surface-variant" style="font-size:14px">${item.cat}</td>
      <td class="p-4" style="font-size:14px"><span class="font-medium">${item.stock} units</span>${item.stockTrend?`<span class="ml-2 ${item.stockTrend.startsWith('+')?'text-success':'text-error'}" style="font-size:12px">${item.stockTrend}</span>`:''}</td>
      <td class="p-4"><div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full ${statusDot(item.status)} shrink-0"></span><span class="${statusTextClass(item.status)} font-medium" style="font-size:14px">${item.status}</span></div></td>
      <td class="p-4 text-on-surface-variant font-medium" style="font-size:14px">${item.depletion}${item.daysLeft?` <span class="${statusTextClass(item.status)} ml-1">(${item.daysLeft})</span>`:''}</td>
      <td class="p-4 text-right">
        <button class="text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity" style="font-size:12px;font-weight:500" onclick="restockItem(${i})">${item.status==='Critical'?'Restock':item.status==='Low Stock'?'Review':'Details'}</button>
      </td>
    </tr>`).join('');

  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div class="flex justify-between items-end">
      <div>
        <p class="text-primary font-medium mb-1" style="font-size:12px;font-weight:500">Operational Forecasting</p>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface hidden md:block">Inventory & Stock Monitoring</h2>
        <h2 style="font-size:30px;font-weight:700;line-height:38px" class="text-on-surface md:hidden">Inventory</h2>
      </div>
      <button class="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-xl hover:bg-primary hover:text-on-primary shadow-sm transition-all flex items-center gap-2" style="font-size:12px;font-weight:500" onclick="addStock()"><span class="material-symbols-outlined text-[18px]">add</span>Add Stock</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface rounded-xl p-6 shadow-sm border border-surface-container flex flex-col justify-between h-32 relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-success/10 rounded-full blur-xl pointer-events-none"></div>
        <span style="font-size:12px;font-weight:500" class="text-on-surface-variant">Active SKUs</span>
        <div class="flex items-baseline gap-3 mt-2"><span style="font-size:36px;font-weight:700" class="text-on-surface">1,248</span><span class="text-success flex items-center bg-success/10 px-2 py-0.5 rounded-full" style="font-size:12px;font-weight:500"><span class="material-symbols-outlined text-[14px]">arrow_upward</span>2.4%</span></div>
      </div>
      <div class="bg-surface rounded-xl p-6 shadow-sm border border-surface-container flex flex-col justify-between h-32 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onclick="filterByStatus('Critical')">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-xl pointer-events-none"></div>
        <span style="font-size:12px;font-weight:500" class="text-on-surface-variant">Critical Depletion Warnings</span>
        <div class="flex items-baseline gap-3 mt-2"><span style="font-size:36px;font-weight:700" class="text-on-surface">12</span><span class="text-error flex items-center bg-error/10 px-2 py-0.5 rounded-full animate-pulse" style="font-size:12px;font-weight:500">Requires Action</span></div>
      </div>
      <div class="bg-surface rounded-xl p-6 shadow-sm border border-surface-container flex flex-col justify-between h-32 relative overflow-hidden">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
        <span style="font-size:12px;font-weight:500" class="text-on-surface-variant">Forecasted Procurement Value</span>
        <div class="flex items-baseline gap-3 mt-2"><span style="font-size:36px;font-weight:700" class="text-on-surface">$84.2k</span><span style="font-size:12px;font-weight:500" class="text-outline">Next 30 Days</span></div>
      </div>
    </div>
    <div class="bg-surface rounded-xl shadow-sm border border-surface-container overflow-hidden">
      <div class="p-4 border-b border-surface-container flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 style="font-size:18px;font-weight:600" class="text-on-surface">Predictive Inventory Depletion</h3>
        <div class="flex gap-2 flex-wrap">
          <select class="bg-surface-container-low border-none rounded-lg px-3 py-1.5 appearance-none focus:ring-2 focus:ring-primary outline-none" style="font-size:12px;font-weight:500" onchange="filterByStatus(this.value)">
            <option value="">All Status</option><option value="Critical">Critical</option><option value="Low Stock">Low Stock</option><option value="Healthy">Healthy</option>
          </select>
          <button class="p-2 rounded-lg border border-surface-container text-on-surface-variant hover:bg-surface-container-low transition-colors" onclick="downloadInventory()"><span class="material-symbols-outlined text-[18px]">download</span></button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse whitespace-nowrap">
          <thead><tr class="bg-surface border-b border-surface-container">
            ${['Product Name','Category','Current Stock','Urgency','Predicted Depletion','Actions'].map(h=>`<th class="text-on-surface-variant p-4 uppercase tracking-wider font-semibold" style="font-size:11px;letter-spacing:.05em;font-weight:700">${h}</th>`).join('')}
          </tr></thead>
          <tbody id="inv-tbody">${rows}</tbody>
        </table>
      </div>
      <div class="p-3 px-4 border-t border-surface-container bg-surface-bright flex justify-between items-center text-on-surface-variant" style="font-size:12px;font-weight:500">
        <span>Showing ${inventory.length} of 1,248 entries</span>
        <div class="flex gap-1">
          <button class="px-3 py-1 rounded hover:bg-surface-container transition-colors opacity-50" disabled>Prev</button>
          <button class="px-3 py-1 rounded bg-primary-container text-on-primary-container font-medium">1</button>
          <button class="px-3 py-1 rounded hover:bg-surface-container transition-colors" onclick="Toast.show('Loading page 2…','info')">2</button>
          <button class="px-3 py-1 rounded hover:bg-surface-container transition-colors" onclick="Toast.show('Next page loading…','info')">Next</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Page: Strategy ────────────────────────────────────────
function renderStrategy() {
  const { customers } = ProspecraData;
  const cohorts = [
    {key:'Champions',count:2405,desc:'High spend, frequent buyers. Most valuable segment.',icon:'diamond',color:'primary',action:'Launch Campaign'},
    {key:'Big Spenders',count:842,desc:'High order value but rarely purchase.',icon:'payments',color:'on-tertiary-container',action:'Launch Campaign'},
    {key:'Loyalists',count:4190,desc:'Buy often but spend less per order.',icon:'favorite',color:'secondary',action:'Launch Campaign'},
    {key:'At Risk',count:1204,desc:'Low spend, rare purchases. Likely to churn.',icon:'warning',color:'error',action:'Launch Win-back'}
  ];

  const cohortCards = cohorts.map(c => `
    <div class="border border-outline-variant rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group" onclick="selectCohort('${c.key}')">
      <div class="flex justify-between items-start mb-3">
        <div><h4 class="text-${c.color} font-bold" style="font-size:12px;font-weight:700">${c.key}</h4><p class="text-on-surface font-light mt-1" style="font-size:28px;line-height:1.1">${c.count.toLocaleString()}</p></div>
        <span class="material-symbols-outlined text-${c.color} group-hover:scale-110 transition-transform">${c.icon}</span>
      </div>
      <div><p style="font-size:14px" class="text-on-surface-variant mb-3">${c.desc}</p>
      <button class="w-full py-2 bg-surface border border-outline-variant rounded-lg text-${c.color} hover:opacity-80 transition-all flex items-center justify-center gap-2" style="font-size:12px;font-weight:500" onclick="launchCampaign('${c.key}',event)"><span class="material-symbols-outlined text-[16px]">campaign</span>${c.action}</button></div>
    </div>`).join('');

  const custRows = customers.slice(0,4).map(c => `
    <tr class="hover:bg-surface-container-low transition-colors">
      <td class="py-4 px-6"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">${c.initials}</div><div><p style="font-size:12px;font-weight:500" class="text-on-surface">${c.name}</p><p style="font-size:11px" class="text-on-surface-variant">${c.email}</p></div></div></td>
      <td class="py-4 px-6"><span class="px-2 py-1 ${c.status==='ACTIVE'?'bg-success/10 text-success':'bg-error/10 text-error'} rounded-full" style="font-size:10px;font-weight:700;letter-spacing:.05em">${c.status}</span></td>
      <td class="py-4 px-6" style="font-size:14px" class="text-on-surface">${c.ltv}</td>
      <td class="py-4 px-6" style="font-size:14px" class="text-on-surface-variant">${c.last}</td>
      <td class="py-4 px-6 text-right"><button class="text-primary hover:text-primary-fixed p-1 rounded transition-colors" onclick="Toast.show('Loading customer details…','info')"><span class="material-symbols-outlined text-[20px]">more_vert</span></button></td>
    </tr>`).join('');

  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface hidden md:block">Customer Intelligence</h2>
        <h2 style="font-size:30px;font-weight:700;line-height:38px" class="text-on-surface md:hidden">Strategy</h2>
        <p style="font-size:16px" class="text-on-surface-variant mt-2">Analyze purchasing patterns and launch targeted segment campaigns.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="px-4 py-2 border border-outline-variant text-on-surface rounded-xl hover:bg-surface-container-low transition-colors flex items-center gap-2" style="font-size:12px;font-weight:500" onclick="exportCustomers()"><span class="material-symbols-outlined text-[18px]">download</span>Export Data</button>
        <button class="px-4 py-2 bg-primary-container text-on-primary-container rounded-xl hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2" style="font-size:12px;font-weight:500" onclick="newSegment()"><span class="material-symbols-outlined text-[18px]">add</span>New Segment</button>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-8 bg-surface rounded-xl shadow-sm border border-surface-variant p-6">
        <div class="flex justify-between items-center mb-6"><h3 style="font-size:18px;font-weight:600" class="text-on-surface">Retention Matrix</h3><span class="px-2 py-1 bg-surface-container-low rounded text-on-surface-variant" style="font-size:11px;letter-spacing:.05em;font-weight:700">LAST 30 DAYS</span></div>
        <div class="grid grid-cols-2 gap-4" style="min-height:320px">${cohortCards}</div>
      </div>
      <div class="lg:col-span-4 flex flex-col gap-6">
        ${[{label:'TOTAL CUSTOMERS',val:'8,641',badge:'+12.4%',icon:'groups'},{label:'AVG. CLV',val:'$1,240',badge:'+5.2%',icon:'monitoring'}].map(k=>`
        <div class="bg-surface rounded-xl shadow-sm border border-surface-variant p-6">
          <div class="flex justify-between items-start mb-4"><h4 style="font-size:11px;letter-spacing:.05em;font-weight:700" class="text-on-surface-variant uppercase">${k.label}</h4><span class="material-symbols-outlined text-on-surface-variant">${k.icon}</span></div>
          <div class="flex items-baseline gap-3"><span style="font-size:36px;font-weight:700" class="text-on-surface">${k.val}</span><span class="text-success flex items-center bg-success/10 px-2 py-1 rounded-full" style="font-size:12px;font-weight:500"><span class="material-symbols-outlined text-[14px]">arrow_upward</span>${k.badge}</span></div>
        </div>`).join('')}
        <div class="bg-surface rounded-xl shadow-sm border border-surface-variant p-6 flex flex-col flex-1">
          <div class="flex justify-between items-start mb-4"><h4 style="font-size:11px;letter-spacing:.05em;font-weight:700" class="text-on-surface-variant uppercase">AI INSIGHT</h4><span class="material-symbols-outlined ms-fill text-primary">auto_awesome</span></div>
          <p style="font-size:14px" class="text-on-surface-variant mb-4">The "Champions" cohort is highly responsive to early-access product launches. Consider targeting them with the Q3 collection preview.</p>
          <button class="mt-auto w-full py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors" style="font-size:12px;font-weight:500" onclick="openAICopilot()">Generate Strategy</button>
        </div>
      </div>
    </div>
    <div class="bg-surface rounded-xl shadow-sm border border-surface-variant overflow-hidden">
      <div class="p-6 border-b border-outline-variant flex justify-between items-center">
        <h3 style="font-size:18px;font-weight:600" class="text-on-surface flex items-center gap-2">Filtered List: <span class="text-primary bg-primary/10 px-3 py-1 rounded-full" style="font-size:12px;font-weight:500">Champions (2,405)</span></h3>
        <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span><input class="w-64 bg-surface border border-outline-variant rounded-lg pl-9 pr-4 py-1.5 text-on-surface focus:ring-2 focus:ring-primary transition-colors outline-none" style="font-size:14px" placeholder="Search cohort…" type="text"/></div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead><tr class="border-b border-outline-variant">
            ${['CUSTOMER','STATUS','LTV','LAST PURCHASE','ACTIONS'].map(h=>`<th class="text-on-surface-variant py-3 px-6 uppercase" style="font-size:11px;letter-spacing:.05em;font-weight:700">${h}</th>`).join('')}
          </tr></thead>
          <tbody class="divide-y divide-surface-variant">${custRows}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}

// ── Page: Reports ─────────────────────────────────────────
function renderReports() {
  const { reports } = ProspecraData;
  const reportCards = reports.map((r,i) => `
    <div class="bg-surface rounded-xl p-5 shadow-sm border border-surface-container-highest hover:shadow-md transition-shadow group flex flex-col h-full cursor-pointer" onclick="openReport(${i})">
      <div class="flex justify-between items-start mb-4">
        <div class="p-2 bg-surface-container text-on-surface-variant rounded-lg"><span class="material-symbols-outlined">${r.icon}</span></div>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-md transition-colors" title="Download" onclick="downloadReport(${i},event)"><span class="material-symbols-outlined text-[20px]">download</span></button>
          <button class="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-md transition-colors" title="Share" onclick="shareReport(${i},event)"><span class="material-symbols-outlined text-[20px]">share</span></button>
        </div>
      </div>
      <h4 class="text-on-surface font-semibold mb-1" style="font-size:16px">${r.title}</h4>
      <p class="text-on-surface-variant mb-4 flex-grow" style="font-size:14px">${r.desc}</p>
      <div class="flex items-center justify-between pt-4 border-t border-surface-container-low mt-auto">
        <span class="text-outline" style="font-size:11px;letter-spacing:.05em;font-weight:700">${r.status==='processing'?'Generating… '+r.progress+'%':'Generated: '+r.date}</span>
        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full ${r.status==='ready'?'bg-success/10 text-success':'bg-warning/10 text-warning'} ${r.status==='processing'?'animate-pulse':''}" style="font-size:11px;letter-spacing:.05em;font-weight:700">
          <span class="w-1.5 h-1.5 rounded-full ${r.status==='ready'?'bg-success':'bg-warning'}"></span>${r.status==='ready'?'Ready':'Processing'}
        </span>
      </div>
      ${r.status==='processing'?`<div class="w-full bg-surface-container-low h-1 mt-2 rounded-full overflow-hidden"><div class="bg-warning h-full rounded-full" style="width:${r.progress}%"></div></div>`:''}
    </div>`).join('');

  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface hidden md:block">Reports Hub</h2>
        <h2 style="font-size:30px;font-weight:700;line-height:38px" class="text-on-surface md:hidden">Reports Hub</h2>
        <p style="font-size:16px" class="text-on-surface-variant">Generate, schedule, and analyze your enterprise data.</p>
      </div>
      <button class="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg hover:bg-primary hover:text-on-primary transition-colors flex items-center gap-2 shadow-sm" style="font-size:12px;font-weight:500" onclick="newReport()"><span class="material-symbols-outlined text-[18px]">add</span>New Report</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div class="md:col-span-8 flex flex-col gap-4">
        <div class="flex items-center justify-between"><h3 class="text-on-surface flex items-center gap-2" style="font-size:18px;font-weight:600"><span class="material-symbols-outlined text-tertiary">history</span>Recently Generated</h3><button class="text-primary hover:underline" style="font-size:14px;font-weight:500" onclick="Toast.show('Loading all reports…','info')">View All</button></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${reportCards}</div>
      </div>
      <div class="md:col-span-4 flex flex-col gap-4">
        <div class="bg-surface rounded-xl p-5 shadow-sm border border-surface-container-highest">
          <h3 class="text-on-surface mb-4 flex items-center gap-2" style="font-size:18px;font-weight:600"><span class="material-symbols-outlined text-primary">schedule</span>Upcoming Schedules</h3>
          <div class="flex flex-col gap-0">
            ${[{name:'Weekly Executive Summary',freq:'Every Monday, 8:00 AM'},{name:'EOM Financial Rec',freq:'Last Day of Month'}].map(s=>`
            <div class="py-3 border-b border-surface-container-low last:border-0 flex justify-between items-center group">
              <div><span class="text-on-surface font-medium" style="font-size:14px">${s.name}</span><div class="text-on-surface-variant mt-1 flex items-center gap-1" style="font-size:11px;letter-spacing:.05em;font-weight:700"><span class="material-symbols-outlined text-[14px]">event_repeat</span>${s.freq}</div></div>
              <button class="text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100" onclick="editSchedule('${s.name}')"><span class="material-symbols-outlined text-[20px]">edit</span></button>
            </div>`).join('')}
          </div>
          <button class="mt-4 w-full py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors" style="font-size:12px;font-weight:500" onclick="manageSchedules()">Manage Schedules</button>
        </div>
        <div class="bg-surface rounded-xl p-5 shadow-sm border border-surface-container-highest flex-grow">
          <h3 class="text-on-surface mb-4 flex items-center gap-2" style="font-size:18px;font-weight:600"><span class="material-symbols-outlined text-tertiary">dashboard_customize</span>Template Library</h3>
          <div class="flex flex-col gap-3">
            ${[{icon:'inventory_2',title:'Inventory Health',sub:'Stockouts, Turnover'},{icon:'trending_up',title:'Sales Performance',sub:'Revenue, Growth YoY'},{icon:'groups',title:'Customer Insights',sub:'Demographics, LTV'}].map(t=>`
            <button class="w-full flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-surface-container-highest hover:bg-surface-container-lowest transition-all text-left group" onclick="useTemplate('${t.title}')">
              <div class="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">${t.icon}</span></div>
              <div class="flex-1"><span class="block text-on-surface font-medium" style="font-size:14px">${t.title}</span><span class="block text-outline mt-0.5" style="font-size:11px;letter-spacing:.05em;font-weight:700">${t.sub}</span></div>
              <span class="material-symbols-outlined text-outline group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">arrow_forward</span>
            </button>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── Page: Settings ────────────────────────────────────────
function renderSettings() {
  document.getElementById('page-container').innerHTML = `
  <div class="page-content space-y-8">
    <div><h2 style="font-size:36px;font-weight:700;line-height:44px;letter-spacing:-.02em" class="text-on-surface">Settings</h2><p style="font-size:16px" class="text-on-surface-variant mt-1">Manage your account, preferences, and integrations.</p></div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="md:col-span-1">
        <nav class="bg-surface rounded-xl shadow-sm border border-surface-container-high overflow-hidden">
          ${[{id:'profile',icon:'person',label:'Profile'},{id:'notifications',icon:'notifications',label:'Notifications'},{id:'integrations',icon:'extension',label:'Integrations'},{id:'security',icon:'security',label:'Security'},{id:'billing',icon:'credit_card',label:'Billing'},{id:'team',icon:'group',label:'Team'}].map((s,i)=>`
          <button class="w-full flex items-center gap-3 px-4 py-3 text-left ${i===0?'bg-primary/5 text-primary font-semibold':'text-on-surface-variant hover:bg-surface-container-low'} transition-colors border-b border-surface-container-low last:border-0 group" style="font-size:12px;font-weight:500" onclick="showSettingSection('${s.id}',this)"><span class="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">${s.icon}</span>${s.label}</button>`).join('')}
        </nav>
      </div>
      <div class="md:col-span-3 space-y-6">
        <div class="bg-surface rounded-xl shadow-sm border border-surface-container-high p-6">
          <h3 style="font-size:18px;font-weight:600" class="text-on-surface mb-6">Profile Information</h3>
          <div class="flex items-center gap-4 mb-6 p-4 bg-surface-container-low rounded-xl">
            <div class="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-2xl">SA</div>
            <div><p style="font-size:18px;font-weight:600" class="text-on-surface">System Admin</p><p style="font-size:14px" class="text-on-surface-variant">admin@prospera.io</p><button class="text-primary hover:underline mt-1" style="font-size:12px;font-weight:500" onclick="Toast.show('Photo upload coming soon','info')">Change photo</button></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${[{label:'First Name',val:'System',type:'text'},{label:'Last Name',val:'Admin',type:'text'},{label:'Email',val:'admin@prospera.io',type:'email'},{label:'Role',val:'Super Administrator',type:'text',ro:true}].map(f=>`
            <div><label class="block text-on-surface-variant mb-2" style="font-size:11px;letter-spacing:.05em;font-weight:700">${f.label}</label><input class="w-full ${f.ro?'bg-surface-container':'bg-surface-container-low'} border border-transparent rounded-lg px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" style="font-size:14px" value="${f.val}" type="${f.type}" ${f.ro?'readonly':''}/></div>`).join('')}
          </div>
          <button class="mt-6 px-6 py-2.5 bg-primary-container text-on-primary-container rounded-lg hover:bg-primary hover:text-on-primary transition-colors shadow-sm" style="font-size:12px;font-weight:500" onclick="saveProfile()">Save Changes</button>
        </div>
        <div class="bg-surface rounded-xl shadow-sm border border-surface-container-high p-6">
          <h3 style="font-size:18px;font-weight:600" class="text-on-surface mb-6">Preferences</h3>
          <div class="space-y-5">
            ${[
              {label:'Dark Mode',sub:'Use dark theme across the app',key:'darkMode',on:false},
              {label:'Email Notifications',sub:'Receive weekly digest emails',key:'emailNotif',on:false},
              {label:'Critical Stock Alerts',sub:'Get notified when items hit threshold',key:'stockAlerts',on:true},
              {label:'AI Copilot',sub:'Enable predictive insights banner',key:'aiCopilot',on:true}
            ].map(p=>`
            <div class="flex items-center justify-between py-3 border-b border-surface-container-low last:border-0">
              <div><p style="font-size:14px" class="text-on-surface font-medium">${p.label}</p><p style="font-size:14px" class="text-on-surface-variant">${p.sub}</p></div>
              <button class="relative w-11 h-6 rounded-full ${p.on?'bg-primary':'bg-surface-container-high'} transition-colors outline-none border-0" onclick="togglePref(this,'${p.key}')" role="switch" aria-checked="${p.on}">
                <div class="absolute top-0.5 ${p.on?'right-0.5':'left-0.5'} w-5 h-5 bg-white rounded-full shadow-sm transition-all"></div>
              </button>
            </div>`).join('')}
          </div>
        </div>
        <div class="bg-error/5 border border-error/20 rounded-xl p-6">
          <h3 style="font-size:18px;font-weight:600" class="text-error mb-2">Danger Zone</h3>
          <p style="font-size:14px" class="text-on-surface-variant mb-4">These actions are irreversible. Please proceed with caution.</p>
          <div class="flex flex-wrap gap-3">
            <button class="px-4 py-2 border border-error/30 text-error rounded-lg hover:bg-error/10 transition-colors" style="font-size:12px;font-weight:500" onclick="Toast.show('Export initiated – you will receive an email shortly','success')">Export My Data</button>
            <button class="px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/80 transition-colors" style="font-size:12px;font-weight:500" onclick="Toast.show('Account deletion requires email confirmation','warning')">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ====================================================
// ACTION HANDLERS
// ====================================================
function handleKPIClick(label) {
  const m = {'Total Revenue':'/analytics','Active Users':'/strategy','Avg. Conversion':'/analytics','System Health':'/settings'};
  Toast.show('Loading '+label+' details…','info');
  setTimeout(()=>navigate(m[label]||'/analytics'),400);
}
function exportReport()    { Toast.show('Report exported successfully!','success'); }
function exportPDF()       { Toast.show('PDF export started – check your downloads.','success'); }
function exportForecast()  { Toast.show('Forecast export started.','success'); }
function exportCustomers() { Toast.show('Customer data export initiated.','success'); }
function showDatePicker()  { Toast.show('Date picker coming soon.','info'); }
function switchQuarter(btn, q) {
  btn.parentElement.querySelectorAll('button').forEach(b=>{ b.classList.remove('bg-surface-container-low'); b.classList.add('text-on-surface-variant'); });
  btn.classList.add('bg-surface-container-low'); btn.classList.remove('text-on-surface-variant');
  Toast.show('Switched to '+q+' data.','info');
}
function filterRegions(val) {
  document.querySelectorAll('.region-row').forEach(r=>{ r.style.display = r.dataset.region.includes(val.toLowerCase())?'':'none'; });
}
function updateForecast()  { Toast.show('Forecast model updated.','success'); }
function newForecastModel(){ Toast.show('New model wizard coming soon.','info'); }
function toggleCI(btn) {
  const thumb = btn.querySelector('div');
  const isOn = btn.classList.contains('bg-primary');
  btn.classList.toggle('bg-primary',!isOn);
  btn.classList.toggle('bg-surface-container-high',isOn);
  thumb.className = `absolute top-0.5 ${!isOn?'right-0.5':'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm transition-all`;
  Toast.show('Confidence interval '+(isOn?'hidden':'shown')+'.','info');
}
function addStock()        { Toast.show('Add Stock form coming soon.','info'); }
function filterByStatus(status) {
  const tbody = document.getElementById('inv-tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row,i)=>{ const item = ProspecraData.inventory[i]; if(!item) return; row.style.display = (!status||item.status===status)?'':'none'; });
}
function restockItem(i) {
  const item = ProspecraData.inventory[i];
  if(!item) return;
  Toast.show('Restock order placed for '+item.name+'!','success');
}
function downloadInventory(){ Toast.show('Inventory CSV download started.','success'); }
function changePeriod(btn,period) {
  btn.parentElement.querySelectorAll('button').forEach(b=>{ b.classList.remove('bg-primary-container','text-on-primary-container'); b.classList.add('bg-surface-container-low','text-on-surface'); });
  btn.classList.add('bg-primary-container','text-on-primary-container'); btn.classList.remove('bg-surface-container-low','text-on-surface');
  Toast.show('Showing '+period+' trend.','info');
}
function selectCohort(key) { Toast.show('Viewing '+key+' cohort.','info'); }
function launchCampaign(label,e){ e.stopPropagation(); Toast.show('Campaign for '+label+' launched! 🚀','success'); }
function newSegment()      { Toast.show('New segment creation coming soon.','info'); }
function openReport(i)     { const r=ProspecraData.reports[i]; Toast.show('Opening: '+r.title,'info'); }
function downloadReport(i,e){ e.stopPropagation(); const r=ProspecraData.reports[i]; Toast.show(r.title+' downloaded!','success'); }
function shareReport(i,e)  { e.stopPropagation(); const r=ProspecraData.reports[i]; Toast.show('Share link copied for '+r.title+'!','success'); }
function newReport()       { Toast.show('New Report wizard launching…','info'); }
function editSchedule(name){ Toast.show('Editing schedule: '+name,'info'); }
function manageSchedules() { Toast.show('Schedule manager coming soon.','info'); }
function useTemplate(name) { Toast.show('Template "'+name+'" loaded!','success'); }
function saveProfile()     { Toast.show('Profile saved successfully!','success'); }
function showSettingSection(id,btn) {
  btn.parentElement.querySelectorAll('button').forEach(b=>{ b.classList.remove('bg-primary/5','text-primary','font-semibold'); b.classList.add('text-on-surface-variant'); });
  btn.classList.add('bg-primary/5','text-primary','font-semibold'); btn.classList.remove('text-on-surface-variant');
  Toast.show('Settings section: '+id,'info');
}
function togglePref(btn, key) {
  const thumb = btn.querySelector('div');
  const isOn = btn.classList.contains('bg-primary');
  btn.classList.toggle('bg-primary',!isOn);
  btn.classList.toggle('bg-surface-container-high',isOn);
  thumb.className = `absolute top-0.5 ${!isOn?'right-0.5':'left-0.5'} w-5 h-5 bg-white rounded-full shadow-sm transition-all`;
  btn.setAttribute('aria-checked', String(!isOn));
  if(key==='darkMode') toggleDarkMode();
  Toast.show(key+' '+(isOn?'disabled':'enabled')+'.','info');
}

// ====================================================
// GLOBAL UI
// ====================================================
function openAICopilot()  { document.getElementById('ai-drawer').classList.add('open'); }
function closeAICopilot() { document.getElementById('ai-drawer').classList.remove('open'); }
function closeDropdowns() { document.getElementById('notif-panel').classList.add('hidden'); document.getElementById('profile-dropdown').classList.add('hidden'); }
function closeMobileMenu(){ document.getElementById('mobile-sidenav').classList.add('-translate-x-full'); document.getElementById('mobile-overlay').classList.add('hidden'); }

document.getElementById('ai-fab').addEventListener('click', openAICopilot);
document.getElementById('ai-close').addEventListener('click', closeAICopilot);

document.getElementById('notif-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('profile-dropdown').classList.add('hidden');
  document.getElementById('notif-panel').classList.toggle('hidden');
});

document.getElementById('profile-btn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('notif-panel').classList.add('hidden');
  document.getElementById('profile-dropdown').classList.toggle('hidden');
});

document.addEventListener('click', () => closeDropdowns());

function clearNotifications() {
  document.getElementById('notif-dot').classList.add('hidden');
  document.getElementById('notif-panel').classList.add('hidden');
  Toast.show('All notifications marked as read.','success');
}

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('mobile-sidenav').classList.remove('-translate-x-full');
  document.getElementById('mobile-overlay').classList.remove('hidden');
});

let isDark = false;
function toggleDarkMode() {
  isDark = !isDark;
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('theme-icon').textContent = isDark ? 'dark_mode' : 'light_mode';
}
document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);

document.getElementById('global-search').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const val = e.target.value.trim().toLowerCase();
  const map = {dashboard:'/',analytic:'/analytics',forecast:'/forecasts',inventor:'/inventory',strateg:'/strategy',report:'/reports',setting:'/settings'};
  for (const [k,r] of Object.entries(map)) { if(val.includes(k)){ Toast.show('Navigating to '+k+'…','info'); setTimeout(()=>navigate(r),300); e.target.value=''; return; } }
  Toast.show('No matching page found.','warning');
});

// ── Init ──────────────────────────────────────────────────
AICopilot.init();
navigate(location.pathname || '/', false);
