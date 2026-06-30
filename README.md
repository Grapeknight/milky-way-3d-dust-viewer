# Milky Way 3D Dust and Superbubble Viewer

Interactive Three.js visualization of the local Milky Way 3D dust distribution,
open superbubbles, distance-resolved bubbles, and the Radcliffe Wave reference
plane.

## Live Preview

Open the GitHub Pages preview:

https://grapeknight.github.io/milky-way-3d-dust-viewer/

The online preview uses the 10 pc volume texture so it can be hosted directly in
the repository. The full server deployment package, including the optional 5 pc
resolution data, is distributed from the Releases page:

https://github.com/Grapeknight/milky-way-3d-dust-viewer/releases/latest

## Data Sources

- The 3D dust background is based on Wang, T., Yuan, H., et al. 2025,
  ApJS, 280, 15: all-sky 3D dust map.
- The open superbubbles are from Wang, T., Yuan, H., et al. 2026.
  The Milky Way as a "Phantom Galaxy": A Bubble-Dominated Disk Sculpted by
  Stellar Feedback and the Origin of the Radcliffe Wave. to be resubmitted.
- The bubbles are from Wang, T., Yuan, H., et al. 2026.
  The Bubble Catchers Project: First Catalog of Distance-Resolved Bubbles in
  the Milky Way. to be resubmitted.

## What Is Included

- `docs/`: GitHub Pages static viewer using the 10 pc volume.
- `src/`: source JavaScript for the Three.js viewer.
- `scripts/`: local packaging script used to produce split-data viewer assets.
- `DEPLOYMENT.md`: instructions for website operators.

The complete 10 pc + 5 pc static deployment package is attached to each GitHub
Release as `three_volume_viewer_server_package.zip`.

## Notes on Large Files

GitHub blocks regular repository files larger than 100 MiB. The 5 pc volume is
about 578 MB, so it is intentionally not tracked in git. It is distributed as
part of the Release deployment ZIP instead.

## Usage

For online viewing, use the GitHub Pages link above.

For production hosting, download `three_volume_viewer_server_package.zip` from
the latest Release, unzip it into one web directory, and serve `index.html` or
`three_volume_viewer.html` as static files. Keep all files in the ZIP in the
same directory.

## Citation

If this viewer or its data products are used in a presentation, website, or
publication, please cite the data sources listed above.
