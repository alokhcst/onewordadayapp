#!/usr/bin/env pwsh
# Test the get-todays-word Lambda function

Write-Host "Testing get-todays-word Lambda Function..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$FUNCTION_NAME = "onewordaday-production-get-todays-word"

# Step 1: Check function configuration
Write-Host "[1/4] Checking function configuration..." -ForegroundColor Yellow
$config = aws lambda get-function-configuration --function-name $FUNCTION_NAME --output json | ConvertFrom-Json

Write-Host "  Runtime: $($config.Runtime)" -ForegroundColor Gray
Write-Host "  Memory: $($config.MemorySize) MB" -ForegroundColor Gray
Write-Host "  Timeout: $($config.Timeout) seconds" -ForegroundColor Gray
Write-Host "  Last Modified: $($config.LastModified)" -ForegroundColor Gray

# Check environment variables
Write-Host "`n  Environment Variables:" -ForegroundColor Gray
$config.Environment.Variables.PSObject.Properties | ForEach-Object {
    Write-Host "    $($_.Name) = $($_.Value)" -ForegroundColor Gray
}

# Check USE_AI_GENERATION flag
$useAI = $config.Environment.Variables.USE_AI_GENERATION
Write-Host "`n  [INFO] USE_AI_GENERATION = $useAI" -ForegroundColor $(if ($useAI -eq 'true') { 'Green' } else { 'Yellow' })

# Step 2: Check if API keys are configured
Write-Host "`n[2/4] Checking API keys in Secrets Manager..." -ForegroundColor Yellow
try {
    $secret = aws secretsmanager get-secret-value --secret-id onewordaday/llm-api-keys --output json 2>&1 | ConvertFrom-Json
    $secretData = $secret.SecretString | ConvertFrom-Json
    
    Write-Host "  [OK] Secret exists with keys:" -ForegroundColor Green
    $secretData.PSObject.Properties.Name | ForEach-Object {
        $keyName = $_
        $keyValue = $secretData.$keyName
        $masked = if ($keyValue) { $keyValue.Substring(0, [Math]::Min(10, $keyValue.Length)) + "..." } else { "NOT SET" }
        Write-Host "    - ${keyName}: $masked" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WARNING] Secret not found or error accessing it" -ForegroundColor Yellow
    Write-Host "  Without API keys, function will use word bank instead of AI" -ForegroundColor Gray
}

# Step 3: Invoke the function with a test payload
Write-Host "`n[3/4] Invoking Lambda function..." -ForegroundColor Yellow

# Create test payload (simulating API Gateway event)
$testUserId = "test-user-$(Get-Random -Maximum 9999)"
$payloadJson = "{`"requestContext`":{`"authorizer`":{`"claims`":{`"sub`":`"$testUserId`",`"email`":`"test@example.com`"}}},`"queryStringParameters`":null}"

# Save payload to file with ASCII encoding (no BOM)
[System.IO.File]::WriteAllText("$PWD\test-payload.json", $payloadJson, [System.Text.Encoding]::ASCII)

Write-Host "  Sending test request..." -ForegroundColor Gray

# Invoke function
$response = aws lambda invoke `
    --function-name $FUNCTION_NAME `
    --payload file://test-payload.json `
    --cli-binary-format raw-in-base64-out `
    response.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Function invoked successfully" -ForegroundColor Green
    
    # Read and display response
    $responseData = Get-Content response.json | ConvertFrom-Json
    
    Write-Host "`n[4/4] Response from Lambda:" -ForegroundColor Yellow
    Write-Host "  Status Code: $($responseData.statusCode)" -ForegroundColor $(if ($responseData.statusCode -eq 200) { 'Green' } else { 'Red' })
    
    if ($responseData.body) {
        $body = $responseData.body | ConvertFrom-Json
        
        if ($responseData.statusCode -eq 200) {
            Write-Host "`n  [SUCCESS] Word Generated:" -ForegroundColor Green
            Write-Host "    Word: $($body.word.word)" -ForegroundColor Cyan
            Write-Host "    Definition: $($body.word.definition)" -ForegroundColor Gray
            Write-Host "    Part of Speech: $($body.word.partOfSpeech)" -ForegroundColor Gray
            Write-Host "    Difficulty: $($body.word.difficulty)" -ForegroundColor Gray
            
            if ($body.word.generationMethod) {
                Write-Host "    Generation Method: $($body.word.generationMethod)" -ForegroundColor $(if ($body.word.generationMethod -eq 'AI') { 'Green' } else { 'Yellow' })
            }
            
            if ($body.word.provider) {
                Write-Host "    LLM Provider: $($body.word.provider)" -ForegroundColor Cyan
            }
            
            if ($body.word.imageUrl) {
                Write-Host "    Image URL: $($body.word.imageUrl)" -ForegroundColor Gray
            }
            
            if ($body.word.sentences) {
                Write-Host "`n    Example Sentences:" -ForegroundColor Gray
                $body.word.sentences | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
            }
        } else {
            Write-Host "`n  [ERROR] Function returned error:" -ForegroundColor Red
            Write-Host "    Message: $($body.message)" -ForegroundColor Red
            if ($body.error) {
                Write-Host "    Error: $($body.error)" -ForegroundColor Red
            }
        }
        
        # Show full response for debugging
        Write-Host "`n  Full Response Body:" -ForegroundColor Gray
        $body | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor DarkGray
    }
} else {
    Write-Host "  [ERROR] Function invocation failed" -ForegroundColor Red
}

# Clean up test files
if (Test-Path response.json) {
    Remove-Item response.json
}
if (Test-Path test-payload.json) {
    Remove-Item test-payload.json
}

# Step 4: Check recent logs
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Checking recent Lambda logs..." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

aws logs tail "/aws/lambda/$FUNCTION_NAME" --since 5m --format short | Select-Object -Last 30

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nTroubleshooting Tips:" -ForegroundColor Yellow
Write-Host "  - If using WordBank: API keys not set or LLM providers failed" -ForegroundColor White
Write-Host "  - If using AI: Check logs for LLM provider success" -ForegroundColor White
Write-Host "  - Check 'generationMethod' field: 'AI' or 'WordBank'" -ForegroundColor White
Write-Host "  - Ensure SECRET_NAME environment variable points to correct secret" -ForegroundColor White

