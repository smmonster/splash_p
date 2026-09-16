/**
 * 위치 어긋남 검사 회귀 테스트 러너.
 *
 * src/assetShiftCheck.mjs (앱이 실제로 쓰는 그 파일) 를 그대로 불러
 * make-fixtures.py 가 만든 소재 세트에 대해 기대 판정과 맞는지 확인한다.
 *
 * 사용법:
 *   node run.mjs [fixtures 디렉터리]
 * 종료 코드: 0 = 전부 통과, 1 = 실패 있음
 */
import fs from "fs";
import path from "path";
import { findAssetShift, ASSET_SHIFT_PARAMS } from "../../src/assetShiftCheck.mjs";
import { findEdgeDiffSpots, EDGE_DIFF_PARAMS } from "../../src/edgeDiffCheck.mjs";

const dir = process.argv[2] || path.join(import.meta.dirname, "fixtures");
const metaPath = path.join(dir, "cases.json");
if (!fs.existsSync(metaPath)) {
  console.error(`소재 세트가 없습니다: ${metaPath}`);
  console.error("먼저 make-fixtures.py 로 생성하세요. (README.md 참조)");
  process.exit(2);
}

const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const { width: W, height: H } = meta;
const still = new Uint8Array(fs.readFileSync(path.join(dir, meta.still)));

console.log(`소재 ${W}x${H}, 케이스 ${meta.cases.length}건`);
console.log(`파라미터 BLOCK=${ASSET_SHIFT_PARAMS.BLOCK} STRIDE=${ASSET_SHIFT_PARAMS.STRIDE} ` +
  `SEARCH=±${ASSET_SHIFT_PARAMS.SEARCH} MIN_SHIFT=${ASSET_SHIFT_PARAMS.MIN_SHIFT} ` +
  `ERR_RATIO=${ASSET_SHIFT_PARAMS.ERR_RATIO} MIN_CONSENSUS=${ASSET_SHIFT_PARAMS.MIN_CONSENSUS} ` +
  `CONSENSUS_TOL=${ASSET_SHIFT_PARAMS.CONSENSUS_TOL}`);
console.log("");

let failures = 0;
let totalMs = 0;

for (const c of meta.cases) {
  const frame = new Uint8Array(fs.readFileSync(path.join(dir, c.frame)));
  // 케이스별로 다른 스틸컷을 쓸 수 있다 (ok-real-q* 는 영상 프레임의 JPEG 판이 스틸컷)
  const stillForCase = c.still
    ? new Uint8Array(fs.readFileSync(path.join(dir, c.still)))
    : still;
  const r = findAssetShift(stillForCase, frame, W, H);
  totalMs += r.elapsedMs;

  // known-gap 은 "검출 못 하는 것이 현재 정상" — 검출되면 오히려 알려줘야 한다.
  const wantShifted = c.expect === "shifted";
  const ok = c.expect === "known-gap" ? !r.shifted : r.shifted === wantShifted;
  if (!ok) failures++;

  const detail = r.shifted
    ? `어긋남 dy=${r.dy >= 0 ? "+" : ""}${r.dy} dx=${r.dx >= 0 ? "+" : ""}${r.dx} ` +
      `(합의 ${r.consensus}/${r.confirmedCount}블록, y ${r.region.y0}~${r.region.y1})`
    : `어긋남 없음` +
      (r.worstCandidate ? ` (최대 의심 오차감소비 ${r.worstCandidate.ratio.toFixed(3)})` : "");

  // 윤곽선 검사는 반려 판정에 쓰지 않고 '확인필요'까지만 올린다.
  // 표시 지점이 상한을 넘지 않는지, 정상 소재에서 조용한지를 확인한다.
  const e = findEdgeDiffSpots(stillForCase, frame, W, H);
  if (e.spots.length > EDGE_DIFF_PARAMS.MAX_SPOTS) { failures++; }
  // 윤곽선 검사 기대값 — quiet: 조용해야 함 / review: 확인필요가 떠야 함
  // overcompressed: 실제 반입 수준보다 과압축한 합성 소재라 걸리는 것이 정상 (채점 제외)
  const edgeExpect = c.edge || "any";
  const edgeOk = edgeExpect === "quiet" ? !e.needsReview
    : edgeExpect === "review" ? e.needsReview
    : true;
  if (!edgeOk) failures++;
  const edgeInfo = `윤곽선 ${e.needsReview ? "확인필요" : "통과  "} ` +
    `(기대 ${edgeExpect}, 최저비율 ${e.worstRatio.toFixed(2)}, 표시 ${e.spots.length}곳)` +
    (edgeOk ? "" : `  ← FAIL: 기대 ${edgeExpect}`);

  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${c.name.padEnd(15)} 기대=${c.expect.padEnd(10)} ${String(r.elapsedMs).padStart(4)}ms  ${detail}`);
  console.log(`         ${edgeInfo}`);
  if (!ok) console.log(`         ↳ ${c.note}`);
  else if (c.expect === "known-gap") console.log(`         ↳ 알려진 한계: ${c.note}`);
}

console.log("");
console.log(`총 ${meta.cases.length}건 중 ${meta.cases.length - failures}건 통과, ${failures}건 실패 ` +
  `(검사 시간 합계 ${totalMs}ms, 케이스당 평균 ${Math.round(totalMs / meta.cases.length)}ms)`);
process.exit(failures ? 1 : 0);
