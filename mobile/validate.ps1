# Validation Script for Google Messages Mobile App
# This script checks code integrity before building

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       Google Messages App - Code Validation Script           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorCount = 0
$WarningCount = 0

# Function to print status
function Print-Status {
    param([string]$Message, [string]$Status)
    $maxLength = 60
    $padding = $maxLength - $Message.Length
    $dots = "." * $padding
    
    if ($Status -eq "PASS") {
        Write-Host "$Message$dots" -NoNewline
        Write-Host "[✓ PASS]" -ForegroundColor Green
    } elseif ($Status -eq "FAIL") {
        Write-Host "$Message$dots" -NoNewline
        Write-Host "[✗ FAIL]" -ForegroundColor Red
        $script:ErrorCount++
    } elseif ($Status -eq "WARN") {
        Write-Host "$Message$dots" -NoNewline
        Write-Host "[⚠ WARN]" -ForegroundColor Yellow
        $script:WarningCount++
    } else {
        Write-Host "$Message$dots" -NoNewline
        Write-Host "[$Status]" -ForegroundColor Gray
    }
}

Write-Host "📋 Checking Project Structure..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

# Check if mobile directory exists
if (Test-Path ".\package.json") {
    Print-Status "Mobile directory structure" "PASS"
} else {
    Print-Status "Mobile directory structure" "FAIL"
    Write-Host "   Run this script from the mobile directory!" -ForegroundColor Red
    exit 1
}

# Check key directories
$directories = @(
    "src",
    "src\services",
    "src\components",
    "src\types",
    "android\app\src\main\java\com\googlemessages\app"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Print-Status "Directory: $dir" "PASS"
    } else {
        Print-Status "Directory: $dir" "FAIL"
    }
}

Write-Host "`n📦 Checking NPM Dependencies..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

if (Test-Path "node_modules") {
    Print-Status "node_modules folder" "PASS"
} else {
    Print-Status "node_modules folder" "WARN"
    Write-Host "   Run: npm install" -ForegroundColor Yellow
}

# Check package.json dependencies
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$requiredDeps = @(
    "react-native",
    "expo",
    "react-native-contacts",
    "react-native-get-sms-android",
    "socket.io-client"
)

foreach ($dep in $requiredDeps) {
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $dep) {
        Print-Status "Dependency: $dep" "PASS"
    } else {
        Print-Status "Dependency: $dep" "FAIL"
    }
}

Write-Host "`n🔧 Checking TypeScript Files..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

# Check TypeScript service files
$tsFiles = @(
    "src\services\smsService.ts",
    "src\services\contactsService.ts",
    "src\services\socketService.ts",
    "src\components\ConversationItem.tsx",
    "src\components\MessageBubble.tsx",
    "app\index.tsx",
    "app\chat\[id].tsx",
    "app\compose.tsx",
    "app\settings.tsx"
)

foreach ($file in $tsFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "import.*from" -or $content -match "export") {
            Print-Status "File: $file" "PASS"
        } else {
            Print-Status "File: $file" "WARN"
        }
    } else {
        Print-Status "File: $file" "FAIL"
    }
}

Write-Host "`n⚡ Running TypeScript Type Check..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

try {
    $tscOutput = npx tsc --noEmit --project tsconfig.json 2>&1
    if ($LASTEXITCODE -eq 0) {
        Print-Status "TypeScript compilation" "PASS"
    } else {
        Print-Status "TypeScript compilation" "FAIL"
        Write-Host "`n   Errors:" -ForegroundColor Red
        Write-Host "   $tscOutput" -ForegroundColor Red
    }
} catch {
    Print-Status "TypeScript compilation" "WARN"
    Write-Host "   Could not run TypeScript check" -ForegroundColor Yellow
}

Write-Host "`n📱 Checking Android/Kotlin Files..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

# Check Kotlin files
$kotlinFiles = @(
    "android\app\src\main\java\com\googlemessages\app\EnhancedSmsManager.kt",
    "android\app\src\main\java\com\googlemessages\app\DefaultSmsModule.kt",
    "android\app\src\main\java\com\googlemessages\app\CustomPackage.kt",
    "android\app\src\main\java\com\googlemessages\app\SmsSentReceiver.kt",
    "android\app\src\main\java\com\googlemessages\app\SmsDeliveredReceiver.kt",
    "android\app\src\main\java\com\googlemessages\app\SmsReceiver.kt",
    "android\app\src\main\java\com\googlemessages\app\MmsReceiver.kt",
    "android\app\src\main\java\com\googlemessages\app\MmsService.kt"
)

foreach ($file in $kotlinFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "package com\.googlemessages\.app") {
            Print-Status "Kotlin: $(Split-Path $file -Leaf)" "PASS"
        } else {
            Print-Status "Kotlin: $(Split-Path $file -Leaf)" "WARN"
        }
    } else {
        Print-Status "Kotlin: $(Split-Path $file -Leaf)" "FAIL"
    }
}

# Check AndroidManifest.xml
if (Test-Path "android\app\src\main\AndroidManifest.xml") {
    $manifest = Get-Content "android\app\src\main\AndroidManifest.xml" -Raw
    
    # Check key permissions
    $permissions = @("READ_SMS", "SEND_SMS", "RECEIVE_SMS", "READ_CONTACTS")
    $allPerms = $true
    foreach ($perm in $permissions) {
        if ($manifest -notmatch $perm) {
            $allPerms = $false
            break
        }
    }
    
    if ($allPerms) {
        Print-Status "AndroidManifest.xml permissions" "PASS"
    } else {
        Print-Status "AndroidManifest.xml permissions" "WARN"
    }
    
    # Check receivers
    if ($manifest -match "SmsReceiver" -and $manifest -match "SmsSentReceiver") {
        Print-Status "AndroidManifest.xml receivers" "PASS"
    } else {
        Print-Status "AndroidManifest.xml receivers" "WARN"
    }
} else {
    Print-Status "AndroidManifest.xml" "FAIL"
}

Write-Host "`n🔍 Checking Key Features..." -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

# Check if EnhancedSmsManager is registered
if (Test-Path "android\app\src\main\java\com\googlemessages\app\CustomPackage.kt") {
    $customPackage = Get-Content "android\app\src\main\java\com\googlemessages\app\CustomPackage.kt" -Raw
    if ($customPackage -match "EnhancedSmsManager") {
        Print-Status "EnhancedSmsManager registration" "PASS"
    } else {
        Print-Status "EnhancedSmsManager registration" "FAIL"
    }
}

# Check if smsService uses EnhancedSmsManager
if (Test-Path "src\services\smsService.ts") {
    $smsService = Get-Content "src\services\smsService.ts" -Raw
    if ($smsService -match "EnhancedSmsManager") {
        Print-Status "SMS Service integration" "PASS"
    } else {
        Print-Status "SMS Service integration" "WARN"
    }
}

# Check if contacts service exists
if (Test-Path "src\services\contactsService.ts") {
    $contactsService = Get-Content "src\services\contactsService.ts" -Raw
    if ($contactsService -match "react-native-contacts") {
        Print-Status "Contacts Service integration" "PASS"
    } else {
        Print-Status "Contacts Service integration" "WARN"
    }
}

# Check retry functionality
if (Test-Path "app\chat\[id].tsx") {
    $chatScreen = Get-Content "app\chat\[id].tsx" -Raw
    if ($chatScreen -match "handleRetryMessage") {
        Print-Status "Message retry functionality" "PASS"
    } else {
        Print-Status "Message retry functionality" "WARN"
    }
}

# Check status tracking
if (Test-Path "android\app\src\main\java\com\googlemessages\app\SmsSentReceiver.kt") {
    $sentReceiver = Get-Content "android\app\src\main\java\com\googlemessages\app\SmsSentReceiver.kt" -Raw
    if ($sentReceiver -match "onSmsSent") {
        Print-Status "SMS status tracking" "PASS"
    } else {
        Print-Status "SMS status tracking" "WARN"
    }
}

Write-Host "`n📊 Validation Summary" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n"

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "✓ All checks passed! Your code is ready to build." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Connect your Android device via USB" -ForegroundColor White
    Write-Host "  2. Enable USB debugging on the device" -ForegroundColor White
    Write-Host "  3. Run: npx expo run:android" -ForegroundColor White
    Write-Host "  4. Grant SMS permissions when prompted" -ForegroundColor White
    Write-Host "  5. Test sending/receiving SMS" -ForegroundColor White
    exit 0
} elseif ($ErrorCount -eq 0) {
    Write-Host "⚠ Validation completed with $WarningCount warning(s)." -ForegroundColor Yellow
    Write-Host "  The app should still work, but review warnings above." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "✗ Validation failed with $ErrorCount error(s) and $WarningCount warning(s)." -ForegroundColor Red
    Write-Host "  Please fix the errors above before building." -ForegroundColor Red
    exit 1
}
