import { Editor, MarkdownPostProcessorContext, Notice, Plugin } from 'obsidian'
import { Clock } from './clock';
import { RpgClockSettings, DefaultSettings, SettingsTab } from './settings';
import { CommandInput } from './commandInput';

export const urlRegex = /\/([^\/]+)\/?$/

export default class RpgClock extends Plugin {
	settings!: RpgClockSettings;
	clocks?: Clock[];
	pendingFocusLast = false;

	async onload() {
		this.clocks = [];
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor(
			'clock',
			async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
				ctx.addChild(new Clock(this, this.settings, el, source.trim(), ctx));
			}
		);

		this.addCommand({
			id: 'insert-clock',
			name: 'Insert Clock',
			editorCallback: (editor: Editor) => {
				new CommandInput(this.app, (name, sections) => {
					this.insertClockAtCursor(editor, name, sections);
				}).open();
			}
		});

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor) => {
				menu.addItem((item) => {
					item
						.setTitle('Insert Clock')
						.setIcon('clock')
						.onClick(() => {
							new CommandInput(this.app, (name, sections) => {
								this.insertClockAtCursor(editor, name, sections);
							}).open();
						});
				});
			})
		);

		this.addSettingTab(new SettingsTab(this.app, this));
	}

	private insertClockAtCursor(editor: Editor, name: string, sections: number) {
		try {
			const codeBlock = `\`\`\`clock\n${name}:0/${sections}\n\`\`\`\n`;
			const cursor = editor.getCursor();
			editor.transaction({
				changes: [{ from: cursor, text: codeBlock }]
			});
			editor.setCursor({
				line: cursor.line + codeBlock.split('\n').length,
				ch: 0
			});
			new Notice(`Added ${name}`);
		} catch (error) {
			new Notice(String(error));
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DefaultSettings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
