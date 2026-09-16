/**
 * 모션 스틸컷 ↔ 영상 첫 프레임(t=0) 윤곽선 차이 검사 — '확인필요' 판정 전용.
 *
 * ⚠ 이 검사 결과로 '반려' 판정을 내리면 안 된다. 색차·위치 검사가 모두 통과한 소재에
 *   '확인필요'(육안 확인 안내)를 띄우는 용도까지만 쓴다.
 *
 * 쓰는 이유: 색차 검사와 위치 검사가 모두 놓치는 '요소 추가·삭제'를 유일하게 짚어낸다.
 * 평행이동이 아니라 있다·없다의 문제라 위치 검사로는 구조적으로 잡히지 않는다.
 *
 * 동작 — 지역별 '윤곽선 밀도'를 비교한다
 *   1. 두 이미지에서 각각 윤곽선 지도를 만든다 (3x3 Sobel 밝기 기울기)
 *   2. BLOCK px 창을 STRIDE 간격으로 훑으며 창 안의 윤곽선 픽셀 수를 양쪽에서 센다
 *   3. 적은 쪽 / 많은 쪽 비율이 RATIO 미만인 창을 '의심 블록'으로 본다
 *   4. 의심 블록이 MIN_BLOCKS 개 이상이면 '확인필요'
 *
 * 왜 밀도 비교인가 — 앞서 '한쪽에만 있는 윤곽선'을 세는 방식을 썼는데, 배경이 복잡한 곳에
 * 얹힌 요소를 놓쳤다. 고양이 소재의 얇은 흰 텍스트가 고양이 털 위에 있어서 텍스트 윤곽선
 * 주변에 털 윤곽선이 양쪽 모두 존재했고, 그래서 '한쪽에만 있는 것'으로 분류되지 않았다.
 * 밀도 비교는 배경과 무관하게 '이 자리에 윤곽선이 훨씬 많다/적다'를 보므로 이 경우도 잡는다.
 *
 * 실측 (실제 반입 소재 기준, 블록 최저 비율)
 *   고양이 · 얇은 텍스트 추가       0.03   확인필요 ✔
 *   고양이 · 정상 (JPEG q95/q85)   0.89   통과 ✔
 *   블리치 · 정상 (JPEG q95)       0.96   통과 ✔
 *   블리치 · 정상 (JPEG q85)       0.87   통과 ✔
 * 결함 0.03 과 정상 0.87 사이가 넓어 RATIO 0.30 을 그 사이에 둔다.
 *
 * 한계 — 영상을 실제 반입 수준보다 훨씬 심하게 압축하면(실측 2.8배 이상) 원본의 가는
 * 무늬가 뭉개져 윤곽선이 통째로 사라지고, '요소가 삭제된 것'과 구분되지 않는다.
 * 그래서 이 검사는 '확인필요'까지만 올리고 반려 판정에는 넣지 않는다.
 * 검수자가 겹쳐보기로 한 번 보면 끝나는 비용이라 감수할 만하다.
 *
 * 전역 색감 변화는 윤곽선 위치를 바꾸지 않아 걸리지 않는다.
 */

export const EDGE_DIFF_PARAMS = {
  EDGE_THR: 16,     // 윤곽선으로 볼 밝기 기울기 세기
  BLOCK: 32,        // 밀도를 비교할 창 한 변 (px)
  STRIDE: 16,       // 창 이동 간격 — 절반씩 겹쳐 경계에 걸친 요소도 덮는다
  MIN_EDGES: 40,    // 창 안 윤곽선이 이보다 적으면 건너뛴다.
                    //   몇 픽셀짜리 창은 비율이 쉽게 0에 가까워져 통계가 불안정하다.
  RATIO: 0.30,      // 적은 쪽/많은 쪽 비율이 이 값 미만이면 의심 블록.
                    //   실측 — 실제 결함 0.03, 실제 정상 소재 최저 0.87. 그 사이 값.
  MIN_BLOCKS: 2,    // 의심 블록이 이 개수 이상이어야 '확인필요' (우연한 한 칸 억제)
  MAX_SPOTS: 5,     // 화면에 표시할 지점 상한. 상한이 없으면 마커가 화면을 덮어
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

/** 적분 영상 — 임의 사각형의 합을 네 번 조회로 구하려고 미리 누적해 둔다. */
function integralImage(mask, W, H) {
  const I = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    for (let x = 0; x < W; x++) {
      rowSum += mask[y * W + x];
      I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + rowSum;
    }
  }
  return I;
}

const boxSum = (I, W, x0, y0, x1, y1) =>
  I[(y1 + 1) * (W + 1) + x1 + 1] - I[y0 * (W + 1) + x1 + 1]
  - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];

/**
 * 인접한 의심 블록을 하나의 영역으로 합친다.
 * STRIDE < BLOCK 이라 같은 요소를 덮는 블록들이 서로 겹치므로,
 * 그대로 두면 마커가 여러 개로 쪼개져 보인다.
 */
function mergeBlocks(hits, block) {
  const groups = [];
  const used = new Uint8Array(hits.length);
  for (let i = 0; i < hits.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const queue = [i];
    let x0 = hits[i].x, y0 = hits[i].y;
    let x1 = hits[i].x + block, y1 = hits[i].y + block;
    let worst = hits[i].ratio;
    while (queue.length) {
      const cur = hits[queue.pop()];
      for (let j = 0; j < hits.length; j++) {
        if (used[j]) continue;
        // 블록끼리 겹치거나 맞닿으면 같은 영역으로 본다
        if (Math.abs(hits[j].x - cur.x) <= block && Math.abs(hits[j].y - cur.y) <= block) {
          used[j] = 1;
          queue.push(j);
          x0 = Math.min(x0, hits[j].x); y0 = Math.min(y0, hits[j].y);
          x1 = Math.max(x1, hits[j].x + block); y1 = Math.max(y1, hits[j].y + block);
          if (hits[j].ratio < worst) worst = hits[j].ratio;
        }
      }
    }
    groups.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, ratio: worst });
  }
  groups.sort((a, b) => a.ratio - b.ratio);   // 차이가 큰(비율 낮은) 영역이 먼저
  return groups;
}

/**
 * 윤곽선 밀도 차이가 큰 지점을 찾아 '확인필요' 여부와 표시 지점을 반환.
 *
 * @param {Uint8Array} still 스틸컷 흑백 평면 (길이 W*H)
 * @param {Uint8Array} frame 영상 첫 프레임 흑백 평면 (길이 W*H)
 * @param {number} W 가로 px
 * @param {number} H 세로 px
 * @param {object} [params] EDGE_DIFF_PARAMS 일부 덮어쓰기 (회귀 테스트용)
 */
export function findEdgeDiffSpots(still, frame, W, H, params) {
  const P = { ...EDGE_DIFF_PARAMS, ...(params || {}) };
  const t0 = Date.now();

  const ea = edgeMap(still, W, H, P.EDGE_THR);
  const eb = edgeMap(frame, W, H, P.EDGE_THR);
  const Ia = integralImage(ea, W, H);
  const Ib = integralImage(eb, W, H);

  const hits = [];
  let worstRatio = 1;
  for (let y = 0; y + P.BLOCK <= H; y += P.STRIDE) {
    for (let x = 0; x + P.BLOCK <= W; x += P.STRIDE) {
      const a = boxSum(Ia, W, x, y, x + P.BLOCK - 1, y + P.BLOCK - 1);
      const b = boxSum(Ib, W, x, y, x + P.BLOCK - 1, y + P.BLOCK - 1);
      const hi = a > b ? a : b;
      if (hi < P.MIN_EDGES) continue;      // 윤곽선이 적은 창은 비율이 불안정
      const lo = a > b ? b : a;
      const ratio = lo / hi;
      if (ratio < worstRatio) worstRatio = ratio;
      // side: 스틸컷 쪽 윤곽선이 더 많으면 '영상에서 빠진 요소'
      if (ratio < P.RATIO) hits.push({ x, y, ratio, side: a > b ? "still" : "frame" });
    }
  }

  const needsReview = hits.length >= P.MIN_BLOCKS;
  const regions = needsReview ? mergeBlocks(hits, P.BLOCK) : [];
  const spots = regions.slice(0, P.MAX_SPOTS).map(r => ({
    kind: "edge",
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    ratio: r.ratio,
  }));

  return {
    status: "ok",
    needsReview,
    spots,
    regionCount: regions.length,
    hitBlocks: hits.length,
    worstRatio,
    elapsedMs: Date.now() - t0,
  };
}
