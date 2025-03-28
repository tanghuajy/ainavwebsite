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

# Initialize database
Write-Host "Initializing database..." -ForegroundColor $Blue
wrangler d1 execute $DB_NAME --file=./schema.sql

# Generate random JWT key
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "Generating JWT key..." -ForegroundColor $Blue

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor $Blue
$JWT_SECRET | wrangler secret put JWT_SECRET

# Deploy Worker
Write-Host "Deploying Worker..." -ForegroundColor $Blue
wrangler deploy

# Get Worker URL
$WORKER_URL = (wrangler whoami | Select-String -Pattern 'https://.*\.workers\.dev').Matches.Value
Write-Host "Worker deployed successfully, URL: $WORKER_URL" -ForegroundColor $Green

# Update frontend API URL
Write-Host "Updating frontend API URL..." -ForegroundColor $Blue
$content = Get-Content src/index.html
$content = $content -replace "const API_BASE_URL = 'https://your-worker-url.workers.dev'", "const API_BASE_URL = '$WORKER_URL'"
$content | Set-Content src/index.html

# Deploy frontend to Pages
Write-Host "Deploying frontend to Pages..." -ForegroundColor $Blue
wrangler pages deploy src --project-name ainavwebsite

Write-Host "Deployment completed!" -ForegroundColor $Green
Write-Host "Please visit your Cloudflare Pages URL to view the site" -ForegroundColor $Green
Write-Host "Admin account:  admin@example.com" -ForegroundColor $Green
Write-Host "Admin password: 123456" -ForegroundColor $Green 