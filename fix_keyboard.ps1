# Fix keyboard layout to US English
$langs = Get-WinUserLanguageList
$enUS = $langs | Where-Object { $_.LanguageTag -eq 'en-US' }

# Add US keyboard layout if missing
if ($enUS.InputMethodTips.Count -eq 0) {
    $enUS.InputMethodTips.Add('0409:00000409')
    Set-WinUserLanguageList $langs
    Write-Host "Added US English keyboard layout"
}

# Remove French-Canadian if not needed
$frCA = $langs | Where-Object { $_.LanguageTag -eq 'fr-CA' }
if ($frCA) {
    Write-Host "French-Canadian keyboard found. To remove it:"
    Write-Host "1. Press Windows+I"
    Write-Host "2. Go to Time & Language > Language & Region"
    Write-Host "3. Remove French (Canada)"
}

Write-Host ""
Write-Host "Current keyboard layouts:"
Get-WinUserLanguageList | ForEach-Object {
    Write-Host "  $($_.LanguageTag): $($_.InputMethodTips -join ', ')"
}

Write-Host ""
Write-Host "To switch keyboard layout manually:"
Write-Host "  Press: Windows + Space (multiple times to cycle)"
Write-Host "  Or: Alt + Shift"

