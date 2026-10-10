import { FC, useEffect, useState } from 'react';
import { CopyToClipboard, LocalizeText } from '../../../api';

const COPIED_MS = 1000;

/** A read-only value that copies itself on click, with the AIR "copied" hint. */
export const FurniEditorCopyValueView: FC<{ value: string | number; label?: string }> = ({ value, label = '' }) => {
    const [copied, setCopied] = useState(false);
    const text = String(value);

    useEffect(() => {
        if (!copied) return;

        const handle = window.setTimeout(() => setCopied(false), COPIED_MS);

        return () => window.clearTimeout(handle);
    }, [copied]);

    return (
        <button
            aria-label={label || undefined}
            className={`volt-furni-editor-copy ${copied ? 'is-copied' : ''}`}
            title={LocalizeText('furni.editor.copy.tip')}
            type="button"
            onClick={() => void CopyToClipboard(text).then((ok) => setCopied(ok))}
        >
            <span className="volt-furni-editor-copy-value">{text}</span>
            <span className="volt-furni-editor-copy-hint">{LocalizeText(copied ? 'furni.editor.copy.done' : 'furni.editor.copy')}</span>
        </button>
    );
};
