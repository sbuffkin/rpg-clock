import { describe, it, expect } from 'vitest';
import { parseClocks, serializeClock } from '../parse';

describe('parseClocks', () => {
    it('parses a basic clock', () => {
        const result = parseClocks('My Clock:3/8');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ name: 'My Clock', filled: 3, total: 8, lineOffset: 0 });
    });

    it('parses a clock with a hex color', () => {
        const result = parseClocks('Boss Fight:2/6:#ff0000');
        expect(result[0]).toMatchObject({ name: 'Boss Fight', filled: 2, total: 6, color: '#ff0000' });
    });

    it('parses multiple clocks and records correct lineOffsets', () => {
        const result = parseClocks('Clock A:1/4\nClock B:0/8');
        expect(result).toHaveLength(2);
        expect(result[0].lineOffset).toBe(0);
        expect(result[1].lineOffset).toBe(1);
    });

    it('skips blank lines', () => {
        const result = parseClocks('\nClock:1/4\n');
        expect(result).toHaveLength(1);
    });

    it('skips lines with non-numeric values', () => {
        const result = parseClocks('Bad:x/y\nGood:1/4');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Good');
    });

    it('handles a clock with no name (value-only format)', () => {
        const result = parseClocks('2/6');
        expect(result[0]).toMatchObject({ name: '', filled: 2, total: 6 });
    });

    it('handles filled=0', () => {
        const result = parseClocks('New Clock:0/4');
        expect(result[0].filled).toBe(0);
    });

    it('leaves color undefined when not provided', () => {
        const result = parseClocks('Clock:1/4');
        expect(result[0].color).toBeUndefined();
    });

    it('reassembles colons in color values', () => {
        // e.g. if someone stores an rgb() value that happens to have extra colons
        // parts.slice(2).join(':') ensures they're rejoined correctly
        const result = parseClocks('Clock:1/4:extra:colon');
        expect(result[0].color).toBe('extra:colon');
    });
});

describe('serializeClock', () => {
    it('serializes name, filled, and total', () => {
        expect(serializeClock({ name: 'My Clock', filled: 3, total: 8 })).toBe('My Clock:3/8');
    });

    it('appends color when present', () => {
        expect(serializeClock({ name: 'Boss', filled: 2, total: 6, color: '#ff0000' })).toBe('Boss:2/6:#ff0000');
    });

    it('serializes with empty name', () => {
        expect(serializeClock({ name: '', filled: 0, total: 4 })).toBe(':0/4');
    });

    it('round-trips through parseClocks', () => {
        const input = 'Heist:3/6:#aabbcc';
        const [def] = parseClocks(input);
        expect(serializeClock(def)).toBe(input);
    });
});
