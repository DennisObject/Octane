import { useCallback, useEffect, useState } from 'react';
import { checkServerReachable, fetchMaintenanceStatus, MaintenanceStatus } from '../../api';

// Maintenance notice and game-server reachability shown on the landing page.
export const useHotelStatus = () =>
{
    const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
    const [serverReachable, setServerReachable] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    const recheckServer = useCallback(async (): Promise<boolean> =>
    {
        setChecking(true);

        try
        {
            const reachable = await checkServerReachable();

            setServerReachable(reachable);

            return reachable;
        }
        finally
        {
            setChecking(false);
        }
    }, []);

    useEffect(() =>
    {
        let cancelled = false;

        void fetchMaintenanceStatus().then((status) => !cancelled && status && setMaintenance(status));
        void checkServerReachable().then((reachable) => !cancelled && setServerReachable(reachable));

        return () =>
        {
            cancelled = true;
        };
    }, []);

    const reportMaintenance = useCallback((message: string) => setMaintenance({ enabled: true, message }), []);

    return { maintenance, serverReachable, checking, recheckServer, reportMaintenance };
};
