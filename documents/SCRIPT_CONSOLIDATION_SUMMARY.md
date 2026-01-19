# Script Consolidation Summary

## Date: November 12, 2025

## Overview

All PowerShell deployment scripts have been consolidated into a **single unified script**: `scripts/deploy.ps1`

This provides a consistent, maintainable, and easy-to-use interface for all deployment operations.

---

## What Changed

### Before (Multiple Scripts)

```
scripts/
├── deploy-all.ps1
├── deploy-web.ps1
├── redeploy-lambda.ps1
├── quick-fix-and-deploy.ps1
├── force-deploy-lambda.ps1
├── cleanup-user.ps1
├── check-logs.ps1
├── check-logs-recent.ps1
├── get-web-url.ps1
├── fix-and-deploy-now.ps1
├── diagnose-502.ps1
├── fix-502.ps1
└── fix-s3-permissions.ps1
```

**Problem:** Too many scripts to remember and maintain.

### After (Single Script)

```
scripts/
└── deploy.ps1  ← One script for everything
```

**Solution:** All functionality in one place with action-based commands.

---

## Migration Guide

### Quick Reference Table

| Old Command | New Command |
|------------|-------------|
| `.\scripts\deploy-all.ps1` | `.\scripts\deploy.ps1 -Action full` |
| `.\scripts\deploy-web.ps1` | `.\scripts\deploy.ps1 -Action web` |
| `.\scripts\redeploy-lambda.ps1` | `.\scripts\deploy.ps1 -Action lambda` |
| `.\scripts\quick-fix-and-deploy.ps1` | `.\scripts\deploy.ps1 -Action quick` |
| `.\scripts\force-deploy-lambda.ps1` | `.\scripts\deploy.ps1 -Action force-lambda` |
| `.\scripts\cleanup-user.ps1 -Email "user@example.com"` | `.\scripts\deploy.ps1 -Action cleanup-user -Email "user@example.com"` |
| `.\scripts\check-logs.ps1` | `.\scripts\deploy.ps1 -Action logs` |
| `.\scripts\get-web-url.ps1` | `.\scripts\deploy.ps1 -Action urls` |
| N/A (manual process) | `.\scripts\deploy.ps1 -Action status` |

---

## Examples

### Example 1: Full Deployment

**Before:**
```powershell
.\scripts\deploy-all.ps1
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action full
```

---

### Example 2: Quick Deploy

**Before:**
```powershell
.\scripts\quick-fix-and-deploy.ps1
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action quick
```

---

### Example 3: Web Only

**Before:**
```powershell
.\scripts\deploy-web.ps1 -UseTerraform
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action web
```

---

### Example 4: Lambda Only

**Before:**
```powershell
.\scripts\redeploy-lambda.ps1
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action lambda
```

---

### Example 5: Check Logs

**Before:**
```powershell
.\scripts\check-logs.ps1
```

**After:**
```powershell
# All functions
.\scripts\deploy.ps1 -Action logs

# Specific function
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

---

### Example 6: User Cleanup

**Before:**
```powershell
.\scripts\cleanup-user.ps1 -Email "test@example.com"
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action cleanup-user -Email "test@example.com"
```

---

### Example 7: Get URLs

**Before:**
```powershell
.\scripts\get-web-url.ps1
```

**After:**
```powershell
.\scripts\deploy.ps1 -Action urls
```

---

### Example 8: Check Status (NEW!)

**Before:** N/A (had to manually check each component)

**After:**
```powershell
.\scripts\deploy.ps1 -Action status
```

---

## New Features

### 1. **Unified Help System**

```powershell
# Show help
.\scripts\deploy.ps1 -Action help

# Detailed PowerShell help
Get-Help .\scripts\deploy.ps1 -Detailed

# Examples
Get-Help .\scripts\deploy.ps1 -Examples
```

### 2. **Status Checking**

```powershell
# Check what's deployed
.\scripts\deploy.ps1 -Action status
```

Shows:
- ✅ Infrastructure status (API Gateway, Cognito, etc.)
- ✅ Lambda function status and last modified times
- ✅ S3 and CloudFront configuration
- ✅ Secrets configuration

### 3. **Consistent Error Handling**

All actions now have:
- ✅ Colored output (success = green, warning = yellow, error = red)
- ✅ Clear error messages
- ✅ Progress tracking
- ✅ Rollback hints on failure

### 4. **Better Logging Output**

```powershell
# Old: check-logs.ps1 showed all functions always
# New: Can filter by specific function
.\scripts\deploy.ps1 -Action logs -Function user-preferences
```

### 5. **Common Options Across All Actions**

```powershell
# Auto-approve (skip prompts)
.\scripts\deploy.ps1 -Action full -AutoApprove

# Skip build (faster web deploy)
.\scripts\deploy.ps1 -Action web -SkipBuild

# Skip tests
.\scripts\deploy.ps1 -Action full -SkipTests

# Specify environment
.\scripts\deploy.ps1 -Action lambda -Environment staging
```

---

## Benefits

### For Developers

✅ **One command to remember** - Just `deploy.ps1 -Action <what>`  
✅ **Consistent interface** - Same options across all actions  
✅ **Better help** - Built-in documentation  
✅ **Faster** - Optimized workflows  
✅ **Safer** - Validation and error checking  

### For Maintenance

✅ **Single file** - One script to maintain and update  
✅ **Shared functions** - Common code reused across actions  
✅ **Easier testing** - Test one script instead of many  
✅ **Better documentation** - All usage info in one place  
✅ **Version control** - Track changes to one file  

### For Teams

✅ **Easier onboarding** - New team members learn one script  
✅ **Consistent workflows** - Everyone uses same commands  
✅ **Less confusion** - No "which script should I use?"  
✅ **Better documentation** - Single source of truth  

---

## Backward Compatibility

### Old Scripts Still Work (for now)

The old scripts are **deprecated but not removed**. They still work for backward compatibility.

However, we **strongly recommend** migrating to the new unified script.

### Migration Timeline

- **Phase 1 (Now):** New script available, old scripts deprecated
- **Phase 2 (2 weeks):** Add deprecation warnings to old scripts
- **Phase 3 (1 month):** Consider removing old scripts (team decision)

---

## What to Update

### 1. Update Your Bookmarks/Aliases

```powershell
# Old bookmark
alias deploy-web='.\scripts\deploy-web.ps1'

# New bookmark
alias deploy='.\scripts\deploy.ps1'
alias deploy-web='.\scripts\deploy.ps1 -Action web'
alias deploy-quick='.\scripts\deploy.ps1 -Action quick'
```

### 2. Update Your Documentation

Search your docs for references to old scripts and update them.

**Example search terms:**
- `deploy-all.ps1`
- `deploy-web.ps1`
- `quick-fix-and-deploy.ps1`
- `redeploy-lambda.ps1`

### 3. Update Your CI/CD Pipelines

If you have any automated deployments, update them:

```yaml
# Old
- run: .\scripts\deploy-all.ps1 -AutoApprove

# New
- run: .\scripts\deploy.ps1 -Action full -AutoApprove
```

### 4. Update Your README Files

Update any project READMEs that reference old scripts.

---

## Testing the New Script

### Test All Actions

```powershell
# 1. Check help
.\scripts\deploy.ps1 -Action help

# 2. Check status
.\scripts\deploy.ps1 -Action status

# 3. Show URLs
.\scripts\deploy.ps1 -Action urls

# 4. Check logs
.\scripts\deploy.ps1 -Action logs

# 5. Deploy (if ready)
.\scripts\deploy.ps1 -Action quick
```

---

## Files Created

### New Files

1. **`scripts/deploy.ps1`** - The unified deployment script
2. **`DEPLOYMENT_GUIDE.md`** - Complete user guide
3. **`scripts/README.md`** - Scripts directory overview
4. **`SCRIPT_CONSOLIDATION_SUMMARY.md`** - This document

### Modified Files

None (all old scripts remain untouched for backward compatibility)

---

## Quick Start for New Users

```powershell
# First time? Start here:

# 1. See what actions are available
.\scripts\deploy.ps1 -Action help

# 2. Check current deployment status
.\scripts\deploy.ps1 -Action status

# 3. Deploy everything (first time)
.\scripts\deploy.ps1 -Action full

# 4. Or just quick deploy (after code changes)
.\scripts\deploy.ps1 -Action quick

# 5. Get your web app URL
.\scripts\deploy.ps1 -Action urls
```

---

## Support & Documentation

### Main Documentation

- **`DEPLOYMENT_GUIDE.md`** - Complete deployment guide
- **`scripts/README.md`** - Scripts overview
- **`ARCHITECTURE_FLOW_DIAGRAM.md`** - System architecture

### Get Help

```powershell
# In-script help
.\scripts\deploy.ps1 -Action help

# PowerShell help system
Get-Help .\scripts\deploy.ps1 -Full
```

### Common Questions

**Q: Can I still use the old scripts?**  
A: Yes, they still work. But we recommend migrating to the new script.

**Q: Will the old scripts be removed?**  
A: Not immediately. We'll give advance notice if we decide to remove them.

**Q: What if I find a bug?**  
A: The new script has the same functionality as the old scripts, just consolidated. If you find an issue, use the old script temporarily and report the bug.

**Q: Can I customize the script?**  
A: Yes! The script is well-documented with clear sections. You can modify it or add new actions.

---

## Summary

✅ **All deployment scripts consolidated into `scripts/deploy.ps1`**  
✅ **Consistent, easy-to-use interface**  
✅ **Comprehensive documentation**  
✅ **Backward compatible** (old scripts still work)  
✅ **Better error handling and progress tracking**  
✅ **New features**: status checking, filtered logs, help system  

---

**Start using the new script today!**

```powershell
.\scripts\deploy.ps1 -Action help
```

