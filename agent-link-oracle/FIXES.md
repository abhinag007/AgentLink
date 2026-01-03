# Bug Fixes & Solutions

## ES Module `__dirname` Issue (v2.0.1)

### Problem
```
ReferenceError: __dirname is not defined in ES module scope
```

### Cause
The project uses `"type": "module"` in `package.json`, which enables ES modules. In ES modules, the CommonJS variables `__dirname` and `__filename` are not available.

### Solution
Added ES module equivalents using `fileURLToPath` and `import.meta.url`:

```typescript
import { fileURLToPath } from "url";
import path from "path";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Files Modified
- `src/config/blockchain.ts` - Added ES module `__dirname` polyfill

### Verification
```bash
npm run dev
# Should start successfully without errors
```

### Status
✅ **Fixed in v2.0.1**

---

## Future Considerations

### Alternative Approaches

1. **Use `import.meta.url` directly**
   ```typescript
   const idlPath = new URL('./idl.json', import.meta.url).pathname;
   ```

2. **Use relative paths from project root**
   ```typescript
   const idlPath = path.join(process.cwd(), 'src/config/idl.json');
   ```

3. **Convert to CommonJS** (not recommended)
   - Remove `"type": "module"` from package.json
   - Change all imports to `require()`
   - Less modern, not recommended for new projects

### Best Practice
The current solution (using `fileURLToPath` and `import.meta.url`) is the standard approach for ES modules and maintains compatibility while using modern JavaScript features.

---

## Testing Checklist

After any path-related changes, verify:

- [ ] `npm run dev` - Server starts without errors
- [ ] `npm run register` - Bot registration works
- [ ] `npm run manual-boost` - Manual boost works
- [ ] All file paths resolve correctly
- [ ] IDL file is loaded successfully
- [ ] No console errors or warnings

---

## Related Documentation

- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [import.meta.url](https://nodejs.org/api/esm.html#importmetaurl)
- [fileURLToPath](https://nodejs.org/api/url.html#urlfileurltopathurl)

