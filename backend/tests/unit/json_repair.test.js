import { describe, it, expect } from '@jest/globals';

function repairJson(output) {
    let cleanOutput = output.replace(/```json/g, "").replace(/```/g, "").trim();

    const firstBrace = cleanOutput.indexOf('{');
    const lastBrace = cleanOutput.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanOutput = cleanOutput.substring(firstBrace, lastBrace + 1);
    }

    // 3. Advanced Cleaning
    cleanOutput = cleanOutput
        .replace(/\/\*[\s\S]*?\*\//g, "") // Block comments
        .replace(/\/\/.*$/gm, "");         // Line comments

    // 4. Remove Trailing Commas
    cleanOutput = cleanOutput.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]");

    // Secondary Fix: Bad escapes
    const fixedOutput = cleanOutput.replace(/\\(?!(["\\/bfnrt]|u[0-9a-fA-F]{4}))/g, "\\\\");

    return fixedOutput;
}

describe('JSON Repair Logic Unit Tests', () => {
    it('should pass clean JSON through unmodified', () => {
        const input = '{"key": "value"}';
        const expected = '{"key": "value"}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ key: 'value' });
    });

    it('should strip markdown json blocks', () => {
        const input = '```json\n{"key": "value"}\n```';
        const expected = '{"key": "value"}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ key: 'value' });
    });

    it('should strip single-line comments', () => {
        const input = '{\n "key": "value", // comment\n "n": 1\n}';
        const expected = '{\n "key": "value", \n "n": 1\n}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ key: 'value', n: 1 });
    });

    it('should strip multi-line block comments', () => {
        const input = '{\n "key": "value" /* comment */\n}';
        const expected = '{\n "key": "value" \n}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ key: 'value' });
    });

    it('should remove trailing commas in objects', () => {
        const input = '{"key": "value", }';
        const expected = '{"key": "value"}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ key: 'value' });
    });

    it('should remove trailing commas in arrays', () => {
        const input = '{"list": [1, 2, ]}';
        const expected = '{"list": [1, 2]}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ list: [1, 2] });
    });

    it('should duplicate invalid backslashes (escaping them)', () => {
        const input = '{"path": "C:\\Program Files"}';
        const expected = '{"path": "C:\\\\Program Files"}';
        expect(repairJson(input)).toBe(expected);
        expect(JSON.parse(repairJson(input))).toEqual({ path: 'C:\\Program Files' });
    });
});
