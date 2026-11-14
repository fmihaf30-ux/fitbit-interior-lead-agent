@echo off
title Fitbit Interiors 24-Hour Autonomous Lead & Outreach Daemon
cd /d "%~dp0"
echo ========================================================================
echo   FITBIT INTERIORS 24-HOUR AUTONOMOUS AGENT DAEMON
echo   Running automated lead discovery, reply checks, and outreach...
echo ========================================================================
node scheduler.js --daemon
pause
