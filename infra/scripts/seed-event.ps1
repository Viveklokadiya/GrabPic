param(
  [string]$ApiBase = "http://localhost:8000/api/v1",
  [string]$EventName = "Sample Event",
  [string]$DriveLink = ""
)

if ([string]::IsNullOrWhiteSpace($DriveLink)) {
  Write-Error "Provide a public Google Drive folder link via -DriveLink"
  exit 1
}

$body = @{
  name = $EventName
  drive_link = $DriveLink
} | ConvertTo-Json

$response = Invoke-RestMethod -Method Post -Uri "$ApiBase/events" -ContentType "application/json" -Body $body
$response | ConvertTo-Json -Depth 5

