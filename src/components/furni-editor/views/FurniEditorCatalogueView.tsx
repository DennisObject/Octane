import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { StaffEmpty, StaffSection } from '../../../common';
import { CatalogRef, formatCatalogPrice, furniEditorText } from '../../../hooks/furni-editor';

/** The catalogue offers that sell this furni. */
export const FurniEditorCatalogueView: FC<{ catalogItems: CatalogRef[] }> = ({ catalogItems }) => (
    <StaffSection title={furniEditorText('furni.editor.catalogue.title', { count: catalogItems.length })}>
        {catalogItems.length === 0 ? (
            <StaffEmpty>{LocalizeText('furni.editor.catalogue.empty')}</StaffEmpty>
        ) : (
            <table className="octane-staff-table">
                <thead>
                    <tr>
                        <th>{LocalizeText('furni.editor.catalogue.page')}</th>
                        <th>{LocalizeText('furni.editor.catalogue.offer')}</th>
                        <th className="octane-furni-editor-end">{LocalizeText('furni.editor.catalogue.price')}</th>
                    </tr>
                </thead>
                <tbody>
                    {catalogItems.map((ref) => (
                        <tr key={ref.id}>
                            <td>
                                {ref.pageName} <span className="octane-staff-muted">#{ref.pageId}</span>
                            </td>
                            <td className="octane-furni-editor-ellipsis">
                                {ref.catalogName} <span className="octane-staff-muted">#{ref.id}</span>
                            </td>
                            <td className="octane-furni-editor-end">{formatCatalogPrice(ref)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </StaffSection>
);
