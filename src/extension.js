const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

      const actions =
        process.platform === 'darwin'
          ? ['Install via Homebrew', 'Download JetBrains Mono']
          : ['Download JetBrains Mono'];

      const picked = await vscode.window.showInformationMessage(
        'Applied JetBrains Mono settings, but JetBrains Mono was not detected on your system yet.',
        ...actions
      );

      if (picked === 'Install via Homebrew') {
        const term = vscode.window.createTerminal('ThemePilot: Install JetBrains Mono');
        term.show();
        term.sendText('brew install --cask font-jetbrains-mono');
      } else if (picked === 'Download JetBrains Mono') {
        await vscode.env.openExternal(
          vscode.Uri.parse('https://www.jetbrains.com/lp/mono/')
        );
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
