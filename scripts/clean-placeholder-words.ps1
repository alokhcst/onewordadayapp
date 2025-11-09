#!/usr/bin/env pwsh
# Delete placeholder words from word bank (words starting with 'word')

Write-Host "Cleaning Placeholder Words from Word Bank..." -ForegroundColor Cyan

$TABLE_NAME = "onewordaday-production-word-bank"

Write-Host "Table: $TABLE_NAME" -ForegroundColor Gray
Write-Host "Target: Words starting with 'word' (e.g., word3_0, word4_1, etc.)`n" -ForegroundColor Yellow

# Scan the table for placeholder words
Write-Host "Scanning for placeholder words..." -ForegroundColor Yellow

# Use properly escaped JSON for AWS CLI
$scanResult = aws dynamodb scan `
    --table-name $TABLE_NAME `
    --filter-expression 'begins_with(word, :prefix)' `
    --expression-attribute-values '{\":prefix\":{\"S\":\"word\"}}' `
    --projection-expression 'wordId, word' `
    --output json | ConvertFrom-Json

if (-not $scanResult.Items) {
    Write-Host "No placeholder words found!" -ForegroundColor Green
    exit 0
}

$itemCount = $scanResult.Items.Count
Write-Host "Found $itemCount placeholder words to delete`n" -ForegroundColor Yellow

# Ask for confirmation
Write-Host "Preview of words to be deleted:" -ForegroundColor Cyan
$scanResult.Items | Select-Object -First 10 | ForEach-Object {
    Write-Host "  - $($_.word.S) (ID: $($_.wordId.S))" -ForegroundColor Gray
}

if ($itemCount -gt 10) {
    Write-Host "  ... and $($itemCount - 10) more" -ForegroundColor Gray
}

Write-Host ""
$confirmation = Read-Host "Do you want to delete these $itemCount words? (yes/no)"

if ($confirmation -ne 'yes') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

# Delete items in batches (max 25 per batch for BatchWriteItem)
Write-Host "`nDeleting placeholder words..." -ForegroundColor Yellow

$batchSize = 25
$deletedCount = 0
$errorCount = 0

for ($i = 0; $i -lt $scanResult.Items.Count; $i += $batchSize) {
    $batch = $scanResult.Items[$i..[Math]::Min($i + $batchSize - 1, $scanResult.Items.Count - 1)]
    
    # Build delete requests
    $deleteRequests = @()
    foreach ($item in $batch) {
        $deleteRequests += @{
            DeleteRequest = @{
                Key = @{
                    wordId = $item.wordId
                }
            }
        }
    }
    
    # Create request items JSON
    $requestItems = @{
        $TABLE_NAME = $deleteRequests
    } | ConvertTo-Json -Depth 5 -Compress
    
    try {
        aws dynamodb batch-write-item --request-items $requestItems | Out-Null
        $deletedCount += $batch.Count
        $batchNum = [math]::Floor($i / $batchSize) + 1
        $totalBatches = [math]::Ceiling($scanResult.Items.Count / $batchSize)
        Write-Host "  [OK] Batch $batchNum/$totalBatches - Deleted $($batch.Count) words (Total: $deletedCount)" -ForegroundColor Green
    } catch {
        $errorCount += $batch.Count
        Write-Host "  [ERROR] Batch failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successfully deleted: $deletedCount words" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Failed to delete: $errorCount words" -ForegroundColor Red
}
Write-Host ""

