import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from "obsidian";
import RpgClock from "./main";
import { RpgClockSettings } from "./settings";
import { ClockDef, Color, parseClocks, serializeClock } from "./parse";

export class Clock extends MarkdownRenderChild {
    plugin: RpgClock;
    settings: RpgClockSettings;
    input: string;
    ctx: MarkdownPostProcessorContext;
    clockDefs: ClockDef[];

    constructor(
        plugin: RpgClock,
        settings: RpgClockSettings,
        containerEl: HTMLElement,
        input: string,
        ctx: MarkdownPostProcessorContext
    ) {
        super(containerEl);
        this.plugin = plugin;
        this.settings = settings;
        this.input = input;
        this.ctx = ctx;
        this.clockDefs = parseClocks(input);
    }

    onload() {
        this.containerEl.innerHTML = '';
        this.renderAll();
    }

    unload() {
        if (this.clockDefs.length > 0) {
            this.plugin.clocks?.remove(this);
        }
    }

    public refresh() {
        this.clockDefs = parseClocks(this.input);
        this.containerEl.empty();
        this.renderAll();
    }

    private renderAll() {
        const n = this.clockDefs.length;
        const cols = Math.ceil(Math.sqrt(n + 1));
        this.containerEl.style.display = 'grid';
        this.containerEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;
        this.containerEl.style.gap = '8px';
        this.containerEl.style.justifyContent = 'start';
        this.containerEl.style.alignItems = 'start';

        const clockEls: HTMLElement[] = [];
        for (const def of this.clockDefs) {
            clockEls.push(this.renderClock(this.containerEl, def));
        }

        clockEls.forEach((el, i) => this.setupDrag(el, i, clockEls));

        this.renderAddButton(this.containerEl);
    }

    private renderClock(container: HTMLElement, def: ClockDef): HTMLElement {
        const color = def.color || this.settings.clockColor;
        const size = this.settings.clockSize ?? 100;

        const clockEl = container.createDiv({ cls: 'clock' });
        clockEl.setAttribute('n', String(def.total));
        clockEl.style.setProperty('--n', String(def.total));
        clockEl.style.setProperty('--clock-color', color);
        clockEl.style.setProperty('--clock-size', `${size}px`);

        // Circular clock widget
        const widgetEl = clockEl.createDiv({ cls: 'widget' });

        // Drag handle (visible on hover)
        widgetEl.createDiv({ cls: 'clock-drag-handle', text: '⠿' });

        // Delete button (top-right, visible on hover)
        const deleteBtn = widgetEl.createEl('button', { cls: 'clock-delete-btn', text: '×' });
        deleteBtn.addEventListener('click', async () => {
            const idx = this.clockDefs.indexOf(def);
            if (idx === -1) return;
            // Capture section info BEFORE any DOM changes — getSectionInfo can
            // return null after containerEl.empty() in some Obsidian versions.
            const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath) as TFile;
            if (!file) return;
            const info = this.ctx.getSectionInfo(this.containerEl);
            if (!info) return;
            this.clockDefs.splice(idx, 1);
            this.containerEl.empty();
            this.renderAll();
            await this.writeAllClocksWithInfo(file, info);
        });

        const coreEl = widgetEl.createDiv({ cls: 'core' });
        this.buildSlices(coreEl, def.total, def.filled);
        this.buildBars(coreEl, def.total);

        // Color picker at bottom-right of widget
        const colorInput = widgetEl.createEl('input', { cls: 'clock-color-btn' });
        colorInput.type = 'color';
        colorInput.value = this.toHex(color);
        colorInput.addEventListener('change', () => {
            def.color = colorInput.value as Color;
            clockEl.style.setProperty('--clock-color', def.color);
            this.updateClockSource(def);
        });

        // Controls below the clock
        const controlsEl = clockEl.createDiv({ cls: 'clock-controls' });

        // Stepper row: [-] filled / [total] [+]
        const stepperEl = controlsEl.createDiv({ cls: 'clock-stepper' });
        const decBtn = stepperEl.createEl('button', { cls: 'clock-btn-dec', text: '-' });
        const filledVal = stepperEl.createEl('span', { cls: 'clock-filled-val', text: String(def.filled) });
        stepperEl.createEl('span', { cls: 'clock-sep', text: '/' });
        const totalInput = stepperEl.createEl('input', { cls: 'clock-total' });
        totalInput.type = 'number';
        totalInput.min = '1';
        totalInput.max = '24';
        totalInput.value = String(def.total);
        totalInput.addEventListener('focus', () => totalInput.select());
        const incBtn = stepperEl.createEl('button', { cls: 'clock-btn-inc', text: '+' });

        // Name input
        const nameInput = controlsEl.createEl('input', { cls: 'clock-name' });
        nameInput.type = 'text';
        nameInput.value = def.name;
        nameInput.placeholder = 'Clock name';

        // Decrement filled
        decBtn.addEventListener('click', () => {
            if (def.filled <= 0) return;
            def.filled--;
            filledVal.textContent = String(def.filled);
            this.updateFilledDOM(clockEl, def.filled);
            this.updateClockSource(def);
        });

        // Increment filled
        incBtn.addEventListener('click', () => {
            if (def.filled >= def.total) return;
            def.filled++;
            filledVal.textContent = String(def.filled);
            this.updateFilledDOM(clockEl, def.filled);
            this.updateClockSource(def);
        });

        // Change total sections
        totalInput.addEventListener('change', () => {
            const newTotal = parseInt(totalInput.value);
            if (isNaN(newTotal) || newTotal < 1) return;
            def.total = newTotal;
            def.filled = Math.min(def.filled, def.total);
            filledVal.textContent = String(def.filled);
            clockEl.setAttribute('n', String(def.total));
            clockEl.style.setProperty('--n', String(def.total));
            coreEl.empty();
            this.buildSlices(coreEl, def.total, def.filled);
            this.buildBars(coreEl, def.total);
            this.updateClockSource(def);
        });

        // Rename
        nameInput.addEventListener('input', () => {
            nameInput.value = nameInput.value.replace(/:/g, '');
        });
        const applyRename = () => {
            def.name = nameInput.value;
            this.updateClockSource(def);
        };
        nameInput.addEventListener('blur', applyRename);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.blur();
        });

        return clockEl;
    }

    // ── Drag & drop ──────────────────────────────────────────────────────────

    private setupDrag(clockEl: HTMLElement, index: number, allClockEls: HTMLElement[]) {
        clockEl.draggable = true;

        clockEl.addEventListener('dragstart', (e) => {
            // Don't drag when the user interacts with inputs / buttons
            const target = e.target as HTMLElement;
            if (target.closest('input, button')) { e.preventDefault(); return; }
            e.dataTransfer!.effectAllowed = 'move';
            e.dataTransfer!.setData('text/plain', String(index));
            setTimeout(() => clockEl.addClass('clock-dragging'), 0);
        });

        clockEl.addEventListener('dragend', () => {
            clockEl.removeClass('clock-dragging');
            allClockEls.forEach(el => el.removeClass('clock-drag-over'));
        });

        clockEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            allClockEls.forEach(el => el.removeClass('clock-drag-over'));
            clockEl.addClass('clock-drag-over');
        });

        clockEl.addEventListener('dragleave', (e) => {
            // Only remove the class if we're leaving the clock element entirely
            if (!clockEl.contains(e.relatedTarget as Node)) {
                clockEl.removeClass('clock-drag-over');
            }
        });

        clockEl.addEventListener('drop', (e) => {
            e.preventDefault();
            clockEl.removeClass('clock-drag-over');
            const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'));
            if (isNaN(fromIndex) || fromIndex === index) return;

            // Reorder in memory and re-render immediately
            const [moved] = this.clockDefs.splice(fromIndex, 1);
            this.clockDefs.splice(index, 0, moved);
            this.containerEl.empty();
            this.renderAll();

            // Persist the new order
            this.writeAllClocks();
        });
    }

    // ── Add clock ─────────────────────────────────────────────────────────────

    private renderAddButton(container: HTMLElement) {
        const size = this.settings.clockSize ?? 100;
        const addBtn = container.createDiv({ cls: 'clock-add' });
        addBtn.style.setProperty('--clock-size', `${size}px`);
        addBtn.createEl('span', { text: '+' });
        addBtn.addEventListener('click', () => this.addClock());
    }

    private async addClock(): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath) as TFile;
        if (!file) return;
        const info = this.ctx.getSectionInfo(this.containerEl);
        if (!info) return;
        const content = await this.plugin.app.vault.read(file);
        const lines = content.split('\n');
        lines.splice(info.lineEnd, 0, 'New Clock:0/4');
        await this.plugin.app.vault.modify(file, lines.join('\n'));
    }

    // ── DOM helpers ───────────────────────────────────────────────────────────

    private buildSlices(coreEl: HTMLElement, total: number, filled: number) {
        for (let i = 0; i < total; i++) {
            const slice = coreEl.createDiv({ cls: 'slice' });
            slice.setAttribute('i', String(i));
            slice.style.setProperty('--i', String(i));
            if (i < filled) slice.setAttribute('filled', '');
        }
    }

    private buildBars(coreEl: HTMLElement, total: number) {
        for (let i = 0; i < total; i++) {
            const bar = coreEl.createDiv({ cls: 'bar' });
            bar.setAttribute('i', String(i));
            bar.style.setProperty('--i', String(i));
            bar.createDiv({ cls: 'paint' });
        }
    }

    private updateFilledDOM(clockEl: HTMLElement, filled: number) {
        clockEl.querySelectorAll('.slice').forEach((slice, i) => {
            if (i < filled) slice.setAttribute('filled', '');
            else slice.removeAttribute('filled');
        });
    }

    /** Convert any CSS color string to #rrggbb for <input type="color"> */
    private toHex(color: string): string {
        if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return '#ff5757';
        ctx.fillStyle = color;
        return ctx.fillStyle;
    }

    // ── Source writes ─────────────────────────────────────────────────────────

    private async updateClockSource(def: ClockDef): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath) as TFile;
        if (!file) return;
        const info = this.ctx.getSectionInfo(this.containerEl);
        if (!info) return;
        const targetLine = info.lineStart + 1 + def.lineOffset;
        const content = await this.plugin.app.vault.read(file);
        const lines = content.split('\n');
        if (targetLine >= lines.length) return;
        lines[targetLine] = serializeClock(def);
        await this.plugin.app.vault.modify(file, lines.join('\n'));
    }

    private async writeAllClocks(): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath) as TFile;
        if (!file) return;
        const info = this.ctx.getSectionInfo(this.containerEl);
        if (!info) return;
        await this.writeAllClocksWithInfo(file, info);
    }

    private async writeAllClocksWithInfo(file: TFile, info: { lineStart: number; lineEnd: number; text: string }): Promise<void> {
        const content = await this.plugin.app.vault.read(file);
        const lines = content.split('\n');
        const blockStart = info.lineStart + 1;
        const blockEnd = info.lineEnd;
        const newLines = this.clockDefs.map(serializeClock);
        lines.splice(blockStart, blockEnd - blockStart, ...newLines);
        await this.plugin.app.vault.modify(file, lines.join('\n'));
    }
}
