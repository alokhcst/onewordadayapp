# Scripts Directory

## 🎯 Unified Deployment Script

**All deployment tasks are now consolidated into a single script:**

```powershell
.\scripts\deploy.ps1 -Action <action>
```

See **`../DEPLOYMENT_GUIDE.md`** for complete documentation.

---

## Quick Commands

### Most Common Operations

```powershell
# Complete deployment
.\scripts\deploy.ps1 -Action full

# Quick redeploy after code changes (Lambda + Web)
.\scripts\deploy.ps1 -Action quick

# Deploy web app only
.\scripts\deploy.ps1 -Action web

# Deploy Lambda functions only
.\scripts\deploy.ps1 -Action lambda

# Check deployment status
.\scripts\deploy.ps1 -Action status

# View web app URLs
.\scripts\deploy.ps1 -Action urls

# Check Lambda logs
.\scripts\deploy.ps1 -Action logs

# Remove a test user
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"

# Show help
.\scripts\deploy.ps1 -Action help
```

---

## 📋 All Available Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `full` | Complete deployment (infra + backend + frontend) | First-time setup, major changes |
| `quick` | Quick deploy (Lambda + Web) | Daily development |
| `infra` | Infrastructure only (Terraform) | Infrastructure updates |
| `lambda` | Lambda functions only | Backend code changes |
| `web` | Web app only | Frontend code changes |
| `force-lambda` | Force Lambda deploy (bypass Terraform) | Emergency fixes |
| `cleanup-user` | Remove user from Cognito + DynamoDB | User cleanup |
| `logs` | Check Lambda function logs | Debugging |
| `urls` | Show web app URLs | Get deployment URLs |
| `status` | Show deployment status | Verify deployment |
| `help` | Show help message | Get usage info |

---

## 🗂️ Script Inventory

### ✅ Active Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| **`deploy.ps1`** | **Unified deployment script** | **✅ USE THIS** |
| `fix-secret.ps1` | Configure AWS Secrets Manager | ✅ Active (utility) |
| `request-ssl-certificate.ps1` | Request ACM SSL certificate | ✅ Active (utility) |
| `setup-custom-domain.ps1` | Setup custom domain | ✅ Active (utility) |
| `add-dns-record.ps1` | Add Route 53 DNS records | ✅ Active (utility) |
| `populate-word-bank.ps1` | Populate word bank in DynamoDB | ✅ Active (utility) |
| `reset-project.js` | Reset project state | ✅ Active (utility) |

### ⚠️ Deprecated Scripts (Use `deploy.ps1` Instead)

The following scripts are **deprecated** and replaced by `deploy.ps1`:

| Old Script | Replacement Command |
|-----------|---------------------|
| ~~`deploy-all.ps1`~~ | `.\scripts\deploy.ps1 -Action full` |
| ~~`deploy-web.ps1`~~ | `.\scripts\deploy.ps1 -Action web` |
| ~~`redeploy-lambda.ps1`~~ | `.\scripts\deploy.ps1 -Action lambda` |
| ~~`quick-fix-and-deploy.ps1`~~ | `.\scripts\deploy.ps1 -Action quick` |
| ~~`force-deploy-lambda.ps1`~~ | `.\scripts\deploy.ps1 -Action force-lambda` |
| ~~`cleanup-user.ps1`~~ | `.\scripts\deploy.ps1 -Action cleanup-user -Email <email>` |
| ~~`check-logs.ps1`~~ | `.\scripts\deploy.ps1 -Action logs` |
| ~~`check-logs-recent.ps1`~~ | `.\scripts\deploy.ps1 -Action logs` |
| ~~`get-web-url.ps1`~~ | `.\scripts\deploy.ps1 -Action urls` |
| ~~`fix-and-deploy-now.ps1`~~ | `.\scripts\deploy.ps1 -Action quick` |
| ~~`fix-s3-permissions.ps1`~~ | Handled automatically by Terraform |
| ~~`fix-502.ps1`~~ | `.\scripts\deploy.ps1 -Action logs` (for debugging) |
| ~~`diagnose-502.ps1`~~ | `.\scripts\deploy.ps1 -Action status` + `logs` |

### 🔧 Utility Scripts (Still Active)

These specialized utility scripts remain available:

| Script | Purpose |
|--------|---------|
| `fix-secret.ps1` | Configure LLM API keys in AWS Secrets Manager |
| `request-ssl-certificate.ps1` | Request SSL certificate from AWS ACM |
| `setup-custom-domain.ps1` | Interactive custom domain setup |
| `add-dns-record.ps1` | Add DNS CNAME records to Route 53 |
| `populate-word-bank.ps1` | Bulk import words into DynamoDB |
| `populate-word-bank.js` | Node.js version of word bank import |
| `reset-project.js` | Reset project to clean state |
| `deploy-esm.ps1` | Deploy Lambda with ESM modules |
| `rebuild-layer-esm.ps1` | Rebuild Lambda layer for ESM |
| `rebuild-layer.ps1` | Rebuild Lambda layer for CommonJS |
| `test-get-todays-word.ps1` | Test get-todays-word Lambda function |

### 📜 Legacy Scripts (Bash)

| Script | Note |
|--------|------|
| `deploy.sh` | Legacy bash script (use PowerShell version) |
| `destroy.sh` | Legacy bash script (use Terraform directly) |

---

## 🚀 Quick Start

### First Time Setup

```powershell
# 1. Configure Terraform variables
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
# Edit terraform.tfvars with your values

# 2. Deploy everything
.\scripts\deploy.ps1 -Action full

# 3. Get your web app URL
.\scripts\deploy.ps1 -Action urls
```

### Daily Development

```powershell
# Make code changes, then:
.\scripts\deploy.ps1 -Action quick

# Clear browser cache (Ctrl+Shift+R) and test
```

### Debugging

```powershell
# Check what's deployed
.\scripts\deploy.ps1 -Action status

# Check Lambda logs
.\scripts\deploy.ps1 -Action logs -Function user-preferences

# Clean up test user
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"
```

---

## 📚 Documentation

- **`../DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`../ARCHITECTURE_FLOW_DIAGRAM.md`** - System architecture
- **`../CHANGES_SUMMARY.md`** - Recent changes and fixes
- **`../SQUARESPACE_QUICKSTART.md`** - Custom domain setup

---

## ❓ Need Help?

```powershell
# Show help message
.\scripts\deploy.ps1 -Action help

# Show detailed help
Get-Help .\scripts\deploy.ps1 -Detailed

# Show examples
Get-Help .\scripts\deploy.ps1 -Examples
```

---

## 🔄 Migration from Old Scripts

If you have existing scripts or documentation referencing old script names, use this mapping:

```powershell
# Old way
.\scripts\deploy-all.ps1

# New way
.\scripts\deploy.ps1 -Action full
```

```powershell
# Old way
.\scripts\quick-fix-and-deploy.ps1

# New way
.\scripts\deploy.ps1 -Action quick
```

```powershell
# Old way
.\scripts\cleanup-user.ps1 -Email "user@example.com"

# New way
.\scripts\deploy.ps1 -Action cleanup-user -Email "user@example.com"
```

All old scripts still work (for backward compatibility), but **we recommend using the new unified script**.

---

## ✅ Benefits of Unified Script

- **Single command** - One script to learn
- **Consistent** - Same options across all actions
- **Comprehensive** - All deployment tasks in one place
- **Validated** - Built-in checks and error handling
- **Documented** - Extensive help and examples
- **Colored output** - Easy to read status messages
- **Progress tracking** - Clear feedback at each step

---

## 🎯 Next Steps

1. **Read the full guide**: See `../DEPLOYMENT_GUIDE.md`
2. **Try it out**: Run `.\scripts\deploy.ps1 -Action status`
3. **Update bookmarks**: Use `deploy.ps1` for all deployments
4. **Share with team**: Point them to this README

---

**✅ All deployment operations are now unified in `deploy.ps1`!**

