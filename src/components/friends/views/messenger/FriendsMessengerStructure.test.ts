import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Messenger component structure', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/friends/views/messenger/FriendsMessengerView.css'), 'utf8');

    it('uses the AIR Ubuntu regular and bold faces instead of the global condensed alias', () => {
        expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*MessengerUbuntu;[^}]*Ubuntu\.ttf[^}]*font-weight:\s*400;/s);
        expect(css).toMatch(/@font-face\s*\{[^}]*font-family:\s*MessengerUbuntu;[^}]*Ubuntu-b\.ttf[^}]*font-weight:\s*700;/s);
        expect(css).toMatch(/\.messenger-window\s*\{[^}]*font-family:\s*MessengerUbuntu,/s);
        expect(css).not.toMatch(/\.messenger-window\s*\{[^}]*font-family:\s*Ubuntu,/s);
    });
});
