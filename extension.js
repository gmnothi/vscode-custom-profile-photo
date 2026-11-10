'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { decodePhoto, cssFor } = require('./core');

async function activate(context) {
  const avatar = vscode.Uri.joinPath(context.globalStorageUri, 'avatar.png');
  const css = vscode.Uri.joinPath(context.globalStorageUri, 'avatar.css');
  // User-data storage may use vscode-userdata:, but Custom CSS accepts file: URLs.
  const cssImport = vscode.Uri.file(css.fsPath).toString();
  const config = () => vscode.workspace.getConfiguration('vscode_custom_css');
  const readPhoto = async () => { try { return await vscode.workspace.fs.readFile(avatar); } catch { return undefined; } };
  const writePhoto = async png => {
    await vscode.workspace.fs.createDirectory(context.globalStorageUri);
    await vscode.workspace.fs.writeFile(avatar, png);
    await vscode.workspace.fs.writeFile(css, Buffer.from(cssFor(Buffer.from(png))));
  };
  async function registerCSS() {
    const imports = config().get('imports', []);
    const old = context.globalState.get('legacyImport');
    const next = imports.filter(x => x !== old && x !== css.toString() && x !== cssImport);
    next.push(cssImport);
    const changed = JSON.stringify(imports) !== JSON.stringify(next);
    if (changed) await config().update('imports', next, vscode.ConfigurationTarget.Global);
    return changed;
  }
  async function reloadCSS() {
    await vscode.commands.executeCommand('extension.updateCustomCSS');
    await context.globalState.update('lastApplyVersion', vscode.version);
  }
  async function apply() {
    const png = await readPhoto();
    if (!png) { await vscode.commands.executeCommand('customProfilePhoto.open'); return; }
    await writePhoto(png);
    await registerCSS();
    await reloadCSS();
  }
  async function reset() {
    const imports = config().get('imports', []);
    const old = context.globalState.get('legacyImport');
    await config().update('imports', imports.filter(x => x !== css.toString() && x !== cssImport && x !== old), vscode.ConfigurationTarget.Global);
    // Keep the saved crop available so Reset can be undone with Reapply.
    await context.globalState.update('enabled', false);
    await reloadCSS();
  }
  let panel;
  async function open() {
    if (panel) { panel.reveal(); return; }
    panel = vscode.window.createWebviewPanel('customProfilePhoto', 'Your Profile Photo', vscode.ViewColumn.Active, {
      enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    });
    const current = panel;
    const nonce = crypto.randomBytes(18).toString('base64');
    const html = await fs.readFile(vscode.Uri.joinPath(context.extensionUri, 'media', 'cropper.html').fsPath, 'utf8');
    current.webview.html = html.replaceAll('NONCE', nonce);
    let busy = false;
    current.onDidDispose(() => { panel = undefined; }, null, context.subscriptions);
    current.webview.onDidReceiveMessage(async message => {
      if (!message || busy) return;
      try {
        if (message.type === 'ready') {
          const png = await readPhoto();
          if (png) await current.webview.postMessage({ type:'photo', data:'data:image/png;base64,'+Buffer.from(png).toString('base64') });
        } else if (message.type === 'save') {
          busy = true;
          const png = decodePhoto(message.data);
          await writePhoto(png);
          await registerCSS();
          await context.globalState.update('enabled', true);
          await current.webview.postMessage({ type:'saved' });
          await reloadCSS();
        }
      } catch (error) {
        await current.webview.postMessage({ type:'error', message:error.message });
        vscode.window.showErrorMessage('Custom Profile Photo: '+error.message);
      } finally { busy = false; }
    }, null, context.subscriptions);
  }
  const guard = fn => async () => { try { await fn(); } catch(e) { vscode.window.showErrorMessage('Custom Profile Photo: '+e.message); } };
  context.subscriptions.push(
    vscode.commands.registerCommand('customProfilePhoto.open', guard(open)),
    vscode.commands.registerCommand('customProfilePhoto.apply', guard(async()=> { await context.globalState.update('enabled', true); await apply(); })),
    vscode.commands.registerCommand('customProfilePhoto.reset', guard(reset))
  );
  // Migrate the earlier local crop without including any personal image in the VSIX.
  if (!await readPhoto()) {
    const legacy = config().get('imports', []).find(x => typeof x === 'string' && /\/vscode-avatar\/avatar\.css$/.test(x));
    if (legacy) {
      try {
        const text = await fs.readFile(vscode.Uri.parse(legacy).fsPath, 'utf8');
        const data = text.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
        if (data) {
          await writePhoto(decodePhoto(data[0]));
          await context.globalState.update('legacyImport', legacy);
          await context.globalState.update('enabled', true);
          await registerCSS();
        }
      } catch(e) { console.warn('Custom Profile Photo migration:', e.message); }
    }
  }
  if (await readPhoto() && context.globalState.get('enabled') !== false) {
    const repaired = await registerCSS();
    if (repaired) {
      await reloadCSS();
      return;
    }
    const version = context.globalState.get('lastNotifiedVersion');
    if (version !== vscode.version) {
      await context.globalState.update('lastNotifiedVersion', vscode.version);
      vscode.window.showInformationMessage('Your profile photo is saved. After a VS Code update, use Reapply to restore it if needed.', 'Reapply', 'Open Cropper').then(choice => {
        if (choice === 'Reapply') return guard(apply)();
        if (choice === 'Open Cropper') return guard(open)();
      });
    }
  }
}
module.exports = { activate };
