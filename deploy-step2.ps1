# Set output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set color output
$Green = [System.ConsoleColor]::Green
$Blue = [System.ConsoleColor]::Blue
$Red = [System.ConsoleColor]::Red

Write-Host "Starting step 2 deployment..." -ForegroundColor $Blue

# Read database ID
$DB_ID = Get-Content "db_id.txt"
if ($null -eq $DB_ID) {
    Write-Host "Database ID not found, please run step 1 first" -ForegroundColor $Red
    exit 1
}

# Initialize database
Write-Host "Initializing database..." -ForegroundColor $Blue
wrangler d1 execute bookmark_db --file=./schema.sql

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