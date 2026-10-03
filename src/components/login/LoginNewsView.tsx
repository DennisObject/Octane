import { FC, useEffect, useState } from 'react';
import { loginText } from '../../api';
import { useLoginNews } from '../../hooks/login';

const AUTO_ADVANCE_MS = 10000;

// The hotel view's promo_article widget (500x118): header rule, page disks,
// a 150px image and the title, text and button beside it.
export const LoginNewsView: FC = () =>
{
    const articles = useLoginNews();
    const [index, setIndex] = useState(0);

    useEffect(() =>
    {
        if (articles.length < 2) return;

        const timer = window.setTimeout(() => setIndex((current) => (current + 1) % articles.length), AUTO_ADVANCE_MS);

        return () => window.clearTimeout(timer);
    }, [articles.length, index]);

    const article = articles[Math.min(index, articles.length - 1)];

    if (!article) return null;

    return (
        <aside className="login-promo-article" aria-label={loginText('landing.view.promo.article.header', 'News')}>
            <div className="login-promo-article-header">
                <span>{loginText('landing.view.promo.article.header', 'News')}</span>
            </div>
            {articles.length > 1 && (
                <div className="login-promo-article-navigation">
                    {articles.slice(0, 10).map((item, position) => (
                        <button
                            key={item.id}
                            type="button"
                            className={position === index ? 'is-active' : ''}
                            title={loginText('promo.article.widget.tooltip.go.to.article', 'Go to article')}
                            aria-label={item.title}
                            onClick={() => setIndex(position)}
                        />
                    ))}
                </div>
            )}
            <div className="login-promo-article-body">
                {article.image && <img className="login-promo-article-image" src={article.image} alt="" />}
                <div className="login-promo-article-content">
                    <div className="login-promo-article-title">{article.title}</div>
                    {article.body && <div className="login-promo-article-text">{article.body}</div>}
                    {article.linkText && article.linkUrl && (
                        <a className="login-promo-article-button" href={article.linkUrl} target="_blank" rel="noopener noreferrer">
                            {article.linkText}
                        </a>
                    )}
                </div>
            </div>
        </aside>
    );
};
