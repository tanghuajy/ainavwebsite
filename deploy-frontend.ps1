# Set output encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set color output
$Green = [System.ConsoleColor]::Green
$Blue = [System.ConsoleColor]::Blue
$Red = [System.ConsoleColor]::Red

Write-Host "Starting frontend deployment to Cloudflare Pages..." -ForegroundColor $Blue

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

# Check if JWT_SECRET is set
Write-Host "Checking JWT_SECRET environment variable..." -ForegroundColor $Blue
try {
    wrangler pages secret list --project-name ainavwebsite | Select-String "JWT_SECRET" | Out-Null
    Write-Host "JWT_SECRET is already set" -ForegroundColor $Green
} catch {
    Write-Host "JWT_SECRET not found, generating new one..." -ForegroundColor $Blue
    $JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    echo $JWT_SECRET | wrangler pages secret put JWT_SECRET --project-name ainavwebsite
    Write-Host "JWT_SECRET has been set" -ForegroundColor $Green
}

# Deploy frontend to Pages
Write-Host "Deploying frontend to Pages..." -ForegroundColor $Blue
wrangler pages deploy public --project-name ainavwebsite

# Deploy Functions
Write-Host "Deploying Functions..." -ForegroundColor $Blue
wrangler pages deploy functions --project-name ainavwebsite

Write-Host "Frontend deployment completed!" -ForegroundColor $Green
Write-Host "Please visit your Cloudflare Pages URL to view the site" -ForegroundColor $Green
Write-Host "Admin account: admin@163.com" -ForegroundColor $Green
Write-Host "Admin password: 123456" -ForegroundColor $Green 