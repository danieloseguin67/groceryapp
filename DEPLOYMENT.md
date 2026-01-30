# GitHub Pages Deployment

Your Grocery Manager app is configured for GitHub Pages deployment.

## Setup Steps

1. **Install deployment dependency:**
   ```bash
   npm install
   ```

2. **Create GitHub repository** (if not already created):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/groceryManager.git
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Build and deployment", select Source: **GitHub Actions**

## Deployment Options

### Option 1: Automatic Deployment (Recommended)
The GitHub Actions workflow will automatically deploy when you push to the main branch:
```bash
git add .
git commit -m "Your changes"
git push
```

### Option 2: Manual Deployment
Deploy directly from your local machine:
```bash
npm run deploy
```

## After Deployment

Your app will be available at:
```
https://YOUR-USERNAME.github.io/groceryManager/
```

## Important Notes

⚠️ **Save Functionality:** The save feature requires a backend server which won't work on GitHub Pages (static hosting). Consider:
- Removing the save functionality for the deployed version
- Using browser localStorage instead
- Deploying the backend separately (e.g., Heroku, Railway, Vercel)

## Build Configuration

- Base href is set to `/groceryManager/` in [package.json](package.json)
- Production build outputs to `dist/grocery-manager/browser`
- GitHub Actions workflow is in [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
