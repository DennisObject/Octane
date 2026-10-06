import { AddLinkEventTracker, ILinkEventTracker, OctaneLogger, RemoveLinkEventTracker } from '@octane/renderer';
import DOMPurify from 'dompurify';
import { FC, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, OpenUrl } from '../../api';
import { ClassicScrollAreaView, OctaneCardHeaderView, OctaneCardView } from '../../common';

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

export const OctanepediaView: FC<{}> = () => {
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
            OctaneLogger.error(`Failed to fetch ${url}`);
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

    const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
        const link = (event.target as HTMLElement).closest('a');

        if (!link || !event.currentTarget.contains(link)) return;

        event.preventDefault();

        const href = link.getAttribute('href') ?? '';

        if (href.startsWith(INTERNAL_LINK_PREFIX)) CreateLinkEvent(href.slice(1));
        else if (href) OpenUrl(link.href);
    };

    const closePage = () => {
        requestRef.current?.abort();
        requestRef.current = null;
        setPage(null);
    };

    if (!page) return null;

    return (
        <OctaneCardView
            className="octanepedia"
            frameStyle={3}
            initialPosition={{ x: 23, y: 41 }}
            isResizable={false}
            style={{ height: page.dimensions?.height ?? 398, width: page.dimensions?.width ?? 418 }}
            uniqueKey="octanepedia"
            unconstrainedPosition>
            <OctaneCardHeaderView headerText={page.header} onCloseClick={closePage} />
            <ClassicScrollAreaView className="octanepedia__viewport" contentClassName="octanepedia__content" scrollStep={42}>
                <div dangerouslySetInnerHTML={{ __html: markup }} onClick={handleContentClick} />
            </ClassicScrollAreaView>
        </OctaneCardView>
    );
};
