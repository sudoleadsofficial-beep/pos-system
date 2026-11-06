@echo off
cd /d "%~dp0"
call node_modules\.bin\electron.cmd electron\main.cjs
