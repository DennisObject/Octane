import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { useFurniturePlaylistEditorWidget } from '../../../../../hooks';
import { DiskInventoryView } from './DiskInventoryView';
import { SongPlaylistView } from './SongPlaylistView';

export const FurniturePlaylistEditorWidgetView: FC<{}> = (props) => {
    const {
        objectId = -1,
        currentPlayingIndex = -1,
        playlist = null,
        diskInventory = null,
        onClose = null,
        togglePlayPause = null,
        removeFromPlaylist = null,
        addToPlaylist = null
    } = useFurniturePlaylistEditorWidget();

    if (objectId === -1) return null;

    return (
        <VoltCardView className="volt-playlist-editor-widget" theme="primary-slim">
            <VoltCardHeaderView headerText={LocalizeText('playlist.editor.title')} onCloseClick={onClose} />
            <VoltCardContentView>
                <div className="playlist-editor-layout flex flex-row gap-1 h-full min-h-0">
                    <div className="playlist-editor-pane relative overflow-hidden h-full rounded flex flex-col min-w-0">
                        <DiskInventoryView addToPlaylist={addToPlaylist} diskInventory={diskInventory} />
                    </div>
                    <div className="playlist-editor-pane relative overflow-hidden h-full rounded flex flex-col min-w-0">
                        <SongPlaylistView
                            currentPlayingIndex={currentPlayingIndex}
                            furniId={objectId}
                            playlist={playlist}
                            removeFromPlaylist={removeFromPlaylist}
                            togglePlayPause={togglePlayPause}
                        />
                    </div>
                </div>
            </VoltCardContentView>
        </VoltCardView>
    );
};
