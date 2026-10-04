import { HousekeepingAccessSnapshot } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../api';
import { HousekeepingRolesApi } from '../../api/housekeeping/HousekeepingRolesApi';
import { IHousekeepingActionResult } from '../../api/housekeeping/IHousekeepingTypes';

export const useHousekeepingRoles = (allowed: boolean) =>
{
    const [snapshot, setSnapshot] = useState<HousekeepingAccessSnapshot | null>(null);
    const [roleId, setRoleId] = useState(0);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
    const pending = useRef(false);
    const generation = useRef(0);

    const reload = useCallback(async () =>
    {
        const request = ++generation.current;

        try
        {
            const data = await HousekeepingRolesApi.snapshot();

            if (request === generation.current) setSnapshot(data);
        }
        catch
        {
            if (request === generation.current) setStatus({ ok: false, message: LocalizeText('housekeeping.action.error') });
        }
    }, []);

    useEffect(() =>
    {
        let active = true;
        if (allowed) HousekeepingRolesApi.snapshot().then(data =>
        {
            if (active) setSnapshot(data);
        }).catch(() =>
        {
            if (active) setStatus({ ok: false, message: LocalizeText('housekeeping.action.error') });
        });
        return () =>
        {
            active = false;
        };
    }, [allowed]);

    const run = useCallback(async (action: () => Promise<IHousekeepingActionResult>, selectResult = false) =>
    {
        if (pending.current) return false;
        pending.current = true;
        setBusy(true);
        setStatus(null);

        try
        {
            const result = await action();

            setStatus({ ok: result.ok, message: LocalizeText(result.ok ? 'housekeeping.roles.saved' : result.message || 'housekeeping.action.error') });
            if (result.ok && selectResult) setRoleId(result.actionId || 0);
            await reload();

            return result.ok;
        }
        catch
        {
            setStatus({ ok: false, message: LocalizeText('housekeeping.action.error') });

            return false;
        }
        finally
        {
            pending.current = false;
            setBusy(false);
        }
    }, [reload]);

    return { snapshot: allowed ? snapshot : null, roleId, setRoleId, busy, status, setStatus, run, reload };
};

export type HousekeepingRolesState = ReturnType<typeof useHousekeepingRoles>;
