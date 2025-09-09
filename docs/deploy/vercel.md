# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the Five Cucumbers multi-game web application to Vercel, with specific focus on avoiding the common `/apps/hub/apps/hub/.next/routes-manifest.json` error.

## Prerequisites

- GitHub repository with the Five Cucumbers project
- Vercel account linked to your GitHub
- Node.js 18+ and pnpm installed locally

## Recommended Vercel Configuration

### Method 1: Root Directory = `apps/hub` (Recommended)

This is the **preferred method** for monorepo deployments:

1. **Import Project**:
   - Go to [vercel.com](https://vercel.com) and click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

2. **Configure Settings**:
   - **Framework Preset**: `Next.js` (auto-detected)
   - **Root Directory**: `apps/hub`
   - **Build Command**: *(leave empty - uses default `next build`)*
   - **Output Directory**: *(leave empty - uses default `.next`)*
   - **Install Command**: *(leave empty - uses default `npm install`)*

3. **Environment Variables**:
   - Add all `NEXT_PUBLIC_*` variables from `env.example`
   - Set Firebase configuration variables

4. **Advanced Settings**:
   - ✅ **Include source files outside of the Root Directory**: ON
   - ✅ **Build Cache**: Clear cache before deploying

5. **Deploy**: Click "Deploy"

### Method 2: Root Directory = `.` (Alternative)

If Method 1 doesn't work, try this alternative:

1. **Configure Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `.` (repository root)
   - **Build Command**: `pnpm dlx turbo run build --filter=./apps/hub`
   - **Output Directory**: `apps/hub/.next`
   - **Install Command**: `pnpm install --frozen-lockfile`

2. **Environment Variables**: Same as Method 1

3. **Deploy**: Click "Deploy"

## Local Verification

Before deploying, verify your build locally:

```bash
# Navigate to the project root
cd /path/to/Five_Cucumber

# Install dependencies
pnpm install

# Build the application
pnpm build

# Verify build output
pnpm vercel:check
```

The verification script will:
- ✅ Check for correct `.next` directory location
- ✅ Verify `routes-manifest.json` exists
- ✅ Detect double-path issues
- ✅ Validate build artifacts

## Troubleshooting

### Error: `/apps/hub/apps/hub/.next/routes-manifest.json` not found

This error indicates a **double-path issue**. Follow these steps:

1. **Remove Vercel Configuration Files**:
   ```bash
   # Remove any vercel.json files
   rm -f vercel.json
   rm -f apps/hub/vercel.json
   ```

2. **Clear Vercel Cache**:
   - In Vercel dashboard, go to Project Settings
   - Navigate to "Functions" tab
   - Click "Clear Build Cache"

3. **Check Next.js Configuration**:
   - Ensure `apps/hub/next.config.js` doesn't have `distDir` specified
   - Verify no custom output directory configuration

4. **Verify Local Build**:
   ```bash
   cd apps/hub
   pnpm build
   ls -la .next/routes-manifest.json  # Should exist
   ```

5. **Re-deploy with Correct Settings**:
   - Use Method 1 configuration above
   - Ensure "Include source files outside of the Root Directory" is ON

### Build Failures

1. **Check Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Verify TypeScript**:
   ```bash
   pnpm type-check
   ```

3. **Check Linting**:
   ```bash
   pnpm lint
   ```

### Environment Variables Issues

1. **Verify All Required Variables**:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

2. **Check Variable Names**: Ensure they match exactly (case-sensitive)

## Post-Deployment Verification

After successful deployment:

1. **Test Application**:
   - Visit the deployed URL
   - Verify all pages load correctly
   - Test game functionality
   - Check responsive design

2. **Monitor Logs**:
   - Check Vercel Function logs for errors
   - Monitor build logs for warnings

3. **Performance Check**:
   - Use Lighthouse to audit performance
   - Verify Core Web Vitals

## CI/CD Integration

The project includes GitHub Actions for automated testing:

- **Test Job**: Runs on every push/PR
- **E2E Job**: Runs Playwright tests
- **Deploy Job**: Deploys to Firebase (if configured)

To add Vercel deployment to CI:

```yaml
# Add to .github/workflows/ci.yml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
    working-directory: apps/hub
```

## Best Practices

1. **Always test locally** before deploying
2. **Use environment variables** for configuration
3. **Monitor build logs** for warnings
4. **Keep dependencies updated**
5. **Use semantic versioning** for releases

## Support

If you encounter issues:

1. Check the [Vercel Documentation](https://vercel.com/docs)
2. Review the [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
3. Check project issues on GitHub
4. Run `pnpm vercel:check` for local diagnostics

## File Structure Reference

```
Five_Cucumber/
├── apps/
│   └── hub/                 # Next.js app (Vercel Root Directory)
│       ├── .next/           # Build output (auto-generated)
│       ├── app/             # App Router pages
│       ├── components/      # React components
│       ├── lib/             # Utilities
│       ├── providers/       # Context providers
│       └── next.config.js   # Next.js configuration
├── packages/                # Shared packages
├── games/                   # Game modules
├── tooling/                 # Build tools
│   └── check-next-output.cjs # Verification script
└── docs/
    └── deploy/
        └── vercel.md        # This file
```
