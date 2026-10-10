import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue } from '../../api';
import { subscribePlugins } from './VoltPluginApi';

import './VoltPluginApi';

export const ExternalPluginLoader: FC<{}> = () => {
    const [, forceUpdate] = useState(0);
    const [pluginUrls, setPluginUrls] = useState<string[]>([]);

    useEffect(() => {
        return subscribePlugins(() => forceUpdate((n) => n + 1));
    }, []);

    useEffect(() => {
        let urls: string[] = [];

        try {
            urls = GetConfigurationValue<string[]>('external.plugins', []) || [];
        } catch (e) {
            console.warn('[VoltPlugins] Could not read external.plugins config:', e);
            return;
        }

        if (!urls.length) {
            console.log('[VoltPlugins] No external plugins configured');
            return;
        }

        console.log('[VoltPlugins] Loading external plugins:', urls);
        setPluginUrls(urls);
    }, []);

    if (!pluginUrls.length) return null;

    return (
        <>
            {pluginUrls.map((url) => (
                <script
                    key={url}
                    async
                    src={url}
                    onLoad={() => console.log(`[VoltPlugins] Loaded: ${url}`)}
                    onError={() => console.warn(`[VoltPlugins] Failed to load: ${url}`)}
                />
            ))}
        </>
    );
};
