# Publishing Mosaic to the VS Code Marketplace

This guide explains how to package and publish the Mosaic extension to the Visual Studio Code Marketplace.

## Prerequisites

1. **Publisher Account**: You need a publisher account on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage).
   - Our current publisher ID is: `Methil`
2. **Personal Access Token (PAT)**: You must create a PAT in Azure DevOps to authenticate `vsce`.
   - Go to [Azure DevOps](https://dev.azure.com/) -> User Settings -> Personal Access Tokens.
   - Select **All accessible organizations**.
   - Set the scope to **Marketplace -> Publish**.
3. **Install VSCE**: Install the Visual Studio Code Extension Manager globally.
   ```bash
   npm install -g @vscode/vsce
   ```

## Step 1: Login

Authenticate your local machine with your publisher and PAT.
```bash
vsce login Methil
```
Enter your PAT when prompted.

## Step 2: Verification

Before packaging, ensure the extension builds correctly and passes linting.
```bash
npm run compile
npm run lint
```

## Step 3: Versioning

Update the version in `package.json` following [SemVer](https://semver.org/) rules.
You can use `vsce` to bump the version and create a git tag:
```bash
vsce publish patch # 0.1.0 -> 0.1.1
# OR
vsce publish minor # 0.1.0 -> 0.2.0
```

## Step 4: Packaging

If you want to create a `.vsix` file for local testing or manual upload:
```bash
vsce package
```
This generates `mosaic-vscode-X.X.X.vsix`.

## Step 5: Publishing

To publish directly to the Marketplace:
```bash
vsce publish
```

### Important Notes:
- **README**: Ensure `README.md` is updated as it will be the extension's landing page.
- **Icons**: The extension icon is located at `assets/icon.png`.
- **Pre-publish Script**: The `vscode:prepublish` script in `package.json` automatically runs `npm run compile` during packaging.
