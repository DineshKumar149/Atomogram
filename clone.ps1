$ErrorActionPreference = "Stop"

Write-Host "Dumping roles..."
npx supabase db dump --db-url "postgresql://postgres:Dinesh%402729305@db.pyofwjdoptibhxueuhvy.supabase.co:5432/postgres" -f roles.sql --role-only
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Dumping schema..."
npx supabase db dump --db-url "postgresql://postgres:Dinesh%402729305@db.pyofwjdoptibhxueuhvy.supabase.co:5432/postgres" -f schema.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Dumping data..."
npx supabase db dump --db-url "postgresql://postgres:Dinesh%402729305@db.pyofwjdoptibhxueuhvy.supabase.co:5432/postgres" -f data.sql --data-only
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restoring roles..."
npx supabase db execute --db-url "postgresql://postgres:Pranchi%406368@db.lwqqacrjszjujdimrbdz.supabase.co:5432/postgres" -f roles.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restoring schema..."
npx supabase db execute --db-url "postgresql://postgres:Pranchi%406368@db.lwqqacrjszjujdimrbdz.supabase.co:5432/postgres" -f schema.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restoring data..."
npx supabase db execute --db-url "postgresql://postgres:Pranchi%406368@db.lwqqacrjszjujdimrbdz.supabase.co:5432/postgres" -f data.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Restoring .env file..."
mv .env.hidden .env

Write-Host "Done!"
