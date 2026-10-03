import { FC, Fragment, ReactNode } from 'react';
import { parseFontSegments } from '../api';

const renderInlineFontMarkup = (text: string): ReactNode => {
    if (!text) return text;
    if (text.indexOf('<font') === -1) return text;

    const segments = parseFontSegments(text);

    if (!segments.length) return text;

    return segments.map((segment, index) => {
        if (segment.color)
            return (
                <span key={index} style={{ color: segment.color }}>
                    {segment.text}
                </span>
            );

        return <Fragment key={index}>{segment.text}</Fragment>;
    });
};

interface UserIdentityViewProps {
    username: string;
    showColon?: boolean;
    className?: string;
    nameClassName?: string;
}

export const UserIdentityView: FC<UserIdentityViewProps> = ({
    username = '',
    showColon = false,
    className = '',
    nameClassName = 'username font-bold'
}) => {
    return (
        <span className={`inline-flex items-center whitespace-nowrap align-middle ${className}`}>
            <span className={`${nameClassName} whitespace-nowrap`}>
                {renderInlineFontMarkup(username)}
                {showColon ? ': ' : ''}
            </span>
        </span>
    );
};
