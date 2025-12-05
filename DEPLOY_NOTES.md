# Deployment Notes

## Target Vercel Account
**Account URL**: [vercel.com/paralela49-6983](https://vercel.com/paralela49-6983)

## Deployment Instructions

Since the deployment is triggered via GitHub, the connection is managed in the **Vercel Dashboard**.

1. **Log in** to the correct Vercel account (`paralela49-6983`).
2. **Import Project**:
   - Go to "Add New..." -> "Project".
   - Select the GitHub repository.
   - Ensure the Vercel Team/Scope selected in the top left is `paralela49-6983`.
3. **Verify Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Environment Variables**:
   - Ensure any required env vars (like encryption keys, if any) are added here.

## Troubleshooting
If the bot deploys to the wrong account again:
1. Disconnect the repository from the *wrong* Vercel account (Settings -> Git -> Disconnect).
2. Re-connect it from the dashboard of `paralela49-6983`.
