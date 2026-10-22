/**
 * 웹툰앱 스플래시 — 로고·배경 대비 검사와 구분선(디바이더) 보조값.
 *
 * 출처: 웹툰 디자인팀 「스플래시 로고 가시성 확보를 위한 배경 대비 기준 도입」(2026-10-15 전달)
 *       + 함께 전달된 〈스플래시 배경 컬러 확인〉 툴의 판정 로직.
 *       아래 상수·임계값은 그 툴 구현과 동일하게 맞춘 것이다. 임의로 바꾸지 말 것.
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
  /** 그린 로고 + 배경이 로고보다 밝을 때 (밝은 컬러·저채도 배경) */
  GREEN_ON_LIGHT: 1.6,
  /** 그린 로고 + 배경이 로고보다 어두울 때 (중·고채도, 어두운 배경) */
  GREEN_ON_DARK: 2,
  /** 화이트 로고 — 배경 밝기와 무관하게 단일 기준 */
  WHITE: 3,
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

/**
 * 배경색과 웹툰 로고의 대비 판정.
 *
 * 그린 로고 기준이 둘로 갈리는 이유 — 배경이 로고보다 밝으면 대비를 2 까지 끌어올리기가
 * 구조적으로 어렵다(그린 자체가 밝은 색이라 더 밝은 배경과는 차이가 안 벌어진다).
 * 그래서 밝은 쪽은 1.6, 어두운 쪽은 2 로 나눈다.
 *
 * @param {string} bgHex     배경색 "#rrggbb"
 * @param {"green"|"white"} logoColor 소재에 쓰인 웹툰 로고 색
 * @returns {{ratio:number, threshold:number, pass:boolean, bgIsLighter:boolean}|null}
 */
export function evaluateWebtoonContrast(bgHex, logoColor) {
  const bg = hexToRgb(bgHex);
  if (!bg) return null;

  const logoHex = logoColor === "white" ? WEBTOON_LOGO_WHITE : WEBTOON_LOGO_GREEN;
  const logo = hexToRgb(logoHex);

  const ratio = contrastRatioRgb(bg, logo);
  const bgIsLighter = relativeLuminanceRgb(bg) >= relativeLuminanceRgb(logo);

  const threshold = logoColor === "white"
    ? WEBTOON_CONTRAST_THRESHOLDS.WHITE
    : (bgIsLighter
        ? WEBTOON_CONTRAST_THRESHOLDS.GREEN_ON_LIGHT
        : WEBTOON_CONTRAST_THRESHOLDS.GREEN_ON_DARK);

  return { ratio, threshold, pass: ratio >= threshold, bgIsLighter };
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
};

/**
 * 한 줄(세로형 구분선이면 열, 가로형이면 행)을 훑어 '선 후보'인지 본다.
 * 선 후보 = 한 덩어리로 이어진 + 색·알파가 균일한 + 충분히 긴 픽셀 줄.
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

  let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, aMin = 255, aMax = 0;
  for (let i = best.start; i < best.start + best.run; i++) {
    const [r, g, b, a] = get(i);
    rSum += r; gSum += g; bSum += b; aSum += a;
    if (r < rMin) rMin = r; if (r > rMax) rMax = r;
    if (g < gMin) gMin = g; if (g > gMax) gMax = g;
    if (b < bMin) bMin = b; if (b > bMax) bMax = b;
    if (a < aMin) aMin = a; if (a > aMax) aMax = a;
  }
  if (rMax - rMin > p.COLOR_DEV || gMax - gMin > p.COLOR_DEV || bMax - bMin > p.COLOR_DEV) return null;
  if (aMax - aMin > p.ALPHA_DEV) return null;

  const n = best.run;
  return {
    start: best.start,
    length: n,
    rgb: [rSum / n, gSum / n, bSum / n],
    alpha: aSum / n,
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
 * @param {"W"|"H"} orientation  로고 가이드 방향. W(가로형)=세로 구분선, H(세로형)=가로 구분선
 * @returns {{found:boolean, type?:"black"|"white"|"other", opacityPct?:number,
 *            pass?:boolean, thickness?:number, length?:number}}
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

  return {
    found: true,
    type,
    opacityPct,
    opacityOk,
    pass: opacityOk && type !== "other",
    thickness,
    length: rep.length,
  };
}
