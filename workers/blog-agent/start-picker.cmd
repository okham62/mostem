@echo off
if exist "D:\Program Files\nodejs\node.exe" (
  start "" /MIN "D:\Program Files\nodejs\node.exe" "%~dp0picker.mjs"
) else (
  start "" /MIN "C:\Program Files\nodejs\node.exe" "%~dp0picker.mjs"
)
