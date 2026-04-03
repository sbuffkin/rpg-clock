import RpgClock from "./main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { Color } from "./parse";

export type { Color };

export interface RpgClockSettings {
  clockSize: number;
  clockColor: Color;
  paletteColors: Color[];
}

export const DefaultSettings: RpgClockSettings = {
  clockSize: 150,
  clockColor: "#70909e",
  paletteColors: [
    "#1f0000",
    "#ab1212",
    "#006d75",
    "#c8d6e5",
    "#ffffff",
    "#caa212",
    "#6e8776",
  ],
};

export class SettingsTab extends PluginSettingTab {
  plugin: RpgClock;

  constructor(app: App, plugin: RpgClock) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    let { settings } = this.plugin;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Clock Size")
      .setDesc("How big the clock will be.")
      .addSlider((slider) => {
        slider
          .setLimits(60, 300, 10)
          .setValue(settings.clockSize)
          .setDynamicTooltip()
          .onChange(async (value) => {
            settings.clockSize = value;
            await this.plugin.saveSettings();
            this.plugin.clocks?.forEach(c => c.refresh());
          });
      });

    new Setting(containerEl)
      .setName("Clock Color")
      .setDesc("Default clock color on creation.")
      .addColorPicker((colorPicker) => {
        colorPicker.setValue(settings.clockColor).onChange(async (value) => {
          settings.clockColor = value as Color;
          await this.plugin.saveSettings();
        });
      });

    // Palette section
    new Setting(containerEl)
      .setName("Color Palette")
      .setDesc("Quick-select colors available on each clock. Click a swatch to remove it.");

    const paletteWrap = containerEl.createDiv({ cls: 'rpg-clock-palette-editor' });
    this.renderPaletteEditor(paletteWrap);
  }

  private renderPaletteEditor(wrap: HTMLElement) {
    wrap.empty();
    const { settings } = this.plugin;

    // Existing swatches
    const swatchRow = wrap.createDiv({ cls: 'rpg-clock-palette-swatches' });
    let dragFrom: number | null = null;

    for (let i = 0; i < settings.paletteColors.length; i++) {
      const color = settings.paletteColors[i];
      const swatch = swatchRow.createDiv({ cls: 'rpg-clock-palette-swatch' });
      swatch.style.background = color;
      swatch.setAttribute('title', `${color} — click to edit, right-click to remove`);
      swatch.draggable = true;

      // Hidden color input overlaid on the swatch for editing
      const colorPicker = swatch.createEl('input', { cls: 'rpg-clock-palette-swatch-picker' });
      colorPicker.type = 'color';
      colorPicker.value = color;
      colorPicker.addEventListener('input', async () => {
        settings.paletteColors[i] = colorPicker.value as Color;
        swatch.style.background = colorPicker.value;
        swatch.setAttribute('title', `${colorPicker.value} — click to edit, right-click to remove`);
        await this.plugin.saveSettings();
      });

      swatch.addEventListener('click', () => colorPicker.click());

      swatch.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        settings.paletteColors.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderPaletteEditor(wrap);
      });

      swatch.addEventListener('dragstart', (e) => {
        dragFrom = i;
        e.dataTransfer!.effectAllowed = 'move';
        setTimeout(() => swatch.addClass('rpg-clock-palette-swatch--dragging'), 0);
      });

      swatch.addEventListener('dragend', () => {
        dragFrom = null;
        swatchRow.querySelectorAll('.rpg-clock-palette-swatch').forEach(el => {
          el.removeClass('rpg-clock-palette-swatch--dragging');
          el.removeClass('rpg-clock-palette-swatch--over');
        });
      });

      swatch.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        swatchRow.querySelectorAll('.rpg-clock-palette-swatch').forEach(el =>
          el.removeClass('rpg-clock-palette-swatch--over')
        );
        swatch.addClass('rpg-clock-palette-swatch--over');
      });

      swatch.addEventListener('dragleave', (e) => {
        if (!swatch.contains(e.relatedTarget as Node))
          swatch.removeClass('rpg-clock-palette-swatch--over');
      });

      swatch.addEventListener('drop', async (e) => {
        e.preventDefault();
        swatch.removeClass('rpg-clock-palette-swatch--over');
        if (dragFrom === null || dragFrom === i) return;
        const [moved] = settings.paletteColors.splice(dragFrom, 1);
        settings.paletteColors.splice(i, 0, moved);
        await this.plugin.saveSettings();
        this.renderPaletteEditor(wrap);
      });
    }

    // Add-color row
    const addRow = wrap.createDiv({ cls: 'rpg-clock-palette-add-row' });
    const picker = addRow.createEl('input', { cls: 'rpg-clock-palette-picker' });
    picker.type = 'color';
    picker.value = '#ffffff';
    const addBtn = addRow.createEl('button', { text: 'Add color' });
    addBtn.addEventListener('click', async () => {
      const color = picker.value as Color;
      if (!settings.paletteColors.includes(color)) {
        settings.paletteColors.push(color);
        await this.plugin.saveSettings();
        this.renderPaletteEditor(wrap);
      }
    });
  }

  hide() {
    if (this.plugin?.clocks) {
      for (let palette of this.plugin.clocks) {
        palette.refresh();
      }
    }
  }
}
