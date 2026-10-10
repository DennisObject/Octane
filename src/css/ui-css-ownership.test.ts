import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('UI CSS ownership', () =>
{
    it('keeps static widget styles in css files instead of React style tags', () =>
    {
        const toolbarView = readSource('src/components/toolbar/ToolbarView.tsx');
        const friendsBarView = readSource('src/components/friends/views/friends-bar/FriendsBarView.tsx');
        const userIdentityView = readSource('src/common/UserIdentityView.tsx');
        const bubbleHiddenView = readSource('src/components/voltbubblehidden/VoltbubbleHiddenView.tsx');
        const chatsCss = readSource('src/css/chat/Chats.css');

        expect(toolbarView).not.toContain('TOOLBAR_STYLES');
        expect(toolbarView).not.toContain('backgroundPosition: \'-25px -38px\'');
        expect(toolbarView).toContain('airMeMenu');
        expect(friendsBarView).not.toContain('FRIENDBAR_STYLES');
        expect(userIdentityView).not.toContain('<style>');
        expect(bubbleHiddenView).not.toContain('<style>');
        expect(bubbleHiddenView).not.toContain('dangerouslySetInnerHTML');
        expect(chatsCss).toContain('.volt-bubbles-hidden .newbubblehe');
    });

    it('keeps the wired fx editor off the room overlay class', () =>
    {
        // .volt-wired-fx is what the room draws a bar with: white, shadowed, font-weight 700.
        // The editor window shared it twice by accident and every label, note and option in the
        // window came out bold, so the editor has its own class and this keeps it that way.
        const editorView = readSource('src/components/wired/views/extras/WiredExtraVariableFxView.tsx');
        const fxCss = readSource('src/css/room/WiredVariableFx.css');

        expect(editorView).toContain('volt-wired-fx-editor');
        expect(editorView).not.toMatch(/volt-wired-fx(?!-editor)(?:__[\w-]+)?["'\s]/);
        expect(fxCss).toContain('font-weight: 700');
        expect(fxCss).not.toContain('.volt-wired-fx__override');
    });
});
