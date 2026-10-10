import { AddLinkEventTracker, ILinkEventTracker, VoltLogger, RemoveLinkEventTracker } from '@volt/renderer';
import DOMPurify from 'dompurify';
import { FC, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, OpenUrl } from '../../api';
import { ClassicScrollAreaView, VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { NativeHabbopageContent } from './NativeHabbopageContent';

const NEW_LINE_REGEX = /\n\r|\n|\r/gm;
const INTERNAL_LINK_PREFIX = '#habbopages/';

interface PageContent {
    dimensions: { width: number; height: number } | null;
    header: string;
    markup: string;
}

const sanitizePageMarkup = (markup: string) =>
    DOMPurify.sanitize(markup.replaceAll('event:habbopages/', INTERNAL_LINK_PREFIX), {
        ALLOWED_TAGS: ['a', 'b', 'br', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'i', 'img', 'p', 'span', 'strong', 'u'],
        ALLOWED_ATTR: ['align', 'alt', 'class', 'height', 'href', 'hspace', 'rel', 'size', 'src', 'style', 'target', 'vspace', 'width'],
        ALLOW_DATA_ATTR: false
    });

export const VoltpediaView: FC<{}> = () => {
    const [page, setPage] = useState<PageContent>(null);
    const requestRef = useRef<AbortController>(null);

    const openPage = useCallback(async (path: string) => {
        requestRef.current?.abort();
        const request = new AbortController();
        requestRef.current = request;
        const url = GetConfigurationValue<string>('habbopages.url') + path;

        try {
            const response = await fetch(url, { signal: request.signal });

            if (!response.ok) throw new Error(response.statusText);

            const splitData = (await response.text()).split(NEW_LINE_REGEX);
            const line = (splitData.shift() ?? '').split('|');
            let dimensions: PageContent['dimensions'] = null;

            if (line[1] && line[1].split(';').length === 2) {
                const [width, height] = line[1].split(';').map((value) => parseInt(value, 10));

                if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) dimensions = { width, height };
            }

            if (requestRef.current === request && !request.signal.aborted) setPage({ dimensions, header: line[0], markup: splitData.join('\n') });
        } catch (error) {
            if (request.signal.aborted) return;
            VoltLogger.error(`Failed to fetch ${url}`);
        }
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const path = url.slice('habbopages/'.length);

                if (!path) return;

                openPage(path);
            },
            eventUrlPrefix: 'habbopages/'
        };

        AddLinkEventTracker(linkTracker);

        return () => {
            requestRef.current?.abort();
            requestRef.current = null;
            RemoveLinkEventTracker(linkTracker);
        };
    }, [openPage]);

    const markup = useMemo(() => (page ? sanitizePageMarkup(page.markup) : ''), [page]);
    const fieldWidth = Math.max(1, (page?.dimensions?.width ?? 418) - 34);

    const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
        const link = (event.target as HTMLElement).closest('a');

        if (!link || !event.currentTarget.contains(link)) return;

        event.preventDefault();

        const href = link.getAttribute('href') ?? '';

        if (href.startsWith(INTERNAL_LINK_PREFIX)) CreateLinkEvent(href.slice(1));
        else if (href) OpenUrl(link.href);
    };

    const openMarkupLink = (href: string) => {
        if (href.startsWith(INTERNAL_LINK_PREFIX)) CreateLinkEvent(href.slice(1));
        else if (href) OpenUrl(new URL(href, window.location.href).href);
    };

    const closePage = () => {
        requestRef.current?.abort();
        requestRef.current = null;
        setPage(null);
    };

    if (!page) return null;

    return (
        <VoltCardView
            className="voltpedia"
            frameStyle={3}
            initialPosition={{ x: 23, y: 41 }}
            isResizable={false}
            style={{ height: page.dimensions?.height ?? 398, width: page.dimensions?.width ?? 418 }}
            uniqueKey="voltpedia"
            unconstrainedPosition
        >
            <VoltCardHeaderView headerText="" onCloseClick={closePage}>
                <NativeText
                    background={0x578ca5}
                    className="voltpedia__native-title"
                    overrides={{ color: 0xffffff }}
                    text={page.header}
                    textStyle="u_frame_title"
                />
            </VoltCardHeaderView>
            <ClassicScrollAreaView className="voltpedia__viewport" contentClassName="voltpedia__content" minThumbSize={26} scrollStep={42} thumbSizeAdjustment={2}>
                <div className="voltpedia__native-container" onClick={handleContentClick}>
                    <NativeHabbopageContent fieldWidth={fieldWidth} markup={markup} onLinkClick={openMarkupLink} />
                </div>
            </ClassicScrollAreaView>
        </VoltCardView>
    );
};
