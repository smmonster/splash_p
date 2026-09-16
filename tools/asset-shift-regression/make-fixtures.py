#!/usr/bin/env python3
"""위치 어긋남 검사(assetShiftCheck.mjs) 회귀 테스트용 소재 세트 생성.

스틸컷 1장과 (선택) 실제 영상 1개를 받아, 아래 케이스별로
1400x614 흑백 평면(.gray)과 기대 판정(cases.json)을 만든다.

  [불일치 — 검출되어야 함]
    real          실제 반입 소재의 영상 첫 프레임 (있을 때만)
    shift2~10     카피라이트 띠만 아래로 N px 밀어 합성 → H.264 인코딩
    diag1         이미지 전체 대각선 1px 밀림
    shiftx12      카피라이트 띠만 오른쪽으로 12px 밀어 합성
    whole10       이미지 전체를 아래로 10px 밀어 합성
  [정상 — 통과해야 함]
    ok-clean      스틸컷을 그대로 인코딩 (실제 반입 소재보다 노이즈 심함)
    ok-lowbitrate 60kbps 저비트레이트 인코딩 — 압축 노이즈 오탐 내성 확인
    ok-soft       절반 축소 후 재확대 인코딩 — 리스케일 흐림 내성 확인
  [알려진 한계 — 위치 검사로는 못 잡음]
    shift1        국소 1px 밀림 (오차감소비 미달 — 육안 비교 몫)
    gap-missing   카피라이트 문구를 통째로 삭제 (평행이동이 아님)

사용법:
    python3 make-fixtures.py <스틸컷.jpg> [영상.mp4] [-o fixtures]

필요: pillow, numpy, ffmpeg
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# 블리치 소재 기준 카피라이트 띠 위치. 다른 소재를 쓸 때는 --band 로 조정한다.
DEFAULT_BAND = (515, 580)
FPS = "29.97"


def encode_first_frame(png: Path, out_png: Path, bitrate="208k", vf=None):
    """PNG → H.264 인코딩 → 첫 프레임(t=0) 무손실 재추출.

    실제 반입 소재와 같은 경로(정지 이미지가 H.264를 거친 뒤 디코딩되는 경로)를 재현한다.
    """
    mp4 = out_png.with_suffix(".mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(png),
           "-t", "2", "-r", FPS]
    if vf:
        cmd += ["-vf", vf]
    cmd += ["-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-b:v", bitrate, str(mp4)]
    subprocess.run(cmd, check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp4),
                    "-vf", r"select=eq(n\,0)", "-vsync", "0", "-frames:v", "1",
                    str(out_png)], check=True)
    mp4.unlink()


def save_gray(img_path: Path, out: Path):
    a = np.asarray(Image.open(img_path).convert("L"), dtype=np.uint8)
    a.tofile(out)
    return a.shape  # (H, W)


def shift_band(still: np.ndarray, band, dy=0, dx=0, erase=False):
    """카피라이트 띠만 이동(또는 삭제)한 이미지. 띠 자리는 배경색으로 메운다."""
    y0, y1 = band
    out = still.copy()
    strip = still[y0:y1].copy()
    # 띠 바로 위 한 줄을 배경색으로 삼아 원래 자리를 메운다.
    bg = still[y0 - 1:y0].copy()
    out[y0:y1] = np.repeat(bg, y1 - y0, axis=0)
    if erase:
        return out
    ty0, ty1 = y0 + dy, y1 + dy
    if dx >= 0:
        out[ty0:ty1, dx:] = strip[:, : strip.shape[1] - dx] if dx else strip
    else:
        out[ty0:ty1, :dx] = strip[:, -dx:]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("still")
    ap.add_argument("video", nargs="?")
    ap.add_argument("-o", "--out", default="fixtures")
    ap.add_argument("--band", default=",".join(map(str, DEFAULT_BAND)),
                    help="카피라이트 띠 y 범위 'y0,y1' (기본 515,580)")
    ap.add_argument("--pair-only", action="store_true",
                    help="합성 밀림 케이스 없이 실제 쌍과 정상 쌍만 생성. "
                         "카피라이트 띠가 없는 소재(예: 고양이)에 사용")
    ap.add_argument("--real-expect", default="shifted",
                    choices=["shifted", "clean", "known-gap"],
                    help="실제 반입 쌍의 위치 검사 기대값")
    ap.add_argument("--real-edge", default="any",
                    choices=["any", "quiet", "review", "overcompressed"],
                    help="실제 반입 쌍의 윤곽선 검사 기대값")
    ap.add_argument("--real-note", default="실제 반입 소재 — 카피라이트 10px 밀림",
                    help="실제 반입 쌍 설명")
    args = ap.parse_args()

    band = tuple(int(v) for v in args.band.split(","))
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    still_img = Image.open(args.still).convert("RGB")
    W, H = still_img.size
    still = np.asarray(still_img)
    save_gray(Path(args.still), out / "still.gray")

    cases = []

    def add(name, expect, note, png, edge="any"):
        tmp = out / f"_{name}.png"
        Image.fromarray(png).save(tmp)
        frame = out / f"{name}.png"
        encode_first_frame(tmp, frame, **ENC.get(name, {}))
        save_gray(frame, out / f"{name}.gray")
        tmp.unlink()
        frame.unlink()
        cases.append({"name": name, "expect": expect, "edge": edge, "note": note,
                      "frame": f"{name}.gray"})

    ENC = {
        "ok-lowbitrate": {"bitrate": "60k"},
        "ok-soft": {"vf": f"scale={W//2}:{H//2},scale={W}:{H}"},
    }

    # 실제 반입 소재 — 있으면 최우선 케이스
    if args.video:
        real = out / "real.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.video,
                        "-vf", r"select=eq(n\,0)", "-vsync", "0", "-frames:v", "1",
                        str(real)], check=True)
        fh, fw = save_gray(real, out / "real.gray")
        real.unlink()
        if (fw, fh) != (W, H):
            sys.exit(f"크기 불일치: 스틸컷 {W}x{H} vs 영상 {fw}x{fh}")
        cases.append({"name": "real", "expect": args.real_expect, "edge": args.real_edge,
                      "note": args.real_note, "frame": "real.gray"})

        # 영상 첫 프레임을 스틸컷으로 내보낸 것처럼 JPEG 로 저장한 쌍.
        # 합성 정상 소재(아래 ok-clean 등)는 실제보다 2.8~6.4배 과압축이라
        # 윤곽선 밀도 검사 기준을 잡는 데 쓸 수 없다. 이 쌍이 실제 반입 조건에 가장 가깝다.
        frame_png = out / "_realframe.png"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.video,
                        "-vf", r"select=eq(n\,0)", "-vsync", "0", "-frames:v", "1",
                        str(frame_png)], check=True)
        base = Image.open(frame_png).convert("RGB")
        for q in (95, 85):
            jp = out / f"_realnorm{q}.jpg"
            base.save(jp, quality=q)
            save_gray(jp, out / f"ok-real-q{q}.gray")
            jp.unlink()
            # 스틸컷 = 영상 첫 프레임의 JPEG 판, 영상 = 실제 반입 영상의 첫 프레임
            cases.append({"name": f"ok-real-q{q}", "expect": "clean", "edge": "quiet",
                          "note": f"영상 첫 프레임을 JPEG q{q} 로 내보낸 정상 쌍 (실제 반입 조건에 가장 가까움)",
                          "still": f"ok-real-q{q}.gray", "frame": "real.gray"})
        frame_png.unlink()

    if args.pair_only:
        meta = {"width": W, "height": H, "still": "still.gray", "cases": cases}
        (out / "cases.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        print(f"{out}/ 에 소재 {len(cases)}건 생성 ({W}x{H}, 실제 쌍만)")
        for c in cases:
            print(f"  {c['name']:<15} 위치={c['expect']:<10} 윤곽선={c.get('edge','any'):<15} {c['note']}")
        return

    # 정상 — 통과해야 함
    add("ok-clean", "clean", "스틸컷 그대로 인코딩 (실제 대비 2.8배 과압축)", still, edge="overcompressed")
    add("ok-lowbitrate", "clean", "60kbps 저비트레이트 (실제 대비 6.4배 과압축)", still, edge="overcompressed")
    add("ok-soft", "clean", "절반 축소 후 재확대 — 리스케일 흐림 내성", still, edge="overcompressed")

    # 전체 대각선 1px 밀림 — MIN_SHIFT=0 으로 낮춘 근거 케이스
    diag = np.roll(np.roll(still, 1, axis=0), 1, axis=1)
    diag[:1] = still[0]
    diag[:, :1] = diag[:, 1:2]
    add("diag1", "shifted", "이미지 전체 대각선 1px 밀림 (MIN_SHIFT=2 로는 놓쳤던 케이스)", diag)

    # 국소 1px — 좁은 영역만 1px 밀리면 압축 노이즈에 묻혀 ERR_RATIO 를 넘지 못한다.
    # 육안 비교(겹쳐보기·깜빡임)가 담당하는 영역.
    add("shift1", "known-gap", "카피라이트 띠만 1px 밀림 — 오차감소비 0.70 으로 임계 미달",
        shift_band(still, band, dy=1))

    # 불일치 — 검출되어야 함
    for dy in (2, 3, 4, 5, 7, 10):
        add(f"shift{dy}", "shifted", f"카피라이트 {dy}px 아래로 밀림",
            shift_band(still, band, dy=dy))
    add("shiftx12", "shifted", "카피라이트 12px 오른쪽으로 밀림",
        shift_band(still, band, dx=12))
    whole = np.roll(still, 10, axis=0)
    whole[:10] = still[0]
    add("whole10", "shifted", "이미지 전체 10px 아래로 밀림", whole)

    # 알려진 한계 — 위치 검사로는 못 잡는다 (색차 검사 몫)
    add("gap-missing", "known-gap", "카피라이트 문구 삭제 — 위치 검사로는 불가, 윤곽선 검사가 확인필요로 올림",
        shift_band(still, band, erase=True), edge="review")

    meta = {"width": W, "height": H, "still": "still.gray", "cases": cases}
    (out / "cases.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"{out}/ 에 소재 {len(cases)}건 생성 ({W}x{H})")
    for c in cases:
        print(f"  {c['name']:<15} 기대={c['expect']:<10} {c['note']}")


if __name__ == "__main__":
    main()
