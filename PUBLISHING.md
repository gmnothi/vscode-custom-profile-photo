# Publishing to the VS Code Marketplace

The repository and the Marketplace listing are separate. This project is configured for publisher ID `GurmanOthi` (display name Gurman Othi). Changing the publisher changes the extension ID, so the Marketplace release installs alongside the local build; reset/uninstall the local build first to avoid duplicate commands.

1. Sign in at https://marketplace.visualstudio.com/manage with your Microsoft account and create a publisher. Choose its permanent ID carefully (for example, `gmnothi`, if available).
2. In this folder, set the actual publisher ID:

   ```sh
   npm pkg set publisher=YOUR_PUBLISHER_ID
   ```

3. Run the checks and build a standard VSIX:

   ```sh
   npm ci
   npm run check
   npm run package
   ```

4. On the publisher management page, choose **New extension → Visual Studio Code**, upload `custom-profile-photo-0.1.1.vsix`, review the listing, and submit it. This manual upload route does not require putting a publisher token into this repository.
5. For later versions, bump `package.json` (for example, `npm version patch`), rebuild, and upload the new VSIX to the existing listing.

Before submitting, verify the cropper, Apply, Reset, and Reapply in a real Extension Development Host. The current automated checks exercise saved-photo persistence and CSS configuration with mocked VS Code APIs; they do not establish live compatibility across VS Code releases. Add a demo screenshot that contains no private source, accounts, or photos you do not intend to publish. The README must continue to disclose the Custom CSS dependency, application patching, integrity warnings, and reapply requirement.

For CLI publishing later, follow Microsoft's current guide for creating an Azure DevOps PAT with the Marketplace Manage scope, then use `npx vsce login YOUR_PUBLISHER_ID` and `npx vsce publish`. Never commit a PAT or paste it into an issue.

Official instructions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
