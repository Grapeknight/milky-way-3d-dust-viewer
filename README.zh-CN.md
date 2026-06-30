# Milky Way 3D Dust and Bubble Viewer

阅读语言：[English](README.md) | [中文](README.zh-CN.md)

这是一个基于 Three.js 的交互式三维可视化页面，用于展示局域银河系三维尘埃分布、开放超泡、距离分辨气泡以及 Radcliffe Wave 参考平面。

## 在线预览

GitHub Pages 在线预览：

https://grapeknight.github.io/milky-way-3d-dust-viewer/

在线预览版本使用 10 pc 体纹理，因此可以直接托管在 GitHub 仓库中。包含 10 pc 与可选 5 pc 分辨率数据的完整服务器部署包发布在 Releases 页面：

https://github.com/Grapeknight/milky-way-3d-dust-viewer/releases/latest

## 数据来源

- 三维尘埃背景图：Wang, T., Yuan, H., Chen, B., Xiang, M., Zhang, R.,
  Huang, B., Gu, H., Wang, S., and Li, J. 2025, The Astrophysical Journal
  Supplement Series, 280, 15, "An all-sky 3D dust map based on Gaia and
  LAMOST", DOI: [10.3847/1538-4365/adea39](https://doi.org/10.3847/1538-4365/adea39)。
- Open superbubbles 来自 Wang, T., Yuan, H., et al. 2026. The Milky Way as a
  "Phantom Galaxy": A Bubble-Dominated Disk Sculpted by Stellar Feedback and
  the Origin of the Radcliffe Wave. to be resubmitted.
- Bubbles 来自 Wang, T., Yuan, H., et al. 2026. The Bubble Catchers Project:
  First Catalog of Distance-Resolved Bubbles in the Milky Way. to be resubmitted.

## 仓库内容

- `docs/`：GitHub Pages 静态预览页面，使用 10 pc 体数据。
- `src/`：Three.js 查看器源代码。
- `scripts/`：用于生成 split-data 查看器文件的本地打包脚本。
- `DEPLOYMENT.md`：网站运维部署说明。

完整的 10 pc + 5 pc 静态部署包作为 GitHub Release 附件发布，文件名为 `three_volume_viewer_server_package.zip`。

## 大文件说明

GitHub 普通仓库不允许提交超过 100 MiB 的单个文件。5 pc 体数据约 578 MB，因此不直接进入 git 仓库，而是放在 Release 部署压缩包中发布。

## 使用方式

在线查看请使用上方 GitHub Pages 链接。

服务器部署请从最新 Release 下载 `three_volume_viewer_server_package.zip`，解压到同一个网站目录中，然后静态服务 `index.html` 或 `three_volume_viewer.html`。压缩包内所有文件需要保留在同一目录。

## 引用

如果在展示、网站或论文中使用本查看器或相关数据产品，请引用上方列出的数据来源。

## 📫 联系方式

如在使用本工具过程中有任何问题、建议或技术交流，欢迎通过 GitHub issue 或邮箱联系作者团队：

- Prof. Yuan Haibo（苑海波 教授）: yuanhb@bnu.edu.cn
- Dr. Wang Tao（王涛）: wt@mail.bnu.edu.cn

