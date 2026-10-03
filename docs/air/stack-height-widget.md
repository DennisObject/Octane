# Stack / walk height AIR reference

Reference build: **WIN63-202609091217-117204808**, qualified with the Habbo AIR bundle verifier and resolved through Habbo Intelligence.

Source paths below are relative to the reference build's `decompiled/` directory:

- `binaryData/993_custom_stack_height_xml$26662ba014dd9aae8c30cece026da767795030613.bin`: element geometry, child order and localisation keys.
- `scripts/com/sulake/habbo/ui/widget/furniture/CustomStackHeightWidget.as`: `open` (105), actions/drag/double-click/Enter (165), integer height conversion (278), slider selection (299), authoritative-height guards (322,452), input blur (375), and leading/trailing scheduler/cancellation (384–450).
- `scripts/com/sulake/habbo/ui/handler/class_3711.as`: floor-item class name and extras (86–101), live object-Z updates (121), null/NaN fallback (157), and rights validation (167).

## Geometry

Frame style 100 uses `illumina_light_frame_xml` (`2670_class_1029.bin`). Its content origin is **(1,30)**, title is (8,11), and close button is (width−28,9), 20×20. The frame is **320×185** in stack mode and **320×210** in walk mode. Feature coordinates are relative to that content origin.

| Element | x,y | width×height |
| --- | --- | --- |
| height_text | 10,5 | 294×59 |
| button_move_up | 9,62 | 19×20 |
| button_move_down | 9,84 | 19×20 |
| slider | 35,68 | 206×30 |
| slider_button | dynamic,0 within slider | 20×30 |
| input border | 250,68 | 58×30 |
| input_height | 7,7 within border | 45×20 |
| button_above_stack | 12,110 | 134×29 |
| button_floor_level | 182,110 | 126×29 |
| walktile_container | 0,149 | 318×24 |
| multiwalk_checkbox | 13,3 within walk container | 17×16 |
| multi-walk text | 31,2 within walk container | 282×19 |

The official captions are `widget.custom.{stack|walk}.height.{title|text}`, `furniture.above.stack`, `furniture.floor.level`, and `widget.custom.multiwalk_mode.text`. Walk mode is selected only by `className.startsWith('tile_walkmagic')`.

## Skins and ownership

The messenger already ports Illumina bitmap skins in `src/assets/images/friends/swf`. Shared `src/common/air/AirWindow` primitives reuse these frame, close, plain-button, and input-fill assets rather than generic card chrome. Feature CSS owns only widget coordinates. The type/style registry is `binaryData/2319_class_836.bin`: frame 100, button/container-button 102, border 105. Text uses the bundled Ubuntu regular/bold fonts, with the 10px `il_frame_title` / `il_button` chrome styles from `1911_styles_css$331fdac96f28616e1b8267d78836e3a31096655112.bin`.

- Frame skin: `1906_illumina_light_skin_frame_xml$93b07f46eea29363b8621e4c40e29416538658899.bin`.
- Plain button skin: `2571_illumina_light_skin_button_plain_xml$46bcdc77db3ae4a4eb2c1090598b48561266935471.bin` (8/4/8/6 caps, independent curves and lower etching).
- Input border/fill skin: `2379_illumina_light_skin_border_input_xml$0fb022e1148e272c78ab317f12dc31a82076311573.bin` (separate border and fill layers).
- Checkbox: existing `habbo-skin/slices/checkbox-{default,checked}.png`, clipped to the XML's logical 17×16 box. The XML asks for checkbox style 102, which has no registered Illumina checkbox skin; AIR falls back to style 0 (`SkinContainer.getSkinRendererByTypeAndStyle`, 82–94), so the default family is retained.
- Arrows: icon styles 0/1, `2653_habbo_skin_icon_set_xml$70c232c67195c1e7eca21666000b39f51214385630.bin`, native 9×10 bitmaps in 12×12 icon windows, RGB multiplied by #7f7f7f.

Additional shared crops are recorded in `src/assets/images/habbo-skin/illumina/provenance.csv`. Reference exports are not modified or committed.

## Behaviour and packets

Open clamps only the displayed height to 80. The slider travels 186 integer pixels (AIR `class_1763.x` is an int) and maps 0–10; larger heights pin its thumb. Selection truncates hundredths; double-click truncates whole heights. Height packets use ActionScript-compatible signed `int(value * 100)` conversion. The 30ms scheduler sends a leading update and the latest trailing value, with a final send only after real thumb movement. Explicit actions, close, removal, unmount and item switches cancel pending sends.

Input admits only `0123456789.`. Typing is local; Enter submits and aligns the slider. Blur without Enter restores cached authority. Object Z is read on room-engine ticks, with null/NaN fallback, alongside the height echo; authoritative updates are cached while dragging, editing or waiting for a live/final send. Existing furniture manipulation permissions are preserved.

| Action | AIR header / composer | Octane target / payload |
| --- | --- | --- |
| Height / above / floor | out 2882, class_2776 | out 3839, `[id, int(height*100)]`, `[id,-100]`, `[id,0]` |
| Multi-walk | out 2882, class_2776 | out 3839, `[id, int(height*100), multiWalk]` |
| Adjacent | out 1643, class_2921 | out 2687, `[id, moveDown]` |
| Height echo | — | in 2816, FurnitureStackHeightEvent |

Header IDs are unchanged. An omitted multi-walk argument preserves the original two-field renderer payload; explicit false is appended. The checkbox opens with `Number(model.getValue(FURNITURE_EXTRAS)) === 1`.

## Visual evidence and limits

Local captures are under `/home/ubuntu/dev/plus/octane-wt/stack-height-evidence/`: stack/walk side-by-side PNGs, native widget PNGs, browser observations and build logs. Captures use Chromium 151, 1280×800 CSS pixels, DPR 1, bundled fonts loaded, and production CSS. The preview runs the actual widget, hook, shared controls and composers, with isolated room/event/localisation fixtures. Scheduler observations additionally use a controlled browser clock. No frontend test suite was added.

All table geometry matches observed browser rectangles. No official AIR runtime screenshot or authenticated Octane room was available: the left panels therefore show geometry read directly from the official XML, not an AIR screenshot. Full text rasterisation parity with AIR's Flash anti-aliasing remains unproven; browser text uses the same font family/size/weight, but cannot reproduce Flash's sharpness/thickness renderer. The preview's English captions are fixture text; production resolves the official keys.
