import React, { useState, useEffect } from "react";
import "./App.css";

// --- 가이드 파일 경로 ---
const LOGO_GUIDE_LIST = [
  { name: "가로형", file: process.env.PUBLIC_URL + "/map_splash_logo_W.png" },
  { name: "세로형", file: process.env.PUBLIC_URL + "/map_splash_logo_H.png" },
];

const LOGO_WIDTH = 945, LOGO_HEIGHT = 720;
const BOTTOM_WIDTH = 1400, BOTTOM_HEIGHT = 614;
const BOTTOM_MAIN_AREA_W = 478;   // 불필요했던 BOTTOM_MAIN_AREA_H 제거
const BOTTOM_TEXT_AVOID_H = 60;
const PREVIEW_MOBILE_W = 375, PREVIEW_MOBILE_H = 812;
const ALLOWED_BOTTOM_EXTS = ["png", "jpg", "jpeg"]; // 하단 이미지는 JPG/JPEG/PNG 허용

// --- 유틸 ---
function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function getOverlapErrorPercent(src1, src2, width, height) {
  function loadImg(src) {
    return new Promise(res => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.src = src;
    });
  }
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
  // hex → rgb 변환
  const c = hex.substring(1); // remove #
  const rgb = parseInt(c, 16); 
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  // 밝기 계산 (WCAG 기준)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? "#222" : "#fff"; 
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
      const a = data[(y*W + x)*4 + 3];
      if (a > alphaThresh) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0 || y1 < 0) return { hasContent:false };

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
const FULL_TAB_LIST = [
  { key: "logo", label: "로고 이미지" },
  { key: "bottom", label: "하단 이미지" },
  { key: "preview", label: "미리보기" }
];

export default function FullSplashMaterialCheck() {
  const [fullTab, setFullTab] = useState("logo");

  // 로고
  const [logoImg, setLogoImg] = useState(null);
  const [logoInfo, setLogoInfo] = useState({});
  const [logoGuideIdx, setLogoGuideIdx] = useState(0);
  const [logoGuideOpacity, setLogoGuideOpacity] = useState(0.3);
  const [logoErrorPercents, setLogoErrorPercents] = useState([]);
  const [logoPaddingCheck, setLogoPaddingCheck] = useState(null);

  const [invertGuide, setInvertGuide] = useState(false);

  // 하단
  const [bottomImg, setBottomImg] = useState(null);
  const [bottomInfo, setBottomInfo] = useState({});

  const [bottomOverlayOpacity, setBottomOverlayOpacity] = useState(0.3);

  // 배경색
  const [bgColor, setBgColor] = useState("#000000");
  const [bgHexInput, setBgHexInput] = useState("#000000");
  const [bgCheck, setBgCheck] = useState({s:0, b:0, pass:true});
  const [bgWasChosen, setBgWasChosen] = useState(false);

  // 배경색 HSV 계산
  function rgb2hsv(r,g,b){
    r/=255;g/=255;b/=255;
    let max=Math.max(r,g,b),min=Math.min(r,g,b),h,s,v=max,c=max-min;
    s=max===0?0:c/max;
    if(c===0) h=0;
    else if(max===r) h=((g-b)/c)%6;
    else if(max===g) h=(b-r)/c+2;
    else h=(r-g)/c+4;
    h=Math.round(h*60);if(h<0)h+=360;
    return {h,s:Math.round(s*100),v:Math.round(v*100)};
  }
// 배경색 적용
function applyBgColor(hex) {
  setBgHexInput(hex); // 입력값 그대로 유지

  // hex 코드가 6자리 완성됐을 때만 bgColor 업데이트
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex || "");
  if (!m) return;
  const norm = "#" + m[1].toLowerCase();
  setBgColor(norm);

  const rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(norm);
  let r=255,g=255,b=255;
  if(rgb) { r=parseInt(rgb[1],16);g=parseInt(rgb[2],16);b=parseInt(rgb[3],16); }
  const hsv = rgb2hsv(r,g,b);
  setBgCheck({s: hsv.s, b: hsv.v, pass: (hsv.s + hsv.v <= 160)});
}

  useEffect(()=>{ applyBgColor(bgColor); },[]);

  // 로고 업로드
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setLogoImg(ev.target.result);
        const img = new window.Image();
        img.onload = async function () {
          let isTransparent = false;
          if (file.type==="image/png" || file.name.toLowerCase().endsWith(".png")) {
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, img.width, img.height);
            const d = ctx.getImageData(0, 0, img.width, img.height).data;
            for (let i = 3; i < d.length; i += 4*32) {
              if (d[i] < 250) { isTransparent = true; break; }
            }
          }
          setLogoInfo({w:img.width,h:img.height,size:file.size,isPng:true,isTransparent});

          // 가이드 일치율
          const errorArr = [];
          for (let i = 0; i < LOGO_GUIDE_LIST.length; ++i) {
            const guideSrc = LOGO_GUIDE_LIST[i].file;
            const error = await getOverlapErrorPercent(ev.target.result, guideSrc, LOGO_WIDTH, LOGO_HEIGHT);
            errorArr.push(error);
          }
          setLogoErrorPercents(errorArr);
          if (errorArr.length > 0) {
            const bestIdx = errorArr.indexOf(Math.min(...errorArr));
            setLogoGuideIdx(bestIdx);
          }

          // 중앙정렬 검사
          setLogoPaddingCheck(analyzePaddingAlignment(img));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 하단 업로드
  const handleBottomChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const isAllowedFormat = ALLOWED_BOTTOM_EXTS.includes(ext);

  const reader = new FileReader();
  reader.onload = (ev) => {
    setBottomImg(ev.target.result);
    const img = new window.Image();
    img.onload = function () {
      // 투명(알파) 체크 (JPG/JPEG은 원래 불투명)
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const d = ctx.getImageData(0, 0, img.width, img.height).data;
      let isTransparent = false;
      for (let i = 3; i < d.length; i += 4 * 32) {
        if (d[i] < 250) { isTransparent = true; break; }
      }

      setBottomInfo({
        w: img.width,
        h: img.height,
        size: file.size,
        ext,
        isTransparent,
        isAllowedFormat
      });
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

  const contrastColor = getContrastColor(bgColor);

  return (
    <div>
      {/* 탑 탭 */}
      <div className="top-type-tab-row">
        {TYPE_LIST.map(type =>
          <button key={type.key}
            className={`top-type-tab-btn${type.key === "full" ? " active" : ""}`}
            onClick={()=>{ if(type.key!=="full") window.location.href=type.url; }}>
            {type.label}
          </button>
        )}
      </div>

      <div className="multi-overlay-root">
        <div className="multi-overlay-card">
          <h1 className="multi-overlay-title">지도 스플래시 전면형 검수</h1>

          {/* 서브 탭 */}
          <div className="tab-header-row" style={{marginBottom:32}}>
            {FULL_TAB_LIST.map(tab=>(
              <button key={tab.key}
                className={`tab-header-btn${fullTab===tab.key?" active":""}`}
                onClick={()=>setFullTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 로고 탭 */}
          {fullTab==="logo" && (
            <div>
              <div className="overlay-upload-area">
                <label htmlFor="logo-upload" className="overlay-upload-btn">
                  <span className="upload-arrow" /> 로고 이미지 업로드
                  <input id="logo-upload" type="file" accept="image/png" onChange={handleLogoChange} />
                </label>
              </div>

              {logoImg ? (
                <>
                  {/* 배경색 */}
                  <div style={{margin:"14px 0"}}>
                    <b>배경 컬러</b>&nbsp;
                    <input 
  type="color" 
  value={bgColor} 
  onChange={e => { setBgWasChosen(true); applyBgColor(e.target.value); }}
  style={{
    width: 35,   // 원하는 가로 크기
    height: 20,  // 원하는 세로 크기
    padding: 0,
    border: "1px solid #ccc",
    borderRadius: 1,
    cursor: "pointer"
  }}
/>
                    <input type="text" value={bgHexInput} onChange={e => { setBgWasChosen(true); applyBgColor(e.target.value); }} style={{marginLeft:8,width:90}}/>
                  </div>
                  

{/* 등록 이미지 미리보기 */}
<div style={{display:"flex",gap:20}}>
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
    <div style={{
      position: "absolute",
      top: 6,
      left: 6,
      background: "rgba(255,255,255,0.8)",
      padding: "2px 6px",
      borderRadius: 4,
      fontSize: "0.8em",
      zIndex: 10
    }}>
      <label style={{display:"flex",alignItems:"center",gap:4}}>
        <input
          type="checkbox"
          checked={invertGuide}
          onChange={(e)=>setInvertGuide(e.target.checked)}
        />
        <span>로고 가이드 색상 반전</span>
      </label>
    </div>

    {/* 업로드된 로고 이미지 */}
    <img
      src={logoImg}
      alt="로고"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />

    {/* 가이드 이미지: 
        - 세로형(logoGuideIdx === 1): 등록 이미지 바운딩 박스 상단(y0)에 맞춰 top 정렬, 가로는 100% 유지(가이드 원본 비율 유지, 세로는 자연 높이).
        - 가로형(logoGuideIdx === 0): 등록 이미지 바운딩 박스 좌측(x0)에 맞춰 left 정렬, 세로는 100%로 덮되(원본 비율 유지), 가로는 자연 너비.
        - padding 분석 전/실패 시엔 기본 전체 덮기로 fallback. */}
    {logoGuideIdx === 1 && logoPaddingCheck?.hasContent ? (
      <img
        src={LOGO_GUIDE_LIST[1].file}
        alt="세로형 가이드"
        style={{
          position: "absolute",
          left: 0,
          top: ((logoPaddingCheck?.bbox?.y0) ?? 0) / 2,
          width: "100%",            // 가로 맞추고
          height: "auto",           // 세로는 원본 비율 유지
          opacity: logoGuideOpacity,
          filter: invertGuide ? "invert(1)" : "none",
          pointerEvents: "none"
        }}
      />
    ) : logoGuideIdx === 0 && logoPaddingCheck?.hasContent ? (
      <img
        src={LOGO_GUIDE_LIST[0].file}
        alt="가로형 가이드"
        style={{
          position: "absolute",
          top: 0,
          left: ((logoPaddingCheck?.bbox?.x0) ?? 0) / 2,
          height: "100%",           // 세로 맞추고
          width: "auto",            // 가로는 원본 비율 유지
          opacity: logoGuideOpacity,
          filter: invertGuide ? "invert(1)" : "none",
          pointerEvents: "none"
        }}
      />
    ) : (
      <img
        src={LOGO_GUIDE_LIST[logoGuideIdx].file}
        alt="가이드"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          opacity: logoGuideOpacity,
          filter: invertGuide ? "invert(1)" : "none",
          pointerEvents: "none"
        }}
      />
    )}

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
  
  <div style={{minWidth:200,display:"flex",flexDirection:"column",gap:12}}>
    {LOGO_GUIDE_LIST.map((g, idx) => (
      <button
        key={g.file}
        style={{
          fontWeight: logoGuideIdx === idx ? 700 : 500,
          color: logoGuideIdx === idx ? "#2952eb" : "#777",
          border: logoGuideIdx === idx ? "2px solid #2952eb" : "1px solid #ddd",
          background: "#fff",
          borderRadius: 4,
          padding: "4px 14px",
          fontSize: "1em",
          cursor: "pointer"
        }}
        onClick={() => setLogoGuideIdx(idx)}
      >
        {g.name}
        <span style={{ fontSize: "0.85em", marginLeft: 6, color: "#444" }}>
          (일치율 {logoErrorPercents[idx] ? (100 - logoErrorPercents[idx] * 100).toFixed(1) + "%" : "-"})
        </span>
        {logoErrorPercents.length > 0 &&
         idx === logoGuideIdx &&
         idx === logoErrorPercents.indexOf(Math.min(...logoErrorPercents)) && (
          <span
            style={{
              marginLeft: 8,
              padding: "2px 6px",
              background: "linear-gradient(90deg,#448bff 45%,#65e5f5 98%)",
              color: "#fff",
              borderRadius: 4,
              fontSize: "0.75em",
              fontWeight: 600
            }}
          >
            추천
          </span>
        )}
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
        onChange={e=>setLogoGuideOpacity(Number(e.target.value))}
        style={{marginLeft:8,verticalAlign:"middle"}}
      />
      <span style={{marginLeft:8,fontSize:"0.9em",fontWeight:600}}>
        {Math.round(logoGuideOpacity*100)}%
      </span>
    </div>
    
  </div>
</div>


                  {/* 기본가이드 체크 */}
                  <div style={{marginTop:40}}>
                    <b>기본가이드 체크</b>
                    <div className="ad-info-box-check">
                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {logoInfo.w===LOGO_WIDTH && logoInfo.h===LOGO_HEIGHT
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">사이즈</span>
                        <span className="info-check-value">{logoInfo.w}x{logoInfo.h} <span className="guide-text"> (가로 945px, 세로 720px)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {logoInfo.size<=400*1024
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">용량</span>
                        <span className="info-check-value">{formatSize(logoInfo.size)} <span className="guide-text"> (400KB 이하)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {logoInfo.isPng
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">포맷</span>
                        <span className="info-check-value">image/png (PNG) <span className="guide-text">(PNG 만 허용)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {logoInfo.isTransparent
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">투명</span>
                        <span className="info-check-value">{logoInfo.isTransparent?"투명 있음":"투명 없음"} <span className="guide-text">(반드시 투명)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {bgCheck.pass
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">채도+명도</span>
                        <span className="info-check-value">S: {bgCheck.s}, B: {bgCheck.b} (합: {bgCheck.s+bgCheck.b}) <span className="guide-text">(합 160 이하)</span></span>
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
  상:<span style={{color: Math.abs(logoPaddingCheck.padding.top - logoPaddingCheck.padding.bottom) > logoPaddingCheck.tolerance ? "red" : "inherit"}}>
    {logoPaddingCheck.padding.top}px
  </span>, 
  하:<span style={{color: Math.abs(logoPaddingCheck.padding.top - logoPaddingCheck.padding.bottom) > logoPaddingCheck.tolerance ? "red" : "inherit"}}>
    {logoPaddingCheck.padding.bottom}px
  </span>, 
  좌:<span style={{color: Math.abs(logoPaddingCheck.padding.left - logoPaddingCheck.padding.right) > logoPaddingCheck.tolerance ? "red" : "inherit"}}>
    {logoPaddingCheck.padding.left}px
  </span>, 
  우:<span style={{color: Math.abs(logoPaddingCheck.padding.left - logoPaddingCheck.padding.right) > logoPaddingCheck.tolerance ? "red" : "inherit"}}>
    {logoPaddingCheck.padding.right}px
  </span>) <span className="guide-text">(오차범위 10px 이내)</span>
</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="tab-empty-msg">로고 이미지를 업로드해 주세요.</div>
              )}
            </div>
          )}

          {/* --- 하단 탭 --- */}
          {fullTab==="bottom" && (
            <div>
              <div className="overlay-upload-area">
                <label htmlFor="bottom-upload" className="overlay-upload-btn">
                  <span className="upload-arrow"/> 하단 이미지 업로드
                  <input
                    id="bottom-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleBottomChange}
                  />
                </label>
              </div>
              {bottomImg ? (
                <>
                  <div style={{width:BOTTOM_WIDTH/2,height:BOTTOM_HEIGHT/2,background:"#fafcff",border:"1px solid #eaeaea",position:"relative"}}>
                    <img src={bottomImg} alt="하단" style={{width:"100%",height:"100%",objectFit:"contain"}}/>

{/* 좌측 불투명 레이어 */}
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: (461 / 2) + "px",
      height: (BOTTOM_HEIGHT / 2) + "px",
      background: `rgba(0,0,0,${bottomOverlayOpacity})`
    }}
  />

  {/* 우측 불투명 레이어 */}
  <div
    style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: (461 / 2) + "px",
      height: (BOTTOM_HEIGHT / 2) + "px",
      background: `rgba(0,0,0,${bottomOverlayOpacity})`
    }}
  />

  <div
      style={{
        position: "absolute",
        top: 1,
        left: 471,
        color: "white",
        fontWeight: "bold",
        fontSize: "0.75em",
        background: "rgba(255, 0, 0, 0.6)",
        padding: 2,
        borderRadius: 2
      }}
    >
      주요 Creative 영역
    </div>
                    
                    {/* 중앙 빨간 점선 테두리 */}
  <div style={{
    position:"absolute",
    top:0,
    left:461/2,
    width:BOTTOM_MAIN_AREA_W/2,
    height:"100%",
      boxSizing: "border-box",
      border: "2px dashed red",
    pointerEvents:"none"
  }}
  >

<div
  style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 392 / 2,   // 미리보기 스케일(1/2)이니까 나눠줌
    height: 100 / 2,
    transform: "translate(-50%, -50%)",
    border: "2px dashed green",
    background: "rgba(4, 109, 32, 0.3)", 
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "green",
    fontWeight: "bold",
    fontSize: "0.75em"
  }}
>
</div>



  {/* 중앙하단 텍스트 회피 영역 (478x60) */}
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      width: "100%",
      height: 30, // 478x60 높이 중 60px
      background: "rgba(20, 0, 149, 0.5)", // 초록색 반투명
      display: "flex"
    }}
  >
  </div>
</div>

<div
      style={{
        position: "absolute",
        top: 275,
        left: 471,
        color: "white",
        fontWeight: "bold",
        fontSize: "0.75em",
        background: "rgba(20, 0, 149, 0.5)",
        padding: 2,
        borderRadius: 2
      }}
    >
      주요 텍스트 배치 지양 영역
    </div>

    <div
      style={{
        position: "absolute",
        top: 130,
        left: 471,
        color: "white",
        fontWeight: "bold",
        fontSize: "0.75em",
        background: "rgba(13, 67, 26, 0.4)",
        padding: 2,
        borderRadius: 2
      }}
    >
      이미지 자동 크롭 영역 (392x100)
    </div>

                  </div>

{/* ▼ 투명도 조절바 */}
<div style={{ marginTop: 10 }}>
  <b>투명도</b>
  <input
    type="range"
    min={0}
    max={1}
    step={0.05}
    value={bottomOverlayOpacity}
    onChange={(e)=>setBottomOverlayOpacity(parseFloat(e.target.value))}
    style={{ marginLeft: 10, verticalAlign: "middle" }}
  />
  <span style={{ marginLeft: 8, fontSize: "0.9em", fontWeight: 600 }}>
    {Math.round(bottomOverlayOpacity * 100)}%
  </span>
</div>

                  {/* 기본가이드 체크 */}
                  <div style={{marginTop:40}}>
                    <b>기본가이드 체크</b>
                    <div className="ad-info-box-check">
                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {bottomInfo.w===BOTTOM_WIDTH && bottomInfo.h===BOTTOM_HEIGHT
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">사이즈</span>
                        <span className="info-check-value">{bottomInfo.w}x{bottomInfo.h} <span className="guide-text"> (가로 1400px, 세로 614px)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {bottomInfo.size<=400*1024
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">용량</span>
                        <span className="info-check-value">{formatSize(bottomInfo.size)} <span className="guide-text"> (400KB 이하)</span></span>
                      </div>

                      <div className="info-check-row">
                        <span className="info-check-icon">
                          {bottomInfo.isAllowedFormat
                            ? <span className="check-green">✔</span>
                            : <span className="check-red">✖</span>}
                        </span>
                        <span className="info-check-label">포맷</span>
                        <span className="info-check-value">
                          {bottomInfo.ext ? bottomInfo.ext.toUpperCase() : "-"}
                          <span className="guide-text"> (허용: PNG / JPG / JPEG)</span>
                        </span>
                      </div>

                      
                    </div>
                  </div>
                </>
              ) : (
                <div className="tab-empty-msg">하단 이미지를 업로드해 주세요.</div>
              )}
            </div>
          )}

          {/* 미리보기 탭 */}
          {fullTab==="preview" && (
  <div>
    {/* 등록 완료 여부 체크 */}
    {(!logoImg || !bottomImg || !bgWasChosen) ? (
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
            <li style={{margin: "12px 0"}}>
              로고 이미지를 업로드해 주세요.{" "}
              <a 
            href="#logo" 
            onClick={(e) => { 
              e.preventDefault(); 
              setFullTab("logo"); 
            }} 
            style={{ color: "#2952eb", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
            </li>
          )}
          {!bgWasChosen && (
            <li style={{margin: "12px 0"}}>
              배경 컬러를 선택/입력해 주세요.{" "}
              <a 
            href="#logo" 
            onClick={(e) => { 
              e.preventDefault(); 
              setFullTab("logo"); 
            }} 
            style={{ color: "#2952eb", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
            </li>
          )}
          {!bottomImg && (
            <li style={{margin: "12px 0"}}>
              하단 이미지를 업로드해 주세요.{" "}
              <a 
            href="#bottom" 
            onClick={(e) => { 
              e.preventDefault(); 
              setFullTab("bottom"); 
            }} 
            style={{ color: "#2952eb", textDecoration: "underline", cursor: "pointer" }}
          >
            link
          </a>
            </li>
          )}
        </ul>
      </div>
    ) : (
      // 모두 준비된 경우 실제 미리보기
     <div
      style={{
        width: PREVIEW_MOBILE_W,
        height: PREVIEW_MOBILE_H,
        margin: "0 auto",
        position: "relative",
        borderRadius: 28,
        overflow: "hidden",
        background: bgColor   // 규칙 3: 전체 영역 배경컬러
      }}
    >
      {/* 상단 55%: 로고 영역 (가운데 정렬, contain) */}
      {/* 로고 영역 */}
<div style={{
  height: "55%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}}>
  {logoImg && (
    <img
      src={logoImg}
      alt="로고"
      style={{
        width: "315px",     // 945 → 315
        height: "240px",    // 720 → 240
        objectFit: "contain"
      }}
    />
  )}
</div>

      {/* 하단 45%: 하단 이미지 (세로 비율 맞춤, 좌우는 잘려도 됨) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "45%",      // 규칙 1
          overflow: "hidden"
        }}
      >
        {bottomImg && (
          <img
            src={bottomImg}
            alt="하단"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              height: "100%",   // 세로를 45% 영역에 맞춤
              width: "auto",    // 가로는 자동 → 필요 시 좌우 크롭
              objectFit: "cover"
            }}
          />
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
  );
}
