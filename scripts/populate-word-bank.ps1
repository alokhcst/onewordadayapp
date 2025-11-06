# PowerShell script to populate word bank
# Usage: .\scripts\populate-word-bank.ps1

param(
    [string]$TableName = "onewordaday-dev-word-bank",
    [string]$Region = "us-east-1"
)

Write-Host "Populating word bank table: $TableName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Sample words to add
$words = @(
    @{
        word = "serendipity"
        definition = "The occurrence and development of events by chance in a happy or beneficial way"
        partOfSpeech = "noun"
        pronunciation = "/ˌserənˈdipədē/"
        difficulty = 3
        synonyms = @("fortune", "luck", "chance")
        antonyms = @("misfortune", "bad luck")
    },
    @{
        word = "ephemeral"
        definition = "Lasting for a very short time"
        partOfSpeech = "adjective"
        pronunciation = "/əˈfem(ə)rəl/"
        difficulty = 4
        synonyms = @("transient", "fleeting", "temporary")
        antonyms = @("permanent", "lasting", "eternal")
    },
    @{
        word = "resilient"
        definition = "Able to recover quickly from difficulties"
        partOfSpeech = "adjective"
        pronunciation = "/rəˈzilyənt/"
        difficulty = 3
        synonyms = @("tough", "strong", "flexible")
        antonyms = @("weak", "fragile")
    },
    @{
        word = "eloquent"
        definition = "Fluent or persuasive in speaking or writing"
        partOfSpeech = "adjective"
        pronunciation = "/ˈeləkwənt/"
        difficulty = 3
        synonyms = @("articulate", "expressive", "fluent")
        antonyms = @("inarticulate", "ineloquent")
    },
    @{
        word = "innovative"
        definition = "Featuring new methods; advanced and original"
        partOfSpeech = "adjective"
        pronunciation = "/ˈinəˌvādiv/"
        difficulty = 2
        synonyms = @("creative", "original", "novel")
        antonyms = @("traditional", "conventional")
    }
)

$successCount = 0
$errorCount = 0

foreach ($wordData in $words) {
    $wordId = [guid]::NewGuid().ToString()
    
    # Create item JSON
    $item = @{
        wordId = @{ S = $wordId }
        word = @{ S = $wordData.word }
        definition = @{ S = $wordData.definition }
        partOfSpeech = @{ S = $wordData.partOfSpeech }
        pronunciation = @{ S = $wordData.pronunciation }
        difficulty = @{ N = $wordData.difficulty.ToString() }
        category = @{ S = "general" }
        frequency = @{ N = "50" }
        audioUrl = @{ S = "" }
        imageUrl = @{ S = "" }
        createdAt = @{ S = (Get-Date -Format o) }
        synonyms = @{ SS = $wordData.synonyms }
        antonyms = @{ SS = $wordData.antonyms }
        ageGroups = @{ SS = @("young_adult", "adult", "senior") }
        contexts = @{ SS = @("general", "corporate") }
        examples = @{ SS = @("Example sentence 1", "Example sentence 2") }
    }
    
    $itemJson = $item | ConvertTo-Json -Depth 10 -Compress
    
    try {
        aws dynamodb put-item `
            --table-name $TableName `
            --item $itemJson `
            --region $Region `
            2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Added: $($wordData.word)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "✗ Failed to add: $($wordData.word)" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "✗ Failed to add: $($wordData.word) - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Successfully added: $successCount words" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "✗ Failed: $errorCount words" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan

