import { FC, PropsWithChildren, ReactNode } from 'react';
import { Text } from '../../../common';
import { useWiredNative } from './WiredNativeContext';
import { WiredText } from './WiredText';

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

export const WiredSection: FC<PropsWithChildren<WiredSectionProps>> = ({ title = null, headerOption = null, headerOptionsRight = null, titleOffset = 0, splitter = true, className = '', children = null }) =>
{
    const isNative = useWiredNative();

    // The other frames keep their own divider and plain section body; the Illumina section chrome is drawn for the Illumina frame only.
    if (!isNative)
    {
        return (
            <>
                {splitter && <div className="octane-wired__divider" />}
                <div className="octane-wired__section">
                    <div className="flex flex-col gap-1">
                        {title !== null && (typeof title === 'string' ? <Text bold>{title}</Text> : title)}
                        {headerOption}
                        {headerOptionsRight}
                        {children}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className={`octane-wired__native-section ${className}`}>
            {splitter && <WiredSplitter />}
            <div className="octane-wired__native-section-inner">
                {(title !== null || headerOption !== null || headerOptionsRight !== null) && (
                    <div className="octane-wired__native-section-header">
                        {title !== null &&
                            (typeof title === 'string' ? (
                                <WiredText bold className={titleOffset ? 'octane-wired__native-text--offset' : ''} text={title} />
                            ) : (
                                <span className="octane-wired__text octane-wired__text--bold" style={titleOffset ? { marginTop: titleOffset } : undefined}>
                                    {title}
                                </span>
                            ))}
                        {headerOption}
                        {headerOptionsRight !== null && <div className="octane-wired__native-section-header-right">{headerOptionsRight}</div>}
                    </div>
                )}
                {children}
            </div>
        </div>
    );
};
