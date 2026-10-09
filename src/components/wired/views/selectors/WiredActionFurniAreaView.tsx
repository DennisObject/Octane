import { GetRoomEngine, RoomAreaSelectionManager } from '@octane/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredButtonRow } from '../WiredButtonRow';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredActionFurniAreaView: FC<{}> = (props) => {
    const [rootX, setRootX] = useState(0);
    const [rootY, setRootY] = useState(0);
    const [areaWidth, setAreaWidth] = useState(0);
    const [areaHeight, setAreaHeight] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    // InArea.as: both buttons need an activated area selection manager; Select Area stays disabled from the click until the drag (or Clear) reports an area.
    const [isAreaActive, setIsAreaActive] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    // True only while this window's own activate() succeeded: another selector's activation is never touched, cleared or deactivated from here.
    const ownsAreaSelection = useRef(false);
    const { trigger = null, setIntParams } = useWired();

    const save = useCallback(() => {
        setIntParams([rootX, rootY, areaWidth, areaHeight, filterExisting ? 1 : 0, invert ? 1 : 0]);
    }, [rootX, rootY, areaWidth, areaHeight, filterExisting, invert, setIntParams]);

    // Activate the area selection manager when dialog opens, deactivate on close
    useEffect(() => {
        if (!trigger) return;

        const callback = (x: number, y: number, w: number, h: number) => {
            setRootX(x);
            setRootY(y);
            setAreaWidth(w);
            setAreaHeight(h);
            setIsSelecting(false);
        };

        const activated = GetRoomEngine().areaSelectionManager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);

        ownsAreaSelection.current = activated;

        if (activated) {
            // Restore previously saved area highlight when re-opening dialog
            if (trigger.intData.length >= 4 && trigger.intData[2] > 0 && trigger.intData[3] > 0) {
                GetRoomEngine().areaSelectionManager.setHighlight(trigger.intData[0], trigger.intData[1], trigger.intData[2], trigger.intData[3]);
            }
        }

        return () => {
            if (ownsAreaSelection.current) GetRoomEngine().areaSelectionManager.deactivate();

            ownsAreaSelection.current = false;
        };
    }, [trigger]);

    useEffect(() => {
        if (!trigger) return;

        if (trigger.intData.length >= 4) {
            setRootX(trigger.intData[0]);
            setRootY(trigger.intData[1]);
            setAreaWidth(trigger.intData[2]);
            setAreaHeight(trigger.intData[3]);
        } else {
            setRootX(0);
            setRootY(0);
            setAreaWidth(0);
            setAreaHeight(0);
        }

        setFilterExisting(trigger.intData.length >= 5 && trigger.intData[4] === 1);
        setInvert(trigger.intData.length >= 6 && trigger.intData[5] === 1);
        // The first effect has just tried to activate the manager: both buttons work only when that call succeeded (InArea.onEditStart).
        setIsAreaActive(ownsAreaSelection.current);
        setIsSelecting(false);
    }, [trigger]);

    useEffect(() => {
        if (!trigger || !ownsAreaSelection.current) return;

        GetRoomEngine().areaSelectionManager.setHighlightType(invert ? RoomAreaSelectionManager.HIGHLIGHT_GREEN : RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);
    }, [invert, trigger]);

    const selectArea = () =>
    {
        // Direct calls obey the same enable rules as the button: an owned manager that is idle (InArea.onSelect runs only from an enabled button).
        if (!ownsAreaSelection.current || GetRoomEngine().areaSelectionManager.areaSelectionState !== RoomAreaSelectionManager.NOT_SELECTING_AREA) return;

        setIsSelecting(true);
        GetRoomEngine().areaSelectionManager.startSelecting();
    };

    const clearArea = () =>
    {
        if (!ownsAreaSelection.current) return;

        GetRoomEngine().areaSelectionManager.clearHighlight();
        setRootX(0);
        setRootY(0);
        setAreaWidth(0);
        setAreaHeight(0);
        setIsSelecting(false);
    };

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: '385px' }}>
            <WiredSection title={LocalizeText('wiredfurni.params.area_selection')}>
                <span className="octane-wired__text octane-wired__text--soft octane-wired__text--wrap">{LocalizeText('wiredfurni.params.area_selection.info')}</span>
                <WiredButtonRow
                    buttons={[
                        { id: 'select', label: LocalizeText('wiredfurni.params.area_selection.select'), disabled: !isAreaActive || isSelecting, onClick: selectArea },
                        { id: 'clear', label: LocalizeText('wiredfurni.params.area_selection.clear'), disabled: !isAreaActive, onClick: clearArea }
                    ]}
                />
            </WiredSection>
            <WiredSection title={LocalizeText('wiredfurni.params.selector_options_selector')}>
                <WiredCheckboxGroup>
                    <WiredCheckboxOption checked={filterExisting} label={LocalizeText('wiredfurni.params.selector_option.0')} onChange={setFilterExisting} />
                    <WiredCheckboxOption checked={invert} label={LocalizeText('wiredfurni.params.selector_option.1')} last={true} onChange={setInvert} />
                </WiredCheckboxGroup>
            </WiredSection>
        </WiredSelectorBaseView>
    );
};
