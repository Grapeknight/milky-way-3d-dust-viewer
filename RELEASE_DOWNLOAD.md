# Reconstructing the Server Deployment ZIP

The full server deployment package is distributed as split Release assets:

- `three_volume_viewer_server_package.zip.part01`
- `three_volume_viewer_server_package.zip.part02`
- `three_volume_viewer_server_package.zip.part03`
- `three_volume_viewer_server_package.zip.part04`
- `three_volume_viewer_server_package.zip.part05`
- `three_volume_viewer_server_package.zip.part06`

Download all parts into one folder, then run:

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

Expected SHA256:

```text
710818D97FC627CFAAE79522F78DDCEAF0626B12221934AAF3F3AD8B75BA338E
```

Then unzip `three_volume_viewer_server_package.zip` and deploy all extracted
files into the same static web directory.

