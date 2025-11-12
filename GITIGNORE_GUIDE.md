# .gitignore Configuration Guide

## Overview
The `.gitignore` file has been configured to exclude sensitive files, build artifacts, and temporary files while keeping important documentation and source code tracked.

## What's Ignored

### 1. Dependencies and Build Artifacts
```
node_modules/
dist/
web-build/
build/
backend/dist/
backend/layers/nodejs/
expo-env.d.ts
```

### 2. Environment and Secrets
```
.env
.env.local
.env.*.local
terraform/terraform.tfvars  # Contains sensitive AWS config and secrets
*.tfvars (except *.tfvars.example)
*secret*.json
*credentials*.json
secrets.yaml
secrets.yml
```

### 3. Terraform State and Cache
```
**/.terraform/
**/.terraform.lock.hcl
**/terraform.tfstate
**/terraform.tfstate.*
**/terraform.tfstate.backup
**/tfplan
.terraform.tfstate.lock.info
crash.log
override.tf
```

### 4. Lambda Deployment Packages
```
*.zip (all zip files except specific exceptions)
function.zip
**/function.zip
backend/**/*.zip
lambda-*.zip
```

### 5. Temporary and Test Files
```
test-*.json
*-response.json
*-payload.json
update-word.json
today-word.json
debug-*.json
mock-*.json
*.tmp
*.temp
*.tmp.ps1
*.backup.ps1
```

### 6. IDE and OS Files
```
.vscode/
.idea/
.DS_Store
Thumbs.db
Desktop.ini
*.swp
*.swo
*~
```

### 7. Logs
```
logs/
*.log
*.log.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### 8. Mobile Platform Specific
```
# iOS
xcuserdata
*.xccheckout
DerivedData
*.ipa
*.xcuserstate

# Android
.gradle
local.properties
*.iml
*.hprof
.cxx/
*.keystore (except debug.keystore)
```

## What's Tracked (NOT Ignored)

### ✅ Source Code
- All `.ts`, `.tsx`, `.js`, `.jsx` files
- `package.json`, `tsconfig.json`, `babel.config.js`
- `app.json`, `eas.json`

### ✅ Configuration Templates
- `terraform.tfvars.example`
- `aws-credentials-template.json`

### ✅ Documentation
- All `*.md` files:
  - `README.md`
  - `ARCHITECTURE_FLOW_DIAGRAM.md`
  - `BACKEND_ERROR_HANDLING_IMPROVEMENTS.md`
  - `GOOGLE_OAUTH_SETUP.md`
  - `HISTORY_FEATURE_ENHANCEMENT.md`
  - `TERRAFORM_FIXES_SUMMARY.md`
  - `USER_NAME_DISPLAY_FIX.md`
  - And all other documentation

### ✅ Scripts
- `scripts/*.ps1` (PowerShell deployment scripts)
- `scripts/README.md`

### ✅ Terraform Infrastructure Code
- All `.tf` files
- `modules/**/*.tf`
- `terraform.tfvars.example` (template)

### ✅ Backend Lambda Functions
- `backend/src/**/*.js` (Lambda source code)
- `backend/src/**/package.json`
- Layer dependencies definition (not the zip)

### ✅ Assets and Static Files
- Images, icons, fonts
- Static configuration files

## Important Notes

### 🔒 Secrets and Credentials
**NEVER commit:**
- `terraform/terraform.tfvars` (contains Google OAuth secrets, AWS credentials)
- Any file with "secret" or "credentials" in the name
- `.env` files with API keys
- AWS credential files

### 📦 Binary and Generated Files
**Don't commit:**
- `node_modules/` (too large, regenerated from package.json)
- Build outputs (`dist/`, `web-build/`)
- Compiled binaries
- Lambda deployment zip files

### 📝 Documentation
**Always commit:**
- All markdown documentation
- README files
- Architecture diagrams
- Setup guides
- Feature documentation

## Verification

### Check what's ignored:
```bash
git status --ignored
```

### Check what would be committed:
```bash
git add --dry-run .
```

### See all tracked files:
```bash
git ls-files
```

## Security Best Practices

### ✅ Safe to Commit:
- Source code
- Documentation
- Configuration templates
- Infrastructure as code (.tf files)
- Deployment scripts
- Example/template files

### ❌ NEVER Commit:
- API keys and secrets
- AWS credentials
- Private keys
- Passwords
- OAuth client secrets
- Database credentials
- Any `.tfvars` file (use .example instead)

## Template Files

For sensitive configuration, always:
1. Create a template file (e.g., `terraform.tfvars.example`)
2. Add the template to git
3. Ignore the actual file (e.g., `terraform.tfvars`)
4. Document required values in README

### Example:
```hcl
# terraform.tfvars.example
google_client_id = "YOUR_GOOGLE_CLIENT_ID_HERE"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET_HERE"
ses_sender_email = "your-email@example.com"
```

## Common Mistakes to Avoid

### ❌ Don't Do:
```bash
git add terraform/terraform.tfvars  # Contains secrets!
git add .env  # Contains API keys!
git add *.zip  # Large binary files
```

### ✅ Do Instead:
```bash
git add terraform/terraform.tfvars.example  # Template only
git add .env.example  # Template only
# Never add zip files - they're regenerated during deployment
```

## Maintenance

### Updating .gitignore:
1. Add new patterns as needed
2. Test with `git status --ignored`
3. Commit the .gitignore changes
4. Document any non-obvious exclusions

### If Secrets Were Committed:
1. **IMMEDIATELY** rotate all secrets
2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
3. Update .gitignore to prevent future commits
4. Force push (if safe): `git push --force`

## Current Status
✅ .gitignore properly configured
✅ Secrets excluded
✅ Documentation included
✅ Temporary files excluded
✅ Source code tracked
✅ Ready for version control

