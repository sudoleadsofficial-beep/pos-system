$posDir = "C:\Users\LENOVO PC\Downloads\pos-research\cloud-pos"
$desktop = [System.Environment]::GetFolderPath('Desktop')
$wsh = New-Object -ComObject WScript.Shell

# 1. Main JKC POS Desktop Shortcut
$shortcutPath = Join-Path $desktop "JKC POS.lnk"
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$posDir\JKC-POS.vbs`""
$shortcut.WorkingDirectory = $posDir
$shortcut.IconLocation = "$posDir\public\favicon.ico"
$shortcut.Description = "JKC Vegetable Commission Agent POS (Offline)"
$shortcut.Save()

# 2. Stop POS Shortcut
$stopShortcutPath = Join-Path $desktop "Stop JKC POS.lnk"
$stopShortcut = $wsh.CreateShortcut($stopShortcutPath)
$stopShortcut.TargetPath = "$posDir\Stop-POS.bat"
$stopShortcut.WorkingDirectory = $posDir
$stopShortcut.IconLocation = "$posDir\public\favicon.ico"
$stopShortcut.Description = "Stop JKC POS background server"
$stopShortcut.Save()

echo "Desktop shortcuts created successfully:"
echo "1. $shortcutPath"
echo "2. $stopShortcutPath"
