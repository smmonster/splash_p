/**
 * 모션 스틸컷 ↔ 영상 첫 프레임(t=0) 윤곽선 차이 검사 — '확인 권장 지점' 안내 전용.
 *
 * ⚠ 이 검사 결과로 '반려' 판정을 내리면 안 된다. 색차·위치 검사가 모두 통과한 소재에
 *   '확인필요'(육안 확인 안내)를 띄우는 용도까지만 쓴다. 이유는 실측으로 확인했다.
 *
 * 쓰는 이유: 색차 검사와 위치 검사가 모두 놓치는 '요소 추가·삭제'를 유일하게 짚어낸다.
 * 평행이동이 아니라 있다·없다의 문제라 위치 검사로는 구조적으로 잡히지 않는다.
 *
 * 동작
 *   1. 두 이미지에서 각각 윤곽선 지도를 만든다 (3x3 Sobel 밝기 기울기)
 *   2. 한쪽에만 있는 윤곽선을 찾는다 (상대편 TOL px 이내면 같은 것으로 봄)
 *   3. 그중 상대편 ISO_RADIUS 안에 윤곽선이 아예 없는 것만 남긴다 = '고립' 잔차
 *   4. REVIEW_CLUSTER 이상 뭉친 고립 덩어리가 있으면 '확인필요'
 *
 * 3번이 핵심이다. 압축 노이즈는 '원래 있던 윤곽선'이 번지거나 약해진 것이라 상대편
 * 가까이에 반드시 윤곽선이 남는다. 반면 새로 생기거나 사라진 요소는 상대편이 빈 배경이라
 * 주변에 윤곽선이 없다. 이 필터를 넣기 전에는 정상 소재도 최대 160px 덩어리가 나와
 * 실제 결함과 구분되지 않았다.
 *
 *   케이스                고립 덩어리 최대   판정
 *   정상(기본 인코딩)           103px        통과
 *   정상(리스케일)               75px        통과
 *   정상(저비트레이트)         1,064px        확인필요 ← 오탐
 *   결함(10px 밀림)             52px        통과 (위치 검사가 담당)
 *   결함(1px 밀림)              98px        통과 (위치 검사가 담당)
 *   결함(요소 삭제)           1,064px        확인필요 ✔
 *
 * 한계 — 영상 화질이 극단적으로 떨어지면(실제 반입 소재 대비 6.4배 압축) 얇은 글자의
 * 윤곽선이 아예 사라져 '삭제된 요소'와 구분되지 않는다. 위 표의 저비트레이트 정상 소재가
 * 그 경우다. 그래서 이 검사는 '확인필요'까지만 올리고 반려 판정에는 넣지 않는다.
 * 검수자가 겹쳐보기로 한 번 보면 끝나는 비용이라 감수할 만하다.
 *
 * 전역 색감 변화는 윤곽선 위치를 바꾸지 않아 걸리지 않는다.
 */

export const EDGE_DIFF_PARAMS = {
  EDGE_THR: 16,       // 윤곽선으로 볼 밝기 기울기 세기
  TOL: 2,             // 상대편 윤곽선을 같은 것으로 볼 거리(px). 압축 흔들림 흡수
  ISO_RADIUS: 8,      // '고립' 판정 반경(px). 이 반경 안에 상대편 윤곽선이 전혀 없어야
                      //   새로 생기거나 사라진 요소로 본다. 압축 노이즈는 원래 있던 윤곽선이
                      //   번지거나 약해진 것이라 상대편 가까이에 항상 윤곽선이 남는다.
  MIN_CLUSTER: 25,    // 덩어리로 셀 최소 크기 (px)
  REVIEW_CLUSTER: 150,// 이 크기 이상 고립 덩어리가 있으면 '확인필요'.
                      //   실측 — 정상 소재의 고립 덩어리 최대 103px(기본 인코딩)·75px(리스케일),
                      //   실제 요소 삭제 소재는 198px 이상이 5개. 약 1.9배 여유.
                      //   자동 반려가 아니라 육안 확인 안내이므로 다소의 오탐은 감수한다.
  MAX_SPOTS: 5,       // 화면에 표시할 지점 상한. 상한이 없으면 마커가 화면을 덮어
                      //   검수자가 마커 자체를 무시하게 된다.
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
  // TOL 까지 부풀린 뒤 이어서 ISO_RADIUS 까지 더 부풀린다 (처음부터 다시 계산하지 않는다)
  const da = dilate(ea, W, H, P.TOL);
  const db = dilate(eb, W, H, P.TOL);
  const daIso = dilate(da, W, H, Math.max(0, P.ISO_RADIUS - P.TOL));
  const dbIso = dilate(db, W, H, Math.max(0, P.ISO_RADIUS - P.TOL));

  // 양방향으로 본다. 스틸컷에만 있으면 '영상에서 빠짐', 반대는 '스틸컷에서 빠짐'.
  // 상대편 ISO_RADIUS 안에 윤곽선이 전혀 없는 것만 남긴다 — 이게 '고립' 잔차다.
  // 원래 있던 윤곽선이 압축으로 번진 경우는 상대편 가까이에 윤곽선이 남아 여기서 걸러진다.
  const isolated = (e, dOther, dOtherIso) => {
    const out = new Uint8Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = e[i] && !dOther[i] && !dOtherIso[i] ? 1 : 0;
    return out;
  };

  const all = [];
  for (const [side, mask] of [["still", isolated(ea, db, dbIso)],
                              ["frame", isolated(eb, da, daIso)]]) {
    for (const c of clusters(mask, W, H, P.MIN_CLUSTER)) all.push({ ...c, side });
  }
  all.sort((a, b) => b.size - a.size);

  // 확인필요 기준을 넘은 덩어리만 표시한다. 기준 미만까지 표시하면 정상 소재에도
  // 마커가 떠서 검수자가 마커를 무시하게 된다.
  const significant = all.filter(c => c.size >= P.REVIEW_CLUSTER);
  const spots = significant.slice(0, P.MAX_SPOTS).map(c => ({
    kind: "edge",
    side: c.side,
    size: c.size,
    x: c.x0,
    y: c.y0,
    w: c.x1 - c.x0 + 1,
    h: c.y1 - c.y0 + 1,
  }));

  return {
    status: "ok",
    needsReview: significant.length > 0,
    spots,
    reviewCount: significant.length,
    totalClusters: all.length,
    maxClusterSize: all.length ? all[0].size : 0,
    elapsedMs: Date.now() - t0,
  };
}
