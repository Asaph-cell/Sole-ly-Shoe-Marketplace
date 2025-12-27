@echo off
REM ================================================================
REM SOLELY KENYA - DEPLOYMENT SCRIPT
REM ================================================================
REM Run this script to deploy all Edge Functions to Supabase
REM Make sure Supabase CLI is installed and you're logged in
REM ================================================================

echo.
echo ================================================================
echo SOLELY KENYA - Edge Functions Deployment
echo ================================================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    echo Then login:
    echo   supabase login
    echo.
    pause
    exit /b 1
)

echo [INFO] Supabase CLI found
echo.

REM Confirm deployment
set /p confirm="Deploy all Edge Functions? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo ================================================================
echo DEPLOYING EMAIL NOTIFICATION FUNCTIONS (9/19)
echo ================================================================
echo.

echo [1/8] Deploying notify-buyer-order-placed...
supabase functions deploy notify-buyer-order-placed
if %errorlevel% neq 0 goto :error

echo [2/8] Deploying notify-buyer-order-accepted...
supabase functions deploy notify-buyer-order-accepted
if %errorlevel% neq 0 goto :error

echo [3/8] Deploying notify-buyer-order-shipped...
supabase functions deploy notify-buyer-order-shipped
if %errorlevel% neq 0 goto :error

echo [4/8] Deploying notify-buyer-order-declined...
supabase functions deploy notify-buyer-order-declined
if %errorlevel% neq 0 goto :error

echo [5/8] Deploying notify-vendor-new-order...
supabase functions deploy notify-vendor-new-order
if %errorlevel% neq 0 goto :error

echo [6/8] Deploying notify-buyer-order-arrived...
supabase functions deploy notify-buyer-order-arrived
if %errorlevel% neq 0 goto :error

echo [7/8] Deploying notify-buyer-order-completed...
supabase functions deploy notify-buyer-order-completed
if %errorlevel% neq 0 goto :error

echo [8/9] Deploying notify-buyer-pickup-ready...
supabase functions deploy notify-buyer-pickup-ready
if %errorlevel% neq 0 goto :error

echo [9/9] Deploying notify-dispute-update...
supabase functions deploy notify-dispute-update
if %errorlevel% neq 0 goto :error

echo.
echo ================================================================
echo DEPLOYING AUTO-MANAGEMENT FUNCTIONS (8/15)
echo ================================================================
echo.

echo [6/8] Deploying auto-cancel-stale-orders...
supabase functions deploy auto-cancel-stale-orders
if %errorlevel% neq 0 goto :error

echo [7/8] Deploying auto-release-escrow...
supabase functions deploy auto-release-escrow
if %errorlevel% neq 0 goto :error

echo [8/8] Deploying auto-refund-unshipped...
supabase functions deploy auto-refund-unshipped
if %errorlevel% neq 0 goto :error

echo.
echo ================================================================
echo DEPLOYING PAYMENT FUNCTIONS (15/15)
echo ================================================================
echo.

echo [9/15] Deploying paystack-initiate-payment...
supabase functions deploy paystack-initiate-payment
if %errorlevel% neq 0 goto :error

echo [10/15] Deploying paystack-webhook...
supabase functions deploy paystack-webhook --no-verify-jwt
if %errorlevel% neq 0 goto :error

echo [11/15] Skipping legacy Pesapal functions...

echo [13/15] Deploying process-delivery-fee-payment...
supabase functions deploy process-delivery-fee-payment
if %errorlevel% neq 0 goto :error

echo [14/15] Deploying process-payouts...
supabase functions deploy process-payouts
if %errorlevel% neq 0 goto :error

echo [15/15] Deploying create-order...
supabase functions deploy create-order
if %errorlevel% neq 0 goto :error

echo.
echo ================================================================
echo SUCCESS! All Edge Functions Deployed
echo ================================================================
echo.
echo Next steps:
echo 1. Set environment secrets (see setup-secrets.bat)
echo 2. Run cron job SQL in Supabase Dashboard
echo 3. Deploy frontend build
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Deployment failed!
echo Please check the error message above and try again.
echo.
pause
exit /b 1
