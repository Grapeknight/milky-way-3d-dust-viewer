# Deployment Notes

This repository has two deployment paths.

## 1. GitHub Pages Preview

The `docs/` directory is published with GitHub Pages. It contains the 10 pc
viewer assets:

- `index.html`
- `three_volume_viewer.html`
- `three_volume_viewer_app.js`
- `three_volume_metadata.json`
- `dust_volume_u8_sxy1_sz1.bin`

This preview is intended for easy sharing and quick inspection.

## 2. Full Server Deployment

For website operations, use the latest Release assets:

`three_volume_viewer_server_package.zip.part01`, `.part02`, ...

Download all parts and concatenate them into:

`three_volume_viewer_server_package.zip`

PowerShell reconstruction command:

```powershell
$parts = Get-ChildItem .\three_volume_viewer_server_package.zip.part* | Sort-Object Name
$out = [System.IO.File]::Create("three_volume_viewer_server_package.zip")
foreach ($part in $parts) {
  $in = [System.IO.File]::OpenRead($part.FullName)
  try { $in.CopyTo($out) } finally { $in.Dispose() }
}
$out.Dispose()
Get-FileHash .\three_volume_viewer_server_package.zip -Algorithm SHA256
```

Expected ZIP SHA256:

```text
710818D97FC627CFAAE79522F78DDCEAF0626B12221934AAF3F3AD8B75BA338E
```

After reconstruction, the ZIP contains:

- `index.html`
- `three_volume_viewer.html`
- `three_volume_viewer_app.js`
- `three_volume_metadata.json`
- `dust_volume_u8_sxy1_sz1.bin`
- `three_volume_metadata_5pc_sigma1.json`
- `dust_volume_u8_5pc_sigma1.bin`
- `README_DEPLOY.txt`
- `SHA256SUMS.txt`

Unzip all files into the same web-accessible directory. The viewer expects the
metadata and binary volume files to sit next to the HTML and JavaScript files.

Recommended MIME types:

- `.html`: `text/html`
- `.js`: `application/javascript`
- `.json`: `application/json`
- `.bin`: `application/octet-stream`

The 5 pc file is large and should be served with normal static-file range and
cache behavior supported by the web server.
