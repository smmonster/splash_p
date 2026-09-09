/**
 * 스틸컷 ↔ 영상 첫 프레임 검사 워커 (위치 어긋남 + 윤곽선 차이).
 *
 * 위치 어긋남 전수 탐색은 메인 스레드에서 약 0.6초 걸려 UI 가 멈춘다.
 * 별도 스레드로 빼서 검수 화면이 반응을 유지하도록 한다.
 * 두 검사가 같은 흑백 평면을 쓰므로 한 번의 메시지로 함께 처리한다.
 * 워커를 못 띄우는 환경에서는 App.js 가 메인 스레드로 폴백한다.
 */
import { findAssetShift } from "./assetShiftCheck.mjs";
import { findEdgeDiffSpots } from "./edgeDiffCheck.mjs";

/* eslint-disable no-restricted-globals */
self.onmessage = (e) => {
  const { still, frame, W, H } = e.data || {};
  try {
    self.postMessage({
      ok: true,
      shift: findAssetShift(still, frame, W, H),
      edge: findEdgeDiffSpots(still, frame, W, H),
    });
  } catch (err) {
    self.postMessage({ ok: false, message: String((err && err.message) || err) });
  }
};
