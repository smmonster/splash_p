/**
 * 모션 스틸컷 ↔ 영상 첫 프레임(t=0) 윤곽선 차이 검사 — '확인 권장 지점' 안내 전용.
 *
 * ⚠ 이 검사 결과로 반려 판정을 내리면 안 된다. 검수자가 육안으로 어디를 볼지
 *   짚어주는 용도로만 쓴다. 자동 판정에 쓸 수 없는 이유는 실측으로 확인했다.
 *
 *   케이스              덩어리 수   최대 덩어리
 *   정상(기본 인코딩)      38개      149px
 *   정상(저비트레이트)      60개      928px   ← 정상인데 가장 나쁨
 *   정상(리스케일)         41개      160px
 *   결함(10px 밀림)        17개      720px
 *   결함(1px 밀림)         36개      202px
 *   결함(요소 삭제)        52개    1,064px
 *
 *   정상 소재가 실제 결함보다 나쁘게 나와, 덩어리 수·크기 어떤 임계로도 분리되지 않는다.
 *   영상 화질이 조금만 떨어지면 정상 소재가 전부 걸린다.
 *
 * 그래도 쓰는 이유: 색차 검사와 위치 검사가 모두 놓치는 '요소 추가·삭제'를
 * 유일하게 짚어낸다. 위 표의 요소 삭제 케이스에서 카피라이트 자리(y 529~543)를
 * 1,064px 덩어리로 정확히 지목했다. 판정이 아니라 안내라서 오탐 부담이 없다.
 *
 * 동작
 *   1. 두 이미지에서 각각 윤곽선 지도를 만든다 (3x3 Sobel 밝기 기울기)
 *   2. 한쪽에만 있는 윤곽선을 찾는다 (상대편 TOL px 이내면 같은 것으로 봄)
 *   3. 남은 것 중 MIN_CLUSTER 이상 뭉친 덩어리를 크기순으로 추린다
 *
 * 전역 색감 변화는 윤곽선 위치를 바꾸지 않아 걸리지 않고,
 * 압축 노이즈는 기존 윤곽선이 1~2px 번지는 것이라 TOL 허용 범위에 흡수된다.
 */

export const EDGE_DIFF_PARAMS = {
  EDGE_THR: 16,      // 윤곽선으로 볼 밝기 기울기 세기
  TOL: 2,            // 상대편 윤곽선을 같은 것으로 볼 거리(px). 압축 흔들림 흡수
  MIN_CLUSTER: 25,   // 이 크기 이상 뭉친 덩어리만 후보로 인정 (px)
  MAX_SPOTS: 5,      // 화면에 표시할 지점 상한.
                     //   정상 소재도 38~60개 덩어리가 나오므로 상한 없이 표시하면
                     //   화면이 마커로 덮여 검수자가 마커 자체를 무시하게 된다.
                     //   크기 상위 몇 곳만 짚어주는 편이 실제로 도움이 된다.
};

/** 3x3 Sobel 기울기 세기가 임계를 넘는 픽셀을 윤곽선으로 표시. 1px 테두리는 제외. */
function edgeMap(gray, W, H, thr) {
  const out = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    const rm = (y - 1) * W, r0 = y * W, rp = (y + 1) * W;
    for (let x = 1; x < W - 1; x++) {
      const tl = gray[rm + x - 1], tc = gray[rm + x], tr = gray[rm + x + 1];
      const ml = gray[r0 + x - 1], mr = gray[r0 + x + 1];
      const bl = gray[rp + x - 1], bc = gray[rp + x], br = gray[rp + x + 1];
      const gx = tr + 2 * mr + br - tl - 2 * ml - bl;
      const gy = bl + 2 * bc + br - tl - 2 * tc - tr;
      if (Math.sqrt(gx * gx + gy * gy) / 4 > thr) out[r0 + x] = 1;
    }
  }
  return out;
}

/** 3x3 팽창을 iterations 번. 가로·세로로 분리해 처리한다 (이진 팽창은 분리 가능). */
function dilate(mask, W, H, iterations) {
  let cur = mask;
  for (let it = 0; it < iterations; it++) {
    const h = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const r = y * W;
      for (let x = 0; x < W; x++) {
        h[r + x] = cur[r + x] ||
          (x > 0 ? cur[r + x - 1] : 0) ||
          (x < W - 1 ? cur[r + x + 1] : 0);
      }
    }
    const v = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const r = y * W;
      for (let x = 0; x < W; x++) {
        v[r + x] = h[r + x] ||
          (y > 0 ? h[r - W + x] : 0) ||
          (y < H - 1 ? h[r + W + x] : 0);
      }
    }
    cur = v;
  }
  return cur;
}

/** 8방향으로 연결된 픽셀 덩어리를 찾아 크기·경계상자 목록으로 반환. */
function clusters(mask, W, H, minSize) {
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const found = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    let sp = 0;
    stack[sp++] = i;
    seen[i] = 1;
    let size = 0;
    let y0 = (i / W) | 0, y1 = y0, x0 = i % W, x1 = x0;
    while (sp > 0) {
      const p = stack[--sp];
      const py = (p / W) | 0, px = p % W;
      size++;
      if (py < y0) y0 = py; else if (py > y1) y1 = py;
      if (px < x0) x0 = px; else if (px > x1) x1 = px;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          if (nx < 0 || nx >= W) continue;
          const q = ny * W + nx;
          if (mask[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
        }
      }
    }
    if (size >= minSize) found.push({ size, y0, x0, y1, x1 });
  }
  found.sort((a, b) => b.size - a.size);
  return found;
}

/**
 * 확인 권장 지점 목록을 반환.
 *
 * @param {Uint8Array} still 스틸컷 흑백 평면 (길이 W*H)
 * @param {Uint8Array} frame 영상 첫 프레임 흑백 평면 (길이 W*H)
 * @param {number} W 가로 px
 * @param {number} H 세로 px
 * @param {object} [params] EDGE_DIFF_PARAMS 일부 덮어쓰기 (회귀 테스트용)
 * @returns spots — 크기 상위 지점. side: "still"=영상에서 빠진 요소, "frame"=스틸컷에서 빠진 요소
 */
export function findEdgeDiffSpots(still, frame, W, H, params) {
  const P = { ...EDGE_DIFF_PARAMS, ...(params || {}) };
  const t0 = Date.now();

  const ea = edgeMap(still, W, H, P.EDGE_THR);
  const eb = edgeMap(frame, W, H, P.EDGE_THR);
  const da = dilate(ea, W, H, P.TOL);
  const db = dilate(eb, W, H, P.TOL);

  // 양방향으로 본다. 스틸컷에만 있으면 '영상에서 빠짐', 반대는 '스틸컷에서 빠짐'.
  const residual = (e, dOther) => {
    const out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = e[i] && !dOther[i] ? 1 : 0;
    return out;
  };

  const all = [];
  for (const [side, mask] of [["still", residual(ea, db)], ["frame", residual(eb, da)]]) {
    for (const c of clusters(mask, W, H, P.MIN_CLUSTER)) all.push({ ...c, side });
  }
  all.sort((a, b) => b.size - a.size);

  const spots = all.slice(0, P.MAX_SPOTS).map(c => ({
    side: c.side,
    size: c.size,
    x: c.x0,
    y: c.y0,
    w: c.x1 - c.x0 + 1,
    h: c.y1 - c.y0 + 1,
  }));

  return {
    status: "ok",
    spots,
    totalClusters: all.length,   // 정상 소재도 수십 개 나온다 — 판정에 쓰지 말 것
    maxClusterSize: all.length ? all[0].size : 0,
    elapsedMs: Date.now() - t0,
  };
}
