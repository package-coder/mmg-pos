# Simple printer test for MMG POS Helper
# Run: powershell -File test_printer.ps1

Write-Host "Testing MMG POS Printer Connection"
Write-Host "===================================="
Write-Host ""

# Check if helper is running
Write-Host "Checking if helper is running..."
$process = Get-Process mmg-helper -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "[OK] mmg-helper.exe is running (PID: $($process.Id))"
} else {
    Write-Host "[ERROR] mmg-helper.exe is not running"
    Write-Host ""
    Write-Host "Start the helper with:"
    Write-Host "  1. Run: C:\MMG-POS\mmg-helper.exe"
    Write-Host "  2. Or double-click: mmg-helper.exe"
    exit 1
}

Write-Host ""

# Check if port 9999 is listening
Write-Host "Checking if port 9999 is listening..."
$listening = netstat -ano | Select-String "9999" | Select-String "LISTENING"
if ($listening) {
    Write-Host "[OK] Port 9999 is listening"
    Write-Host "      $listening"
} else {
    Write-Host "[ERROR] Port 9999 is not listening"
    Write-Host ""
    Write-Host "The helper may not have started correctly"
    exit 1
}

Write-Host ""
Write-Host "[OK] Helper is running and ready for print jobs"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open the POS app in browser"
Write-Host "  2. Create a test transaction"
Write-Host "  3. Click 'Print Receipt'"
Write-Host "  4. Check if printer prints"
Write-Host ""
Write-Host "Printer details:"
Write-Host "  IP: 192.168.192.168 (default)"
Write-Host "  Port: 9100"
Write-Host "  Protocol: ESC/POS (Epson TM-series)"
