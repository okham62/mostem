import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Opens a native Windows folder picker and returns the absolute path.
 * Falls back to null on cancel / non-Windows.
 */
export async function pickFolderNative(): Promise<string | null> {
  if (process.platform !== 'win32') {
    throw new Error('폴더 선택은 현재 Windows에서만 지원됩니다.')
  }

  const script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '블로그 이미지 폴더를 선택하세요'
$dialog.ShowNewFolderButton = $true
$dialog.UseDescriptionForTitle = $true
$r = $dialog.ShowDialog()
if ($r -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Write-Output $dialog.SelectedPath
}
`
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-STA', '-Command', script],
    { encoding: 'utf8', windowsHide: false, maxBuffer: 1024 * 1024 }
  )
  const path = String(stdout || '').trim()
  return path || null
}
