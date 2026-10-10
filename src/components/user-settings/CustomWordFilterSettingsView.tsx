import {
    AddCustomFilterWordMessageComposer,
    CustomFilterResultEvent,
    GetCustomFilterMessageComposer,
    ModifyCustomFilterResultEvent,
    RemoveCustomFilterWordMessageComposer
} from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../../hooks';
import { SettingsWindow } from './SettingsWindow';

// ModifyCustomFilterResult codes of the v75 word filter window: 1 added a word, 3 removed one.
const RESULT_ADDED = 1;
const RESULT_REMOVED = 3;
// Row colours of the v75 list: odd rows white, even rows #e9e9e1, selected #9ab8d9, hovered #b6d9ff.
const ROW_COLOR_ODD = '#ffffff';
const ROW_COLOR_EVEN = '#e9e9e1';
const ROW_COLOR_SELECTED = '#9ab8d9';
const ROW_COLOR_HOVER = '#b6d9ff';

export const CustomWordFilterSettingsView: FC<{ onClose: () => void }> = ({ onClose }) => {
    const [words, setWords] = useState<string[]>([]);
    const [word, setWord] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [hoverIndex, setHoverIndex] = useState(-1);

    useEffect(() => {
        SendMessageComposer(new GetCustomFilterMessageComposer());
    }, []);

    useMessageEvent<CustomFilterResultEvent>(CustomFilterResultEvent, (event) => {
        const incoming = event.getParser().words;

        setWords((previous) => [...previous, ...incoming.filter((value) => !previous.includes(value))]);
    });

    useMessageEvent<ModifyCustomFilterResultEvent>(ModifyCustomFilterResultEvent, (event) => {
        const parser = event.getParser();

        if (parser.result === RESULT_ADDED) setWords((previous) => (previous.includes(parser.word) ? previous : [...previous, parser.word]));
        else if (parser.result === RESULT_REMOVED) setWords((previous) => previous.filter((value) => value !== parser.word));
    });

    const addWord = () => {
        if (word.length === 0 || words.includes(word)) return;

        SendMessageComposer(new AddCustomFilterWordMessageComposer(word));
        setWord('');
        setSelectedIndex(-1);
    };

    const removeWord = () => {
        const selected = words[selectedIndex];

        if (!selected) return;

        setSelectedIndex(-1);
        SendMessageComposer(new RemoveCustomFilterWordMessageComposer(selected));
    };

    // Hovering a row paints the hover colour even over the selected row (v75 OVER); leaving restores the selection.
    const rowColor = (index: number) => {
        if (index === hoverIndex) return ROW_COLOR_HOVER;
        if (index === selectedIndex) return ROW_COLOR_SELECTED;

        return index % 2 !== 0 ? ROW_COLOR_ODD : ROW_COLOR_EVEN;
    };

    const addWordLabel = localizeWithFallback('navigator.roomsettings.roomfilter.addword', 'Add');

    return (
        <SettingsWindow
            className="has-classic-scrollbar"
            lineWidth={162}
            lineX={41}
            name="wordfilter"
            title={localizeWithFallback('word_filter.settings.title', 'Word filter')}
            titleWidth={153}
            titleX={46}
            width={242}
        >
            <div className="us-at us-filter-input-box" style={{ left: 11, top: 36, width: 152, height: 24 }}>
                <input
                    aria-label={addWordLabel}
                    className="us-filter-input"
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                />
            </div>
            <button className="us-button us-at" style={{ left: 168, top: 36, width: 66, height: 24 }} type="button" onClick={addWord}>
                {addWordLabel}
            </button>
            <div className="us-at us-filter-list-box" style={{ left: 11, top: 67, width: 222, height: 100 }}>
                <div className="us-filter-list">
                    {words.map((value, index) => (
                        <button
                            key={value}
                            className="us-filter-row"
                            style={{ background: rowColor(index), height: 20 }}
                            type="button"
                            onClick={() => setSelectedIndex(index)}
                            onMouseEnter={() => setHoverIndex(index)}
                            onMouseLeave={() => setHoverIndex(-1)}
                        >
                            {value}
                        </button>
                    ))}
                </div>
            </div>
            <button className="us-button us-at" disabled={selectedIndex < 0} style={{ left: 11, top: 174, width: 210, height: 30 }} type="button" onClick={removeWord}>
                {localizeWithFallback('navigator.roomsettings.roomfilter.removeword', 'Remove')}
            </button>
            <button className="us-button us-at" style={{ left: 11, top: 211, width: 60 }} type="button" onClick={onClose}>
                {localizeWithFallback('widget.memenu.back', localizeWithFallback('generic.back', 'Back'))}
            </button>
        </SettingsWindow>
    );
};
