import argparse
import base64
import csv
import gzip
import json
import shutil
from importlib.machinery import SourceFileLoader
from pathlib import Path


HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Three.js Dust Volume Viewer</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #07080a;
      font-family: Arial, Helvetica, sans-serif;
    }
    #app {
      width: 100vw;
      height: 100vh;
    }
    .toolbar {
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 8px;
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 6px;
      color: #eef2f5;
      background: rgba(9, 11, 15, 0.84);
      backdrop-filter: blur(6px);
      font-size: 12px;
    }
    .button-row {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: nowrap;
    }
    .toolbar-toggle-row {
      display: flex;
      justify-content: flex-start;
    }
    .toolbar.is-collapsed {
      gap: 0;
    }
    .toolbar.is-collapsed > :not(.toolbar-toggle-row) {
      display: none;
    }
    .toolbar.is-collapsed .toolbar-toggle-row {
      display: flex;
    }
    .toolbar button {
      height: 28px;
      padding: 0 10px;
      border: 1px solid rgba(255,255,255,0.20);
      border-radius: 5px;
      color: #eef2f5;
      background: #26313d;
      font-size: 12px;
      cursor: pointer;
    }
    .toolbar button.is-off {
      color: #aab3bd;
      background: #161b22;
      border-color: rgba(255,255,255,0.10);
    }
    .control {
      display: grid;
      grid-template-columns: 72px 132px 38px;
      gap: 8px;
      align-items: center;
    }
    .control label {
      color: rgba(238,242,245,0.78);
      white-space: nowrap;
    }
    .control input {
      width: 132px;
      accent-color: #8bb7e0;
    }
    .control output {
      min-width: 38px;
      text-align: right;
      color: rgba(238,242,245,0.88);
      font-variant-numeric: tabular-nums;
    }
    .filter-panel {
      display: grid;
      gap: 6px;
      padding-top: 3px;
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .filter-title {
      color: rgba(238,242,245,0.82);
      font-weight: 600;
    }
    .filter-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .filter-row label {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      color: rgba(238,242,245,0.78);
      white-space: nowrap;
    }
    .filter-row input[type="checkbox"] {
      margin: 0;
      accent-color: #8bb7e0;
    }
    .filter-row select {
      width: 100%;
      height: 28px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 5px;
      color: #eef2f5;
      background: #161b22;
      font-size: 12px;
    }
    .bubble-info {
      color: rgba(238,242,245,0.72);
      font-size: 11px;
      line-height: 1.45;
    }
    .swatch {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.35);
    }
    .viewer-note {
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.12);
      color: rgba(238,242,245,0.72);
      font-size: 11px;
      line-height: 1.45;
    }
    .viewer-note a {
      color: #9cc7ee;
      text-decoration: none;
    }
    .viewer-note a:hover {
      text-decoration: underline;
    }
    .gpu-warning {
      color: #ff6b6b;
      font-weight: 600;
    }
    .model-control {
      display: grid;
      gap: 4px;
      padding-top: 6px;
      border-top: 1px solid rgba(255,255,255,0.12);
    }
    .model-title {
      color: rgba(238,242,245,0.78);
    }
    .resolution-buttons {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: flex-start;
    }
    .toolbar .resolution-button {
      height: 28px;
      min-width: 52px;
      padding: 0 10px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 5px;
      color: #eef2f5;
      background: #161b22;
      font-size: 12px;
    }
    .toolbar .resolution-button.is-active {
      color: #07111c;
      background: #8bb7e0;
      border-color: rgba(139,183,224,0.95);
    }
    .toolbar .resolution-button:disabled {
      cursor: progress;
      opacity: 0.72;
    }
    .hud {
      position: fixed;
      right: 12px;
      bottom: 12px;
      z-index: 10;
      color: rgba(238,242,245,0.78);
      font-size: 12px;
      line-height: 1.4;
      text-align: right;
      pointer-events: none;
    }
    .tooltip {
      position: fixed;
      z-index: 20;
      display: none;
      max-width: 220px;
      padding: 5px 7px;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 5px;
      color: #eef2f5;
      background: rgba(9, 11, 15, 0.90);
      font-size: 12px;
      line-height: 1.25;
      pointer-events: none;
      white-space: nowrap;
    }
    .status {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: rgba(238,242,245,0.84);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-toggle-row">
      <button type="button" id="controlsToggle" aria-expanded="true">Hide controls</button>
    </div>
    <!-- Primary scene visibility and camera controls. -->
    <div class="button-row">
      <button type="button" id="dustToggle">Dust</button>
      <button type="button" id="resetView">Reset view</button>
      <button type="button" id="osbToggle" class="is-off">Open superbubbles</button>
      <button type="button" id="bubblesToggle" class="is-off">Bubbles</button>
      <button type="button" id="rwToggle" class="is-off">Radcliffe Wave</button>
    </div>
    <!-- Open-superbubble filters: group colors and single-object selection are mutually exclusive. -->
    <div class="filter-panel">
      <div class="filter-title">Open superbubbles</div>
      <div class="filter-row">
        <label><input type="checkbox" data-osb-color="#1e88e5"><span class="swatch" style="background:#1e88e5"></span>North-open</label>
        <label><input type="checkbox" data-osb-color="#e53935"><span class="swatch" style="background:#e53935"></span>South-open</label>
        <label><input type="checkbox" data-osb-color="#2e7d32"><span class="swatch" style="background:#2e7d32"></span>Disk-penetrating</label>
      </div>
      <div class="filter-row">
        <select id="osbIdFilter" aria-label="Open superbubble ID"></select>
      </div>
    </div>
    <!-- Bubble filters: Grade A/B checkboxes are cleared when an individual bubble is selected. -->
    <div class="filter-panel">
      <div class="filter-title">Bubbles</div>
      <div class="filter-row">
        <label><input type="checkbox" data-bubble-grade="A">Grade A</label>
        <label><input type="checkbox" data-bubble-grade="B">Grade B</label>
      </div>
      <div class="filter-row">
        <select id="bubbleIdFilter" aria-label="Bubble ID"></select>
      </div>
      <div class="bubble-info" id="bubbleInfo">Select one bubble to show l, b, D, and distance.</div>
    </div>
    <div class="viewer-note">
      Note: To enable interactive visualization, the default 3D extinction map is sampled at 10 pc,<br>
      and voxels with dust density &lt; 0.05 mag kpc<sup>-1</sup> are fully transparent.<br>
      <span class="gpu-warning">The optional 5 pc resolution has a high GPU cost and still cannot show all details.</span><br>
      Individual bubbles should not be expected to have clear one-to-one 3D dust counterparts;<br>
      use a <a href="https://nadc.china-vo.org/data/dustmaps/plot/sin" target="_blank" rel="noopener noreferrer">sky-view dust map</a>
      for detailed bubble inspection.
    </div>
    <!-- Physical-resolution switching replaces the 3D texture while keeping the same scene controls. -->
    <div class="model-control">
      <div class="model-title">Physical resolution</div>
      <div class="resolution-buttons" id="dustModelButtons" aria-label="Physical resolution">
        <button type="button" class="resolution-button is-active" data-dust-model="10pc" aria-pressed="true">10pc</button>
        <button type="button" class="resolution-button" data-dust-model="5pc" aria-pressed="false">5pc</button>
      </div>
    </div>
    <!-- Expensive shader lighting is opt-in; it adds gradient normals and a short shadow march. -->
    <div class="model-control">
      <div class="model-title">Rendering quality</div>
      <div class="resolution-buttons" aria-label="Rendering quality">
        <button type="button" id="lightingToggle" class="resolution-button is-off" aria-pressed="false">Gradient lighting</button>
      </div>
    </div>
    <!-- Opacity remains the lightweight day-to-day visual tuning control. -->
    <div class="control">
      <label for="opacityScale">Opacity</label>
      <input id="opacityScale" type="range" min="0.10" max="15.00" step="0.05" value="4.00">
      <output id="opacityValue">4.00</output>
    </div>
  </div>
  <div id="app"></div>
  <div class="hud" id="hud"></div>
  <div class="tooltip" id="tooltip"></div>
  <div class="status" id="status">Loading volume data...</div>
  <script src="three_volume_viewer_app.js?v=20260702-gradient-lighting"></script>
</body>
</html>
"""


def load_volume_module():
    return SourceFileLoader("three_volume_source", "4_make_three_volume_viewer.py").load_module()


def finite_float(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number else None


def enrich_bubbles(bubbles, bubbles_csv: Path):
    if not bubbles_csv.exists():
        return bubbles

    extra = {}
    with bubbles_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            bubble_id = str(row.get("ID", "")).strip()
            if not bubble_id:
                continue
            extra[bubble_id] = {
                "l": finite_float(row.get("l")),
                "b": finite_float(row.get("b")),
                "D_deg": finite_float(row.get("D")),
                "best_distance_kpc": finite_float(row.get("best_distance")),
            }

    enriched = []
    for bubble in bubbles:
        item = dict(bubble)
        details = extra.get(item.get("id"))
        if details:
            item.update({key: value for key, value in details.items() if value is not None})
        enriched.append(item)
    return enriched


def write_gzip_base64_payload(output_path: Path, metadata: dict, bin_path: Path, global_name: str):
    temp_gzip = output_path.with_suffix(output_path.suffix + ".tmp.gz")
    with bin_path.open("rb") as src, gzip.open(temp_gzip, "wb", compresslevel=6) as gz:
        shutil.copyfileobj(src, gz, length=1024 * 1024 * 8)

    with output_path.open("w", encoding="utf-8", newline="") as out:
        out.write(f"window.{global_name}=")
        out.write('{"metadata":')
        out.write(json.dumps(metadata, ensure_ascii=False, separators=(",", ":")))
        out.write(',"volumeGzipBase64":"')

        remainder = b""
        with temp_gzip.open("rb") as gz:
            while True:
                chunk = gz.read(1024 * 1024 * 6)
                if not chunk:
                    break
                data = remainder + chunk
                keep = len(data) % 3
                if keep:
                    body = data[:-keep]
                    remainder = data[-keep:]
                else:
                    body = data
                    remainder = b""
                if body:
                    out.write(base64.b64encode(body).decode("ascii"))
            if remainder:
                out.write(base64.b64encode(remainder).decode("ascii"))

        out.write('"};\n')

    temp_gzip.unlink(missing_ok=True)


def write_5pc_metadata(output_dir: Path, base_metadata: dict, fivepc_metadata_source: Path, fivepc_bin_source: Path):
    if not fivepc_metadata_source.exists() or not fivepc_bin_source.exists():
        print(
            "Warning: 5 pc metadata/bin source is missing; skipped 5 pc viewer assets.",
            flush=True,
        )
        return

    source_metadata = json.loads(fivepc_metadata_source.read_text(encoding="utf-8"))
    fivepc_metadata = dict(base_metadata)
    for key in ("source", "grid", "bounds", "transfer"):
        if key in source_metadata:
            fivepc_metadata[key] = source_metadata[key]
    fivepc_metadata["render"] = {
        "raySteps": 160,
        "opacityScale": float(source_metadata.get("render", {}).get("opacityScale", 4.0)),
        "brightness": float(source_metadata.get("render", {}).get("brightness", 1.45)),
    }
    fivepc_metadata["volume"] = {
        "bin": "dust_volume_u8_5pc_sigma1.bin",
        "dataJs": "three_volume_data_5pc_sigma1_gzip_base64.js",
        "encoding": "uint8 texture order, x fastest; 5 pc smoothed model, gzip base64 fallback for file://",
    }
    fivepc_metadata["resolution"] = {
        "spacingKpc": 0.005,
        "spacingPc": 5,
        "smoothing": "Gaussian-smoothed 5 pc volume",
    }

    (output_dir / "three_volume_metadata_5pc_sigma1.json").write_text(
        json.dumps(fivepc_metadata, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    output_bin = output_dir / "dust_volume_u8_5pc_sigma1.bin"
    if not output_bin.exists() or output_bin.stat().st_size != fivepc_bin_source.stat().st_size:
        shutil.copy2(fivepc_bin_source, output_bin)

    write_gzip_base64_payload(
        output_dir / "three_volume_data_5pc_sigma1_gzip_base64.js",
        fivepc_metadata,
        output_bin,
        "THREE_VOLUME_VIEWER_DATA_5PC",
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Create a portable split-data Three.js dust volume viewer.")
    parser.add_argument("--npz", default="viewer_data/dust_lowres_sxy1_sz1.npz")
    parser.add_argument("--annotations", default="viewer_data/annotations.json")
    parser.add_argument("--output-dir", default="viewer_data")
    parser.add_argument("--html-name", default="three_volume_viewer.html")
    parser.add_argument("--metadata-name", default="three_volume_metadata.json")
    parser.add_argument("--bin-name", default="dust_volume_u8_sxy1_sz1.bin")
    parser.add_argument("--data-js-name", default="three_volume_data_base64.js")
    parser.add_argument("--bubbles-csv", default="Bubbles.csv")
    parser.add_argument("--fivepc-metadata-source", default="three_volume_viewer_optimized/three_volume_metadata_5pc_sigma1.json")
    parser.add_argument("--fivepc-bin-source", default="three_volume_viewer_optimized/dust_volume_u8_5pc_sigma1.bin")
    parser.add_argument("--dust-transparent-max", type=float, default=0.05)
    parser.add_argument("--dust-max", type=float, default=0.6)
    parser.add_argument("--ray-steps", type=int, default=160)
    parser.add_argument("--opacity-scale", type=float, default=4.0)
    parser.add_argument("--brightness", type=float, default=1.45)
    return parser.parse_args()


def main():
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    volume_mod = load_volume_module()
    texture_order, metadata = volume_mod.build_volume_payload(
        Path(args.npz),
        args.dust_transparent_max,
        args.dust_max,
    )
    metadata["openSuperbubbles"] = volume_mod.build_open_superbubble_lines(Path(args.annotations))
    metadata["bubbles"] = enrich_bubbles(volume_mod.load_bubbles(Path(args.annotations)), Path(args.bubbles_csv))
    metadata["render"] = {
        "raySteps": int(args.ray_steps),
        "opacityScale": float(args.opacity_scale),
        "brightness": float(args.brightness),
    }
    metadata["volume"] = {
        "bin": args.bin_name,
        "dataJs": args.data_js_name,
        "encoding": "uint8 texture order, x fastest, load from binary on HTTP or base64 JS on file://",
    }

    bin_bytes = texture_order.tobytes()
    (output_dir / args.bin_name).write_bytes(bin_bytes)
    (output_dir / args.metadata_name).write_text(
        json.dumps(metadata, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    data_js = (
        "window.THREE_VOLUME_VIEWER_DATA="
        + json.dumps(
            {
                "metadata": metadata,
                "volumeBase64": base64.b64encode(bin_bytes).decode("ascii"),
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + ";\n"
    )
    (output_dir / args.data_js_name).write_text(data_js, encoding="utf-8")
    (output_dir / args.html_name).write_text(HTML, encoding="utf-8")
    write_5pc_metadata(
        output_dir,
        metadata,
        Path(args.fivepc_metadata_source),
        Path(args.fivepc_bin_source),
    )

    print(f"Saved {output_dir / args.html_name}")
    print(f"Saved {output_dir / args.metadata_name}")
    print(f"Saved {output_dir / args.bin_name}")
    print(f"Saved {output_dir / args.data_js_name}")
    print(
        "Volume texture: "
        f"{metadata['grid']['nx']} x {metadata['grid']['ny']} x {metadata['grid']['nz']} "
        f"= {metadata['grid']['totalVoxels']:,} cells"
    )


if __name__ == "__main__":
    main()
