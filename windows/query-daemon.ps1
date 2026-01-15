# Quick script to query the daemon for devices
# Usage: .\windows\query-daemon.ps1

$libusbPath = "$env:USERPROFILE\AppData\Local\Programs\Python\Python313\Lib\site-packages\libusb\_platform\windows\x86_64"
$env:Path = "$libusbPath;$env:Path"

Write-Host "Querying daemon for devices..." -ForegroundColor Cyan
python -m modern_third_space.cli list

Write-Host "`nQuerying daemon via TCP..." -ForegroundColor Cyan
try {
    $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 5050)
    $stream = $client.GetStream()
    $writer = New-Object System.IO.StreamWriter($stream)
    $reader = New-Object System.IO.StreamReader($stream)
    
    $writer.WriteLine('{"cmd": "list"}')
    $writer.Flush()
    Start-Sleep -Milliseconds 500
    
    $response = $reader.ReadLine()
    $client.Close()
    
    $json = $response | ConvertFrom-Json
    Write-Host "Daemon response:" -ForegroundColor Green
    $json | ConvertTo-Json -Depth 10
    
    if ($json.devices -and $json.devices.Count -gt 0) {
        Write-Host "`n✓ Found $($json.devices.Count) device(s)" -ForegroundColor Green
        foreach ($device in $json.devices) {
            Write-Host "  - VID=$($device.vendor_id) PID=$($device.product_id) Bus=$($device.bus) Address=$($device.address)" -ForegroundColor White
        }
    } else {
        Write-Host "`n✗ No devices found by daemon" -ForegroundColor Red
        Write-Host "The daemon may need to be restarted with libusb DLL in PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error querying daemon: $_" -ForegroundColor Red
}
