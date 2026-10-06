import { SanitizeHtml } from '../../../../api/utils/SanitizeHtml';

export const getPlainNotificationText = (value: string): { markup: string; text: string | null } => {
    const markup = SanitizeHtml(value.replace(/\r\n|\r|\n/g, '<br />'));

    if (typeof document === 'undefined') return { markup, text: null };

    const template = document.createElement('template');
    template.innerHTML = markup;
    let text = '';

    for (const node of template.content.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
        else if (node.nodeName === 'BR') text += '\n';
        else return { markup, text: null };
    }

    return { markup, text };
};
