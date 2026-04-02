type RGB = `rgb(${number}, ${number}, ${number})`;
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;
type HEX = `#${string}`;

export type Color = RGB | RGBA | HEX;

export interface ClockDef {
    name: string;
    filled: number;
    total: number;
    color?: Color;
    lineOffset: number;
}

export function parseClocks(input: string): ClockDef[] {
    const defs: ClockDef[] = [];
    input.split('\n').forEach((line, lineOffset) => {
        if (!line.trim()) return;
        const parts = line.split(':');
        let name: string, value: string, color: Color | undefined;
        if (parts.length === 1) {
            name = '';
            value = parts[0];
        } else if (parts.length === 2) {
            [name, value] = parts;
        } else {
            name = parts[0];
            value = parts[1];
            color = parts.slice(2).join(':') as Color;
        }
        const [filled, total] = value.split('/').map(Number);
        if (isNaN(filled) || isNaN(total)) return;
        defs.push({ name, filled, total, color, lineOffset });
    });
    return defs;
}

export function serializeClock(def: Pick<ClockDef, 'name' | 'filled' | 'total' | 'color'>): string {
    let line = `${def.name}:${def.filled}/${def.total}`;
    if (def.color) line += `:${def.color}`;
    return line;
}
