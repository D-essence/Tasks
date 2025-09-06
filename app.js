export default function App({ saveData, loadData, userId }) {
  const state = {
    currentTab: "home",
    tasks: {}, // { 'YYYY-MM-DD': [{id, title, done}] }
    kpis: []   // [{id, title, deadline, done?:bool}]
  };

  // ============ Utils ============
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const todayKey = () => new Date().toISOString().slice(0,10);
  const uidLabel = $("#uid-label");
  if (uidLabel) uidLabel.textContent = userId || "myUser";

  function uuid() { return 'xxxxxxxx'.replace(/x/g,()=> (Math.random()*16|0).toString(16)); }
  function fmtDate(dstr){
    if (!dstr) return "";
    const d = new Date(dstr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function setUpdatedNow(){
    const el = $("#last-updated");
    if (!el) return;
    const now = new Date();
    const jp = now.toLocaleString("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    el.textContent = `保存: ${jp}`;
  }

  async function persist(){
    await saveData({
      tasks: state.tasks,
      kpis: state.kpis
    });
    setUpdatedNow();
  }

  // ============ Load on start ============
  (async function boot(){
    try{
      const data = await loadData();
      if (data){
        state.tasks = data.tasks || {};
        state.kpis  = data.kpis  || [];
      } else {
        // 初回
        state.tasks[todayKey()] = [];
        state.kpis = [];
        await persist();
      }
    }catch(e){
      console.error("load error", e);
      state.tasks[todayKey()] = state.tasks[todayKey()] || [];
    }
    bindNav();
    bindHome();
    bindToday();
    bindKPI();
    renderAll();
  })();

  // ============ Navigation (双方向OK) ============
  function switchTab(tab){
    state.currentTab = tab;
    $$(".tab-section").forEach(s => s.classList.add("hidden"));
    $(`#tab-${tab}`).classList.remove("hidden");
    $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  }
  function bindNav(){
    $$(".tab-btn").forEach(btn => btn.addEventListener("click", ()=> switchTab(btn.dataset.tab)));
    $("#go-today")?.addEventListener("click", ()=> switchTab("today"));
    $("#go-kpi")?.addEventListener("click", ()=> switchTab("kpi"));
    $("#to-home")?.addEventListener("click", ()=> switchTab("home"));
    $("#to-kpi")?.addEventListener("click", ()=> switchTab("kpi"));
    $("#kpi-to-home")?.addEventListener("click", ()=> switchTab("home"));
    $("#kpi-to-today")?.addEventListener("click", ()=> switchTab("today"));
    $("#force-save")?.addEventListener("click", persist);
    switchTab("home");
  }

  // ============ Home ============
  function bindHome(){ /* no-op for now */ }
  function renderHome(){
    const list = state.tasks[todayKey()] || [];
    $("#home-today-count").textContent = String(list.filter(t=>!t.done).length);
    $("#home-kpi-open").textContent = String(state.kpis.filter(k=>!k.done).length);
  }

  // ============ Today Tasks ============
  function bindToday(){
    $("#add-task-btn")?.addEventListener("click", ()=>{
      const input = $("#new-task-input");
      const title = input.value.trim();
      if (!title) return;
      const key = todayKey();
      state.tasks[key] = state.tasks[key] || [];
      state.tasks[key].push({ id: uuid(), title, done:false });
      input.value = "";
      renderToday();
      persist();
      renderHome();
    });
  }
  function renderToday(){
    const ul = $("#task-list");
    ul.innerHTML = "";
    const key = todayKey();
    const items = (state.tasks[key] || []);
    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <input type="checkbox" ${item.done ? "checked":""} />
        <div class="title">${escapeHtml(item.title)}</div>
        <button class="del">削除</button>
      `;
      const cb = li.querySelector("input[type=checkbox]");
      cb.addEventListener("change", ()=>{
        item.done = cb.checked;
        persist();
        renderHome();
      });
      li.querySelector(".del").addEventListener("click", ()=>{
        const arr = state.tasks[key];
        const idx = arr.findIndex(t=>t.id===item.id);
        if (idx>=0) arr.splice(idx,1);
        ul.removeChild(li);
        persist();
        renderHome();
      });
      ul.appendChild(li);
    });
  }

  // ============ KPI list ============
  function bindKPI(){
    $("#add-kpi-btn")?.addEventListener("click", ()=>{
      const title = $("#kpi-title-input").value.trim();
      const deadline = $("#kpi-deadline-input").value || null;
      if (!title) return;
      state.kpis.push({ id: uuid(), title, deadline, done:false });
      $("#kpi-title-input").value = "";
      $("#kpi-deadline-input").value = "";
      renderKPI();
      persist();
      renderHome();
    });
  }
  function renderKPI(){
    const ul = $("#kpi-list");
    ul.innerHTML = "";
    const sorted = [...state.kpis].sort((a,b)=> (a.done - b.done) || ((a.deadline||"") > (b.deadline||"") ? 1 : -1));
    sorted.forEach(kpi => {
      const li = document.createElement("li");
      li.className = "item";
      const due = kpi.deadline ? fmtDate(kpi.deadline) : "期限なし";
      li.innerHTML = `
        <input type="checkbox" ${kpi.done ? "checked":""} />
        <div class="title">${escapeHtml(kpi.title)} <span class="meta">(${due})</span></div>
        <button class="del">削除</button>
      `;
      li.querySelector("input").addEventListener("change", (e)=>{
        kpi.done = e.target.checked;
        persist();
        renderHome();
      });
      li.querySelector(".del").addEventListener("click", ()=>{
        const idx = state.kpis.findIndex(x=>x.id===kpi.id);
        if (idx>=0) state.kpis.splice(idx,1);
        li.remove();
        persist();
        renderHome();
      });
      ul.appendChild(li);
    });
  }

  // ============ Render all ============
  function renderAll(){
    renderHome();
    renderToday();
    renderKPI();
  }

  // ============ helpers ============
  function escapeHtml(str){
    return str.replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}
