import { GetConfiguration } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { fetchNewsArticles, NewsArticle } from '../../api';

export const useLoginNews = () =>
{
    const [articles, setArticles] = useState<NewsArticle[]>([]);

    useEffect(() =>
    {
        const url = GetConfiguration().interpolate(GetConfiguration().getValue<string>('login.news.url', ''));

        if (!url) return;

        const controller = new AbortController();

        fetchNewsArticles(url, controller.signal)
            .then(setArticles)
            .catch(() =>
            {});

        return () => controller.abort();
    }, []);

    return articles;
};
