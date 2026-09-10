param(
  [Parameter(Mandatory = $true)]
  [string]$InputDirectory,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ZipXml {
  param($Archive, [string]$Path)
  $entry = $Archive.GetEntry($Path)
  if (-not $entry) { return $null }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-CellColumn {
  param([string]$Reference)
  return $Reference -replace '[0-9]', ''
}

$result = [ordered]@{}
Get-ChildItem -LiteralPath $InputDirectory -Filter '*.xlsx' | Sort-Object Name | ForEach-Object {
  $archive = [System.IO.Compression.ZipFile]::OpenRead($_.FullName)
  try {
    $workbook = Get-ZipXml $archive 'xl/workbook.xml'
    $relations = Get-ZipXml $archive 'xl/_rels/workbook.xml.rels'
    $sharedXml = Get-ZipXml $archive 'xl/sharedStrings.xml'
    $shared = @()
    if ($sharedXml) {
      foreach ($item in $sharedXml.sst.si) {
        $shared += (($item.InnerText) -replace '\s+', ' ').Trim()
      }
    }

    $relationMap = @{}
    foreach ($relation in $relations.Relationships.Relationship) {
      $relationMap[$relation.Id] = $relation.Target
    }

    $sheets = @()
    foreach ($sheet in $workbook.workbook.sheets.sheet) {
      $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
      $target = $relationMap[$relationshipId] -replace '^/', ''
      if ($target -notmatch '^xl/') { $target = 'xl/' + $target.TrimStart('/') }
      $sheetXml = Get-ZipXml $archive $target
      $rows = @($sheetXml.worksheet.sheetData.row)
      $headerRow = $rows | Where-Object { $_.r -eq '1' } | Select-Object -First 1
      if (-not $headerRow) { $headerRow = $rows | Select-Object -First 1 }
      $headers = @()
      if ($headerRow) {
        foreach ($cell in @($headerRow.c)) {
          $value = $cell.v
          if ($cell.t -eq 's' -and $null -ne $value) { $value = $shared[[int]$value] }
          elseif ($cell.t -eq 'inlineStr') { $value = $cell.is.InnerText }
          $headers += [ordered]@{ column = Get-CellColumn $cell.r; value = [string]$value }
        }
      }
      $dimension = [string]$sheetXml.worksheet.dimension.ref
      $sheets += [ordered]@{
        name = [string]$sheet.name
        state = if ($sheet.state) { [string]$sheet.state } else { 'visible' }
        dimension = $dimension
        firstRow = [int]$headerRow.r
        headers = $headers
      }
    }
    $result[$_.Name] = $sheets
  } finally {
    $archive.Dispose()
  }
}

$json = $result | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText((Resolve-Path (Split-Path $OutputPath -Parent)).Path + [System.IO.Path]::DirectorySeparatorChar + (Split-Path $OutputPath -Leaf), $json, [System.Text.UTF8Encoding]::new($false))
