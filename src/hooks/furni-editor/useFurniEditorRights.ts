import { useHasPermission } from '../session';

/**
 * Rights on top of acc_catalogfurni (which opens the editor): furnidata
 * writes and deleting a furni. They only hide controls; PlusEMU checks the
 * same rights on every packet.
 */
export const useFurniEditorRights = () => {
    const canEditFurnidata = useHasPermission('acc_furnidata_edit');
    const canDelete = useHasPermission('acc_furni_delete');

    return { canEditFurnidata, canDelete };
};

export type FurniEditorRights = ReturnType<typeof useFurniEditorRights>;
