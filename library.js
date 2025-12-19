const $ = (id) => document.getElementById(id);

const searchEl = $("search");
const newNameEl = $("newName");
const newBtn = $("newBtn");
const importBtn = $("importBtn");
const exportAllBtn = $("exportAllBtn");
const wipeBtn = $("wipeBtn");
const grid = $("grid");
const importFile = $("importFile");

const LS_INDEX = "videoStudio.projects.v1"; // [{id,name,createdAt,updatedAt}]
const LS_PROJ_PREFIX = "videoStudio.project.v1."; // + id => data

function uid(){
  return (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
}
function nowISO(){ return new Date().toISOString(); }
function safeText(s){ return String(s ?? "").replace(/[<>&"]/g, (m)=>({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[m])); }

function loadIndex(){
  try { return JSON.parse(localStorage.getItem(LS_INDEX) || "[]"); }
  catch { return []; }
}
function saveIndex(arr){
  localStorage.setItem(LS_INDEX, JSON.stringify(arr));
}
function loadProject(id){
  try { return JSON.parse(localStorage.getItem(LS_PROJ_PREFIX + id) || "null"); }
  catch { return null; }
}
function saveProject(id, data){
  localStorage.setItem(LS_PROJ_PREFIX + id, JSON.stringify(data));
}
function deleteProject(id){
  localStorage.removeItem(LS_PROJ_PREFIX + id);
  const idx = loadIndex().filter(p => p.id !== id);
  saveIndex(idx);
}

function sortByUpdatedDesc(a,b){
  return (b.updatedAt || "").localeCompare(a.updatedAt || "");
}

function openEditor(id){
  // edit.html은 pages 폴더 안에 있으므로 같은 폴더 경로
  location.href = `./edit.html?pid=${encodeURIComponent(id)}`;
}

function render(){
  const q = (searchEl.value || "").trim().toLowerCase();
  const list = loadIndex()
    .filter(p => !q || (p.name || "").toLowerCase().includes(q))
    .sort(sortByUpdatedDesc);

  grid.innerHTML = "";

  if (list.length === 0){
    grid.innerHTML = `<div class="muted" style="grid-column:1/-1;">프로젝트가 없어. 위에서 새 프로젝트를 만들어봐.</div>`;
    return;
  }

  for (const p of list){
    const data = loadProject(p.id) || {};
    const clipsCount = Array.isArray(data.clips) ? data.clips.length : 0;
    const subsCount = Array.isArray(data.subtitles) ? data.subtitles.length : 0;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="cardTop">
        <div>
          <h3 class="title">${safeText(p.name || "Untitled")}</h3>
          <div class="meta">최근 수정: ${safeText((p.updatedAt || "").replace("T"," ").slice(0,19))}</div>
        </div>
        <div class="badges">
          <span class="badge">🎬 클립 ${clipsCount}</span>
          <span class="badge">💬 자막 ${subsCount}</span>
        </div>
      </div>

      <div class="row">
        <button class="btn2 primary" type="button" data-act="open">열기</button>
        <button class="btn2" type="button" data-act="rename">이름변경</button>
        <button class="btn2" type="button" data-act="export">내보내기</button>
        <button class="btn2 danger" type="button" data-act="del">삭제</button>
      </div>

      <div class="muted">팁) 열기 → edit에서 자동 저장됨. 영상은 다시 선택!</div>
    `;

    card.querySelector('[data-act="open"]').addEventListener("click", () => openEditor(p.id));

    card.querySelector('[data-act="rename"]').addEventListener("click", () => {
      const next = prompt("프로젝트 이름", p.name || "");
      if (next === null) return;
      const name = next.trim() || "Untitled";
      const idx = loadIndex();
      const i = idx.findIndex(x => x.id === p.id);
      if (i >= 0){
        idx[i] = { ...idx[i], name, updatedAt: nowISO() };
        saveIndex(idx);
      }
      render();
    });

    card.querySelector('[data-act="export"]').addEventListener("click", () => {
      const payload = {
        meta: { exportedAt: nowISO(), app: "Video Studio", version: 1 },
        project: loadProject(p.id) || null,
        index: p
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${(p.name||"untitled").replace(/\s+/g,"_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    card.querySelector('[data-act="del"]').addEventListener("click", () => {
      if (!confirm(`삭제할까?\n\n${p.name}`)) return;
      deleteProject(p.id);
      render();
    });

    grid.appendChild(card);
  }
}

/* ====== 새 프로젝트 ====== */
newBtn.addEventListener("click", () => {
  const name = (newNameEl.value || "").trim() || "Untitled";
  const id = uid();
  const t = nowISO();

  const idx = loadIndex();
  idx.push({ id, name, createdAt: t, updatedAt: t });
  saveIndex(idx);

  // 프로젝트 기본 데이터 생성
  saveProject(id, {
    id,
    name,
    createdAt: t,
    updatedAt: t,
    // 편집 데이터(자동 저장될 영역)
    clips: [],
    subtitles: [],
    settings: {
      filters: { bright: 100, contrast: 100, sat: 100, blur: 0 },
      watermark: { text: "", size: 42, color: "#ffffff", x: 0.05, y: 0.92 },
      subsOn: true,
      clipsOn: false
    }
  });

  openEditor(id);
});

/* ====== 검색 ====== */
searchEl.addEventListener("input", render);

/* ====== 전체 내보내기 ====== */
exportAllBtn.addEventListener("click", () => {
  const idx = loadIndex().sort(sortByUpdatedDesc);
  const all = idx.map(p => ({ index: p, project: loadProject(p.id) }));
  const payload = { meta: { exportedAt: nowISO(), app: "Video Studio", version: 1 }, all };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `video_studio_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ====== 가져오기(JSON) ====== */
importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async () => {
  const f = importFile.files?.[0];
  importFile.value = "";
  if (!f) return;

  try{
    const text = await f.text();
    const json = JSON.parse(text);

    // 단일 프로젝트 내보내기 형식
    if (json?.project?.id && json?.index?.id){
      const id = json.index.id;
      const idx = loadIndex().filter(p => p.id !== id);
      idx.push({ ...json.index, updatedAt: nowISO() });
      saveIndex(idx);
      saveProject(id, { ...json.project, updatedAt: nowISO() });
      render();
      return;
    }

    // 전체 백업 형식
    if (Array.isArray(json?.all)){
      const idx = loadIndex();
      const map = new Map(idx.map(p => [p.id, p]));
      for (const entry of json.all){
        if (!entry?.index?.id) continue;
        map.set(entry.index.id, { ...entry.index, updatedAt: nowISO() });
        if (entry.project?.id) saveProject(entry.index.id, { ...entry.project, updatedAt: nowISO() });
      }
      saveIndex([...map.values()]);
      render();
      return;
    }

    alert("지원하지 않는 JSON 형식이야!");
  }catch(e){
    alert("가져오기에 실패했어. JSON 파일이 맞는지 확인해줘!");
  }
});

/* ====== 전체 삭제 ====== */
wipeBtn.addEventListener("click", () => {
  if (!confirm("전체 프로젝트를 삭제할까? (되돌릴 수 없음)")) return;
  const idx = loadIndex();
  for (const p of idx) localStorage.removeItem(LS_PROJ_PREFIX + p.id);
  localStorage.removeItem(LS_INDEX);
  render();
});

render();
