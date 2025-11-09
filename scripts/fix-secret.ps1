#!/usr/bin/env pwsh
# Fix the malformed API keys secret

Write-Host "Checking and Fixing API Keys Secret..." -ForegroundColor Cyan

$SECRET_NAME = "onewordaday/llm-api-keys"

# Step 1: Check current secret
Write-Host "`n[1/3] Checking current secret..." -ForegroundColor Yellow
try {
    # Get the secret string directly (single AWS call)
    $secretString = aws secretsmanager get-secret-value --secret-id $SECRET_NAME --query SecretString --output text
    
    Write-Host "  Secret exists!" -ForegroundColor Green
    Write-Host "`n  Current SecretString:" -ForegroundColor Gray
    Write-Host "  $secretString" -ForegroundColor DarkGray
 
    # Try to parse the JSON
    try {
        $parsed = $secretString | ConvertFrom-Json
        
        Write-Host "`n  [OK] Secret JSON is valid!" -ForegroundColor Green
        Write-Host "  Keys found:" -ForegroundColor Gray
        
        # Display all keys and their values (masked for security)
        $parsed.PSObject.Properties | ForEach-Object {
            $key = $_.Name
            $value = $_.Value
            $maskedValue = if ($value -and $value.Length -gt 8) { 
                $value.Substring(0, 8) + "..." 
            } elseif ($value) { 
                "***" 
            } else { 
                "(empty)" 
            }
            Write-Host "    - ${key}: $maskedValue" -ForegroundColor Gray
        }
        
        Write-Host "`n  Secret is properly formatted! No changes needed." -ForegroundColor Green
        exit 0
        
    } catch {
        Write-Host "`n  [ERROR] Secret JSON is INVALID!" -ForegroundColor Red
        Write-Host "  Parse error: $_" -ForegroundColor Red
        
        # Try to parse malformed JSON-like format: {key1:value1,key2:value2,...}
        $rawValue = $secretString.Trim()
        Write-Host "`n  Attempting to parse malformed secret format..." -ForegroundColor Gray
        
        # Check if it looks like the malformed format with curly braces
        if ($rawValue -match '^\{(.+)\}$') {
            $content = $matches[1]
            Write-Host "  Detected malformed JSON-like format, extracting keys..." -ForegroundColor Cyan
            
            # Split by comma and parse key:value pairs
            $pairs = $content -split ','
            foreach ($pair in $pairs) {
                if ($pair -match '^(\w+):(.+)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim()
                    
                    Write-Host "    Found: $key = $($value.Substring(0, [Math]::Min(8, $value.Length)))..." -ForegroundColor Gray
                    
                    switch ($key) {
                        'groq' { $detectedGroq = $value }
                        'unsplash' { $detectedUnsplash = $value }
                    }
                }
            }
        }
        # Check if it's a single raw API key
        elseif ($rawValue -match '^gsk_') {
            Write-Host "  Detected: Single Groq API key" -ForegroundColor Cyan
            $detectedGroq = $rawValue
        }
        elseif ($rawValue.Length -gt 30 -and $rawValue -notmatch '^gsk_') {
            Write-Host "  Detected: Likely single Unsplash API key" -ForegroundColor Cyan
            $detectedUnsplash = $rawValue
        }
        else {
            Write-Host "  Could not identify secret format" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [INFO] Secret does not exist yet" -ForegroundColor Yellow
}

# Step 2: Create or update secret with valid JSON
Write-Host "`n[2/3] Creating/Updating secret with valid JSON..." -ForegroundColor Yellow

# Build the valid JSON structure (only Groq and Unsplash)
$validJson = @{
    groq = if ($detectedGroq) { $detectedGroq } else { "" }
    unsplash = if ($detectedUnsplash) { $detectedUnsplash } else { "" }
} | ConvertTo-Json -Compress

# Show what will be preserved
if ($detectedGroq) {
    Write-Host "  [INFO] Preserving detected Groq API key: $($detectedGroq.Substring(0, [Math]::Min(8, $detectedGroq.Length)))..." -ForegroundColor Green
}
if ($detectedUnsplash) {
    Write-Host "  [INFO] Preserving detected Unsplash API key: $($detectedUnsplash.Substring(0, [Math]::Min(8, $detectedUnsplash.Length)))..." -ForegroundColor Green
}

Write-Host "`n  New secret structure:" -ForegroundColor Gray
Write-Host "  $validJson" -ForegroundColor DarkGray

$confirmation = Read-Host "`n  Do you want to update/create the secret? (yes/no)"

if ($confirmation -ne 'yes') {
    Write-Host "  Skipping secret update. Moving to verification..." -ForegroundColor Yellow
} else {
    try {
        # Try to update first
        aws secretsmanager update-secret --secret-id $SECRET_NAME --secret-string $validJson 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Secret updated successfully!" -ForegroundColor Green
        } else {
            # If update fails, try create
            aws secretsmanager create-secret --name $SECRET_NAME --secret-string $validJson --description "API keys for LLM providers and Unsplash" | Out-Null
            Write-Host "  [OK] Secret created successfully!" -ForegroundColor Green
        }
    } catch {
        Write-Host "  [ERROR] Failed to create/update secret: $_" -ForegroundColor Red
        exit 1
    }
}



# Step 3: Test API keys with actual API calls
Write-Host "`n[4/4] Testing API keys..." -ForegroundColor Yellow

# Test Groq API
if ($detectedGroq -and $detectedGroq.Length -gt 0) {
    Write-Host "`n  Testing Groq API..." -ForegroundColor Cyan
    Write-Host "    Using key: $($detectedGroq.Substring(0, [Math]::Min(12, $detectedGroq.Length)))...[$($detectedGroq.Length) chars]" -ForegroundColor DarkGray
    
    try {
        $groqPayload = @{
            model = "llama-3.1-8b-instant"
            messages = @(
                @{
                    role = "user"
                    content = "Return JSON with status field set to success"
                }
            )
            temperature = 0.1
            max_tokens = 50
            response_format = @{ type = "json_object" }
        } | ConvertTo-Json -Depth 5
        
        $groqHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $($detectedGroq)"
        }
        
        $groqResponse = Invoke-RestMethod -Uri "https://api.groq.com/openai/v1/chat/completions" `
            -Method Post `
            -Headers $groqHeaders `
            -Body $groqPayload `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($groqResponse.choices -and $groqResponse.choices[0].message.content) {
            Write-Host "    [OK] Groq API key is VALID and working!" -ForegroundColor Green
            Write-Host "    Model: $($groqResponse.model)" -ForegroundColor Gray
            Write-Host "    Response: $($groqResponse.choices[0].message.content)" -ForegroundColor Gray
        } else {
            Write-Host "    [WARNING] Groq API responded but format unexpected" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    [ERROR] Groq API key is INVALID or API call failed!" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "    Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n  [SKIP] Groq API key not set" -ForegroundColor Gray
}

# Test Unsplash API (using public authentication)
if ($detectedUnsplash -and $detectedUnsplash.Length -gt 0) {
    Write-Host "`n  Testing Unsplash API..." -ForegroundColor Cyan
    Write-Host "    Using Access Key: $($detectedUnsplash.Substring(0, [Math]::Min(12, $detectedUnsplash.Length)))...[$($detectedUnsplash.Length) chars]" -ForegroundColor DarkGray
    
    try {
        # Public authentication: Send Access Key via Authorization header as "Client-ID"
        # Reference: https://unsplash.com/documentation#public-authentication
        $unsplashHeaders = @{
            "Authorization" = "Client-ID $($detectedUnsplash)"
            "Accept-Version" = "v1"
        }
        
        # Test with /photos/random endpoint (simple public endpoint)
        $unsplashResponse = Invoke-RestMethod -Uri "https://api.unsplash.com/photos/random" `
            -Method Get `
            -Headers $unsplashHeaders `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        if ($unsplashResponse.id) {
            Write-Host "    [OK] Unsplash API key is VALID and working!" -ForegroundColor Green
            Write-Host "    Sample photo ID: $($unsplashResponse.id)" -ForegroundColor Gray
            Write-Host "    Photo by: $($unsplashResponse.user.name)" -ForegroundColor Gray
            Write-Host "    Image URL: $($unsplashResponse.urls.small)" -ForegroundColor Gray
        } else {
            Write-Host "    [WARNING] Unsplash API responded but unexpected format" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    [ERROR] Unsplash API key is INVALID or API call failed!" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "    Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
        Write-Host "    Tip: Get a valid Access Key from https://unsplash.com/developers" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n  [SKIP] Unsplash API key not set" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Secret Validation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. If API keys are invalid, update them:" -ForegroundColor White
Write-Host "     aws secretsmanager update-secret \\" -ForegroundColor Gray
Write-Host "       --secret-id $SECRET_NAME \\" -ForegroundColor Gray
Write-Host "       --secret-string '{\"groq\":\"YOUR_KEY\",\"unsplash\":\"YOUR_KEY\"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Get free API keys:" -ForegroundColor White
Write-Host "     Groq: https://console.groq.com/keys" -ForegroundColor Cyan
Write-Host "     Unsplash: https://unsplash.com/developers" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Test Lambda function:" -ForegroundColor White
Write-Host "     .\test-get-todays-word.ps1" -ForegroundColor Gray
Write-Host ""

