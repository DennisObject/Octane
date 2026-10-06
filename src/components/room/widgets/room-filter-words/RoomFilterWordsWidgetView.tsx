import { GetCustomRoomFilterMessageComposer, UpdateRoomFilterMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFilterWordsWidget, useNavigatorData } from '../../../../hooks';
import { NavigatorRoomSettingsAtView } from '../../../navigator/views/room-settings/NavigatorRoomSettingsAtView';

const DEFAULT_WORD = 'bobba';

// v75 iro_room_filter_framed (the ros_filter controller): a 250x230 frame with the add field, the word list and the
// add / remove buttons. Rows are ros_badword items; the list only changes through the server's filter packet.
export const RoomFilterWordsWidgetView: FC<{}> = (props) => {
    const [word, setWord] = useState<string>(DEFAULT_WORD);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const { wordsFilter = [], isVisible = null, setWordsFilter, onClose = null } = useFilterWordsWidget();
    const { navigatorData } = useNavigatorData();

    // Add: send the word, ask for the refreshed list and reset the field to its default.
    const addWord = () => {
        if (!word.length || !navigatorData?.enteredGuestRoom) return;

        const roomId = navigatorData.enteredGuestRoom.roomId;

        SendMessageComposer(new UpdateRoomFilterMessageComposer(roomId, true, word));
        SendMessageComposer(new GetCustomRoomFilterMessageComposer(roomId));
        setWord(DEFAULT_WORD);
    };

    // Remove: only the selected row; it disappears at once and the removal is sent without a refresh.
    const removeWord = () => {
        const selectedWord = wordsFilter?.[selectedIndex];

        if (selectedWord === undefined || !navigatorData?.enteredGuestRoom) return;

        SendMessageComposer(new UpdateRoomFilterMessageComposer(navigatorData.enteredGuestRoom.roomId, false, selectedWord));
        setWordsFilter((previous) => previous.filter((existing) => existing !== selectedWord));
        setSelectedIndex(-1);
    };

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-ros-filter" frameStyle={3} isResizable={false} uniqueKey="octane-room-filter">
            <OctaneCardHeaderView headerText={LocalizeText('navigator.roomsettings.roomfilter')} onCloseClick={() => onClose()} />
            <OctaneCardContentView className="octane-ros-filter-content" gap={0}>
                <NavigatorRoomSettingsAtView className="ros-list-border" h={30} w={130} x={5} y={8}>
                    <input
                        className="ros-filter-word"
                        type="text"
                        value={word}
                        maxLength={255}
                        onChange={(event) => setWord(event.target.value)}
                    />
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={30} w={137} x={140} y={8}>
                    <button type="button" className="ros-button ros-button-fit" onClick={addWord}>
                        <span className="ros-button-label">{LocalizeText('navigator.roomsettings.roomfilter.addword')}</span>
                    </button>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView className="ros-list-border" h={100} w={235} x={5} y={50}>
                    <div className="ros-filter-list">
                        {(wordsFilter ?? []).map((badWord, index) => (
                            <button
                                key={index}
                                type="button"
                                className={`ros-filter-row${index % 2 !== 0 ? ' is-odd' : ''}${index === selectedIndex ? ' is-selected' : ''}`}
                                onClick={() => setSelectedIndex(index)}
                            >
                                {badWord}
                            </button>
                        ))}
                    </div>
                </NavigatorRoomSettingsAtView>
                <NavigatorRoomSettingsAtView h={30} w={137} x={140} y={155}>
                    <button type="button" className="ros-button ros-button-fit" onClick={removeWord}>
                        <span className="ros-button-label">{LocalizeText('navigator.roomsettings.roomfilter.removeword')}</span>
                    </button>
                </NavigatorRoomSettingsAtView>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
