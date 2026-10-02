# Style-5 save button and door arrows

Primary build `WIN63-202609091217-117204808`. Skin registry `decompiled/binaryData/2319_class_836.bin` (`habbo_element_description_xml`, class `class_836`).

The save control is `button_thick` style 5, not `button` style 5. The door controls are `container_button` style 5. The arrows are child `icon` styles 2 and 3.

## Save button

Skin node: `type=button_thick intent=white style=5` asset `habbo_skin_button_shiny_thick_xml`, text layout `habbo_window_layout_button_shiny_thick_black_xml`, layout `button_shiny_thick`.

Instance in `layout/floor_plan_editor_bc.xml`: name `save`, 120×35, `width_min` 90, `width_max` 120, color `0x0bb3e3` = `#0BB3E3` (R 11, G 179, B 227).

Atlas: `habbo_blue_skin.png`, copied from `decompiled/images/2378_class_840.png` (`HabboWindowManagerCom.habbo_blue_skin_png` = `class_840`). The sheet is gray, not cyan. `BitmapSkinRenderer.configureWindowColorTransform` multiplies RGB by `channel/255` when the window color is below `0xFFFFFF`. Offsets are 0. Alpha is unchanged.

| State | Source x of left / center / right | y top, mid, bottom |
| --- | --- | --- |
| default | 32 / 37 / 38 | 50, 55, 69 |
| hovering | 44 / 49 / 51 | 50, 55, 69 |
| pressed | 57 / 62 / 63 | 50, 55, 69 |
| disabled | 69 / 74 / 75 | 50, 55, 69 |

Slice sizes: left and right 5×5, 5×14, 5×5. Center 1×5, 1×14, 1×5. Hover’s right edge starts at x=51, one pixel after the 1px center at x=49. That gap is in the sheet. The slices do not include it.

Layout `button_shiny_thick` is 11×24. Official scale words are `fixed`, `move`, and `strech` (spelled that way):

- Corners: fixed.
- Left and right edges: fixed horizontally, `strech` or `move` vertically.
- Top and bottom center: `strech` horizontally, fixed or `move` vertically.
- Middle center: `strech` both.

`fixed` copies the slice at its size. `move` shifts it by the extra pixels. `strech` adds the extra pixels to that slice and scales the bitmap with smoothing off. On a 120×35 button the extra is +109 width and +11 height, all of it on the center column and the middle row.

Caption layout: text style `button_shiny_bold`, color `#FFFFFF`, margins left 10, top 5, right 10, bottom 6. The font face behind `button_shiny_bold` is not in these skin files.

Rendered targets, tint already applied: `button_thick_style5_save_120x35_default.png`, `_hovering.png`, `_pressed.png`, `_disabled.png`. Untinted 11×24 assemblies and the nine slices per state use the same prefix. Tint in those renders truncates `int(channel * multiplier)`.

## Door button chrome

Skin node: `type=container_button intent=white style=5` asset `habbo_skin_button_shiny_large_xml`, layout `button_shiny_large`. These two buttons set no color. The default window color is `0xFFFFFF` (`DefaultAttStruct`), so the multiply tint is not applied. They are not cyan.

Atlas: `habbo_skin_ubuntu.png` from `decompiled/images/2925_habbo_skin_ubuntu_png$3e7b6c31bebfcaeb507157a302e0b5be1308799348.png`.

| State | Left x | Center x | Right x | Top y, mid y, bottom y |
| --- | --- | --- | --- | --- |
| default | 110 | 116 | 124 | 190, 196, 217 |
| pressed | 140 | 146 | 154 | 190, 196, 217 |
| hovering | 170 | 176 | 184 | 190, 196, 217 |
| disabled | 200 | 206 | 214 | 190, 196, 217 |

Slice sizes: sides 6 wide; center 8 wide; heights 6, 21, and 7. Layout box is 20×34. Each door button is 25×24, so the center gains +5 width and the middle row loses 10 height (21 becomes 11). Same `fixed` / `move` / `strech` rules.

Files: `container_button_style5_25x24_default.png`, `_hovering.png`, `_pressed.png`, `_disabled.png`, plus per-slice PNGs.

## Arrows

`habbo_skin_icon_set_xml`, asset `habbo_icons.png` from `decompiled/images/2949_habbo_icons_png$8b101e792160bfac16b264f6c2a8ba2d1546660773.png`.

| Style | Template | Sheet rect | Intent in the skin |
| --- | --- | --- | --- |
| 2 | `icon_2` | x=20 y=0 w=10 h=9 | Simple arrow left |
| 3 | `icon_3` | x=31 y=0 w=10 h=9 | Simple arrow right |

Layout name `icon16` is a fixed 16×16 slot. The bitmap is copied at its own 10×9 size at the slot origin. It is not scaled to 16×16 or to the widget box.

The editor sets icon color `0x00`. That passes the tint test and multiplies RGB by 0, leaving alpha. The glyphs are white in the sheet and black on screen.

Widget boxes, which do not stretch the glyph: left icon at (7, 7) size 30×30 inside the 25×24 left button; right icon at (9, 7) size 28×29 inside the right button.

Files: `icon_style2_arrow_left.png` and `icon_style3_arrow_right.png` are the black glyphs. `icon_style2_arrow_left_mask.png` and `icon_style3_arrow_right_mask.png` are the white sheet crops.

## Scrollbars and toolbar selection

Copied from `floor-editor-reference/assets/chrome/skin/` (`BARS-AND-SELECTION.md`). Style 3 art is 17px on the cross axis and is drawn at the widget origin. Height-map slots are 13px, so the extra 4px is clipped. The preview vertical slot is 20px and the 17px art stays left-aligned. Toolbar buttons are `container_button` style 3 at 51×42. Bit 16 is the skin state `pressed`. Files: `air/scroll/scrollbar3_*` and `air/toolbar_container_button_style3_51x42_{default,hovering,pressed}.png`.

## Frame and control corrections (2026-10-02)

Build remains `WIN63-202609091217-117204808`, resolved through Habbo Intelligence. The existing frame-ubuntu-3-bc.png already matches the original colorized frame; the extra CSS fill was removed rather than recoloring it. Atlas `decompiled/images/2925_habbo_skin_ubuntu_png$3e7b6c31bebfcaeb507157a302e0b5be1308799348.png`, skin `2731_habbo_skin_frame_3_xml$d1e23f95e0a5a8d49e2c96e218b39397322985329.bin`. Top 33 rows multiply by FF8D00; body and bottom stay untinted. The ordinary editor overrides default frame margins with 0/33/0/0 in its XML.

`dropmenu-frame.png` assembles left/center atlas (10,70) and separate right cap (140,70), 6/4/6 columns, 6/11/6 rows. `dropmenu-arrow.png` and `dropmenu-arrow-hover.png` are the 22x20 rectangles at (20,72) and (60,72). Skin `2136_habbo_skin_dropmenu_3_xml$89b64be081a9a84b6b80b746236626701322682160.bin`, window layout `1903_dropmenu_3_xml$1ab4a96b40d2038cce5d2f186668186f1537248225.bin`. Arrow moves to (90,2) on 114x25 controls; it is not stretched into a border.

`checkbox-default.png` and `checkbox-selected.png` are fixed 15x15 style-0 crops at (410,0)/(410,16) of `2378_class_840.png` (habbo_blue_skin), which style 3 falls back to. `panel-border.png` is the style-3 border-slot crop at (20,30), 7x7, from that sheet, multiplied by BDBDB5 with alpha unchanged and 3/1/3 slices.

`height-colormap.png` reproduces `BCFloorPlanEditor.createTileHeightColorMap`: 315x19, one column per x, palette index int(x/315*30). Colors use the unoccupied uint(255*channel) values from the extraction height-colors.csv, not a browser gradient. Slider geometry is from the copied editor layout; the 56x2 wall-divider asset stretches horizontally to 111x2, and the 17x21 thumb stretches to its 12x16 XML slot.

Ghost avatar bitmap stays at its natural sh size: AvatarImageWidget.refresh assigns the widget dimensions from its bitmap without a CSS scale.

The dropmenu labels grow through TextLabelController.refresh and ButtonController expand-to-child; the item layout 12px is not the final row. Embedded Ubuntu Regular metrics (em 1000, ascent 932, descent 190), leading 0, text-field gutter 4 and floor-to-pixel give a 17px caption plus 2/4 margins: 23px rows and a 99px four-item popup. Closed runtime caption width is 102 after closeExpandedMenuView; the separate arrow remains at x=90.
