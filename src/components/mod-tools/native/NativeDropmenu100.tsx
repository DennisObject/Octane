import { CSSProperties, FC, useState } from 'react';
import { NativeText } from '../../../common/native-text/NativeText';
import illuminaAtlas from '../../../assets/mod-tools/skins/habbo-illumina-light-skin.png';
import dropmenuXml from '../../../assets/mod-tools/skins/skin-illumina-dropmenu.xml?raw';
import { NativeSkin, parseNativeSkin } from './NativeSkin';
import { NativeSkinView } from './NativeSkinView';

const SKIN = parseNativeSkin(dropmenuXml);
// the open list is the dropmenu frame without its arrow
const LIST_SKIN: NativeSkin = {
    ...SKIN,
    layouts: { ...SKIN.layouts, illumina_light_dropmenu_frame: { ...SKIN.layouts.illumina_light_dropmenu_frame, entities: SKIN.layouts.illumina_light_dropmenu_frame.entities.filter((entity) => entity.name !== 'arrow') } }
};

const ITEM_HEIGHT = 19;
const rect = (x: number, y: number, width: number, height: number): CSSProperties => ({ left: x, top: y, width, height });

interface Native100DropmenuProps {
    x: number;
    y: number;
    width: number;
    height: number;
    caption: string;
    items: string[];
    /** The item the menu shows as chosen: drawn in the selected state while the list is open. */
    selectedIndex?: number;
    open: boolean;
    onToggle: () => void;
    onSelect: (index: number) => void;
    /** Rows the open list is taller than its items (the classic handler's 20px menu draws a list one row longer than the 19px ones). */
    listExtra?: number;
}

/** dropmenu style 100 (Illumina light): a white rounded face with the caption at (10, 3) and a grey arrow; the open list covers it with the items 19px apart from (6, 2). */
export const Native100Dropmenu: FC<Native100DropmenuProps> = ({ x, y, width, height, caption, items, selectedIndex = -1, open, onToggle, onSelect, listExtra = 0 }) => {
    const [over, setOver] = useState(false);
    const [hover, setHover] = useState(-1);

    return (
        <div className="native100-dropmenu" style={rect(x, y, width, height)} onPointerEnter={() => setOver(true)} onPointerLeave={() => setOver(false)}>
            <NativeSkinView atlas={illuminaAtlas} height={height} layout="illumina_light_dropmenu_frame" skin={SKIN} state={over ? 'hovering' : 'default'} width={width} />
            <div className="native100-dropmenu__caption" style={{ left: 10, top: 3, width: width - 40, height: 14 }}>
                <NativeText background={0xffffff} text={caption} textStyle="il_regular" />
            </div>
            <div className="native100-dropmenu__region" onClick={onToggle} />
            {open && (
                <div className="native100-dropmenu__list" style={{ left: 0, top: 0, width, height: items.length * ITEM_HEIGHT + 6 + listExtra }} onPointerLeave={() => setHover(-1)}>
                    <NativeSkinView atlas={illuminaAtlas} height={items.length * ITEM_HEIGHT + 6 + listExtra} layout="illumina_light_dropmenu_frame" skin={LIST_SKIN} width={width} />
                    {items.map((item, index) => (
                        <div key={index} className="native100-dropmenu__item" style={rect(6, 2 + index * ITEM_HEIGHT, width - 12, ITEM_HEIGHT)} onClick={() => onSelect(index)} onPointerMove={() => setHover(index)}>
                            <NativeSkinView atlas={illuminaAtlas} height={ITEM_HEIGHT} layout="illumina_light_dropmenu_item" skin={SKIN} state={hover === index ? 'hovering' : selectedIndex === index ? 'selected' : 'default'} width={width - 12} />
                            <div className="native100-dropmenu__text" style={{ left: 4, top: 1, width: width - 20, height: ITEM_HEIGHT - 1 }}>
                                <NativeText background={hover === index ? 0xebebeb : selectedIndex === index ? 0xdddddd : 0xffffff} text={item} textStyle="il_regular" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
