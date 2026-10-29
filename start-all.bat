@echo off
echo Starting Companion Platform Services...
start "Backend API" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Admin Web Portal" cmd /k "cd /d %~dp0admin-web && npm run dev"
timeout /t 2 /nobreak >nul
start "Mobile App" cmd /k "cd /d %~dp0mobile-app && npm run dev"
echo All services started!
echo Backend:   http://localhost:5000
echo Admin Web: http://localhost:3000
echo Mobile:    http://localhost:5173
pause
