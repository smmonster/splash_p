/**
 * 웹툰앱 스플래시 — 로고·배경 대비 검사와 구분선(디바이더) 보조값.
 *
 * 출처: 웹툰 디자인팀 「스플래시 로고 가시성 확보를 위한 배경 대비 기준 도입」(2026-10-15 전달)
 *       + 함께 전달된 〈스플래시 배경 컬러 확인〉 툴의 판정 로직.
 *       이후 2026-11-02 요청으로 그린 로고 기준값의 분기 잣대와 값이 바뀌었다
 *       (상대휘도 비교 1.6/2 → HSB 명도 B 50 기준 1.4/2). 그만큼 위 공유 툴과는
 *       값이 어긋나 있으니, 둘을 맞출 때는 반드시 디자인팀 확인을 거칠 것.
 *       아래 상수·임계값을 임의로 바꾸지 말 것.
 *
 * 왜 필요한가 — 기존에는 배경색의 채도(S)+명도(B) 합이 160 이하인지만 봤다.
 * 이 방식은 색상(H)과 실제 로고 색을 반영하지 못해서, 밝은 하늘색(#78cbff, 합 153)에
 * 그린 로고를 얹은 소재가 통과했다. 실제 대비는 1.03 대 1 로 로고가 배경에 묻힌다.
 * 그래서 기존 S+B 조건은 그대로 두고, 로고와 배경의 WCAG 대비 조건을 하나 더 얹는다.
 *
 * 두 검사의 성격이 다르다
 *   - 대비 검사: 자동 판정(통과/반려). 기준이 수치로 확정돼 있다.
 *   - 구분선 검사: 보조값(참고)까지만. 판정은 검수자가 수동 체크리스트에서 한다.
 */

// ── 대비 기준 ────────────────────────────────────────────────────────────────

/** 웹툰 그린 로고 색. 상대휘도 0.5211 — 밝은 배경/어두운 배경을 가르는 기준점이기도 하다. */
export const WEBTOON_LOGO_GREEN = "#00dc64";
export const WEBTOON_LOGO_WHITE = "#ffffff";

export const WEBTOON_CONTRAST_THRESHOLDS = {
  /** 그린 로고 + 밝은 배경 (HSB 명도 B ≥ 50) */
  GREEN_ON_LIGHT: 1.4,
  /** 그린 로고 + 어두운 배경 (B < 50) */
  GREEN_ON_DARK: 2,
  /** 화이트 로고 — 배경 밝기와 무관하게 단일 기준 */
  WHITE: 3,
  /** 그린 로고 기준값을 가르는 HSB 명도 경계 */
  BRIGHTNESS_SPLIT: 50,
};

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 상대휘도. rgb 는 0~255 3원소 배열. */
export function relativeLuminanceRgb(rgb) {
  return 0.2126 * srgbToLinear(rgb[0])
       + 0.7152 * srgbToLinear(rgb[1])
       + 0.0722 * srgbToLinear(rgb[2]);
}

/** WCAG 2.1 대비비 — (밝은 쪽 + 0.05) / (어두운 쪽 + 0.05). 범위 1 ~ 21. */
export function contrastRatioRgb(a, b) {
  const la = relativeLuminanceRgb(a);
  const lb = relativeLuminanceRgb(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** "#rrggbb" / "rgb" 축약형 → [r,g,b]. 파싱 실패 시 null. */
export function hexToRgb(hex) {
  let h = String(hex || "").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** HSB 의 명도(B, 0~100). 검수툴의 '채도+명도' 표기와 같은 계산·반올림을 쓴다. */
export function hsbBrightness(rgb) {
  return Math.round((Math.max(rgb[0], rgb[1], rgb[2]) / 255) * 100);
}

/**
 * 배경색과 웹툰 로고의 대비 판정.
 *
 * 그린 로고 기준이 둘로 갈리는 이유 — 밝은 배경에서는 대비를 2 까지 끌어올리기가
 * 구조적으로 어렵다(그린 자체가 밝은 색이라 더 밝은 배경과는 차이가 안 벌어진다).
 * 그래서 밝은 쪽과 어두운 쪽의 기준을 나눈다.
 *
 * 밝다/어둡다를 가르는 잣대는 2026-11-02 에 바뀌었다.
 *   이전: 배경의 상대휘도 vs 그린 로고의 상대휘도(0.5211) → 기준 1.6 / 2
 *   현재: 배경의 HSB 명도 B ≥ 50 → 기준 1.4 / 2   (웹툰 디자인팀 요청)
 * 휘도 대신 HSB 명도를 쓰므로 검수툴에 이미 표기하던 B 값과 잣대가 일치한다.
 *
 * @param {string} bgHex     배경색 "#rrggbb"
 * @param {"green"|"white"} logoColor 소재에 쓰인 웹툰 로고 색
 * @returns {{ratio:number, threshold:number, pass:boolean, bgBrightness:number}|null}
 */
export function evaluateWebtoonContrast(bgHex, logoColor) {
  const bg = hexToRgb(bgHex);
  if (!bg) return null;

  const logoHex = logoColor === "white" ? WEBTOON_LOGO_WHITE : WEBTOON_LOGO_GREEN;
  const logo = hexToRgb(logoHex);

  const ratio = contrastRatioRgb(bg, logo);
  const bgBrightness = hsbBrightness(bg);

  const threshold = logoColor === "white"
    ? WEBTOON_CONTRAST_THRESHOLDS.WHITE
    : (bgBrightness >= WEBTOON_CONTRAST_THRESHOLDS.BRIGHTNESS_SPLIT
        ? WEBTOON_CONTRAST_THRESHOLDS.GREEN_ON_LIGHT
        : WEBTOON_CONTRAST_THRESHOLDS.GREEN_ON_DARK);

  return { ratio, threshold, pass: ratio >= threshold, bgBrightness };
}

// ── 로고 색(그린/화이트) 자동 감지 ───────────────────────────────────────────

export const LOGO_COLOR_PARAMS = {
  OPAQUE_ALPHA: 200,   // 이 알파 이상만 '칠해진 픽셀'로 센다 (안티에일리어싱 가장자리 제외)
  GREEN_DIST: 60,      // 그린 로고색과의 RGB 유클리드 거리 허용치.
                       //   #00dc64 는 특정도가 높은 색이라 넉넉히 잡아도 오검출이 적다.
  MIN_GREEN_RATIO: 0.02, // 칠해진 픽셀 중 그린 비율이 이 값 이상이면 '그린 로고'.
                       //   최악의 경우(광고주 로고가 최대 크기로 꽉 찬 세로형)에도
                       //   웹툰 로고 그린은 전체의 약 5% 를 차지해 2% 와 여유가 있다.
  MIN_GREEN_PX: 200,   // 아주 작은 이미지에서 비율만으로 튀는 것을 막는 하한
};

/**
 * 업로드된 로고 PNG 에서 웹툰 로고가 그린인지 화이트인지 추정한다.
 *
 * 그린(#00dc64)은 고유색이라 '있다/없다'로 가른다. 웹툰 로고는 그린 아니면 화이트
 * 둘 중 하나이므로, 그린이 유의미하게 없으면 화이트로 본다.
 * 검수자가 UI 토글로 덮어쓸 수 있으니 추정이 틀려도 막다른 길은 아니다.
 *
 * @param {Uint8ClampedArray} data  RGBA 픽셀 (canvas getImageData().data)
 * @returns {{color:"green"|"white", greenPx:number, opaquePx:number, greenRatio:number}}
 */
export function detectWebtoonLogoColor(data, params = LOGO_COLOR_PARAMS) {
  const green = hexToRgb(WEBTOON_LOGO_GREEN);
  const maxDistSq = params.GREEN_DIST * params.GREEN_DIST;

  let opaquePx = 0, greenPx = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < params.OPAQUE_ALPHA) continue;
    opaquePx++;
    const dr = data[i] - green[0];
    const dg = data[i + 1] - green[1];
    const db = data[i + 2] - green[2];
    if (dr * dr + dg * dg + db * db <= maxDistSq) greenPx++;
  }

  const greenRatio = opaquePx ? greenPx / opaquePx : 0;
  const isGreen = greenPx >= params.MIN_GREEN_PX && greenRatio >= params.MIN_GREEN_RATIO;
  return { color: isGreen ? "green" : "white", greenPx, opaquePx, greenRatio };
}

// ── 구분선(디바이더) 보조값 ──────────────────────────────────────────────────

export const DIVIDER_PARAMS = {
  TARGET_OPACITY: 50,  // 가이드상 구분선 투명도 (%)
  OPACITY_TOL: 5,      // 허용 오차 (±%p) — 디자인팀 요청값
  ALPHA_MIN: 8,        // 이 알파를 넘으면 '그려진 픽셀'
  MIN_LEN_RATIO: 0.03, // 구분선 길이 하한 (가로형이면 이미지 높이 대비)
  MAX_THICK: 6,        // 구분선 두께 상한 (px). 이보다 두꺼우면 선이 아니라 면으로 본다.
  GAP_RATIO: 0.03,     // 선 양옆이 비어 있어야 하는 폭 (두께 방향 치수 대비).
                       //   가이드상 구분선 양옆은 48px(가로형)·60px(세로형) 여백이라
                       //   945·720 기준 약 28·22px 를 요구해도 여유가 있다.
  GAP_NOISE: 2,        // 여백으로 볼 때 눈감아 줄 픽셀 수
  COLOR_DEV: 14,       // 선 안에서 허용할 채널별 색 편차
  ALPHA_DEV: 24,       // 선 안에서 허용할 알파 편차
  BLACK_MAX: 40,       // 이 이하면 블랙 계열
  WHITE_MIN: 215,      // 이 이상이면 화이트 계열

  // 2026-11-24 추가 — 가장자리가 흐려진 구분선을 놓치던 문제 (아래 scanLine 주석 참고)
  EDGE_TRIM: 2,        // 선의 양 끝 이만큼은 균일도·투명도 계산에서 뺀다
  EXPECTED_THICK: 3,   // 가이드상 구분선 두께 (px)
  EXPECTED_LEN: 84,    // 가이드상 구분선 길이 (px)
};

/**
 * 한 줄(세로형 구분선이면 열, 가로형이면 행)을 훑어 '선 후보'인지 본다.
 * 선 후보 = 한 덩어리로 이어진 + 색·알파가 균일한 + 충분히 긴 픽셀 줄.
 *
 * 양 끝 EDGE_TRIM px 는 균일도 판단과 평균값 계산에서 뺀다.
 * 구분선을 리사이즈하거나 래스터화하면 끝 1~2px 의 알파가 안티에일리어싱으로 깎인다.
 * (실측: 85px 짜리 구분선의 양 끝 행만 알파 128 → 64). 이걸 그대로 넣으면 알파 편차가
 * ALPHA_DEV 를 넘겨 줄 전체가 탈락하고, 결국 구분선이 아예 검출되지 않았다.
 * 길이(length)는 끝을 포함한 원래 길이를 그대로 돌려준다 — 형태 판정이 봐야 할 값이라서다.
 */
function scanLine(get, len, minLen, p) {
  let best = { run: 0, start: -1 };
  let curRun = 0, curStart = -1;
  let drawn = 0;

  for (let i = 0; i < len; i++) {
    const a = get(i)[3];
    if (a >= p.ALPHA_MIN) {
      drawn++;
      if (curRun === 0) curStart = i;
      curRun++;
      if (curRun > best.run) best = { run: curRun, start: curStart };
    } else {
      curRun = 0;
    }
  }

  // 한 덩어리여야 한다. 흩어진 픽셀이 많으면 선이 아니라 그림이다.
  if (best.run < minLen || drawn > best.run * 1.3) return null;

  // 양 끝을 뺀 '심지' 구간에서만 색·알파를 본다. 너무 짧으면 뺄 여유가 없으니 그대로 쓴다.
  const trim = best.run > p.EDGE_TRIM * 2 + 2 ? p.EDGE_TRIM : 0;
  const coreStart = best.start + trim;
  const coreEnd = best.start + best.run - trim;   // 열린 구간

  let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, aMin = 255, aMax = 0;
  for (let i = coreStart; i < coreEnd; i++) {
    const [r, g, b, a] = get(i);
    rSum += r; gSum += g; bSum += b; aSum += a;
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (g < gMin) gMin = g; if (g > gMax) gMax = g;
    if (b < bMin) bMin = b; if (b > bMax) bMax = b;
    if (a < aMin) aMin = a; if (a > aMax) aMax = a;
  }
  if (rMax - rMin > p.COLOR_DEV || gMax - gMin > p.COLOR_DEV || bMax - bMin > p.COLOR_DEV) return null;
  if (aMax - aMin > p.ALPHA_DEV) return null;

  const core = coreEnd - coreStart;
  return {
    start: best.start,
    length: best.run,
    rgb: [rSum / core, gSum / core, bSum / core],
    alpha: aSum / core,
  };
}

/**
 * 로고 PNG 에서 구분선을 찾아 '투명도 50% 의 블랙/화이트인지' 보조값을 만든다.
 *
 * 구분선 위치는 가이드상 고정이다 (가로형: 웹툰 로고 - 48px - 세로선 - 48px - 광고주 로고,
 * 세로형: 60px 간격의 가로선). 그래서 선 방향만 알면 좁은 조건으로 찾을 수 있고,
 * 광고주 로고의 획을 선으로 오인할 여지가 적다 — 균일한 색·알파로 한 덩어리를 이루면서
 * 두께가 MAX_THICK 이하이고 양옆이 비어 있어야 하기 때문이다.
 *
 * 전제: 구분선이 PNG 알파로 들어 있어야 투명도를 읽을 수 있다. 배경색과 미리 합성해
 * 불투명하게 넘어온 파일은 투명도 100% 로 잡히고, 이는 '기준 벗어남'으로 보고된다.
 *
 * 한계 — 광고주 로고에 '주변이 비어 있는 가는 세로획'이 딱 하나 있으면 구분선으로 볼 수 있다.
 * 이때 투명도 100% 로 보고되어 '확인 필요'가 뜬다. 자동 반려가 아니라 육안 확인 안내로만
 * 쓰이므로 감수할 만한 쪽으로 기울인 것이다. 반대로 놓치는 쪽(미검출)은 기존 육안 검수와 같다.
 *
 * @param {Uint8ClampedArray} data  RGBA 픽셀
 * @param {number} W @param {number} H
 * 형태(크기) 판정은 2026-11-24 에 추가됐다. 가이드상 구분선은 3×84px(세로형 84×3px)로
 * 고정이라, 번지거나 늘어난 구분선은 수치로 바로 드러난다.
 *
 * @param {Uint8ClampedArray} data  RGBA 픽셀
 * @param {number} W @param {number} H
 * @param {"W"|"H"} orientation  로고 가이드 방향. W(가로형)=세로 구분선, H(세로형)=가로 구분선
 * @returns {{found:boolean, type?:"black"|"white"|"other", opacityPct?:number,
 *            opacityOk?:boolean, shapeOk?:boolean, pass?:boolean,
 *            thickness?:number, length?:number, sizeLabel?:string,
 *            expectedSizeLabel?:string, reasons?:string[]}}
 */
export function detectDivider(data, W, H, orientation, params = DIVIDER_PARAMS) {
  const p = params;
  const vertical = orientation !== "H";          // 가로형 로고 → 세로 구분선
  const across = vertical ? W : H;               // 선을 가로질러 훑는 축 (두께 방향)
  const along = vertical ? H : W;                // 선을 따라가는 축 (길이 방향)
  const minLen = Math.max(12, Math.round(along * p.MIN_LEN_RATIO));

  const px = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  // 축을 가로질러가며 각 줄이 '선 후보'인지 기록
  const lines = new Array(across);
  for (let k = 0; k < across; k++) {
    const get = vertical ? (i => px(k, i)) : (i => px(i, k));
    lines[k] = scanLine(get, along, minLen, p);
  }

  // 선 양옆이 비어 있는지 — 구분선은 여백 한가운데 혼자 서 있다.
  // 이 조건이 없으면 광고주 로고 안의 가는 세로획(I·l·1, 얇은 테두리)이 구분선으로 잡힌다.
  const isIsolated = (from, to, rep) => {
    const gap = Math.max(10, Math.round(across * p.GAP_RATIO));
    for (const [s, e] of [[from - gap, from - 1], [to + 1, to + gap]]) {
      let hit = 0;
      for (let k2 = Math.max(0, s); k2 <= Math.min(across - 1, e); k2++) {
        for (let i = rep.start; i < rep.start + rep.length; i++) {
          const a = (vertical ? px(k2, i) : px(i, k2))[3];
          if (a >= p.ALPHA_MIN && ++hit > p.GAP_NOISE) return false;
        }
      }
    }
    return true;
  };

  // 인접한 후보 줄을 묶어 선 하나로 본다 (안티에일리어싱으로 2~3줄이 되기도 한다)
  let bestGroup = null;
  let k = 0;
  while (k < across) {
    if (!lines[k]) { k++; continue; }
    let end = k;
    while (end + 1 < across && lines[end + 1]) end++;
    const thickness = end - k + 1;

    if (thickness <= p.MAX_THICK) {
      // 가장 진한 줄을 대표로 — 가장자리 줄은 안티에일리어싱으로 알파가 깎여 있다
      let rep = lines[k];
      for (let i = k; i <= end; i++) if (lines[i].alpha > rep.alpha) rep = lines[i];
      if ((!bestGroup || rep.length > bestGroup.rep.length) && isIsolated(k, end, rep)) {
        bestGroup = { rep, thickness };
      }
    }
    k = end + 1;
  }

  if (!bestGroup) return { found: false };

  const { rep, thickness } = bestGroup;
  const [r, g, b] = rep.rgb;
  const maxCh = Math.max(r, g, b), minCh = Math.min(r, g, b);
  const type = maxCh <= p.BLACK_MAX ? "black"
             : minCh >= p.WHITE_MIN ? "white"
             : "other";

  const opacityPct = Math.round((rep.alpha / 255) * 100);
  const opacityOk = Math.abs(opacityPct - p.TARGET_OPACITY) <= p.OPACITY_TOL;

  // 크기는 선 방향에 맞춰 '가로×세로'로 읽는다 (가로형 로고 → 세로 구분선 → 두께×길이)
  const size = vertical ? [thickness, rep.length] : [rep.length, thickness];
  const expected = vertical
    ? [p.EXPECTED_THICK, p.EXPECTED_LEN]
    : [p.EXPECTED_LEN, p.EXPECTED_THICK];
  const shapeOk = size[0] === expected[0] && size[1] === expected[1];

  const sizeLabel = `${size[0]}×${size[1]}px`;
  const expectedSizeLabel = `${expected[0]}×${expected[1]}px`;

  // 틀린 사유만 모은다 (요청 포맷). 순서는 형태 → 투명도 → 색.
  const reasons = [];
  if (!shapeOk) reasons.push(`구분선 형태 변형, ${expectedSizeLabel}`);
  if (!opacityOk) reasons.push(`투명도 ${p.TARGET_OPACITY}% ±${p.OPACITY_TOL}%p`);
  if (type === "other") reasons.push("Black 또는 White 아님");

  return {
    found: true,
    type,
    opacityPct,
    opacityOk,
    shapeOk,
    pass: reasons.length === 0,
    thickness,
    length: rep.length,
    sizeLabel,
    expectedSizeLabel,
    reasons,
  };
}

// ── 로고 변형(원본 대조) ─────────────────────────────────────────────────────

/**
 * 업로드된 로고 PNG(945×720) 안의 네이버웹툰 로고가 원본 그대로인지 본다.
 * 출처: 웹툰 디자인팀 2026-11-24 요청 (기준 로고 PNG 4장 함께 전달).
 *
 * 왜 PNG 대조인가 — 소재 제작 과정에서 웹툰 로고를 다시 그리거나, 다른 크기에서
 * 확대/축소해 붙이는 사고가 반복됐다. 눈으로는 멀쩡해 보여도 색이 미세하게 어긋나거나
 * 외곽이 계단식으로 깨진다. 기준 로고 원본과 픽셀로 대조하면 이 둘을 수치로 가른다.
 *
 * 기준 로고 4장(조합형 190×182 / 단독형 300×288 × 그린·화이트)은 모두
 * '단색 + 투명'으로만 이루어져 있다 (WEBTOON 글자는 색이 아니라 투명 구멍).
 * 그래서 안쪽 픽셀은 전부 원본 컬러 하나와 비교하면 된다.
 */

export const LOGO_SHAPE_PARAMS = {
  ALPHA_MIN: 8,          // 알파 마스크를 만들 때의 '그려진 픽셀' 기준
  COLOR_TOL: 6,          // 원본 컬러와의 채널별 허용 오차 (요청값 ±6)
  COLOR_FAIL_RATIO: 0.01,// 안쪽에서 색이 다른 픽셀이 1% 이상이면 어긋남
  EDGE_MIN_RATIO: 0.5,   // 외곽 반투명 픽셀이 원본의 50% 미만 → 계단식
  EDGE_MAX_RATIO: 2.5,   // 250% 초과 → 흐림
  MIN_IOU: 0.5,          // 이보다 안 맞으면 '웹툰 로고를 찾지 못함'으로 본다
  IOU_TIE: 0.02,         // 이 차이 안쪽이면 동점으로 보고 컬러 일치도로 가른다
                         //   (조합형 그린·화이트는 알파 마스크가 완전히 같다)
  REFINE_RADIUS: { 2: 5, 1: 3 }, // 단계별 재탐색 반경 (해당 배율의 픽셀 단위)
  PYRAMID: [8, 2, 1],    // 1/8 전체 탐색 → 1/2 보정 → 원본 보정
};

/** RGBA 픽셀 → 0/1 알파 마스크. */
function alphaMask(pix, alphaMin) {
  const { data, width, height } = pix;
  const m = new Uint8Array(width * height);
  for (let p = 0, i = 3; p < m.length; p++, i += 4) m[p] = data[i] >= alphaMin ? 1 : 0;
  return m;
}

/** 마스크를 f배 축소. 셀 안의 절반 이상이 채워져 있으면 1. */
function downMask(m, W, H, f) {
  const w = Math.ceil(W / f), h = Math.ceil(H / f);
  const acc = new Uint16Array(w * h);
  for (let y = 0; y < H; y++) {
    const oy = ((y / f) | 0) * w, row = y * W;
    for (let x = 0; x < W; x++) if (m[row + x]) acc[oy + ((x / f) | 0)]++;
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < acc.length; i++) out[i] = acc[i] * 2 >= f * f ? 1 : 0;
  return { m: out, w, h };
}

/** 주어진 오프셋 범위에서 IoU(겹친 넓이 / 합친 넓이)가 가장 큰 위치를 찾는다. */
function searchIoU(t, TW, TH, r, RW, RH, x0, x1, y0, y1) {
  const xs = Math.max(0, x0), xe = Math.min(x1, TW - RW);
  const ys = Math.max(0, y0), ye = Math.min(y1, TH - RH);
  let bestX = -1, bestY = -1, bestS = -1;
  for (let dy = ys; dy <= ye; dy++) {
    for (let dx = xs; dx <= xe; dx++) {
      let inter = 0, union = 0;
      for (let ry = 0; ry < RH; ry++) {
        const ti = (dy + ry) * TW + dx, ri = ry * RW;
        for (let rx = 0; rx < RW; rx++) {
          const a = r[ri + rx], b = t[ti + rx];
          if (a | b) { union++; inter += a & b; }
        }
      }
      const s = union ? inter / union : 0;
      if (s > bestS) { bestS = s; bestX = dx; bestY = dy; }
    }
  }
  return bestX < 0 ? null : { x: bestX, y: bestY, iou: bestS };
}

/**
 * 기준 로고가 대상 이미지 어디에 놓여 있는지 찾는다.
 *
 * 945×720 전체를 원본 해상도로 훑으면 수백억 번 연산이 되므로 피라미드로 좁힌다.
 * 1/8 로 줄여 전체를 훑고(≈400만 회), 그 자리를 1/2 → 원본 순으로 보정한다.
 * 실측으로 원본 해상도 전수 탐색과 같은 위치를 찾는 것을 확인했다.
 */
export function matchWebtoonLogoPosition(target, ref, params = LOGO_SHAPE_PARAMS) {
  const p = params;
  const tm = alphaMask(target, p.ALPHA_MIN);
  const rm = alphaMask(ref, p.ALPHA_MIN);
  let pos = null;

  for (const f of p.PYRAMID) {
    const T = f > 1 ? downMask(tm, target.width, target.height, f)
                    : { m: tm, w: target.width, h: target.height };
    const R = f > 1 ? downMask(rm, ref.width, ref.height, f)
                    : { m: rm, w: ref.width, h: ref.height };
    if (R.w > T.w || R.h > T.h) return null;

    let res;
    if (!pos) {
      res = searchIoU(T.m, T.w, T.h, R.m, R.w, R.h, 0, T.w - R.w, 0, T.h - R.h);
    } else {
      const rad = p.REFINE_RADIUS[f] ?? 3;
      const cx = Math.round(pos.x / f), cy = Math.round(pos.y / f);
      res = searchIoU(T.m, T.w, T.h, R.m, R.w, R.h, cx - rad, cx + rad, cy - rad, cy + rad);
    }
    if (!res) return null;
    pos = { x: res.x * f, y: res.y * f, iou: res.iou };
  }
  return pos;
}

/** 찾은 위치에서 안쪽 컬러와 외곽 반투명 픽셀 수를 센다. */
function measureAgainstRef(target, ref, ox, oy, refRgb, p) {
  const T = target.data, TW = target.width, TH = target.height;
  const R = ref.data, RW = ref.width, RH = ref.height;

  let innerPx = 0, colorBadPx = 0, refEdgePx = 0, edgePx = 0;

  for (let y = 0; y < RH; y++) {
    for (let x = 0; x < RW; x++) {
      const ri = (y * RW + x) * 4;
      const ra = R[ri + 3];
      if (ra > 0 && ra < 255) refEdgePx++;

      const tx = ox + x, ty = oy + y;
      if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) continue;
      const ti = (ty * TW + tx) * 4;
      const ta = T[ti + 3];
      if (ta > 0 && ta < 255) edgePx++;

      if (ra !== 255) continue;
      // '가장자리 1px 제외' — 상하좌우 이웃까지 모두 불투명한 자리만 안쪽으로 본다
      const up    = y > 0      ? R[((y - 1) * RW + x) * 4 + 3] : 0;
      const down  = y < RH - 1 ? R[((y + 1) * RW + x) * 4 + 3] : 0;
      const left  = x > 0      ? R[(y * RW + x - 1) * 4 + 3]   : 0;
      const right = x < RW - 1 ? R[(y * RW + x + 1) * 4 + 3]   : 0;
      if (up !== 255 || down !== 255 || left !== 255 || right !== 255) continue;

      innerPx++;
      if (Math.abs(T[ti]     - refRgb[0]) > p.COLOR_TOL
       || Math.abs(T[ti + 1] - refRgb[1]) > p.COLOR_TOL
       || Math.abs(T[ti + 2] - refRgb[2]) > p.COLOR_TOL) colorBadPx++;
    }
  }

  return { innerPx, colorBadPx, refEdgePx, edgePx };
}

/**
 * 업로드 로고와 기준 로고 4장을 대조해 '원본 그대로인지' 판정한다.
 *
 * 판정 (요청 사양)
 *   - 로고 컬러: 안쪽(가장자리 1px 제외)에서 원본 컬러와 ±6 넘게 다른 픽셀이
 *                1% 이상이면 어긋남 → "로고 컬러 확인 필요"
 *   - 로고 외곽: 외곽 반투명 픽셀이 원본의 50% 미만이면 계단식, 250% 초과면 흐림
 *                → "로고 해상도 확인 필요"
 *
 * 기준 로고 고르기 — 알파 마스크 IoU 가 가장 높은 1장. 조합형 그린·화이트는 마스크가
 * 완전히 같아 동점이 나므로, 동점 구간(IOU_TIE)에서는 컬러가 더 맞는 쪽을 택한다.
 *
 * 자동 반려가 아니라 '확인 필요' 안내로 쓰는 것을 전제로 한 값들이다.
 * 로고를 못 찾은 경우(IoU < MIN_IOU)도 통과시키지 않고 확인 대상으로 넘긴다.
 *
 * @param {{data:Uint8ClampedArray,width:number,height:number}} target 업로드 로고 PNG
 * @param {Array<{key:string,label:string,color:"green"|"white",
 *                pixels:{data:Uint8ClampedArray,width:number,height:number}}>} refs
 * @returns {{matched:boolean, pass:boolean, reasons:string[], ...}}
 */
export function evaluateWebtoonLogoShape(target, refs, params = LOGO_SHAPE_PARAMS) {
  const p = params;
  const cands = [];

  for (const ref of refs) {
    const pos = matchWebtoonLogoPosition(target, ref.pixels, p);
    if (!pos) continue;
    const refRgb = hexToRgb(ref.color === "white" ? WEBTOON_LOGO_WHITE : WEBTOON_LOGO_GREEN);
    const m = measureAgainstRef(target, ref.pixels, pos.x, pos.y, refRgb, p);
    cands.push({
      ref: { key: ref.key, label: ref.label, color: ref.color },
      x: pos.x, y: pos.y, iou: pos.iou,
      ...m,
      colorBadRatio: m.innerPx ? m.colorBadPx / m.innerPx : 1,
      edgeRatio: m.refEdgePx ? m.edgePx / m.refEdgePx : 0,
    });
  }

  if (!cands.length) return { matched: false, pass: false, reasons: ["웹툰 로고를 찾지 못함"] };

  const maxIou = Math.max(...cands.map(c => c.iou));
  const best = cands
    .filter(c => maxIou - c.iou <= p.IOU_TIE)
    .reduce((a, b) => (b.colorBadRatio < a.colorBadRatio ? b : a));

  if (best.iou < p.MIN_IOU) {
    return { matched: false, pass: false, iou: best.iou, reasons: ["웹툰 로고를 찾지 못함"] };
  }

  const colorOk = best.colorBadRatio < p.COLOR_FAIL_RATIO;
  const edgeKind = best.edgeRatio < p.EDGE_MIN_RATIO ? "aliased"
                 : best.edgeRatio > p.EDGE_MAX_RATIO ? "blurred"
                 : null;

  const reasons = [];
  if (!colorOk) reasons.push("로고 컬러 확인 필요");
  if (edgeKind) reasons.push("로고 해상도 확인 필요");

  return {
    matched: true,
    ...best,
    colorOk,
    edgeOk: !edgeKind,
    edgeKind,
    pass: reasons.length === 0,
    reasons,
  };
}
