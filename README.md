# Custom Profile Photo

A local VS Code extension for choosing, cropping, and saving a photo for the Accounts icon. No server, uploads, runtime dependencies, or extra sidebar icons.

Run **Custom Profile Photo: Choose or Crop Photo** from the Command Palette. Choose a JPEG, PNG, or WebP, drag and zoom, then **Save and apply**. Follow the Custom CSS and JS extension's restart prompt. Arrow keys also move the crop.

The photo and generated CSS live in VS Code's extension global storage, outside the installed extension package. They survive normal restarts and extension upgrades. They are local to this computer; they are not uploaded or synced as photos. Reset removes this extension's CSS import, preserves other custom CSS, and keeps the last crop so Reapply can undo Reset.

## Compatibility

VS Code has no supported extension API for replacing the Accounts icon. This extension uses **Custom CSS and JS Loader** (`be5invis.vscode-custom-css`) to apply a small CSS override. It does not change your GitHub/Microsoft account picture, theme, or source files. The dependency patches VS Code's workbench and can trigger an installation-integrity warning; this extension does not suppress integrity checks. Workbench changes can break after VS Code updates. Your photo remains saved: run **Custom Profile Photo: Reapply Saved Photo** and restart when prompted. A notification reminds you after version changes. The VS Code application must be writable for the dependency to apply CSS.

Desktop VS Code only. No support for vscode.dev. The extension runs locally even in remote workspaces. Clearing extension storage or resetting all user data removes the saved crop. To uninstall cleanly, run **Reset to Default Icon**, restart, then uninstall. Do not delete other Custom CSS imports.

## Development

Run `npm ci`, then `npm run check` and `npm run package` to build a VSIX with the official VS Code packaging tool. Tests cover PNG validation, CSS targets, crop migration, save, reset, and persistence with mocked VS Code APIs. Live UI compatibility still needs manual verification. No personal images or migration backups are packaged.

See [PUBLISHING.md](PUBLISHING.md) for Marketplace setup and upload instructions.
