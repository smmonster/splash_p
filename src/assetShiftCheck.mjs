/**
 * 모션 스틸컷 ↔ 영상 첫 프레임(t=0) 에셋 위치 어긋남 검사.
 *
 * 색차(CIEDE2000) 검사와 목적이 다르다. 색은 전혀 보지 않고, 흑백으로 변환한 뒤
 * "블록을 조금씩 밀어봤을 때 더 잘 맞는 자리가 있는지"만 확인한다.
 * JPEG(스틸컷) ↔ H.264(영상) 압축 노이즈는 밀어도 줄어들지 않으므로 걸리지 않는다.
 *
 * 색차 검사가 놓치는 케이스를 메우기 위한 '추가' 레이어다.
 * 다운스케일 격자 색차 검사는 10px 밀림 같은 작은 어긋남을 배경색에 희석시켜 통과시킨다
 * (실측: 1400x614 → 32x14 격자에서 10px 밀린 카피라이트의 최대 셀 ΔE 0.78, 임계 8).
 * 격자를 키우면 정상 소재의 압축 노이즈가 먼저 튀어 오탐이 나므로, 색차 검사는 그대로 두고
 * 이 검사를 통과 소재에 한 단계 얹는 구조를 택했다.
 *
 * 반대로 이 검사는 '평행이동'만 잡는다. 에셋 누락·추가·교체는 잡지 못하며,
 * 그중 큰 차이는 색차 검사가 담당한다. (작은 에셋 누락은 두 검사 모두의 사각지대 — 알려진 한계)
 */

// --- 판정 파라미터 (실제 소재 + 합성 정상/불일치 소재로 검증한 값) -----------
export const ASSET_SHIFT_PARAMS = {
  BLOCK: 64,          // 블록 한 변 (px)
  STRIDE: 32,         // 블록 배치 간격 — 절반씩 겹치게 잘라 경계에 걸친 에셋도 덮는다
  SEARCH: 24,         // 이동량 탐색 범위 ±(px). 가장자리 블록은 안쪽 방향으로만 축소 적용
  FLAT_STD: 8,        // 밝기 표준편차 미달 시 평탄 블록(흰 여백·단색 배경)으로 보고 제외
  MIN_SHIFT: 2,       // 이 값을 넘는 이동량만 어긋남 후보 (2px 이하는 미세 흔들림으로 무시)
  ERR_RATIO: 0.6,     // 이동 후 오차가 제자리 오차의 이 비율 미만으로 줄어야 확정
                      //   실측 여유: 불일치 소재 0.16~0.18 vs 정상 소재 최악 0.73
  MIN_BLOCKS: 2,      // 확정 블록 최소 개수
  MIN_CONSENSUS: 3,   // 동일 이동량을 갖는 블록이 이 개수 이상이어야 불일치 (우연한 정합 억제)
  CONSENSUS_TOL: 0,   // 합의 판정 시 이동량 허용 오차(px). 0 = 완전 동일한 이동량만 같은 표로 집계.
                      //   영상이 미세하게 다른 배율로 렌더된 소재에서 이동량이 1px씩 갈려
                      //   합의가 깨지는 경우가 확인되면 1로 올린다. (현재 값이 검증된 설정)
};

/** 블록 시작점. 마지막 블록은 끝에 붙여 가장자리까지 덮는다. */
export function blockOrigins(size, block, stride) {
  const origins = [];
  for (let v = 0; v <= size - block; v += stride) origins.push(v);
  if (origins.length && origins[origins.length - 1] !== size - block) {
    origins.push(size - block);
  }
  return origins;
}

/**
 * 블록 밝기 차이의 절대값 합(SAD). 낮을수록 잘 맞는다.
 * cut 이상으로 누적되는 순간 중단한다 — 어차피 최소값이 될 수 없으므로
 * 결과는 전수 계산과 완전히 동일하고 계산량만 줄어든다. (실측 2.5배 단축)
 */
function blockSad(a, b, W, y, x, dy, dx, block, cut) {
  let sum = 0;
  for (let j = 0; j < block; j++) {
    let ia = (y + j) * W + x;
    let ib = (y + dy + j) * W + x + dx;
    for (let i = 0; i < block; i++) sum += Math.abs(a[ia + i] - b[ib + i]);
    if (sum >= cut) return Infinity;
  }
  return sum;
}

/** 블록 내 밝기 표준편차 — 평탄 블록(이동량 추정 불가) 판별용 */
function blockStd(a, W, y, x, block) {
  let sum = 0, sq = 0;
  for (let j = 0; j < block; j++) {
    const ia = (y + j) * W + x;
    for (let i = 0; i < block; i++) {
      const v = a[ia + i];
      sum += v;
      sq += v * v;
    }
  }
  const n = block * block;
  const mean = sum / n;
  return Math.sqrt(Math.max(sq / n - mean * mean, 0));
}

/** 가장 많은 블록이 공유하는 이동량과 그 블록 수. 흩어진 이동량 = 오탐 신호. */
function shiftConsensus(confirmed, tol) {
  let best = { dy: 0, dx: 0, count: 0 };
  for (const c of confirmed) {
    let count = 0;
    for (const o of confirmed) {
      if (Math.abs(o.dy - c.dy) <= tol && Math.abs(o.dx - c.dx) <= tol) count++;
    }
    if (count > best.count) best = { dy: c.dy, dx: c.dx, count };
  }
  return best;
}

/**
 * 위치 어긋남 검사 본체.
 *
 * @param {Uint8Array} still 스틸컷 흑백 평면 (길이 W*H)
 * @param {Uint8Array} frame 영상 첫 프레임 흑백 평면 (길이 W*H)
 * @param {number} W 가로 px
 * @param {number} H 세로 px
 * @param {object} [params] ASSET_SHIFT_PARAMS 일부 덮어쓰기 (회귀 테스트용)
 */
export function findAssetShift(still, frame, W, H, params) {
  const P = { ...ASSET_SHIFT_PARAMS, ...(params || {}) };
  const { BLOCK, STRIDE, SEARCH, FLAT_STD, MIN_SHIFT, ERR_RATIO } = P;
  const t0 = Date.now();

  if (W < BLOCK || H < BLOCK) {
    return { status: "too-small", shifted: false, W, H, elapsedMs: Date.now() - t0 };
  }

  const area = BLOCK * BLOCK;
  const confirmed = [];   // 어긋남 확정 블록
  const candidates = [];  // 이동량은 나왔으나 오차 감소가 부족한 블록 (설명용)
  let examined = 0, flat = 0;

  for (const y of blockOrigins(H, BLOCK, STRIDE)) {
    for (const x of blockOrigins(W, BLOCK, STRIDE)) {
      if (blockStd(still, W, y, x, BLOCK) < FLAT_STD) { flat++; continue; }
      examined++;

      // 가장자리 블록은 이미지 안에 남는 방향으로만 밀어본다.
      const dyLo = Math.max(-SEARCH, -y), dyHi = Math.min(SEARCH, H - BLOCK - y);
      const dxLo = Math.max(-SEARCH, -x), dxHi = Math.min(SEARCH, W - BLOCK - x);

      // 제자리 오차를 먼저 구해 탐색 초기 최소값으로 쓴다.
      // 제자리보다 나은 자리가 없으면 이동량은 (0,0)으로 남아 아래 MIN_SHIFT에서 걸러진다.
      const sad0 = blockSad(still, frame, W, y, x, 0, 0, BLOCK, Infinity);
      let bestSad = sad0, bestDy = 0, bestDx = 0;

      for (let dy = dyLo; dy <= dyHi; dy++) {
        for (let dx = dxLo; dx <= dxHi; dx++) {
          const sad = blockSad(still, frame, W, y, x, dy, dx, BLOCK, bestSad);
          if (sad < bestSad) { bestSad = sad; bestDy = dy; bestDx = dx; }
        }
      }

      if (Math.max(Math.abs(bestDy), Math.abs(bestDx)) <= MIN_SHIFT) continue;

      const err0 = sad0 / area;
      const err = bestSad / area;
      const ratio = err / Math.max(err0, 1e-6);
      const rec = { y, x, dy: bestDy, dx: bestDx, err0, err, ratio };
      candidates.push(rec);
      if (ratio < ERR_RATIO) confirmed.push(rec);
    }
  }

  const consensus = shiftConsensus(confirmed, P.CONSENSUS_TOL);
  const shifted = confirmed.length >= P.MIN_BLOCKS && consensus.count >= P.MIN_CONSENSUS;

  // 합의된 이동량에 속한 블록만으로 어긋난 영역을 잡는다.
  let region = null;
  if (shifted) {
    const tol = P.CONSENSUS_TOL;
    const inGroup = confirmed.filter(c =>
      Math.abs(c.dy - consensus.dy) <= tol && Math.abs(c.dx - consensus.dx) <= tol);
    region = {
      y0: Math.min(...inGroup.map(c => c.y)),
      y1: Math.max(...inGroup.map(c => c.y)) + BLOCK,
      x0: Math.min(...inGroup.map(c => c.x)),
      x1: Math.max(...inGroup.map(c => c.x)) + BLOCK,
    };
  }

  // 통과했을 때 "무엇을 보고 통과시켰는지" 남긴다 — 검수자가 판단을 되짚을 수 있도록.
  const worst = candidates.length
    ? candidates.reduce((m, c) => (c.ratio < m.ratio ? c : m))
    : null;

  return {
    status: "ok",
    shifted,
    dy: consensus.dy,
    dx: consensus.dx,
    consensus: consensus.count,
    confirmedCount: confirmed.length,
    blocksExamined: examined,
    blocksFlat: flat,
    region,
    worstCandidate: worst,
    topShifts: [...confirmed]
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 8)
      .map(c => ({ y: c.y, x: c.x, dy: c.dy, dx: c.dx, err0: c.err0, err: c.err, ratio: c.ratio })),
    elapsedMs: Date.now() - t0,
  };
}
