# Milky Way 3D Dust and Bubble Viewer

Read this in: [English](README.md) | [中文](README.zh-CN.md)

Interactive Three.js visualization of the local Milky Way 3D dust distribution,
open superbubbles, and 3D views of bubbles.

## Live Preview

Open the GitHub Pages preview:

https://grapeknight.github.io/milky-way-3d-dust-viewer/

The online preview uses the 10 pc volume texture so it can be hosted directly in
the repository. The full server deployment package, including the optional 5 pc
resolution data, is distributed from the Releases page:

https://github.com/Grapeknight/milky-way-3d-dust-viewer/releases/latest

## Data Sources

- 3D dust background: Wang, T., Yuan, H., Chen, B., Xiang, M., Zhang, R.,
  Huang, B., Gu, H., Wang, S., and Li, J. 2025, The Astrophysical Journal
  Supplement Series, 280, 15, "An all-sky 3D dust map based on Gaia and
  LAMOST", DOI: [10.3847/1538-4365/adea39](https://doi.org/10.3847/1538-4365/adea39).
- Open superbubbles: Wang, T., Yuan, H., et al. 2026. The Milky Way as a
  "Phantom Galaxy": A Bubble-Dominated Disk Sculpted by Stellar Feedback and
  the Origin of the Radcliffe Wave. to be resubmitted.
- Bubbles: Wang, T., Yuan, H., et al. 2026. The Bubble Catchers Project: First
  Catalog of Distance-Resolved Bubbles in the Milky Way. to be resubmitted.

## What Is Included

- `docs/`: GitHub Pages static viewer using the 10 pc volume.
- `src/`: source JavaScript for the Three.js viewer.
- `scripts/`: local packaging script used to produce split-data viewer assets.
- `DEPLOYMENT.md`: instructions for website operators.

The complete 10 pc + 5 pc static deployment package is attached to each GitHub
Release as `three_volume_viewer_server_package.zip`.

## Notes on Large Files

For online preview and version control, this repository tracks the 10 pc preview
data that can be hosted directly. The complete server deployment package,
including the 5 pc resolution volume, is distributed through GitHub Releases.

## Usage

For online viewing, use the GitHub Pages link above.

For production hosting, download `three_volume_viewer_server_package.zip` from
the latest Release, unzip it into one web directory, and serve `index.html` or
`three_volume_viewer.html` as static files. Keep all files in the ZIP in the
same directory.

## Citation

If this viewer or its data products are used in a presentation, website, or
publication, please cite the data sources listed above.

## Contact

For questions, suggestions, or technical discussion, please contact the author
team via GitHub issues or email:

- Prof. Yuan Haibo: yuanhb@bnu.edu.cn
- Dr. Wang Tao: wt@mail.bnu.edu.cn
