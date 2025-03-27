# Set output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set color output
$Green = [System.ConsoleColor]::Green
$Blue = [System.ConsoleColor]::Blue
$Red = [System.ConsoleColor]::Red

Write-Host "Starting deployment to Cloudflare..." -ForegroundColor $Blue

# Check if wrangler is installed
if (-not (Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Host "Wrangler not installed, installing..." -ForegroundColor $Red
    npm install -g wrangler
}

# Check if logged in
try {
    wrangler whoami | Out-Null
} catch {
    Write-Host "Not logged in to Cloudflare, please login..." -ForegroundColor $Red
    wrangler login
}

# Create D1 database
Write-Host "Creating D1 database..." -ForegroundColor $Blue
$DB_NAME = "bookmark_db"
$DB_OUTPUT = wrangler d1 create $DB_NAME
$DB_ID = [regex]::Match($DB_OUTPUT, 'Created database (.*)').Groups[1].Value

if ($null -eq $DB_ID) {
    Write-Host "Failed to create database" -ForegroundColor $Red
    exit 1
}

Write-Host "Database created successfully, ID: $DB_ID" -ForegroundColor $Green

# Update wrangler.toml
Write-Host "Updating wrangler.toml..." -ForegroundColor $Blue
$content = Get-Content wrangler.toml
$content = $content -replace 'database_id = ""', "database_id = `"$DB_ID`""
$content | Set-Content wrangler.toml

# Save database ID to file
$DB_ID | Out-File -FilePath "db_id.txt"

Write-Host "Step 1 completed!" -ForegroundColor $Green 