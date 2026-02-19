Write-Host "Starting GrabPic stack from project root..."
docker compose up -d --build
docker compose ps
Write-Host "Frontend: http://localhost:3000"
Write-Host "Backend:  http://localhost:8000/api/v1/health"

