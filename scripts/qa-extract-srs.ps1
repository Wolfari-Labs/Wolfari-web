$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root 'docs/Wolfari_SRS_v1.2.docx'
$zip = [IO.Compression.ZipFile]::OpenRead($source)
try {
  $reader = [IO.StreamReader]::new($zip.GetEntry('word/document.xml').Open())
  try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
  $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $paragraphs = @($xml.SelectNodes('//w:body//w:p', $ns) | ForEach-Object {
    ($_.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join ''
  })
  $out = Join-Path $root 'docs/qa/srs-source.json'
  [IO.Directory]::CreateDirectory((Split-Path $out -Parent)) | Out-Null
  $data = @{ source = 'docs/Wolfari_SRS_v1.2.docx'; sha256 = (Get-FileHash $source -Algorithm SHA256).Hash; paragraphs = $paragraphs }
  [IO.File]::WriteAllText($out, ($data | ConvertTo-Json -Depth 5), [Text.UTF8Encoding]::new($false))
  Write-Output "$($paragraphs.Count) paragraphs extracted; source SHA256 $($data.sha256)"
} finally { $zip.Dispose() }
