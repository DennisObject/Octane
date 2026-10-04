import { describe, expect, it } from 'vitest';
import * as DraftTree from './catalogAdminTree.helpers';

describe('buildCatalogAdminDraftTree', () => {
    it('maps pointer position to clear before, inside and after zones', () => {
        const resolvePosition = (DraftTree as any).resolveCatalogAdminPageDropPosition;

        expect(resolvePosition(102, 100, 40)).toBe('before');
        expect(resolvePosition(120, 100, 40)).toBe('inside');
        expect(resolvePosition(138, 100, 40)).toBe('after');
    });
});
