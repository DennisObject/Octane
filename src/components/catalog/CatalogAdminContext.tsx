import { createContext, FC, ReactNode, useContext, useEffect } from 'react';
import { isVoltAuthEnabled } from '../../api';
import { Permission } from '../../api/permissions';
import { useHasPermission } from '../../hooks';
import { useCatalogAdminUiStore } from '../../hooks/catalog/catalogAdminUiStore';
import { CatalogAdminMutations, useCatalogAdminMutations } from '../../hooks/catalog/useCatalogAdminMutations';

interface ICatalogAdminContext extends CatalogAdminMutations {
    /**
     * The server-confirmed catalog admin permission. It only decides what the client shows:
     * the server authorises every admin request on its own.
     */
    canEdit: boolean;
    adminMode: boolean;
    setAdminMode: (adminMode: boolean) => void;
}

const CatalogAdminContext = createContext<ICatalogAdminContext>(null);

export const useCatalogAdmin = () => useContext(CatalogAdminContext);

export const CatalogAdminProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const hasPermission = useHasPermission(Permission.CatalogEdit);
    const canEdit = isVoltAuthEnabled() && hasPermission;
    const mutations = useCatalogAdminMutations();
    const adminMode = useCatalogAdminUiStore((state) => state.adminMode);
    const setAdminMode = useCatalogAdminUiStore((state) => state.setAdminMode);
    const reset = useCatalogAdminUiStore((state) => state.reset);

    // Losing the permission (rank change, re-login) closes admin mode and every editor.
    useEffect(() => {
        if (!canEdit) reset();
    }, [canEdit, reset]);

    return <CatalogAdminContext value={{ ...mutations, canEdit, adminMode: canEdit && adminMode, setAdminMode }}>{children}</CatalogAdminContext>;
};
