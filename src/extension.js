const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const THEME_LABELS = [
  {
    label: 'ThemePilot: IDEA Dark (New UI)',
    description: 'Modern IntelliJ IDEA New UI dark palette (#1E1F22)',
  },
  {
    label: 'ThemePilot: IDEA Darcula (Classic)',
    description: 'Classic IntelliJ Darcula dark palette (#2B2B2B)',
  },
  {
    label: 'ThemePilot: IDEA Light',
    description: 'Crisp IntelliJ Light palette (#FFFFFF)',
  },
];

function hasJetBrainsMonoInstalled() {
  const dirs =
    process.platform === 'darwin'
      ? [
          path.join(os.homedir(), 'Library', 'Fonts'),
          '/Library/Fonts',
          '/System/Library/Fonts',
        ]
      : process.platform === 'win32'
        ? [
            path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts'),
            'C:\\Windows\\Fonts',
          ]
        : [
            path.join(os.homedir(), '.local', 'share', 'fonts'),
            '/usr/share/fonts',
            '/usr/local/share/fonts',
          ];

  for (const dir of dirs) {
    try {
      const entries = fs.readdirSync(dir);
      if (entries.some((f) => /jetbrains\s*mono/i.test(f))) return true;
    } catch {
      // ignore missing dirs
    }
  }
  return false;
}

function installBundledFonts(extensionPath) {
  const bundledDir = path.join(extensionPath, 'fonts');
  let ttfFiles = [];
  try {
    ttfFiles = fs.readdirSync(bundledDir).filter((f) => f.toLowerCase().endsWith('.ttf'));
  } catch {
    return { installed: false, count: 0, bundledDir };
  }
  if (ttfFiles.length === 0) return { installed: false, count: 0, bundledDir };

  if (process.platform === 'darwin' || process.platform === 'linux') {
    const targetDir =
      process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Fonts')
        : path.join(os.homedir(), '.local', 'share', 'fonts');
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      let copied = 0;
      for (const file of ttfFiles) {
        const dest = path.join(targetDir, file);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(bundledDir, file), dest);
          copied += 1;
        }
      }
      if (process.platform === 'linux') {
        execFile('fc-cache', ['-f', targetDir], () => {});
      }
      return { installed: true, count: copied, bundledDir, targetDir };
    } catch {
      return { installed: false, count: 0, bundledDir };
    }
  }

  return { installed: false, count: 0, bundledDir };
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('themepilot.applyIdeaFont', async () => {
      const editorCfg = vscode.workspace.getConfiguration('editor');
      const termCfg = vscode.workspace.getConfiguration('terminal.integrated');

      await editorCfg.update(
        'fontFamily',
        "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
        vscode.ConfigurationTarget.Global
      );
      await editorCfg.update('fontLigatures', true, vscode.ConfigurationTarget.Global);
      await editorCfg.update('lineHeight', 1.55, vscode.ConfigurationTarget.Global);
      await termCfg.update(
        'fontFamily',
        "'JetBrains Mono', 'Menlo', 'Monaco', monospace",
        vscode.ConfigurationTarget.Global
      );

      if (hasJetBrainsMonoInstalled()) {
        void vscode.window.showInformationMessage(
          'ThemePilot applied JetBrains Mono font, ligatures, and IntelliJ line height.'
        );
        return;
      }

      const result = installBundledFonts(context.extensionPath);
      if (result.installed) {
        const choice = await vscode.window.showInformationMessage(
          `Installed bundled JetBrains Mono (${result.count} font files) into ${result.targetDir}. Reload VS Code to activate the new font.`,
          'Reload Window'
        );
        if (choice === 'Reload Window') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        return;
      }

      const choice = await vscode.window.showInformationMessage(
        'Applied JetBrains Mono settings. Open the bundled fonts folder to install the included .ttf files offline?',
        'Open Fonts Folder'
      );
      if (choice === 'Open Fonts Folder') {
        await vscode.env.openExternal(vscode.Uri.file(result.bundledDir));
      }
    }),

    vscode.commands.registerCommand('themepilot.resetFont', async () => {
      const editorCfg = vscode.workspace.getConfiguration('editor');
      const termCfg = vscode.workspace.getConfiguration('terminal.integrated');
      await editorCfg.update('fontFamily', undefined, vscode.ConfigurationTarget.Global);
      await editorCfg.update('fontLigatures', undefined, vscode.ConfigurationTarget.Global);
      await editorCfg.update('lineHeight', undefined, vscode.ConfigurationTarget.Global);
      await termCfg.update('fontFamily', undefined, vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage('ThemePilot reset editor font overrides to defaults.');
    }),

    vscode.commands.registerCommand('themepilot.switchTheme', async () => {
      const picked = await vscode.window.showQuickPick(THEME_LABELS, {
        placeHolder: 'Select a ThemePilot color theme',
      });
      if (!picked) return;
      await vscode.workspace
        .getConfiguration('workbench')
        .update('colorTheme', picked.label, vscode.ConfigurationTarget.Global);
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
