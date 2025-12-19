const $ = (id) => document.getElementById(id);

const q = $("q");
const list = $("list");

const searchGoogle = $("searchGoogle");
const searchYouTube = $("searchYouTube");
const searchNaver = $("searchNaver");

const links = [
  {
    title: "MediaRecorder (내보내기/녹화) - MDN",
    desc: "WebM 내보내기, mimeType, 녹화 기본",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder",
  },
  {
    title: "Canvas 2D filter (밝기/대비/채도/블러) - MDN",
    desc: "brightness/contrast/saturate/blur 적용",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter",
  },
  {
    title: "Video/Audio captureStream - MDN",
    desc: "video.captureStream(), 오디오 트랙 가져오기",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream",
  },
  {
    title: "WebVTT 자막 포맷 - MDN",
    desc: ".vtt 자막 표준, 나중에 자막 파일 지원할 때",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API",
  },
  {
    title: "Web Audio API - MDN",
    desc: "볼륨/이펙트/믹싱 확장할 때",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API",
  },
];

function escapeHtml(s){
  return String(s ?? "").replace(/[<>&"]/g, m => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[m]));
}

function render(){
  const keyword = (q.value || "").trim().toLowerCase();

  const filtered = links.filter(l => {
    if (!keyword) return true;
    const hay = `${l.title} ${l.desc}`.toLowerCase();
    return hay.includes(keyword);
  });

  list.innerHTML = "";
 if (filtered.length === 0){
  list.innerHTML = "";
  return;
}

  for (const l of filtered){
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div>
        <div class="title">${escapeHtml(l.title)}</div>
        <div class="desc">${escapeHtml(l.desc)}</div>
      </div>
      <a class="btn2" href="${l.url}" target="_blank" rel="noopener">열기</a>
    `;
    list.appendChild(item);
  }
}

function getQuery(){
  return (q.value || "").trim();
}

function openSearch(baseUrl){
  const query = getQuery();
  const finalQ = query ? query : "영상 편집 웹 만들기 자막 클립 MediaRecorder";
  window.open(baseUrl + encodeURIComponent(finalQ), "_blank", "noopener");
}

searchGoogle.addEventListener("click", () => openSearch("https://www.google.com/search?q="));
searchYouTube.addEventListener("click", () => openSearch("https://www.youtube.com/results?search_query="));
searchNaver.addEventListener("click", () => openSearch("https://search.naver.com/search.naver?query="));

q.addEventListener("input", render);

render();
