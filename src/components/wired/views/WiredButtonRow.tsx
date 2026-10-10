import { GetSessionDataManager } from '@volt/renderer';
import { FC, ReactNode } from 'react';
import { resolveWiredStyle } from '../../../api';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredShellButton } from './WiredShellHeaderView';

export interface WiredRowButton {
    id: string;
    label: ReactNode;
    disabled?: boolean;
    onClick: () => void;
}

/**
 * ButtonRowPreset: buttons of the open frame's style side by side, 12px apart (WiredStyle.buttonRowSpacing), each a whole number of
 * pixels wide (ButtonPreset scale mode: int((width - spacing * gaps) / buttons)) and as high as the style's button.
 */
export const WiredButtonRow: FC<{ buttons: WiredRowButton[] }> = ({ buttons }) =>
{
    const { trigger = null } = useWired();
    const { activeWiredStyle } = useWiredTools();
    // The same style the open frame resolves (WiredBaseView), so the buttons come from the frame's own skin.
    const shellStyle = resolveWiredStyle(activeWiredStyle, GetSessionDataManager().getFloorItemData(trigger?.spriteId)?.className);

    return (
        <div className="volt-wired__button-row" style={{ gridTemplateColumns: `repeat(${buttons.length}, round(down, calc((100% - ${(buttons.length - 1) * 12}px) / ${buttons.length}), 1px))` }}>
            {buttons.map((button) => (
                <WiredShellButton key={button.id} disabled={button.disabled} shellStyle={shellStyle} onClick={button.onClick}>
                    {button.label}
                </WiredShellButton>
            ))}
        </div>
    );
};
