import { App, Modal, Setting } from "obsidian";

export class CommandInput extends Modal {
    result: string = '';
    sections: number = 4;
    onSubmit: (result: string, sections: number) => void;

    constructor(app: App, onSubmit: (result: string, sections: number) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;

        contentEl.createEl('h1', { text: 'New Clock' });

        new Setting(contentEl)
            .setName('Name')
            .addText((text) => {
                text.onChange((value) => { this.result = value; });
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { this.onSubmit(this.result, this.sections); this.close(); }
                });
                setTimeout(() => text.inputEl.focus(), 10);
            });

        new Setting(contentEl)
            .setName('Sections')
            .addText((text) => {
                text.setValue('4');
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.max = '24';
                text.onChange((v) => { this.sections = parseInt(v) || 4; });
                text.inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { this.onSubmit(this.result, this.sections); this.close(); }
                });
            });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Create')
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.result, this.sections);
                        this.close();
                    })
            );
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
