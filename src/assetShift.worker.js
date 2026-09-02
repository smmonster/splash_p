/**
 * 위치 어긋남 검사 워커.
 *
 * 1400x614 전수 탐색은 메인 스레드에서 약 0.6초 걸려 UI가 멈춘다.
 * 별도 스레드로 빼서 검수 화면이 반응을 유지하도록 한다.
 * 워커를 못 띄우는 환경에서는 App.js가 메인 스레드로 폴백한다.
 */
import { findAssetShift } from "./assetShiftCheck.mjs";

/* eslint-disable no-restricted-globals */
self.onmessage = (e) => {
  const { still, frame, W, H } = e.data || {};
  try {
    self.postMessage({ ok: true, result: findAssetShift(still, frame, W, H) });
  } catch (err) {
    self.postMessage({ ok: false, message: String((err && err.message) || err) });
  }
};
