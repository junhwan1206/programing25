const $ = (id) => document.getElementById(id);

const file = $("file");
const video = $("video");
const canvas = $("canvas");
const ctx = canvas.getContext("2d");

const playBtn = $("play");
const pauseBtn = $("pause");
const seek = $("seek");
const timeInfo = $("timeInfo");

const inTimeEl = $("inTime");
const outTimeEl = $("outTime");
const setInBtn = $("setIn");
const setOutBtn = $("setOut");
const loopEl = $("loop");

const speed = $("speed");
const speedText = $("speedText");

const bright = $("bright");
const contrast = $("contrast");
const sat = $("sat");
const blur = $("blur");
const resetFx = $("resetFx");

const text = $("text");
const textSize = $("textSize");
const textColor = $("textColor");
const textX = $("textX");
const textY = $("textY");

const exportBtn = $("export");
const download = $("download");

/* ✅ 클립 UI */
const clipsOn = $("clipsOn");
const clipAdd = $("clipAdd");
const clipClearAll = $("clipClearAll");
const clipList = $("clipList");

/* ✅ 자막 UI */
const subsOn = $("subsOn");
const subTextInput = $("subTextInput");
const subStart = $("subStart");
const subEnd = $("subEnd");
const subSetStart = $("subSetStart");
const subSetEnd = $("subSetEnd");
const subSize = $("subSize");
const subColor = $("subColor");
const subAdd = $("subAdd");
const subUpdate = $("subUpdate");
const subClear = $("subClear");
const subList = $("subList");

let rafId = null;
let duration = 0;

/* =========================
   데이터
========================= */
let clips = []; // {id, start, end}
let playClipIndex = 0;

let subtitles = []; // {id, text, start, end, size, color}
let selectedSubId = null;

/* =========================
   유틸
========================= */
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function fmt(t){
  t = Math.max(0, t || 0);
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(Math.floor(t % 60)).padStart(2, "0");
  return `${mm}:${ss}`;
}
function fmtSec(t){
  return `${fmt(t)} (${(t||0).toFixed(2)}s)`;
}
function idgen(){
  return (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
}

/* =========================
   UI enable
========================= */
function enableUI(on){
  [
    playBtn, pauseBtn, seek, inTimeEl, outTimeEl, setInBtn, setOutBtn,
    speed, bright, contrast, sat, blur, resetFx,
    text, textSize, textColor, textX, textY,
    exportBtn,

    clipsOn, clipAdd, clipClearAll,

    subTextInput, subStart, subEnd, subSetStart, subSetEnd,
    subSize, subColor, subAdd, subUpdate, subClear
  ].forEach(el => el.disabled = !on);
}

/* =========================
   캔버스/프레임
========================= */
function resizeCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
}

function currentInOut(){
  const inT = clamp(parseFloat(inTimeEl.value || "0"), 0, duration);
  const outT = clamp(parseFloat(outTimeEl.value || String(duration)), 0, duration);
  return { inT: Math.min(inT, outT), outT: Math.max(inT, outT) };
}

function applyFilters(){
  ctx.filter = `brightness(${bright.value}%) contrast(${contrast.value}%) saturate(${sat.value}%) blur(${blur.value}px)`;
}

function rectWidth(){
  return canvas.getBoundingClientRect().width || 1;
}

/* =========================
   ✅ 클립 기능
========================= */
function normalizeClip(start, end){
  const a = clamp(parseFloat(start), 0, duration);
  const b = clamp(parseFloat(end), 0, duration);
  const s = Math.min(a,b);
  const e = Math.max(a,b);
  return { start: s, end: e };
}

function getSortedClips(){
  return [...clips].sort((a,b) => a.start - b.start);
}

function renderClipList(){
  clipList.innerHTML = "";
  if (clips.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "클립이 아직 없어. In/Out 잡고 ‘클립 추가’ 눌러봐.";
    clipList.appendChild(empty);
    return;
  }

  const sorted = getSortedClips();
  sorted.forEach((c, idx) => {
    const item = document.createElement("div");
    item.className = "item";

    const main = document.createElement("div");
    main.className = "itemMain";
    main.title = "클릭하면 해당 구간 시작으로 이동";

    const t = document.createElement("div");
    t.className = "itemTime";
    t.textContent = `${fmtSec(c.start)}  ~  ${fmtSec(c.end)}`;

    const tx = document.createElement("div");
    tx.className = "itemText";
    tx.textContent = `클립 ${idx+1}`;

    main.appendChild(t);
    main.appendChild(tx);

    main.addEventListener("click", () => {
      if (duration) video.currentTime = c.start;
    });

    const btns = document.createElement("div");
    btns.className = "itemBtns";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "miniBtn";
    up.textContent = "↑";
    up.title = "위로(정렬은 시작시간 기준이지만, 빠르게 정리용)";
    up.addEventListener("click", () => {
      // 실제 정렬은 start 기준이지만, 리스트 관리용으로 start를 살짝 바꿔줌(안전한 최소치)
      const eps = 0.0001;
      c.start = Math.max(0, c.start - eps);
      c.end = Math.max(c.start + 0.01, c.end - eps);
      renderClipList();
       scheduleSave();
    });

    const down = document.createElement("button");
    down.type = "button";
    down.className = "miniBtn";
    down.textContent = "↓";
    down.title = "아래로";
    down.addEventListener("click", () => {
      const eps = 0.0001;
      c.start = Math.min(duration, c.start + eps);
      c.end = Math.min(duration, Math.max(c.start + 0.01, c.end + eps));
      renderClipList();
      scheduleSave();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "miniBtn danger";
    del.textContent = "삭제";
    del.addEventListener("click", () => {
      clips = clips.filter(x => x.id !== c.id);
      renderClipList();
       scheduleSave();
    });

    btns.appendChild(up);
    btns.appendChild(down);
    btns.appendChild(del);

    item.appendChild(main);
    item.appendChild(btns);
    clipList.appendChild(item);
  });
}

function addClipFromInOut(){
  if (!duration) return;
  const { inT, outT } = currentInOut();
  if (outT <= inT + 0.01){
    alert("Out이 In보다 커야 클립을 만들 수 있어!");
    return;
  }
  clips.push({ id: idgen(), start: inT, end: outT });
  renderClipList();
}
// ===== 프로젝트 저장(라이브러리 연동) =====
const LS_INDEX = "videoStudio.projects.v1";
const LS_PROJ_PREFIX = "videoStudio.project.v1.";
const pid = new URLSearchParams(location.search).get("pid");

function loadIndex(){
  try { return JSON.parse(localStorage.getItem(LS_INDEX) || "[]"); }
  catch { return []; }
}
function saveIndex(arr){
  localStorage.setItem(LS_INDEX, JSON.stringify(arr));
}
function loadProject(){
  if (!pid) return null;
  try { return JSON.parse(localStorage.getItem(LS_PROJ_PREFIX + pid) || "null"); }
  catch { return null; }
}
function saveProject(data){
  if (!pid) return;
  localStorage.setItem(LS_PROJ_PREFIX + pid, JSON.stringify(data));
}
function touchProjectName(defaultName="Untitled"){
  if (!pid) return;
  const idx = loadIndex();
  const i = idx.findIndex(p => p.id === pid);
  if (i >= 0){
    idx[i] = { ...idx[i], updatedAt: new Date().toISOString(), name: idx[i].name || defaultName };
    saveIndex(idx);
  }
}


/* 재생 중 클립 자동 넘기기 */
function handleClipPlayback(){
  if (!clipsOn.checked || clips.length === 0) return;

  const sorted = getSortedClips();
  if (playClipIndex >= sorted.length) {
    video.pause();
    return;
  }

  const cur = sorted[playClipIndex];
  const t = video.currentTime || 0;

  // 현재가 클립 범위 바깥이면 해당 클립 start로 맞추기
  if (t < cur.start - 0.02 || t > cur.end + 0.02){
    video.currentTime = cur.start;
    return;
  }

  // 클립 끝 도달 → 다음 클립으로 점프
  if (t >= cur.end){
    playClipIndex++;
    if (playClipIndex >= sorted.length){
      if (loopEl.checked){
        playClipIndex = 0;
        video.currentTime = sorted[0].start;
      }else{
        video.pause();
      }
      return;
    }
    video.currentTime = sorted[playClipIndex].start;
  }
}

/* =========================
   ✅ 자막 기능
========================= */
function clearSubtitleForm(){
  selectedSubId = null;
  subTextInput.value = "";
  subStart.value = "0";
  subEnd.value = Math.min(2, duration || 2).toFixed(2);
  subSize.value = "44";
  subColor.value = "#ffffff";
}

function pickSubtitleToForm(id){
  const s = subtitles.find(x => x.id === id);
  if (!s) return;
  selectedSubId = id;
  subTextInput.value = s.text;
  subStart.value = s.start.toFixed(2);
  subEnd.value = s.end.toFixed(2);
  subSize.value = String(s.size || 44);
  subColor.value = s.color || "#ffffff";
}

function renderSubtitleList(){
  subList.innerHTML = "";
  if (subtitles.length === 0){
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "자막이 아직 없어. ‘자막 추가’로 만들어봐.";
    subList.appendChild(empty);
    return;
  }

  const sorted = [...subtitles].sort((a,b) => a.start - b.start);
  for (const s of sorted){
    const item = document.createElement("div");
    item.className = "item";

    const main = document.createElement("div");
    main.className = "itemMain";
    main.title = "클릭해서 수정";

    const t = document.createElement("div");
    t.className = "itemTime";
    t.textContent = `${fmtSec(s.start)}  ~  ${fmtSec(s.end)}`;

    const tx = document.createElement("div");
    tx.className = "itemText";
    tx.textContent = s.text.replace(/\n/g, " / ");

    main.appendChild(t);
    main.appendChild(tx);

    main.addEventListener("click", () => {
      pickSubtitleToForm(s.id);
      if (duration) video.currentTime = clamp(s.start, 0, duration);
    });

    const btns = document.createElement("div");
    btns.className = "itemBtns";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "miniBtn danger";
    del.textContent = "삭제";
    del.addEventListener("click", () => {
      subtitles = subtitles.filter(x => x.id !== s.id);
      if (selectedSubId === s.id) clearSubtitleForm();
      renderSubtitleList();
      scheduleSave();
    });

    btns.appendChild(del);
    item.appendChild(main);
    item.appendChild(btns);
    subList.appendChild(item);
  }
}

function getActiveSubtitle(t){
  if (!subsOn.checked) return null;
  const act = subtitles
    .filter(s => t >= s.start && t <= s.end)
    .sort((a,b) => (a.end - t) - (b.end - t));
  return act[0] || null;
}

function drawSubtitle(sub, x, y, w, h){
  if (!sub) return;
  const txt = (sub.text || "").trim();
  if (!txt) return;

  const base = rectWidth();
  const scale = (base / 900) * (window.devicePixelRatio || 1);
  const fontPx = Math.max(14, Math.floor((sub.size || 44) * scale));

  ctx.save();
  ctx.filter = "none";
  ctx.font = `900 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const tx = x + w * 0.5;
  const ty = y + h * 0.88;

  const lines = txt.split("\n").slice(0, 3);
  const lineGap = Math.floor(fontPx * 1.15);
  const startY = ty - ((lines.length - 1) * lineGap) / 2;

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 10;
  ctx.lineWidth = Math.max(4, Math.floor(fontPx * 0.18));
  ctx.strokeStyle = "rgba(0,0,0,0.70)";
  ctx.fillStyle = sub.color || "#ffffff";

  for (let i=0;i<lines.length;i++){
    const ly = startY + i * lineGap;
    ctx.strokeText(lines[i], tx, ly);
    ctx.shadowBlur = 0;
    ctx.fillText(lines[i], tx, ly);
    ctx.shadowBlur = 10;
  }
  ctx.restore();
}

function addSubtitle(){
  const txt = (subTextInput.value || "").trim();
  if (!txt){ alert("자막 내용을 입력해줘!"); return; }

  const a = clamp(parseFloat(subStart.value || "0"), 0, duration || 999999);
  const b = clamp(parseFloat(subEnd.value || "0"), 0, duration || 999999);
  const start = Math.min(a,b), end = Math.max(a,b);
  if (end <= start + 0.01){ alert("끝 시간은 시작 시간보다 커야 해!"); return; }

  subtitles.push({
    id: idgen(),
    text: txt,
    start,
    end,
    size: clamp(parseFloat(subSize.value || "44"), 14, 120),
    color: subColor.value || "#ffffff"
  });

  renderSubtitleList();
}

function updateSubtitle(){
  if (!selectedSubId){ alert("수정할 자막을 리스트에서 먼저 선택해줘!"); return; }
  const idx = subtitles.findIndex(x => x.id === selectedSubId);
  if (idx < 0) return;

  const txt = (subTextInput.value || "").trim();
  if (!txt){ alert("자막 내용을 입력해줘!"); return; }

  const a = clamp(parseFloat(subStart.value || "0"), 0, duration || 999999);
  const b = clamp(parseFloat(subEnd.value || "0"), 0, duration || 999999);
  const start = Math.min(a,b), end = Math.max(a,b);
  if (end <= start + 0.01){ alert("끝 시간은 시작 시간보다 커야 해!"); return; }

  subtitles[idx] = {
    ...subtitles[idx],
    text: txt,
    start,
    end,
    size: clamp(parseFloat(subSize.value || "44"), 14, 120),
    color: subColor.value || "#ffffff"
  };

  renderSubtitleList();
}

/* =========================
   draw/tick
========================= */
function drawFrame(){
  if (!duration) return;

  resizeCanvas();
  ctx.save();
  applyFilters();

  const cw = canvas.width, ch = canvas.height;
  const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
  const scale = Math.min(cw / vw, ch / vh);
  const w = vw * scale;
  const h = vh * scale;
  const x = (cw - w) / 2;
  const y = (ch - h) / 2;

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(video, x, y, w, h);

  // 워터마크 텍스트
  const txt = (text.value || "").trim();
  if (txt){
    ctx.filter = "none";
    const size = clamp(parseFloat(textSize.value || "42"), 10, 200);
    const px = clamp(parseFloat(textX.value || "0.05"), 0, 1);
    const py = clamp(parseFloat(textY.value || "0.92"), 0, 1);
    const fontPx = Math.floor(size * (canvas.width / (rectWidth() * (window.devicePixelRatio||1))));
    ctx.font = `900 ${Math.max(14, fontPx)}px system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    const tx2 = x + w * px;
    const ty2 = y + h * py;

    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.strokeText(txt, tx2, ty2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = textColor.value || "#ffffff";
    ctx.fillText(txt, tx2, ty2);
  }

  // 자막
  const activeSub = getActiveSubtitle(video.currentTime || 0);
  drawSubtitle(activeSub, x, y, w, h);

  ctx.restore();
}

function tick(){
  if (duration){
    const v = video.currentTime || 0;
    timeInfo.textContent = `${fmt(v)} / ${fmt(duration)}`;

    const pos = (v / duration) * 1000;
    if (!seek.matches(":active")) seek.value = String(clamp(pos, 0, 1000));

    // In/Out 반복(클립 모드 아닐 때만)
    if (!clipsOn.checked || clips.length === 0){
      const { inT, outT } = currentInOut();
      if (loopEl.checked && v >= outT){
        video.currentTime = inT;
      }
    }else{
      // ✅ 클립 자동 넘기기
      if (!video.paused) handleClipPlayback();
    }
  }

  drawFrame();
  rafId = requestAnimationFrame(tick);
}

function stopLoop(){
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

/* =========================
   로드/재생/탐색 이벤트
========================= */
file.addEventListener("change", () => {
  const f = file.files?.[0];
  if (!f) return;

  download.style.display = "none";
  download.href = "#";

  const url = URL.createObjectURL(f);
  video.src = url;

  video.onloadedmetadata = () => {
    duration = video.duration || 0;
    inTimeEl.value = "0";
    outTimeEl.value = String(duration.toFixed(2));
   enableUI(true);

// ✅ 프로젝트 불러오기(라이브러리 연동)
const proj = loadProject?.(); // (loadProject 함수가 위에 있어야 함)

if (proj) {
  // 설정 복원
  const f = proj.settings?.filters || {};
  bright.value = String(f.bright ?? 100);
  contrast.value = String(f.contrast ?? 100);
  sat.value = String(f.sat ?? 100);
  blur.value = String(f.blur ?? 0);

  const w = proj.settings?.watermark || {};
  text.value = w.text ?? "";
  textSize.value = String(w.size ?? 42);
  textColor.value = w.color ?? "#ffffff";
  textX.value = String(w.x ?? 0.05);
  textY.value = String(w.y ?? 0.92);

  if (typeof proj.settings?.subsOn === "boolean") subsOn.checked = proj.settings.subsOn;
  if (typeof proj.settings?.clipsOn === "boolean") clipsOn.checked = proj.settings.clipsOn;

  // 데이터(클립/자막) 복원
  clips = Array.isArray(proj.clips) ? proj.clips : [];
  subtitles = Array.isArray(proj.subtitles) ? proj.subtitles : [];

  renderClipList();
  renderSubtitleList();
} else {
  // 프로젝트가 없을 때만 기본 초기화
  clips = [];
  renderClipList();

  clearSubtitleForm();
  renderSubtitleList();
}


    video.currentTime = 0;
    stopLoop();
    tick();
  };
});

playBtn.addEventListener("click", async () => {
  if (!duration) return;

  if (clipsOn.checked && clips.length > 0){
    const sorted = getSortedClips();
    playClipIndex = 0;
    video.currentTime = sorted[0].start;
    await new Promise(r => video.addEventListener("seeked", r, { once:true }));
  }else{
    const { inT, outT } = currentInOut();
    if (video.currentTime < inT || video.currentTime > outT){
      video.currentTime = inT;
      await new Promise(r => video.addEventListener("seeked", r, { once:true }));
    }
  }

  video.playbackRate = parseFloat(speed.value || "1");
  await video.play();
});

pauseBtn.addEventListener("click", () => video.pause());

seek.addEventListener("input", () => {
  if (!duration) return;
  const p = parseFloat(seek.value || "0") / 1000;
  video.currentTime = clamp(p * duration, 0, duration);
});

setInBtn.addEventListener("click", () => {
  const t = clamp(video.currentTime || 0, 0, duration);
  const outT = clamp(parseFloat(outTimeEl.value || String(duration)), 0, duration);
  inTimeEl.value = String(Math.min(t, outT).toFixed(2));
});
setOutBtn.addEventListener("click", () => {
  const t = clamp(video.currentTime || 0, 0, duration);
  const inT = clamp(parseFloat(inTimeEl.value || "0"), 0, duration);
  outTimeEl.value = String(Math.max(t, inT).toFixed(2));
});

speed.addEventListener("input", () => {
  const v = parseFloat(speed.value || "1");
  speedText.textContent = `${v.toFixed(2)}x`;
  video.playbackRate = v;
});

resetFx.addEventListener("click", () => {
  bright.value = "100";
  contrast.value = "100";
  sat.value = "100";
  blur.value = "0";
});
// 필터 슬라이더 저장
bright.addEventListener("input", scheduleSave);
contrast.addEventListener("input", scheduleSave);
sat.addEventListener("input", scheduleSave);
blur.addEventListener("input", scheduleSave);

// resetFx도 저장 포함
resetFx.addEventListener("click", () => {
  bright.value = "100";
  contrast.value = "100";
  sat.value = "100";
  blur.value = "0";
  scheduleSave();
});

// 워터마크 저장
text.addEventListener("input", scheduleSave);
textSize.addEventListener("input", scheduleSave);
textColor.addEventListener("input", scheduleSave);
textX.addEventListener("input", scheduleSave);
textY.addEventListener("input", scheduleSave);


/* =========================
   ✅ 클립 이벤트
========================= */
clipAdd.addEventListener("click", () => {
  addClipFromInOut();
  scheduleSave();
});

clipClearAll.addEventListener("click", () => {
  clips = [];
  renderClipList();
  scheduleSave();
});

clipsOn.addEventListener("change", () => {
  scheduleSave();
});

/* =========================
   ✅ 자막 이벤트
========================= */
subSetStart.addEventListener("click", () => {
  const t = clamp(video.currentTime || 0, 0, duration || 999999);
  subStart.value = t.toFixed(2);
});
subSetEnd.addEventListener("click", () => {
  const t = clamp(video.currentTime || 0, 0, duration || 999999);
  subEnd.value = t.toFixed(2);
});
subAdd.addEventListener("click", () => {
  addSubtitle();
  scheduleSave();
});

subUpdate.addEventListener("click", () => {
  updateSubtitle();
  scheduleSave();
});

subClear.addEventListener("click", () => {
  clearSubtitleForm();
  scheduleSave(); // 원치 않으면 빼도 됨
});

subsOn.addEventListener("change", () => {
  drawFrame();
  scheduleSave();
});


/* =========================
   ✅ 내보내기: In/Out OR 클립 이어붙이기
========================= */
function getExportSegments(){
  if (clipsOn.checked && clips.length > 0){
    return getSortedClips().map(c => normalizeClip(c.start, c.end));
  }
  const { inT, outT } = currentInOut();
  return [ normalizeClip(inT, outT) ];
}

exportBtn.addEventListener("click", async () => {
  if (!duration) return;

  download.style.display = "none";
  download.href = "#";

  exportBtn.disabled = true;
  playBtn.disabled = true;

  const segs = getExportSegments();
  if (segs.length === 0){
    alert("내보낼 구간이 없어!");
    exportBtn.disabled = false;
    playBtn.disabled = false;
    return;
  }
  // 유효성
  for (const s of segs){
    if (s.end <= s.start + 0.01){
      alert("구간 중에 Out <= In 인 게 있어. 클립/인아웃 다시 확인해줘!");
      exportBtn.disabled = false;
      playBtn.disabled = false;
      return;
    }
  }

  // 캔버스 스트림
  resizeCanvas();
  const canvasStream = canvas.captureStream(30);

  // 오디오 트랙(가능한 경우)
  let audioTrack = null;
  try{
    await video.play();
    const vStream = video.captureStream?.();
    video.pause();
    if (vStream){
      const aTracks = vStream.getAudioTracks();
      if (aTracks && aTracks.length > 0) audioTrack = aTracks[0];
    }
  }catch(_){}

  const mixed = new MediaStream();
  mixed.addTrack(canvasStream.getVideoTracks()[0]);
  if (audioTrack) mixed.addTrack(audioTrack);

  // MediaRecorder mimeType 선택
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];
  let mimeType = "";
  for (const c of candidates){
    if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
  }

  let rec;
  try{
    rec = new MediaRecorder(mixed, mimeType ? { mimeType } : undefined);
  }catch(e){
    alert("내보내기를 지원하지 않는 브라우저일 수 있어요. 크롬 기반에서 시도해줘!");
    exportBtn.disabled = false;
    playBtn.disabled = false;
    return;
  }

  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  // 내보내기 동안 계속 그리기(자막/워터마크 포함)
  let exporting = true;
  function drawDuringExport(){
    if (!exporting) return;
    drawFrame();
    requestAnimationFrame(drawDuringExport);
  }

  // 녹화 시작
  rec.start(200);
  drawDuringExport();

  // ✅ 구간들을 “순서대로” 플레이하면서 녹화 (중간은 자동으로 건너뜀)
  video.playbackRate = 1;

  for (const s of segs){
    video.currentTime = s.start;
    await new Promise(r => video.addEventListener("seeked", r, { once:true }));

    await video.play();

    await new Promise((resolve) => {
      const checker = () => {
        if ((video.currentTime || 0) >= s.end){
          resolve();
          return;
        }
        requestAnimationFrame(checker);
      };
      checker();
    });

    video.pause();
  }

  exporting = false;
  rec.stop();
  await new Promise((resolve) => rec.onstop = resolve);

  const blob = new Blob(chunks, { type: rec.mimeType || "video/webm" });
  const url = URL.createObjectURL(blob);

  download.href = url;
  download.download = "export.webm";
  download.style.display = "block";

  exportBtn.disabled = false;
  playBtn.disabled = false;
});
let saveTimer = null;
function scheduleSave(){
  if (!pid) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = {
      id: pid,
      name: (loadProject()?.name || "Untitled"),
      updatedAt: new Date().toISOString(),
      clips,
      subtitles,
      settings: {
        filters: {
          bright: +bright.value, contrast: +contrast.value,
          sat: +sat.value, blur: +blur.value
        },
        watermark: {
          text: text.value || "",
          size: +textSize.value,
          color: textColor.value || "#ffffff",
          x: +textX.value, y: +textY.value
        },
        subsOn: !!subsOn.checked,
        clipsOn: !!clipsOn.checked
      }
    };
    saveProject(data);
    touchProjectName(data.name);
  }, 250);
}


window.addEventListener("resize", () => drawFrame());
