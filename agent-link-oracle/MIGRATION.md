# Migration Guide

## Migrating from Old Structure to New Structure

If you have the old flat structure and want to migrate to the new organized structure, follow these steps:

### Quick Migration (Automated)

```bash
# 1. Backup your current setup
cp -r agent-link-oracle agent-link-oracle-backup

# 2. Create new directory structure
mkdir -p src/config src/scripts src/server src/types

# 3. Move files to new locations
mv server.ts src/server/index.ts
mv register-bot.ts src/scripts/register-bot.ts
mv index.ts src/scripts/manual-boost.ts
mv idl.json src/config/idl.json

# 4. Update imports in all moved files
# (This is done automatically by the refactored code)
```

### Manual Migration Steps

#### Step 1: Create Directory Structure
```bash
mkdir -p src/config src/scripts src/server src/types
```

#### Step 2: Move Files
```bash
# Move server
mv server.ts src/server/index.ts

# Move scripts
mv register-bot.ts src/scripts/register-bot.ts
mv index.ts src/scripts/manual-boost.ts

# Move config
mv idl.json src/config/idl.json
```

#### Step 3: Update File Imports

In `src/server/index.ts`, `src/scripts/register-bot.ts`, and `src/scripts/manual-boost.ts`:

**Change:**
```typescript
const idlPath = path.resolve("./idl.json");
```

**To:**
```typescript
const idlPath = path.resolve(__dirname, "../config/idl.json");
```

#### Step 4: Update package.json

**Change:**
```json
{
  "scripts": {
    "start": "tsx server.ts",
    "manual-boost": "tsx index.ts",
    "register": "tsx register-bot.ts"
  }
}
```

**To:**
```json
{
  "scripts": {
    "start": "tsx src/server/index.ts",
    "dev": "tsx watch src/server/index.ts",
    "manual-boost": "tsx src/scripts/manual-boost.ts",
    "register": "tsx src/scripts/register-bot.ts"
  }
}
```

#### Step 5: Update tsconfig.json

**Add/Update:**
```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    // ... other options
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Step 6: Update .gitignore

**Add:**
```
# Build outputs
dist/
*.js
*.d.ts
*.js.map

# Environment
.env
.env.local

# IDE
.vscode/
.idea/

# Logs
logs/
*.log
```

### Verification

After migration, verify everything works:

```bash
# 1. Check if files are in correct locations
ls -la src/config/
ls -la src/scripts/
ls -la src/server/
ls -la src/types/

# 2. Test the scripts
npm run register    # Should work without errors
npm start          # Should start server on port 4000

# 3. Test the endpoints
curl http://localhost:4000/
curl -X POST http://localhost:4000/webhook/github
```

### Rollback (If Needed)

If something goes wrong:

```bash
# 1. Stop any running processes
# 2. Restore from backup
rm -rf agent-link-oracle
mv agent-link-oracle-backup agent-link-oracle
cd agent-link-oracle
```

### Common Issues After Migration

#### Issue: "Cannot find module"
**Cause**: Import paths not updated
**Solution**: Check all imports use relative paths with `../`

#### Issue: "IDL file not found"
**Cause**: IDL path not updated
**Solution**: Ensure path uses `__dirname` and `../config/idl.json`

#### Issue: Scripts don't run
**Cause**: package.json paths not updated
**Solution**: Update all script paths to include `src/`

### Benefits After Migration

✅ **Organized**: Clear folder structure
✅ **Maintainable**: Easy to find and update files
✅ **Scalable**: Ready for new features
✅ **Professional**: Follows best practices
✅ **Documented**: Comprehensive docs included

### Next Steps After Migration

1. Read `README.md` for usage instructions
2. Check `DEVELOPMENT.md` for development guide
3. Review `STRUCTURE.md` to understand architecture
4. Test all functionality thoroughly
5. Update any external references to old file paths

### Need Help?

If you encounter issues during migration:
1. Check the error messages carefully
2. Verify all file paths are correct
3. Ensure environment variables are set
4. Review the DEVELOPMENT.md guide
5. Check that all dependencies are installed

### Migration Checklist

- [ ] Backup current setup
- [ ] Create new directory structure
- [ ] Move all files to new locations
- [ ] Update imports in TypeScript files
- [ ] Update package.json scripts
- [ ] Update tsconfig.json
- [ ] Update .gitignore
- [ ] Test registration script
- [ ] Test server startup
- [ ] Test webhook endpoint
- [ ] Test manual boost script
- [ ] Verify Solana transactions work
- [ ] Update any documentation
- [ ] Commit changes to git

Congratulations! Your project is now properly organized! 🎉

