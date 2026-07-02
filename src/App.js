import React, { useState, useEffect } from "react";
import "./App.css";

// --- 로고 가이드 파일 세트 ---
// 지도
const MAP_LOGO_GUIDE_LIST = [
  { name: "가로형", orientation: "W", file: process.env.PUBLIC_URL + "/map_splash_logo_W.png" },
  { name: "세로형", orientation: "H", file: process.env.PUBLIC_URL + "/map_splash_logo_H.png" },
];

// 네플스
const NPS_LOGO_GUIDE_LIST = [
  { name: "가로형", orientation: "W", file: process.env.PUBLIC_URL + "/nps_splash_logo_W_1.png" },
  { name: "세로형", orientation: "H", file: process.env.PUBLIC_URL + "/nps_splash_logo_H_1.png" },
];

// 웹툰
const WEBTOON_LOGO_GUIDE_LIST = [
  { name: "가로형-기본", orientation: "W", file: process.env.PUBLIC_URL + "/webtoon_splash_logo_W_1.png" },
  { name: "가로형-정방형", orientation: "W", file: process.env.PUBLIC_URL + "/webtoon_splash_logo_W_2.png" },
  { name: "세로형-기본", orientation: "H", file: process.env.PUBLIC_URL + "/webtoon_splash_logo_H_1.png" },
  { name: "세로형-정방형", orientation: "H", file: process.env.PUBLIC_URL + "/webtoon_splash_logo_H_2.png" },
  { name: "단독형", orientation: "ONLY", file: process.env.PUBLIC_URL + "/webtoon_splash_logo_only.png" },
];

const LOGO_MAX_SIZE_WEBTOON = 40 * 1024;
const LOGO_MAX_SIZE_DEFAULT = 400 * 1024;
const BOTTOM_MAX_SIZE_WEBTOON = 300 * 1024;
const BOTTOM_MAX_SIZE_DEFAULT = 400 * 1024;

// 수동 체크리스트 항목 (기준 문구 포함)
const MANUAL_CHECK_COMMON = [
  {
    id: "check_size",
    label: "최소/최대 사이즈 확인",
    guide: "가로&세로 로고 최소/최대 사이즈를 벗어나지 않도록 제작 필요"
  }
];

const MANUAL_CHECK_MAP = [
  {
    id: "map_logo_contrast_choice",
    label: "지도 로고 컬러 (White/Black)",
    guide: "등록한 배경색과의 대비율이 더 큰 색(White/Black)으로 로고 제작 필요"
  },
  {
    id: "map_check_logo",
    label: "로고 위계 확인",
    guide: "로고 영역에는 이벤트/캠페인 명이 아닌 브랜드로고만 적용 가능 (e.g. 네이버예약 O / 10주년 예약위크 X)"
  }
];

const MANUAL_CHECK_WEBTOON = [
  {
    id: "webtoon_green_logo",
    label: "로고 색상",
    guide: "웹툰 로고는 녹색 사용을 기본 원칙, 광고주 로고 색상이 흰색 & 배경과의 가시성 고려해서 흰색 사용 가능"
  },
  {
    id: "webtoon_logo_type",
    label: "로고 유형",
    guide: "광고주 로고의 유형에 따라 가로형/세로형/정방형 가이드에 맞게 적용 (정렬 및 간격 유지 필수)"
  },
  {
    id: "webtoon_logo_type2",
    label: "로고 단독형 사용",
    guide: "웹툰 로고는 녹색 사용을 기본 원칙, 광고주 로고 색상이 흰색 & 배경과의 가시성 고려해서 흰색 사용 가능"
  },
  {
    id: "webtoon_divider",
    label: "로고 구분선 (디바이더)",
    guide: "로고 간 디바이더는 투명도 50%의 반투명으로 적용하며 배경 컬러에 따라 Black 또는 White 타입 사용"
  },
  {
    id: "webtoon_check_logo",
    label: "로고 위계 확인",
    guide: "광고주 브랜드 로고는 서비스 단위 브랜드로 적용 (상품 & IP를 사용하는 경우 별도 문의)"
  } 

];

const MANUAL_CHECK_BOTTOM_COMMON = [
  {
    id: "bottom_main_area_safe",
    label: "주요 크리에이티브 영역 준수",
    guide: "중앙 주요 Creative 영역(점선 영역)에 핵심 비주얼이 배치되었는지 확인"
  },
  {
    id: "bottom_text_avoid",
    label: "텍스트 배치 지양 영역 회피",
    guide: "하단 텍스트 배치 지양 영역에 주요 정보가 포함되지 않았는지 확인"
  },
  {
    id: "bottom_map_font",
    label: "사용 폰트 가이드 준수",
    guide: "최대 2가지 폰트만 사용 가능, 브랜드 고유 폰트는 고딕형 사용 권장, 폰트 컬러는 최대 2가지만 사용 가능"
  },
  {
    id: "bottom_map_bg",
    label: "이미지 배경 처리 방식",
    guide: "배경이 있는 이미지는 영역을 모두 채우거나 자연스럽게 그라데이션 되도록 처리 권장"
  },
    {
    id: "bottom_image_avoid",
    label: "사용불가 및 제한되는 이미지 확인",
    guide: "제품의 용도나 사용 모습 등이 혐오감을 주거나 신체 일부를 확대하여 혐오감을 주는 경우 노출 불가"
  }
];

const MANUAL_CHECK_BOTTOM_MAP = [
  // TODO: map 브랜드 하단 수동검수 항목 (현재 없음)
];

const MANUAL_CHECK_BOTTOM_WEBTOON = [
  // TODO: webtoon 브랜드 하단 수동검수 항목 (현재 없음)
];

// 웹툰앱 동영상형 '하단 동영상' 수동 체크리스트
const MANUAL_CHECK_BOTTOM_VIDEO = [
  { id: "video_creative_area", label: "주요 크리에이티브 영역 준수",
    guide: "중앙 주요 Creative 영역(점선 영역)에 핵심 비주얼이 배치되었는지 확인" },
  { id: "video_text_avoid", label: "텍스트 배치 지양 영역 준수",
    guide: "하단 텍스트 배치 지양 영역에 주요 정보가 포함되지 않았는지 확인" },
  { id: "video_font", label: "사용 폰트 가이드 준수",
    guide: "최대 2가지 폰트만 사용 가능, 브랜드 고유 폰트는 고딕형 사용 권장, 폰트 컬러는 최대 2가지만 사용 가능" },
  { id: "video_bg", label: "동영상 배경 처리 방식",
    guide: "배경이 있는 동영상은 영역을 모두 채우거나 자연스럽게 그라데이션 되도록 처리 권장" },
  { id: "video_motion", label: "광고 동작으로 혼선을 줄 수 있는 요소 제한",
    guide: "클릭/플레이/프로그레스 동작이 연상되는 이미지를 포함한 경우 사용 제한" },
  { id: "video_restricted", label: "사용불가 및 제한되는 이미지 확인",
    guide: "제품의 용도나 사용 모습 등이 혐오감을 주거나 신체 일부를 확대하여 혐오감을 주는 경우 노출 불가" },
];


const LOGO_WIDTH = 945, LOGO_HEIGHT = 720;
const BOTTOM_WIDTH = 1400, BOTTOM_HEIGHT = 614;
const BOTTOM_MAIN_AREA_W = 478;
const PREVIEW_MOBILE_W = 375, PREVIEW_MOBILE_H = 812;
// 하단 동영상 길이 기준 (초). 허용오차 ±0.05 → 1.45~2.05 통과
const BOTTOM_VIDEO_DURATION_MIN = 1.5;
const BOTTOM_VIDEO_DURATION_MAX = 2.0;
const BOTTOM_VIDEO_DURATION_TOL = 0.05;
const getAllowedBottomExts = (brand) =>
  brand === "webtoon" ? ["jpg", "jpeg"] : ["png", "jpg", "jpeg"];

// --- 유틸 ---
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ===== guide recolor (alpha 유지) =====
const recolorGuideCache = new Map();

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

// src PNG를 targetHex 단색(알파 유지)으로 변환한 dataURL 반환
async function getRecoloredGuideDataUrl(src, targetHex) {
  const key = `${src}__${targetHex}`;
  if (recolorGuideCache.has(key)) return recolorGuideCache.get(key);

  const img = await loadImg(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const { r, g, b } = hexToRgb(targetHex);

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a > 0) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const url = canvas.toDataURL("image/png");
  recolorGuideCache.set(key, url);
  return url;
}

async function getOverlapErrorPercent(src1, src2, width, height) {
  const [img1, img2] = await Promise.all([loadImg(src1), loadImg(src2)]);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0,0,width,height);
  ctx.drawImage(img1,0,0,width,height);
  const data1 = ctx.getImageData(0,0,width,height).data;

  ctx.clearRect(0,0,width,height);
  ctx.drawImage(img2,0,0,width,height);
  const data2 = ctx.getImageData(0,0,width,height).data;

  let inter = 0, union = 0;
  for (let i = 3; i < data1.length; i += 4) {
    const a1 = data1[i];
    const a2 = data2[i];
    const has1 = a1 > 20;
    const has2 = a2 > 20;
    if (has1 && has2) inter++;
    if (has1 || has2) union++;
  }
  if (!union) return 1;
  return 1 - (inter / union);
}

function getContrastColor(hex) {
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#222" : "#fff";
}

// WCAG 대비율 계산 (hex vs hex)
function hexToRgb01(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255
  };
}

function srgbToLinear(v) {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb01(hex);
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}


// --- 중앙정렬 검사 ---
function analyzePaddingAlignment(img, { alphaThresh = 40, tolerance = 10 } = {}) {
  const W = img.width, H = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > alphaThresh) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || y1 < 0) return { hasContent: false };

  const padTop = y0;
  const padBottom = H - 1 - y1;
  const padLeft = x0;
  const padRight = W - 1 - x1;

  const pass = Math.abs(padTop - padBottom) <= tolerance &&
               Math.abs(padLeft - padRight) <= tolerance;

  return {
    hasContent: true,
    padding: { top: padTop, bottom: padBottom, left: padLeft, right: padRight },
    bbox: { x0, y0, x1, y1 },
    tolerance,
    pass
  };
}

// --- 메뉴 탭 목록 ---
const TYPE_LIST = [
  { key: "normal", label: "일반형", url: "https://smmonster.github.io/splash/" },
  { key: "full", label: "전면형", url: "/full" },
];
// 브랜드/상품유형에 따라 서브 탭 목록 반환 (웹툰앱+동영상형만 4탭)
function getTabs(logoBrand, productType) {
  if (logoBrand === "webtoon" && productType === "video") {
    return [
      { key: "logo", label: "로고 이미지" },
      { key: "bottom", label: "하단 썸네일" },
      { key: "bottomVideo", label: "하단 동영상" },
      { key: "preview", label: "미리보기" },
    ];
  }
  return [
    { key: "logo", label: "로고 이미지" },
    { key: "bottom", label: "하단 이미지" },
    { key: "preview", label: "미리보기" },
  ];
}

// 하단 가이드 오버레이 프레임 (이미지/동영상 공용). mediaEl = <img> 또는 <video>
function renderBottomGuideFrame(mediaEl, opacity, setOpacity, onReset) {
  return (
    <>
      <div style={{ width: BOTTOM_WIDTH / 2, height: BOTTOM_HEIGHT / 2, background: "#fafcff", border: "1px solid #eaeaea", position: "relative" }}>
        {mediaEl}

        {/* 좌측 불투명 레이어 */}
        <div style={{ position: "absolute", top: 0, left: 0, width: (461 / 2) + "px", height: (BOTTOM_HEIGHT / 2) + "px", background: `rgba(0,0,0,${opacity})` }} />

        {/* 우측 불투명 레이어 */}
        <div style={{ position: "absolute", top: 0, right: 0, width: (461 / 2) + "px", height: (BOTTOM_HEIGHT / 2) + "px", background: `rgba(0,0,0,${opacity})` }} />

        <div style={{ position: "absolute", top: 1, left: 471, color: "white", fontWeight: "bold", fontSize: "0.75em", background: "rgba(255, 0, 0, 0.6)", padding: 2, borderRadius: 2 }}>
          주요 Creative 영역
        </div>

        {/* 중앙 빨간 점선 테두리 */}
        <div style={{ position: "absolute", top: 0, left: 461 / 2, width: BOTTOM_MAIN_AREA_W / 2, height: "100%", boxSizing: "border-box", border: "2px dashed red", pointerEvents: "none" }}>
          {/* 중앙하단 텍스트 회피 영역 */}
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 30, background: "rgba(20, 0, 149, 0.5)", display: "flex" }}></div>
        </div>

        <div style={{ position: "absolute", top: 275, left: 471, color: "white", fontWeight: "bold", fontSize: "0.75em", background: "rgba(20, 0, 149, 0.5)", padding: 2, borderRadius: 2 }}>
          주요 텍스트 배치 지양 영역
        </div>
      </div>

      {/* ▼ 투명도 조절바 (+ 우측 재등록) */}
      <div style={{ marginTop: 5, display: "flex", alignItems: "center", width: BOTTOM_WIDTH / 2 }}>
        <b>투명도</b>
        <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} style={{ marginLeft: 10, verticalAlign: "middle" }} />
        <span style={{ marginLeft: 8, fontSize: "0.9em", fontWeight: 600 }}>{Math.round(opacity * 100)}%</span>
        {onReset && (
          <button className="reset-btn" type="button" onClick={onReset} style={{ marginLeft: "auto" }}>재등록</button>
        )}
      </div>
    </>
  );
}

// 모바일 미리보기 카드 (상단 55% 로고 + 하단 45% 미디어). bottomMediaEl = <img> 또는 <video>
function renderPreviewCard(logoImg, bgColor, bottomMediaEl) {
  return (
    <div
      style={{
        width: PREVIEW_MOBILE_W,
        height: PREVIEW_MOBILE_H,
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        background: bgColor,
        border: "8px solid #e5e7eb",
       boxShadow: "0 6px 24px rgba(0,0,0,0.15)"
      }}
    >
      {/* 상단 55%: 로고 영역 */}
      <div
        style={{
          height: "55%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {logoImg && (
          <img
            src={logoImg}
            alt="로고"
            style={{
              width: "315px",
              height: "240px",
              objectFit: "contain"
            }}
          />
        )}
      </div>

      {/* 하단 45%: 하단 미디어 */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "45%",
          overflow: "hidden"
        }}
      >
        {bottomMediaEl}
      </div>
    </div>
  );
}

// 업로드 아이콘 (드롭존 내부)
function UploadIcon() {
  return (
    <svg className="upload-dropzone-icon" width="30" height="30" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

// 좌측 트리 메뉴 아이콘
function TreeIcon({ type }) {
  const p = {
    width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round",
    strokeLinejoin: "round", className: "tree-icon", "aria-hidden": true,
  };
  switch (type) {
    case "map":
      return (<svg {...p}><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2" /></svg>);
    case "webtoon":
      return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l4-4 4 4 3-3 4 4" /></svg>);
    case "image":
      return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="M4 18l5-5 4 3 3-2 4 4" /></svg>);
    case "video":
      return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.5l5 2.5-5 2.5z" /></svg>);
    case "store":
      return (<svg {...p}><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>);
    case "screen":
      return (<svg {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>);
    case "full":
      return (<svg {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>);
    default:
      return null;
  }
}

export default function FullSplashMaterialCheck() {
  const [fullTab, setFullTab] = useState("logo");
  const [logoBrand, setLogoBrand] = useState("map"); // 기본: 지도
  const [productType, setProductType] = useState("image"); // 웹툰앱 상품유형: image | video
  const [dragZone, setDragZone] = useState(null); // 드래그&드롭 하이라이트 대상

  // 로고
  const [logoImg, setLogoImg] = useState(null);
  const [logoInfo, setLogoInfo] = useState({});
  const [logoGuideIdx, setLogoGuideIdx] = useState(0);
  const [logoGuideOpacity, setLogoGuideOpacity] = useState(0.3);
  const [logoErrorPercents, setLogoErrorPercents] = useState([]);
  const [logoPaddingCheck, setLogoPaddingCheck] = useState(null);
  const [manualChecks, setManualChecks] = useState({});
  const [manualBottomChecks, setManualBottomChecks] = useState({});

// ✅ 가이드 컬러 모드
const [guideColorMode, setGuideColorMode] = useState("white"); // map/nps 기본 white
const [guideOverlaySrc, setGuideOverlaySrc] = useState(null);  // 재색상된 가이드 src

const manualCheckItems = [
    ...(logoBrand === "map" ? MANUAL_CHECK_MAP : []),
    ...(logoBrand === "webtoon" ? MANUAL_CHECK_WEBTOON : []),
    ...MANUAL_CHECK_COMMON
  ];

const manualBottomCheckItems = [
  ...(logoBrand === "map" ? MANUAL_CHECK_BOTTOM_MAP : []),
  ...(logoBrand === "webtoon" ? MANUAL_CHECK_BOTTOM_WEBTOON : []),
  ...MANUAL_CHECK_BOTTOM_COMMON
];

// logoBrand 변경 시 수동검수 체크박스 초기화 (상단/하단)
useEffect(() => {
  const bottomState = {};
  manualBottomCheckItems.forEach(item => { bottomState[item.id] = false; });
  setManualBottomChecks(bottomState);

  const topState = {};
  manualCheckItems.forEach(item => { topState[item.id] = false; });
  setManualChecks(topState);
}, [logoBrand]);

useEffect(() => {
  let cancelled = false;

  (async () => {
    const g = currentGuideList[logoGuideIdx];
    if (!g) {
      setGuideOverlaySrc(null);
      return;
    }

    // 원본 그대로 쓰는 모드
    const useOriginal =
      (logoBrand !== "webtoon" && guideColorMode === "white") || // map/nps: white=원본
      (logoBrand === "webtoon" && guideColorMode === "green");   // webtoon: green=원본

    if (useOriginal) {
      setGuideOverlaySrc(null);
      return;
    }

    // 재색상
    const targetHex =
      guideColorMode === "white" ? "#ffffff" :
      guideColorMode === "black" ? "#000000" :
      "#ffffff";

    const recolored = await getRecoloredGuideDataUrl(g.file, targetHex);
    if (!cancelled) setGuideOverlaySrc(recolored);
  })();

  return () => { cancelled = true; };
}, [guideColorMode, logoGuideIdx, logoBrand]);

  
const [bottomMainColor, setBottomMainColor] = useState(null);

  // 로고 가이드 브랜드 (지도 / 네플스)

  const currentGuideList =
  logoBrand === "map" ? MAP_LOGO_GUIDE_LIST :
  logoBrand === "webtoon" ? WEBTOON_LOGO_GUIDE_LIST :
  NPS_LOGO_GUIDE_LIST;

  // 하단
  const [bottomImg, setBottomImg] = useState(null);
  const [bottomInfo, setBottomInfo] = useState({});
  const [bottomOverlayOpacity, setBottomOverlayOpacity] = useState(0.3);

  // 하단 동영상 (웹툰앱 동영상형)
  const [bottomVideoSrc, setBottomVideoSrc] = useState(null);
  const [bottomVideoInfo, setBottomVideoInfo] = useState({});
  const [bottomVideoOverlayOpacity, setBottomVideoOverlayOpacity] = useState(0.3);
  const [manualVideoChecks, setManualVideoChecks] = useState({});

  // 배경색
  const [bgColor, setBgColor] = useState("#000000");
  const [bgHexInput, setBgHexInput] = useState("#000000");
  const [bgCheck, setBgCheck] = useState({ s: 0, b: 0, pass: true });
  const [bgWasChosen, setBgWasChosen] = useState(false);

  useEffect(() => {
  // --- 로고 리셋 ---
  setLogoImg(null);
  setLogoInfo({});
  setLogoGuideIdx(0);
  setLogoErrorPercents([]);
  setLogoPaddingCheck(null);

  // --- 가이드 컬러도 디폴트로 ---
  if (logoBrand === "webtoon") setGuideColorMode("green");
  else setGuideColorMode("white");
  setGuideOverlaySrc(null);

  // --- 하단 리셋 ---
  setBottomImg(null);
  setBottomInfo({});
  setBottomMainColor(null);

  // --- 하단 동영상 리셋 (objectURL 정리) ---
  setBottomVideoSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  setBottomVideoInfo({});
  setManualVideoChecks({});
}, [logoBrand, productType]);

// 브랜드/상품유형 변경으로 현재 탭이 사라지면 로고 탭으로 폴백
useEffect(() => {
  const valid = getTabs(logoBrand, productType).some(t => t.key === fullTab);
  if (!valid) setFullTab("logo");
}, [logoBrand, productType, fullTab]);

const toggleManualCheck = (id) => {
  setManualChecks(prev => ({ ...prev, [id]: !prev[id] }));
};

  // 배경색 HSV 계산
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b),
      h, s, v = max, c = max - min;
    s = max === 0 ? 0 : c / max;
    if (c === 0) h = 0;
    else if (max === r) h = ((g - b) / c) % 6;
    else if (max === g) h = (b - r) / c + 2;
    else h = (r - g) / c + 4;
    h = Math.round(h * 60); if (h < 0) h += 360;
    return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  // 배경색 적용
  function applyBgColor(hex) {
    setBgHexInput(hex); // 입력값 그대로 유지

    const m = /^#?([a-fA-F0-9]{6})$/.exec(hex || "");
    if (!m) return;
    const norm = "#" + m[1].toLowerCase();
    setBgColor(norm);

    const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(norm);
    let r = 255, g = 255, b = 255;
    if (rgb) {
      r = parseInt(rgb[1], 16);
      g = parseInt(rgb[2], 16);
      b = parseInt(rgb[3], 16);
    }
    const hsv = rgb2hsv(r, g, b);
    setBgCheck({ s: hsv.s, b: hsv.v, pass: (hsv.s + hsv.v <= 160) });
  }

  useEffect(() => { applyBgColor(bgColor); }, []);

  // 로고 업로드
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isPng = file.type === "image/png" || ext === "png";
      if (!isPng) {
        alert("로고 이미지는 PNG 형식만 업로드할 수 있습니다.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setLogoImg(ev.target.result);
        const img = new window.Image();
        img.onload = async function () {
          let isTransparent = false;
          if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, img.width, img.height);
            const d = ctx.getImageData(0, 0, img.width, img.height).data;
            for (let i = 3; i < d.length; i += 4 * 32) {
              if (d[i] < 250) { isTransparent = true; break; }
            }
          }
          setLogoInfo({ w: img.width, h: img.height, size: file.size, isPng: true, isTransparent });

          // 중앙정렬 검사
          setLogoPaddingCheck(analyzePaddingAlignment(img));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 로고 가이드 일치율 계산 (로고 업로드 or 브랜드 변경 시마다)
  useEffect(() => {
    if (!logoImg) {
      setLogoErrorPercents([]);
      setLogoGuideIdx(0);
      return;
    }
    const guideList =
      logoBrand === "map" ? MAP_LOGO_GUIDE_LIST :
      logoBrand === "webtoon" ? WEBTOON_LOGO_GUIDE_LIST :
      NPS_LOGO_GUIDE_LIST;

    (async () => {
      const errorArr = [];
      for (let i = 0; i < guideList.length; ++i) {
        const guideSrc = guideList[i].file;
        const error = await getOverlapErrorPercent(logoImg, guideSrc, LOGO_WIDTH, LOGO_HEIGHT);
        errorArr.push(error);
      }
      setLogoErrorPercents(errorArr);
      if (errorArr.length > 0) {
        const bestIdx = errorArr.indexOf(Math.min(...errorArr));
        setLogoGuideIdx(bestIdx);
      }
    })();
  }, [logoImg, logoBrand]);

  // 하단 업로드
  const handleBottomChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const allowedExts = getAllowedBottomExts(logoBrand);
    const isAllowedFormat = allowedExts.includes(ext);

    if (!isAllowedFormat) {
      alert(`하단 이미지는 ${allowedExts.map(x => x.toUpperCase()).join(" / ")} 형식만 업로드할 수 있습니다.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setBottomImg(ev.target.result);
      const img = new window.Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const d = ctx.getImageData(0, 0, img.width, img.height).data;
        let isTransparent = false;
        for (let i = 3; i < d.length; i += 4 * 32) {
          if (d[i] < 250) { isTransparent = true; break; }
        }

        // 중앙 상단 1px 색상 추출
const midX = Math.floor(img.width / 2);
const topY = 1; // 상단 1px
const pixel = ctx.getImageData(midX, topY, 1, 1).data;
const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(x =>
  x.toString(16).padStart(2, "0")
).join("");
setBottomMainColor(hex);


        setBottomInfo({
          w: img.width,
          h: img.height,
          size: file.size,
          ext,
          isTransparent,
          isAllowedFormat,
          allowedExts
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 하단 동영상 업로드 (메타데이터 + 오디오 트랙 검출)
  const handleBottomVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isMp4 = ext === "mp4" || file.type === "video/mp4";

    if (!isMp4) {
      alert("하단 동영상은 MP4 형식만 업로드할 수 있습니다.");
      return;
    }

    // 이전 objectURL 정리 후 새로 생성
    setBottomVideoSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    const url = URL.createObjectURL(file);
    setBottomVideoSrc(url);

    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.src = url;

    // 오디오 트랙 검출(자동→실패 시 null=수동 폴백)
    const detectAudio = () => {
      if (typeof probe.mozHasAudio === "boolean") return probe.mozHasAudio;
      if (typeof probe.webkitAudioDecodedByteCount === "number")
        return probe.webkitAudioDecodedByteCount > 0;
      if (probe.audioTracks && typeof probe.audioTracks.length === "number")
        return probe.audioTracks.length > 0;
      return null; // 판별 불가
    };

    const finish = (hasAudio) => {
      setBottomVideoInfo({
        w: probe.videoWidth,
        h: probe.videoHeight,
        durationSec: probe.duration,
        size: file.size,
        ext,
        isMp4,
        hasAudio,
      });
    };

    probe.onloadedmetadata = () => {
      // 오디오 디코드 카운트를 얻기 위해 짧게 muted 재생 후 판정
      const immediate = detectAudio();
      if (immediate !== null) { finish(immediate); return; }
      const settle = () => { probe.pause(); finish(detectAudio()); };
      probe.play().then(() => setTimeout(settle, 150)).catch(() => finish(detectAudio()));
    };
    probe.onerror = () => finish(null);
  };

  // 드래그&드롭 업로드: 드롭된 파일을 기존 change 핸들러로 합성 이벤트 전달
  const fileDropProps = (zone, handler) => ({
    onDragOver: (e) => { e.preventDefault(); },
    onDragEnter: (e) => { e.preventDefault(); setDragZone(zone); },
    onDragLeave: (e) => { e.preventDefault(); setDragZone(z => (z === zone ? null : z)); },
    onDrop: (e) => {
      e.preventDefault();
      setDragZone(null);
      const files = e.dataTransfer.files;
      if (files && files.length) handler({ target: { files } });
    },
  });

  // 소재 초기화 (해당 탭의 소재 등록 전 상태로)
  const resetLogo = () => {
    setLogoImg(null);
    setLogoInfo({});
    setLogoGuideIdx(0);
    setLogoErrorPercents([]);
    setLogoPaddingCheck(null);
    setGuideOverlaySrc(null);
    setManualChecks({});
  };
  const resetBottom = () => {
    setBottomImg(null);
    setBottomInfo({});
    setBottomMainColor(null);
    setManualBottomChecks({});
  };
  const resetBottomVideo = () => {
    setBottomVideoSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setBottomVideoInfo({});
    setManualVideoChecks({});
  };

  const contrastColor = getContrastColor(bgColor);
  const mapWhiteCR = contrastRatio(bgColor, "#ffffff");
  const mapBlackCR = contrastRatio(bgColor, "#000000");
  const mapRecommendedLogo = mapWhiteCR >= mapBlackCR ? "white" : "black";


  return (
    <div className="full-layout">
      {/* 좌측 트리 내비게이션 */}
      <aside className="side-tree">
        <div className="side-tree-title">스플래시 검수</div>
        <ul className="tree">
          <li>
            <div className="tree-branch"><TreeIcon type="full" /><span>전면형</span></div>
            <ul className="tree-children">
              <li>
                <button
                  className={`tree-leaf${logoBrand === "map" ? " active" : ""}`}
                  onClick={() => { setLogoBrand("map"); setProductType("image"); }}
                  type="button"
                ><TreeIcon type="map" /><span>지도앱</span></button>
              </li>
              <li>
                <button
                  type="button"
                  className="tree-branch tree-branch--sub tree-branch--btn"
                  onClick={() => { setLogoBrand("webtoon"); setProductType("image"); }}
                ><TreeIcon type="webtoon" /><span>웹툰앱</span></button>
                <ul className="tree-children">
                  <li>
                    <button
                      className={`tree-leaf${logoBrand === "webtoon" && productType === "image" ? " active" : ""}`}
                      onClick={() => { setLogoBrand("webtoon"); setProductType("image"); }}
                      type="button"
                    ><TreeIcon type="image" /><span>이미지형</span></button>
                  </li>
                  <li>
                    <button
                      className={`tree-leaf${logoBrand === "webtoon" && productType === "video" ? " active" : ""}`}
                      onClick={() => { setLogoBrand("webtoon"); setProductType("video"); }}
                      type="button"
                    ><TreeIcon type="video" /><span>동영상형</span></button>
                  </li>
                </ul>
              </li>
              <li>
                <button
                  className={`tree-leaf${logoBrand === "nps" ? " active" : ""}`}
                  onClick={() => { setLogoBrand("nps"); setProductType("image"); }}
                  type="button"
                ><TreeIcon type="store" /><span>네이버플러스스토어</span></button>
              </li>
            </ul>
          </li>
          <li className="tree-divider" aria-hidden="true"></li>
          <li>
            <button
              className="tree-leaf tree-leaf--external"
              onClick={() => { window.location.href = TYPE_LIST.find(t => t.key === "normal").url; }}
              type="button"
            ><TreeIcon type="screen" /><span>일반형</span><span className="tree-external-arrow">↗</span></button>
          </li>
        </ul>
      </aside>

      {/* 우측 콘텐츠 */}
      <div className="full-content">
      <div className="multi-overlay-root">
        
        <div className="multi-overlay-card">

          {/* 서브 탭 */}
          <div className="tab-header-wrap">
            <div className="tab-header-row">
              {getTabs(logoBrand, productType).map(tab => (
                <button key={tab.key}
                  className={`tab-header-btn${fullTab === tab.key ? " active" : ""}`}
                  onClick={() => setFullTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 로고 탭 */}
          {fullTab === "logo" && (
            <div>
              {logoImg ? (
                <>
                  {/* 배경색 */}
                  <div style={{ margin: "14px 0" }}>
                    <b>배경 컬러</b>&nbsp;
                    <input
                      type="color"
                      value={bgColor}
                      onChange={e => { setBgWasChosen(true); applyBgColor(e.target.value); }}
                      style={{
                        width: 35,
                        height: 20,
                        padding: 0,
                        border: "1px solid #ccc",
                        borderRadius: 1,
                        cursor: "pointer"
                      }}
                    />
                    <input
                      type="text"
                      value={bgHexInput}
                      onChange={e => { setBgWasChosen(true); applyBgColor(e.target.value); }}
                      style={{ marginLeft: 8, width: 90 }}
                    />
                  </div>

                  {/* 등록 이미지 미리보기 */}
                  <div style={{ display: "flex", gap: 20 }}>
                    <div
                      style={{
                        width: LOGO_WIDTH / 2,
                        height: LOGO_HEIGHT / 2,
                        background: bgColor,
                        border: "3px solid #333333",
                        position: "relative"
                      }}
                    >
                      {/* 좌상단 체크박스 */}
                      <div>
                        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{
  position: "absolute",
  top: 6,
  left: 6,
  background: "rgba(255,255,255,0.85)",
  padding: "6px 8px",
  borderRadius: 6,
  fontSize: "0.8em",
  zIndex: 10
}}>

  {/* 지도/네플스: white/black */}
  {(logoBrand === "map" || logoBrand === "nps") && (
    <div style={{ display: "flex", gap: 6 }}>
      {["white", "black"].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => setGuideColorMode(m)}
          style={{
            padding: "2px 4px",
            borderRadius: 6,
            border: guideColorMode === m ? "2px solid #2b2f38" : "1px solid #ddd",
            background: guideColorMode === m ? "#eef3ff" : "#fff",
            fontWeight: guideColorMode === m ? 700 : 600,
            cursor: "pointer"
          }}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  )}

  {/* 웹툰: green/white/black */}
  {logoBrand === "webtoon" && (
    <div style={{ display: "flex", gap: 6 }}>
      {["green", "white", "black"].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => setGuideColorMode(m)}
          style={{
            padding: "2px 4px",
            borderRadius: 6,
            border: guideColorMode === m ? "2px solid #2b2f38" : "1px solid #ddd",
            background: guideColorMode === m ? "#eef3ff" : "#fff",
            fontWeight: guideColorMode === m ? 700 : 600,
            cursor: "pointer"
          }}
        >
          {m.toUpperCase()}
        </button>
      ))}
    </div>
  )}
</div>

                        </label>
                      </div>

                      {/* 업로드된 로고 이미지 */}
                      <img
                        src={logoImg}
                        alt="로고"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />

                      {/* 가이드 이미지 */}
                      {/* 가이드 이미지 */}
{(() => {
  const g = currentGuideList[logoGuideIdx];
  if (!g) return null;

  const srcToUse = guideOverlaySrc || g.file;
  
  // ✅ 단독형: 항상 contain + 중앙
  if (g.orientation === "ONLY") {
    return (
      <img
        src={srcToUse}
        alt="단독형 가이드"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: logoGuideOpacity,
          pointerEvents: "none"
        }}
      />
    );
  }

  const isVertical = g.orientation === "H";

  if (logoPaddingCheck?.hasContent) {
    if (isVertical) {
      return (
        <img
          src={srcToUse}
          alt="세로형 가이드"
          style={{
            position: "absolute",
            left: 0,
            top: ((logoPaddingCheck?.bbox?.y0) ?? 0) / 2,
            width: "100%",
            height: "auto",
            opacity: logoGuideOpacity,
            pointerEvents: "none"
          }}
        />
      );
    }

    return (
      <img
        src={srcToUse}
        alt="가로형 가이드"
        style={{
          position: "absolute",
          top: 0,
          left: ((logoPaddingCheck?.bbox?.x0) ?? 0) / 2,
          height: "100%",
          width: "auto",
          opacity: logoGuideOpacity,
          pointerEvents: "none"
        }}
      />
    );
  }

  // fallback
  return (
    <img
      src={srcToUse}
      alt="가이드"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        opacity: logoGuideOpacity,
        pointerEvents: "none"
      }}
    />
  );
})()}



                      {/* 바운딩 박스 + 여백 */}
                      {logoPaddingCheck?.hasContent && (
                        <>
                          <div
                            style={{
                              position: "absolute",
                              left: logoPaddingCheck.bbox.x0 / 2,
                              top: logoPaddingCheck.bbox.y0 / 2,
                              width: (logoPaddingCheck.bbox.x1 - logoPaddingCheck.bbox.x0 + 1) / 2,
                              height: (logoPaddingCheck.bbox.y1 - logoPaddingCheck.bbox.y0 + 1) / 2,
                              border: "1.5px dashed " + contrastColor,
                              pointerEvents: "none"
                            }}
                          />
                          {/* 상/하/좌/우 여백 */}
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: 0,
                              height: logoPaddingCheck.padding.top / 2,
                              borderLeft: "1.5px dashed " + contrastColor,
                              transform: "translateX(-50%)",
                              pointerEvents: "none"
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
                                background: bgColor,
                                color: contrastColor,
                                padding: "0 4px"
                              }}
                            >
                              {logoPaddingCheck.padding.top}px
                            </div>
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              left: "50%",
                              top: logoPaddingCheck.bbox.y1 / 2,
                              height: logoPaddingCheck.padding.bottom / 2,
                              borderLeft: "1.5px dashed " + contrastColor,
                              transform: "translateX(-50%)",
                              pointerEvents: "none"
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
                                background: bgColor,
                                color: contrastColor,
                                padding: "0 4px"
                              }}
                            >
                              {logoPaddingCheck.padding.bottom}px
                            </div>
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: 0,
                              width: logoPaddingCheck.padding.left / 2,
                              borderTop: "1.5px dashed " + contrastColor,
                              transform: "translateY(-50%)",
                              pointerEvents: "none"
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
                                background: bgColor,
                                color: contrastColor,
                                padding: "0 4px"
                              }}
                            >
                              {logoPaddingCheck.padding.left}px
                            </div>
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: logoPaddingCheck.bbox.x1 / 2,
                              width: logoPaddingCheck.padding.right / 2,
                              borderTop: "1.5px dashed " + contrastColor,
                              transform: "translateY(-50%)",
                              pointerEvents: "none"
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%,-50%)",
                                background: bgColor,
                                color: contrastColor,
                                padding: "0 4px"
                              }}
                            >
                              {logoPaddingCheck.padding.right}px
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 우측 컨트롤 */}
                    <div style={{ minWidth: 200, display: "flex", flexDirection: "column", gap: 12 }}>
                      {currentGuideList.map((g, idx) => (
                        <button
                          key={g.file}
                          className="logo-guide-btn"
                          style={{
                            fontWeight: logoGuideIdx === idx ? 700 : 500,
                            color: logoGuideIdx === idx ? "#2b2f38" : "#777",
                            border: logoGuideIdx === idx ? "2px solid #2b2f38" : "1px solid #ddd",
                            background: "#fff",
                            borderRadius: 4,
                            padding: "4px 14px",
                            fontSize: "1em",
                            cursor: "pointer"
                          }}
                          onClick={() => setLogoGuideIdx(idx)}
                        >
                          {g.name}
                          <span style={{ fontSize: "0.9em", marginLeft: 6, color: "#999" }}>
                            (일치율 {logoErrorPercents[idx]
                              ? (100 - logoErrorPercents[idx] * 100).toFixed(1) + "%"
                              : "-"
                            })
                          </span>
                          {(() => {
  const hasScores = logoErrorPercents.length > 0;
  const bestIdx = hasScores ? logoErrorPercents.indexOf(Math.min(...logoErrorPercents)) : -1;
  const isBest = idx === bestIdx;

  return (
    <span
      style={{
        marginLeft: 8,
        padding: "2px 6px",
        background: "linear-gradient(90deg,#448bff 45%,#65e5f5 98%)",
        color: "#fff",
        borderRadius: 4,
        fontSize: "0.75em",
        fontWeight: 600,
        display: "inline-block",
        minWidth: 34,          // ✅ 자리 확보(폭 고정)
        textAlign: "center",   // ✅ 중앙정렬
        visibility: isBest ? "visible" : "hidden" // ✅ 안 보이더라도 공간 유지
      }}
    >
      추천
    </span>
  );
})()}

                        </button>
                      ))}
                      <div>
                        <b>투명도</b>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={logoGuideOpacity}
                          onChange={e => setLogoGuideOpacity(Number(e.target.value))}
                          style={{ marginLeft: 8, verticalAlign: "middle" }}
                        />
                        <span style={{ marginLeft: 8, fontSize: "0.9em", fontWeight: 600 }}>
                          {Math.round(logoGuideOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                </>
              ) : (
                <div
                  className={`overlay-upload-area${dragZone === "logo" ? " drag-over" : ""}`}
                  style={{ width: LOGO_WIDTH / 2, height: LOGO_HEIGHT / 2 }}
                  {...fileDropProps("logo", handleLogoChange)}
                >
                  <label htmlFor="logo-upload" className="upload-dropzone-label">
                    <UploadIcon />
                    <div className="upload-dropzone-title">클릭하거나 여기로 파일을 끌어다 놓으세요 (png)</div>
                    <input id="logo-upload" type="file" accept="image/png" onChange={handleLogoChange} style={{ display: "none" }} />
                  </label>
                </div>
              )}

              {logoImg && (
                <div className="reset-row" style={{ width: LOGO_WIDTH / 2 }}>
                  <button className="reset-btn" type="button" onClick={resetLogo}>재등록</button>
                </div>
              )}

              {/* 기본가이드 체크 (이미지 없어도 항상 표시) */}
              <div style={{ marginTop: 40 }}>
                    <b>기본가이드 체크</b>
                    <div className="ad-info-box-check">
                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {!logoImg ? <span className="check-none">-</span>
                            : (logoInfo.w === LOGO_WIDTH && logoInfo.h === LOGO_HEIGHT
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>)}
                        </span>
                        <span className="info-check-label">사이즈</span>
                        <span className="info-check-value">
                          {logoImg ? `${logoInfo.w}x${logoInfo.h}` : "-"}
                          <span className="guide-text"> (가로 945px, 세로 720px)</span>
                        </span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {!logoImg ? <span className="check-none">-</span>
                            : (logoInfo.size <= (logoBrand === "webtoon" ? LOGO_MAX_SIZE_WEBTOON : LOGO_MAX_SIZE_DEFAULT)
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>)}
                        </span>
                        <span className="info-check-label">용량</span>
                        <span className="info-check-value">
                          {logoImg ? formatSize(logoInfo.size) : "-"}
                          <span className="guide-text"> 
                            {logoBrand === "webtoon" ? " (40KB 이하)" : " (400KB 이하)"}
                          </span>
                        </span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {!logoImg ? <span className="check-none">-</span>
                            : (logoInfo.isPng
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>)}
                        </span>
                        <span className="info-check-label">포맷</span>
                        <span className="info-check-value">
                          {logoImg ? "image/png (PNG)" : "-"} <span className="guide-text">(PNG 만 허용)</span>
                        </span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {!logoImg ? <span className="check-none">-</span>
                            : (logoInfo.isTransparent
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>)}
                        </span>
                        <span className="info-check-label">투명</span>
                        <span className="info-check-value">
                          {logoImg ? (logoInfo.isTransparent ? "투명 있음" : "투명 없음") : "-"}
                          <span className="guide-text">(반드시 투명)</span>
                        </span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {!logoImg ? <span className="check-none">-</span>
                            : (bgCheck.pass
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>)}
                        </span>
                        <span className="info-check-label">채도+명도</span>
                        <span className="info-check-value">
                          {logoImg ? `S: ${bgCheck.s}, B: ${bgCheck.b} (합: ${bgCheck.s + bgCheck.b})` : "-"}
                          <span className="guide-text">(합 160 이하)</span>
                        </span>
                      </div>

                      {logoPaddingCheck?.hasContent && (
                        <div className="info-check-row">
                          <span className="info-check-icon">
                            {logoPaddingCheck.pass
                              ? <span className="check-green">✔</span>
                              : <span className="check-red">✖</span>}
                          </span>
                          <span className="info-check-label">중앙정렬</span>
                          <span className="info-check-value">
                            {logoPaddingCheck.pass ? "PASS" : "FAIL"}
                            &nbsp; (
                            상:
                            <span
                              style={{
                                color:
                                  Math.abs(logoPaddingCheck.padding.top - logoPaddingCheck.padding.bottom) > logoPaddingCheck.tolerance
                                    ? "red"
                                    : "inherit"
                              }}
                            >
                              {logoPaddingCheck.padding.top}px
                            </span>
                            , 하:
                            <span
                              style={{
                                color:
                                  Math.abs(logoPaddingCheck.padding.top - logoPaddingCheck.padding.bottom) > logoPaddingCheck.tolerance
                                    ? "red"
                                    : "inherit"
                              }}
                            >
                              {logoPaddingCheck.padding.bottom}px
                            </span>
                            , 좌:
                            <span
                              style={{
                                color:
                                  Math.abs(logoPaddingCheck.padding.left - logoPaddingCheck.padding.right) > logoPaddingCheck.tolerance
                                    ? "red"
                                    : "inherit"
                              }}
                            >
                              {logoPaddingCheck.padding.left}px
                            </span>
                            , 우:
                            <span
                              style={{
                                color:
                                  Math.abs(logoPaddingCheck.padding.left - logoPaddingCheck.padding.right) > logoPaddingCheck.tolerance
                                    ? "red"
                                    : "inherit"
                              }}
                            >
                              {logoPaddingCheck.padding.right}px
                            </span>
                            ) <span className="guide-text">(오차범위 10px 이내)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>


{/* 수동 체크리스트 (기본가이드와 동일 UI) */}
<div className="manual-checklist-title">수동 체크리스트</div>
<div className="ad-info-box-check ad-info-box-check--manual">
  {manualCheckItems.map((item) => {
  const isMapContrastItem = item.id === "map_logo_contrast_choice";

const guideText = isMapContrastItem
  ? (
    <span className="manual-check-guide--highlight">
      배경색 <b>{bgColor.toUpperCase()}</b> 기준 대비율 ·
      WHITE <span className="good">{mapWhiteCR.toFixed(2)}</span> /
      BLACK <span className="bad">{mapBlackCR.toFixed(2)}</span>
      &nbsp;→&nbsp;
      <b>권장: {mapRecommendedLogo.toUpperCase()}</b>
    </span>
  )
  : (
    <span className="manual-check-guide">{item.guide}</span>
  );


  return (
    <div key={item.id} className="info-check-row manual-check-row">
      <label className="manual-check-label">
        <input
          type="checkbox"
          checked={!!manualChecks[item.id]}
          onChange={() => toggleManualCheck(item.id)}
        />
        <span className="manual-check-text">{item.label}</span>
      </label>
      <span className="manual-check-guide">{guideText}</span>
    </div>
  );
})}

</div>
            </div>
          )}

          {/* --- 하단 탭 --- */}
          {fullTab === "bottom" && (
            <div>
              {bottomImg ? renderBottomGuideFrame(
                <img src={bottomImg} alt="하단" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
                bottomOverlayOpacity,
                setBottomOverlayOpacity,
                resetBottom
              ) : (
                <div
                  className={`overlay-upload-area${dragZone === "bottom" ? " drag-over" : ""}`}
                  style={{ width: BOTTOM_WIDTH / 2, height: BOTTOM_HEIGHT / 2 }}
                  {...fileDropProps("bottom", handleBottomChange)}
                >
                  <label htmlFor="bottom-upload" className="upload-dropzone-label">
                    <UploadIcon />
                    <div className="upload-dropzone-title">
                      클릭하거나 여기로 파일을 끌어다 놓으세요 ({logoBrand === "webtoon" ? "jpg / jpeg" : "png / jpg / jpeg"})
                    </div>
                    <input
                      id="bottom-upload"
                      type="file"
                      accept={logoBrand === "webtoon" ? ".jpg,.jpeg,image/jpeg" : ".png,.jpg,.jpeg,image/png,image/jpeg"}
                      onChange={handleBottomChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}

              {/* 기본가이드 체크 (이미지 없어도 항상 표시) */}
              <div style={{ marginTop: 40 }}>
                <b>기본가이드 체크</b>
                <div className="ad-info-box-check">
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomImg ? <span className="check-none">-</span>
                        : (bottomInfo.w === BOTTOM_WIDTH && bottomInfo.h === BOTTOM_HEIGHT
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">사이즈</span>
                    <span className="info-check-value">
                      {bottomImg ? `${bottomInfo.w}x${bottomInfo.h}` : "-"}
                      <span className="guide-text"> (가로 1400px, 세로 614px)</span>
                    </span>
                  </div>

                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomImg ? <span className="check-none">-</span>
                        : (bottomInfo.size <= (logoBrand === "webtoon" ? BOTTOM_MAX_SIZE_WEBTOON : BOTTOM_MAX_SIZE_DEFAULT)
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">용량</span>
                    <span className="info-check-value">
                      {bottomImg ? formatSize(bottomInfo.size) : "-"}
                      <span className="guide-text">
                        {logoBrand === "webtoon" ? " (300KB 이하)" : " (400KB 이하)"}
                      </span>
                    </span>
                  </div>

                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomImg ? <span className="check-none">-</span>
                        : (bottomInfo.isAllowedFormat
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">포맷</span>
                    <span className="info-check-value">
                      {bottomImg && bottomInfo.ext ? bottomInfo.ext.toUpperCase() : "-"}
                      <span className="guide-text">
                        {logoBrand === "webtoon" ? " (허용: JPG)" : " (허용: PNG / JPG / JPEG)"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 수동 체크리스트 (이미지 없어도 항상 표시) */}
              <div style={{ marginTop: 30 }}>
                <div className="manual-checklist-title">수동 체크리스트</div>
                <div className="ad-info-box-check ad-info-box-check--manual">
                  {manualBottomCheckItems.map(item => (
                    <div key={item.id} className="info-check-row manual-check-row">
                      <label className="manual-check-label">
                        <input
                          type="checkbox"
                          checked={!!manualBottomChecks[item.id]}
                          onChange={() =>
                            setManualBottomChecks(prev => ({
                              ...prev,
                              [item.id]: !prev[item.id]
                            }))
                          }
                        />
                        <span className="manual-check-text">{item.label}</span>
                      </label>
                      <span className="manual-check-guide">{item.guide}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 하단 동영상 탭 (웹툰앱 동영상형) */}
          {fullTab === "bottomVideo" && (
            <div>
              {bottomVideoSrc ? renderBottomGuideFrame(
                <video
                  src={bottomVideoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />,
                bottomVideoOverlayOpacity,
                setBottomVideoOverlayOpacity,
                resetBottomVideo
              ) : (
                <div
                  className={`overlay-upload-area${dragZone === "bottomVideo" ? " drag-over" : ""}`}
                  style={{ width: BOTTOM_WIDTH / 2, height: BOTTOM_HEIGHT / 2 }}
                  {...fileDropProps("bottomVideo", handleBottomVideoChange)}
                >
                  <label htmlFor="bottom-video-upload" className="upload-dropzone-label">
                    <UploadIcon />
                    <div className="upload-dropzone-title">클릭하거나 여기로 파일을 끌어다 놓으세요 (mp4)</div>
                    <input
                      id="bottom-video-upload"
                      type="file"
                      accept=".mp4,video/mp4"
                      onChange={handleBottomVideoChange}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              )}

              {/* 기본가이드 체크 (동영상, 미등록 시에도 표시) */}
              <div style={{ marginTop: 40 }}>
                <b>기본가이드 체크</b>
                <div className="ad-info-box-check">
                  {/* 사이즈 */}
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomVideoSrc ? <span className="check-none">-</span>
                        : (bottomVideoInfo.w === BOTTOM_WIDTH && bottomVideoInfo.h === BOTTOM_HEIGHT
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">사이즈</span>
                    <span className="info-check-value">
                      {bottomVideoSrc ? `${bottomVideoInfo.w}x${bottomVideoInfo.h}` : "-"}
                      <span className="guide-text"> (가로 1400px, 세로 614px)</span>
                    </span>
                  </div>

                  {/* 포맷 */}
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomVideoSrc ? <span className="check-none">-</span>
                        : (bottomVideoInfo.isMp4
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">포맷</span>
                    <span className="info-check-value">
                      {bottomVideoSrc && bottomVideoInfo.ext ? bottomVideoInfo.ext.toUpperCase() : "-"}
                      <span className="guide-text"> (허용: MP4)</span>
                    </span>
                  </div>

                  {/* 영상 길이 */}
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomVideoSrc ? <span className="check-none">-</span>
                        : (typeof bottomVideoInfo.durationSec === "number" &&
                          bottomVideoInfo.durationSec >= BOTTOM_VIDEO_DURATION_MIN - BOTTOM_VIDEO_DURATION_TOL &&
                          bottomVideoInfo.durationSec <= BOTTOM_VIDEO_DURATION_MAX + BOTTOM_VIDEO_DURATION_TOL
                          ? <span className="check-green">✔</span>
                          : <span className="check-red">✖</span>)}
                    </span>
                    <span className="info-check-label">영상 길이</span>
                    <span className="info-check-value">
                      {bottomVideoSrc && typeof bottomVideoInfo.durationSec === "number"
                        ? bottomVideoInfo.durationSec.toFixed(2) + "초"
                        : "-"}
                      <span className="guide-text"> (1.5초 ~ 2.0초)</span>
                    </span>
                  </div>

                  {/* 용량 (표시만) */}
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      <span className="guide-text">·</span>
                    </span>
                    <span className="info-check-label">용량</span>
                    <span className="info-check-value">
                      {bottomVideoSrc ? formatSize(bottomVideoInfo.size) : "-"}
                      <span className="guide-text"> (제한 없음)</span>
                    </span>
                  </div>

                  {/* 사운드 제외 여부 */}
                  <div className="info-check-row">
                    <span className="info-check-icon">
                      {!bottomVideoSrc ? <span className="check-none">-</span>
                        : (bottomVideoInfo.hasAudio === false
                          ? <span className="check-green">✔</span>
                          : bottomVideoInfo.hasAudio === true
                            ? <span className="check-red">✖</span>
                            : <span style={{ color: "#b8860b", fontWeight: "bold" }}>❔</span>)}
                    </span>
                    <span className="info-check-label">사운드 제외</span>
                    <span className="info-check-value">
                      {!bottomVideoSrc ? "-"
                        : bottomVideoInfo.hasAudio === false
                          ? "오디오 트랙 없음"
                          : bottomVideoInfo.hasAudio === true
                            ? "오디오 트랙 포함"
                            : "자동 확인 불가"}
                      <span className="guide-text">
                        {bottomVideoSrc && bottomVideoInfo.hasAudio === null ? " (수동 확인 필요)" : " (오디오 트랙 제외 권장)"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 수동 체크리스트 (동영상, 항상 표시) */}
              <div style={{ marginTop: 30 }}>
                <div className="manual-checklist-title">수동 체크리스트</div>
                <div className="ad-info-box-check ad-info-box-check--manual">
                  {MANUAL_CHECK_BOTTOM_VIDEO.map(item => (
                    <div key={item.id} className="info-check-row manual-check-row">
                      <label className="manual-check-label">
                        <input
                          type="checkbox"
                          checked={!!manualVideoChecks[item.id]}
                          onChange={() =>
                            setManualVideoChecks(prev => ({
                              ...prev,
                              [item.id]: !prev[item.id]
                            }))
                          }
                        />
                        <span className="manual-check-text">{item.label}</span>
                      </label>
                      <span className="manual-check-guide">{item.guide}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 미리보기 탭 */}
          {fullTab === "preview" && (
            <div>

              {/* 안내문구 영역 */}
    <div className="preview-guide-box">
      <p>
        등록된 이미지를 기준으로 임의 생성된 미리보기 입니다. 실제 디바이스와는 다를 수 있습니다.<br />
        등록된 배경 컬러와 하단 이미지는 자연스럽게 연결되어야 합니다.<br />
        상단 로고에서 사용된 요소는 하단 메인 이미지에서는 사용하지 않습니다.<br />
        소재 시인성 or 가독성이 떨어져 보이는 소재는, 별도 디자인 검토 필요합니다 (텍스트 요소가 너무 많거나, 활용 폰트가 많은 경우 등).
      </p>
    </div>

              {(!logoImg || !bottomImg || !bgWasChosen || (productType === "video" && !bottomVideoSrc)) ? (
  <div
    style={{
      border: "1px solid #eee",
      borderRadius: 8,
      padding: 16,
      background: "#fafafa",
      color: "#333",
      lineHeight: 1.6
    }}
  >
    <b style={{ fontSize: "1.05em" }}>미리보기를 위한 준비가 필요합니다.</b>
    <ul style={{ marginTop: 10, marginBottom: 0 }}>
      {!logoImg && (
        <li style={{ margin: "12px 0" }}>
          로고 이미지를 업로드해 주세요.&nbsp;
          <a
            href="#logo"
            onClick={(e) => {
              e.preventDefault();
              setFullTab("logo");
            }}
            style={{ color: "#2b2f38", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
        </li>
      )}
      {!bgWasChosen && (
        <li style={{ margin: "12px 0" }}>
          배경 컬러를 선택/입력해 주세요.&nbsp;
          <a
            href="#logo"
            onClick={(e) => {
              e.preventDefault();
              setFullTab("logo");
            }}
            style={{ color: "#2b2f38", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
        </li>
      )}
      {!bottomImg && (
        <li style={{ margin: "12px 0" }}>
          {productType === "video" ? "하단 썸네일을 업로드해 주세요." : "하단 이미지를 업로드해 주세요."}&nbsp;
          <a
            href="#bottom"
            onClick={(e) => {
              e.preventDefault();
              setFullTab("bottom");
            }}
            style={{ color: "#2b2f38", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
        </li>
      )}
      {productType === "video" && !bottomVideoSrc && (
        <li style={{ margin: "12px 0" }}>
          하단 동영상을 업로드해 주세요.&nbsp;
          <a
            href="#bottomVideo"
            onClick={(e) => {
              e.preventDefault();
              setFullTab("bottomVideo");
            }}
            style={{ color: "#2b2f38", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
        </li>
      )}
    </ul>
  </div>
) : (

  /* ✅ 미리보기 + 컬러정보 옆으로 배치 */
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      gap: 24,
      marginTop: 20
    }}
  >
    {/* ▼ 미리보기 박스 (동영상형: 썸네일 | 동영상 2분할) */}
    {productType === "video" ? (
      <>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: "0.9em" }}>썸네일</div>
          {renderPreviewCard(
            logoImg,
            bgColor,
            bottomImg && (
              <img
                src={bottomImg}
                alt="하단 썸네일"
                style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: "100%", width: "auto", objectFit: "cover" }}
              />
            )
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: "0.9em" }}>동영상</div>
          {renderPreviewCard(
            logoImg,
            bgColor,
            bottomVideoSrc && (
              <video
                src={bottomVideoSrc}
                autoPlay
                loop
                muted
                playsInline
                style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: "100%", width: "auto", objectFit: "cover" }}
              />
            )
          )}
        </div>
      </>
    ) : (
      renderPreviewCard(
        logoImg,
        bgColor,
        bottomImg && (
          <img
            src={bottomImg}
            alt="하단"
            style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: "100%", width: "auto", objectFit: "cover" }}
          />
        )
      )
    )}

    {/* ▼ 컬러정보 패널 (동영상형: 좌측 썸네일 왼쪽으로 / 이미지형: 우측 유지) */}
    <div
      style={{
        order: productType === "video" ? -1 : 0,
        background: "rgba(255,255,255,0.95)",
        border: "1px solid #d4d7e2",
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.85rem",
        color: "#1e293b",
        lineHeight: 1.5,
        width: 220,
        minHeight: 40,
        marginTop: productType === "video" ? 440 : 413
      }}
    >

      {/* 배경 컬러 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            border: "1px solid #ccc",
            background: bgColor
          }}
        ></div>
        <span>
          <b>{bgColor.toUpperCase()}</b>
        </span>
      </div>

      {/* 하단 이미지 중앙상단 컬러 */}
      {bottomMainColor && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "1px solid #ccc",
              background: bottomMainColor
            }}
          ></div>
          <span>
            <b>{bottomMainColor.toUpperCase()}</b>
          </span>
        </div>
      )}
    </div>
  </div>
)}

              
              
            </div>
            
          )}
          

        </div>

        <div className="multi-overlay-footer">ⓒ {new Date().getFullYear()} 광고 소재 검수 툴</div>
      </div>
      </div>
    </div>
  );
}
