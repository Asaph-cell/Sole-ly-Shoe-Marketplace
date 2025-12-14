@echo off
REM ================================================================
REM SOLELY KENYA - SETUP ENVIRONMENT SECRETS
REM ================================================================
REM Run this script to set all required Edge Function secrets
REM Make sure you have your API keys ready before running
REM ================================================================

echo.
echo ================================================================
echo SOLELY KENYA - Environment Secrets Setup
echo ================================================================
echo.
echo This script will help you set up all required secrets for
echo Edge Functions. You'll need:
echo.
echo   1. Resend API Key (for emails)
echo   2. Pesapal Consumer Key (for payments)
echo   3. Pesapal Consumer Secret (for payments)
echo.
echo Make sure you have these ready before proceeding.
echo.
pause

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Supabase CLI not found!
    echo Please install: npm install -g supabase
    pause
    exit /b 1
)

echo.
echo ================================================================
echo SETTING RESEND API KEY
echo ================================================================
echo.
echo Get your Resend API key from: https://resend.com/api-keys
echo.
set /p RESEND_KEY="Enter Resend API Key: "

supabase secrets set RESEND_API_KEY=%RESEND_KEY%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set RESEND_API_KEY
    pause
    exit /b 1
)
echo [SUCCESS] RESEND_API_KEY set

echo.
echo ================================================================
echo SETTING PESAPAL CREDENTIALS
echo ================================================================
echo.
echo Get your Pesapal credentials from: https://www.pesapal.com
echo Make sure to use PRODUCTION credentials!
echo.
set /p PESAPAL_KEY="Enter Pesapal Consumer Key: "
set /p PESAPAL_SECRET="Enter Pesapal Consumer Secret: "

supabase secrets set PESAPAL_CONSUMER_KEY=%PESAPAL_KEY%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set PESAPAL_CONSUMER_KEY
    pause
    exit /b 1
)
echo [SUCCESS] PESAPAL_CONSUMER_KEY set

supabase secrets set PESAPAL_CONSUMER_SECRET=%PESAPAL_SECRET%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set PESAPAL_CONSUMER_SECRET
    pause
    exit /b 1
)
echo [SUCCESS] PESAPAL_CONSUMER_SECRET set

echo.
echo ================================================================
echo SETTING PESAPAL URLs
echo ================================================================
echo.

REM Get project reference
echo Enter your Supabase project reference
echo (Find it in: Supabase Dashboard ^> Settings ^> General)
echo Example: cqcklvdblhcdowisjnsf
echo.
set /p PROJECT_REF="Project Reference: "

set PESAPAL_IPN=https://%PROJECT_REF%.supabase.co/functions/v1/pesapal-ipn-listener

supabase secrets set PESAPAL_IPN_URL=%PESAPAL_IPN%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set PESAPAL_IPN_URL
    pause
    exit /b 1
)
echo [SUCCESS] PESAPAL_IPN_URL set to: %PESAPAL_IPN%

echo.
echo Enter your production domain (e.g., solely.co.ke)
set /p DOMAIN="Domain: "

supabase secrets set PESAPAL_CALLBACK_URL=https://%DOMAIN%/orders
if %errorlevel% neq 0 (
    echo [ERROR] Failed to set PESAPAL_CALLBACK_URL
    pause
    exit /b 1
)
echo [SUCCESS] PESAPAL_CALLBACK_URL set to: https://%DOMAIN%/orders

echo.
echo ================================================================
echo ALL SECRETS CONFIGURED SUCCESSFULLY!
echo ================================================================
echo.
echo Secrets set:
echo   - RESEND_API_KEY
echo   - PESAPAL_CONSUMER_KEY
echo   - PESAPAL_CONSUMER_SECRET
echo   - PESAPAL_IPN_URL
echo   - PESAPAL_CALLBACK_URL
echo.
echo Next steps:
echo 1. Run cron job SQL in Supabase Dashboard
echo 2. Test Edge Functions
echo 3. Deploy frontend
echo.
pause
