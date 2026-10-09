import { FC, PropsWithChildren, ReactNode } from 'react';

export interface WiredSectionProps {
    title?: ReactNode;
    /** Sits right of the title, like SectionParam.headerOptionLeft. */
    headerOption?: ReactNode;
    /** Aligned to the right edge of the header row, like SectionParam.miscHeaderOptions. */
    headerOptionsRight?: ReactNode;
    /** Extra top offset of the title text (WiredStyle.namedInputOffset when an input sits beside it). */
    titleOffset?: number;
    /** Wired sections open with a splitter; the frame header is the only element without one. */
    splitter?: boolean;
    className?: string;
}

export const WiredSplitter: FC<{ className?: string }> = ({ className = '' }) => <div className={`octane-wired__splitter ${className}`} aria-hidden="true" />;

export const WiredSection: FC<PropsWithChildren<WiredSectionProps>> = ({ title = null, headerOption = null, headerOptionsRight = null, titleOffset = 0, splitter = true, className = '', children = null }) => (
    <div className={`octane-wired__native-section ${className}`}>
        {splitter && <WiredSplitter />}
        <div className="octane-wired__native-section-inner">
            {(title !== null || headerOption !== null || headerOptionsRight !== null) && (
                <div className="octane-wired__native-section-header">
                    {title !== null && (
                        <span className="octane-wired__text octane-wired__text--bold" style={titleOffset ? { marginTop: titleOffset } : undefined}>
                            {title}
                        </span>
                    )}
                    {headerOption}
                    {headerOptionsRight !== null && <div className="octane-wired__native-section-header-right">{headerOptionsRight}</div>}
                </div>
            )}
            {children}
        </div>
    </div>
);
