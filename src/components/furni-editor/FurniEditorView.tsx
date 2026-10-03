import { FC, useEffect } from 'react';
import { LocalizeText } from '../../api';
import { StaffStatus, StaffWindow, StaffWindowTab } from '../../common';
import { useHasPermission } from '../../hooks';
import {
    FURNI_EDITOR_GROUPS,
    FurniEditorGroupMark,
    FurniEditorMutationKind,
    FurniEditorNotice,
    FurniEditorTab,
    localizeFurniEditorText,
    useFurniEditorActions,
    useFurniEditorForm,
    useFurniEditorLinkEvents,
    useFurniEditorNavigation,
    useFurniEditorState,
    useFurniEditorUiStore,
    useFurnidataDraft
} from '../../hooks/furni-editor';
import { FurniEditorEditView } from './views/FurniEditorEditView';
import { FurniEditorSearchView } from './views/FurniEditorSearchView';

const PERMISSION = 'acc_catalogfurni';

const MARK_SUFFIX: Record<Exclude<FurniEditorGroupMark, null>, string> = { changed: ' *', invalid: ' !' };

interface StatusLine {
    tone: 'error' | 'success' | 'pending';
    message: string;
}

// One status line at a time: a pending write, then the last result, then reads in flight.
const statusOf = (pending: FurniEditorMutationKind | null, notice: FurniEditorNotice | null, isLoadingDetail: boolean, isImporting: boolean): StatusLine | null => {
    if (pending) return { tone: 'pending', message: LocalizeText(pending === 'delete' ? 'furni.editor.status.deleting' : 'furni.editor.status.saving') };
    if (notice) return { tone: notice.tone, message: localizeFurniEditorText(notice) };
    if (isLoadingDetail) return { tone: 'pending', message: LocalizeText('furni.editor.status.loading') };
    if (isImporting) return { tone: 'pending', message: LocalizeText('furni.editor.status.importing') };

    return null;
};

/**
 * Staff furni editor (items_base + furnidata), opened through the
 * furni-editor/* links only. It renders for the server-confirmed
 * acc_catalogfurni permission; the emulator checks that permission again on
 * every packet, so nothing here is a security boundary.
 */
export const FurniEditorView: FC = () => {
    const canEdit = useHasPermission(PERMISSION);
    const isVisible = useFurniEditorUiStore((state) => state.isVisible);
    const activeTab = useFurniEditorUiStore((state) => state.activeTab);
    const setVisible = useFurniEditorUiStore((state) => state.setVisible);
    const setTab = useFurniEditorUiStore((state) => state.setTab);
    const { detail, importResult, notice, isLoadingDetail, isImporting, pendingMutation } = useFurniEditorState();
    const { loadInteractions, refreshSearch, reloadOpenItem, closeItem, clearNotice } = useFurniEditorActions();

    // The sheet's form lives here, so it survives closing the window, the tabs
    // can mark unsaved groups and leaving the open furni can ask first.
    const item = detail?.item ?? null;
    const sheet = useFurniEditorForm(item);
    const draft = useFurnidataDraft(item, detail?.furniDataEntry ?? null, importResult);
    const navigation = useFurniEditorNavigation(item?.id ?? 0, sheet.isDirty || draft.isDirty);
    const isOpen = isVisible && canEdit;

    useFurniEditorLinkEvents({ canEdit, onClose: navigation.close, onOpenSprite: navigation.openBySprite });

    // Losing the permission closes the window and drops the open furni.
    useEffect(() => {
        if (canEdit) return;

        setVisible(false);
        closeItem();
    }, [canEdit, setVisible, closeItem]);

    useEffect(() => {
        if (!isOpen) return;

        loadInteractions();
        refreshSearch();
        reloadOpenItem();
    }, [isOpen, loadInteractions, refreshSearch, reloadOpenItem]);

    if (!isOpen) return null;

    const shownTab: FurniEditorTab = item ? activeTab : 'search';
    const tabs: StaffWindowTab<FurniEditorTab>[] = [
        { id: 'search', label: LocalizeText('furni.editor.tab.search') },
        ...FURNI_EDITOR_GROUPS.map((group) => {
            const mark = sheet.groupMarks[group];

            return { id: group, label: `${LocalizeText(`furni.editor.tab.${group}`)}${mark ? MARK_SUFFIX[mark] : ''}`, disabled: !item };
        })
    ];

    const status = statusOf(pendingMutation, notice, isLoadingDetail, isImporting);

    return (
        <StaffWindow
            activeTab={shownTab}
            className="octane-furni-editor"
            tabs={tabs}
            title={LocalizeText('furni.editor.title')}
            uniqueKey="furni-editor"
            onClose={navigation.close}
            onTabChange={setTab}
        >
            {status && (
                <StaffStatus
                    dismissLabel={LocalizeText('furni.editor.status.dismiss')}
                    message={status.message}
                    tone={status.tone}
                    onDismiss={notice && !pendingMutation ? clearNotice : undefined}
                />
            )}
            <div className={`octane-furni-editor-page ${shownTab === 'search' ? '' : 'is-hidden'}`}>
                <FurniEditorSearchView onOpen={navigation.open} />
            </div>
            {detail && sheet.form && sheet.stored && (
                <div className={`octane-furni-editor-page ${shownTab === 'search' ? 'is-hidden' : ''}`}>
                    <FurniEditorEditView
                        detail={detail}
                        draft={draft}
                        form={sheet.form}
                        group={shownTab === 'search' ? 'names' : shownTab}
                        sheet={sheet}
                        stored={sheet.stored}
                        onBack={navigation.back}
                        onOpen={navigation.open}
                    />
                </div>
            )}
        </StaffWindow>
    );
};
