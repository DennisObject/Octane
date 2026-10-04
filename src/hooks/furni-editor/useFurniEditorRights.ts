import { Permission } from '../../api/permissions';
import { useHasPermission } from '../session';

/**
 * Rights on top of catalog.edit (which opens the editor): furnidata
 * writes and deleting a furni. They only hide controls; PlusEMU checks the
 * same rights on every packet.
 */
export const useFurniEditorRights = () => {
    const canEditFurnidata = useHasPermission(Permission.FurniEdit);
    const canDelete = useHasPermission(Permission.FurniDelete);

    return { canEditFurnidata, canDelete };
};

export type FurniEditorRights = ReturnType<typeof useFurniEditorRights>;
