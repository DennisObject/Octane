import { ButtonHTMLAttributes, FC, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isWiredVolterStyle, localizeWithFallback, WiredShellStyle } from '../../../api';
import blueSkin from '../../../assets/images/habbo-skin/2249_habbo_skin_blue_png$87fbbf84559e7bad0222a9c697b1104d-1406111769.png';
import plainButton from '../../../assets/images/wired/illumina_light_button_unetched.png';
import volterAtlas from '../../../assets/images/wired/volter_shell_atlas.png';
import { WiredVolterMenuFrameView } from './WiredVolterFrameView';

const headerOffsets = { volter: 128, volter_blue: 136, volter_green: 144, volter_yellow: 152 };

export interface WiredShellMenuItem {
    id: string;
    label: string;
    disabled: boolean;
    onClick: () => void;
    checked?: boolean;
}

interface WiredShellHeaderViewProps {
    shellStyle: WiredShellStyle;
    title: string;
    onClose: () => void;
    menuItems: Array<WiredShellMenuItem | null>;
}

export const WiredShellHeaderView: FC<WiredShellHeaderViewProps> = ({ shellStyle, title, onClose, menuItems }) => {
    const headerPatternId = useId();
    const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuPosition) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) setMenuPosition(null);
        };
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            event.preventDefault();
            event.stopPropagation();
            setMenuPosition(null);
            toggleRef.current?.focus();
        };
        const closeMenu = () => setMenuPosition(null);

        menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('resize', closeMenu);
        window.addEventListener('scroll', closeMenu, true);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('resize', closeMenu);
            window.removeEventListener('scroll', closeMenu, true);
        };
    }, [menuPosition]);

    const moveMenuFocus = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Tab') {
            setMenuPosition(null);
            toggleRef.current?.focus();
            return;
        }

        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
    };

    return (
        <div className="octane-wired__shell-header drag-handler" onPointerDown={() => setMenuPosition(null)}>
            {isWiredVolterStyle(shellStyle) && (
                <svg className="octane-wired__volter-header-skin" aria-hidden="true">
                    <defs>
                        <pattern id={headerPatternId} width={6} height={15} patternUnits="userSpaceOnUse">
                            <image href={volterAtlas} x={-headerOffsets[shellStyle]} y={-300} width={490} height={360} />
                            <image href={volterAtlas} x={-401} y={-16} width={490} height={360} />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#${headerPatternId})`} />
                </svg>
            )}
            <span className="octane-wired__shell-caption">{title}</span>
            {(shellStyle === 'illumina' || shellStyle === 'volter') && (
                <button
                    ref={toggleRef}
                    aria-expanded={!!menuPosition}
                    aria-haspopup="menu"
                    aria-label={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                    className="octane-wired__shell-menu-toggle"
                    type="button"
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        if (menuPosition) event.preventDefault();
                    }}
                    onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setMenuPosition((position) => (position ? null : { left: rect.left, top: rect.bottom }));
                    }}
                />
            )}
            <button
                aria-label={localizeWithFallback('generic.close', 'Close')}
                className="octane-wired__shell-close"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={onClose}
            />
            {menuPosition &&
                createPortal(
                    <div
                        ref={menuRef}
                        className={`octane-wired__shell-menu octane-wired__shell-menu--${shellStyle}`}
                        role="menu"
                        aria-label={localizeWithFallback('wiredfurni.params.menu', 'Menu')}
                        style={menuPosition}
                        onPointerDown={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                        }}
                        onKeyDown={moveMenuFocus}
                        onBlur={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) setMenuPosition(null);
                        }}
                    >
                        {shellStyle === 'volter' && <WiredVolterMenuFrameView />}
                        {menuItems.map((item, index) =>
                            item ? (
                                <button
                                    key={item.id}
                                    aria-checked={item.checked}
                                    className="octane-wired__shell-menu-item"
                                    disabled={item.disabled}
                                    role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                                    tabIndex={-1}
                                    type="button"
                                    onClick={() => {
                                        if (item.checked === undefined) {
                                            setMenuPosition(null);
                                            toggleRef.current?.focus();
                                        }
                                        item.onClick();
                                    }}
                                >
                                    {item.checked !== undefined && (
                                        <span aria-hidden="true" className={`octane-wired__shell-menu-check ${item.checked ? 'is-checked' : ''}`} />
                                    )}
                                    <span>{item.label}</span>
                                </button>
                            ) : (
                                <div key={`spacer-${index}`} className="octane-wired__shell-menu-spacer" role="separator" />
                            )
                        )}
                    </div>,
                    document.body
                )}
        </div>
    );
};

// Read the native skin's bitmap regions without generating or tinting replacement assets.
const buttonRegions = {
    ubuntu: [
        [32, 75, 5, 5],
        [37, 75, 1, 5],
        [38, 75, 5, 5],
        [32, 80, 5, 12],
        [37, 80, 1, 12],
        [38, 80, 5, 12],
        [32, 92, 5, 5],
        [37, 92, 1, 5],
        [38, 92, 5, 5]
    ],
    illumina: [
        [0, 0, 6, 8],
        [6, 0, 1, 8],
        [7, 0, 4, 8],
        [0, 8, 6, 12],
        [6, 8, 1, 12],
        [7, 8, 4, 12],
        [0, 20, 6, 8],
        [6, 20, 1, 8],
        [7, 20, 4, 8]
    ]
};

export const WiredShellButton: FC<ButtonHTMLAttributes<HTMLButtonElement> & { shellStyle: WiredShellStyle }> = ({ shellStyle, children, className = '', ...props }) => {
    const isIllumina = shellStyle === 'illumina';
    const isVolter = isWiredVolterStyle(shellStyle);
    const bitmap = isVolter ? volterAtlas : isIllumina ? plainButton : blueSkin;
    const bitmapWidth = isIllumina ? 11 : 490;
    const bitmapHeight = isVolter ? 360 : isIllumina ? 150 : 300;
    const buttonTop = shellStyle === 'volter' ? 100 : 200;
    const regions = isVolter
        ? [
              [89, buttonTop, 3, 3], [92, buttonTop, 1, 3], [95, buttonTop, 3, 3],
              [89, buttonTop + 3, 3, 1], [92, buttonTop + 3, 1, 1], [95, buttonTop + 3, 3, 1],
              [89, buttonTop + 19, 3, 3], [92, buttonTop + 19, 1, 3], [95, buttonTop + 19, 3, 3]
          ]
        : buttonRegions[shellStyle];

    const region = (rect: number[], className: string, key: number) => (
        <svg key={key} className={className} viewBox={rect.join(' ')} preserveAspectRatio="none" aria-hidden="true">
            <image href={bitmap} width={bitmapWidth} height={bitmapHeight} />
        </svg>
    );

    return (
        <button {...props} className={`octane-wired__shell-button octane-wired__shell-button--${shellStyle} ${className}`} type="button">
            <span className="octane-wired__shell-button-skin" aria-hidden="true">
                {regions.map((rect, index) => region(rect, `octane-wired__shell-button-patch ${index % 3 === 2 ? 'is-right' : ''}`, index))}
            </span>
            {isIllumina && (
                <>
                    {region([1, 31, 3, 5], 'octane-wired__shell-button-curve is-left', 9)}
                    {region([7, 31, 3, 5], 'octane-wired__shell-button-curve is-right', 10)}
                    <span className="octane-wired__shell-button-etching" aria-hidden="true">
                        {[
                            [0, 137, 6, 5],
                            [6, 137, 1, 5],
                            [7, 137, 4, 5]
                        ].map((rect, index) => region(rect, '', index))}
                    </span>
                </>
            )}
            <span className="octane-wired__shell-button-label">{children}</span>
        </button>
    );
};
