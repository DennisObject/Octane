import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Toolbar feature config', () => {
    it('keeps optional custom toolbar buttons behind global config flags', () => {
        const source = readFileSync(join(root, 'src/components/toolbar/ToolbarView.tsx'), 'utf8');

        expect(source).not.toContain('rare-values/toggle');
    });
});
