# Scrollbars and toolbar selection — WIN63-202609091217-117204808

Skin registry `2319_class_836.bin`. Atlas for every piece below is `habbo_skin_ubuntu.png` except the toolbar, which is `habbo_blue_skin.png`. No color multiply: these windows do not set a color, and the default is `0xFFFFFF`.

## XML boxes

| Name | Tag | Style | Box |
| --- | --- | --- | --- |
| `heightmap_scroll_vertical` | scrollbar_vertical | 3 | x=331 y=132, 13×304 |
| `heightmap_scroll_horizontal` | scrollbar_horizontal | 3 | x=0 y=435, 332×13 |
| `preview_scroll_vertical` | scrollbar_vertical | 3 | x=274 y=135, 20×299 |
| `preview_scroll_horizontal` | scrollbar_horizontal | 3 | x=0 y=435, 280×14 |

Style 3 uses `habbo_skin_scrollbar_3_xml` (`scrollbar_style3_skin.xml`). The cross-axis of that skin is 17px and its scale is `fixed`. A 13px or 20px widget does not squash or stretch the chrome. The 17px art is placed at the widget origin, then clipped to the slot.

## Clip

The official renderer clips that 17px art to the XML slot. `overflow: hidden` on the 13px height-map bar matches it. The 20px preview slot is wider than the art, so the full 17px stays visible and 3px of the slot stays empty. The 14px preview horizontal bar clips the same way on the vertical axis.

`WindowModel.renderingWidth` is the window width (`var_31`). `etchingPoint` is `POINT_ZERO`, so the height-map slot stays 13px and the preview slot stays 20px. `WindowRendererItem` allocates the skin bitmap at that size, and `BitmapSkinRenderer` draws into it. A 17px slice copied into a 13px bitmap is cut by the bitmap edge.

Child buttons are clipped too. `class_4253` maps `use_parent_graphic_context` to param bit 16. These scrollbar params include that bit: height-map vertical 2129, height-map horizontal 1169, preview vertical 2065, preview horizontal 1041. The button layouts set the same flag. `WindowModel.clipping` defaults to true (`var_2245`), and these layouts do not turn it off. `WindowRenderer.childRectToClippedDrawRegion`, when the parent has bit 16 and clipping, shrinks the blit so it cannot pass `parent.renderingX + parent.renderingWidth` or `parent.renderingY + parent.renderingHeight`.

## Vertical bar

Window layout `scrollbar_vertical_window_layout.xml`, native 17×56.

- Up button `decrement`: 17×16 at (0, 0), fixed. Sheet rects, all 17×16: default (160, 70), pressed (180, 70), hover (200, 70), disabled/passive (220, 70).
- Down button `increment`: 17×16, `move`s to the bottom. Sheet y=140, same x columns.
- Track `slider_track`: y=16, width 17, height stretches (`strech`) to `barHeight - 32`. Source is 17×2 at (160, 130) for default and pressed, (220, 130) for disabled. Scaled with smoothing off.
- Thumb `slider_bar`: x=0, initial height 24, `height_min` 12. Skin layout is 17×30: top 17×5 fixed, `grd` tiled, bottom 17×5 `move`. Template also has a `mid` slice at y=95; the layout never names it, so it is not drawn.

Lift sheet, 17px wide: top y=90 h=5, grd y=100 h=16, bottom y=119 h=5. Columns: default x=160, pressed x=180, hover x=200. The disabled lift template is empty, so a disabled thumb draws nothing.

Files: `scrollbar3_button_up_*_button.png`, `scrollbar3_button_down_*_button.png`, `scrollbar3_track_ver_*_track.png`, `scrollbar3_lift_vertical_*_*.png`, assembled thumbs `scrollbar3_lift_vertical_{default,hovering,pressed}_17x24.png`. Reference bars, 160px tall so the track is visible: `heightmap_scroll_vertical_13x160_default.png`, `preview_scroll_vertical_20x160_default.png`, and the unclipped `scrollbar_vertical_style3_17x160_default.png`. Real XML heights are 304 and 299; only the track grows.

## Horizontal bar

Window layout `scrollbar_horizontal_window_layout.xml`, native 56×17. Same structure turned sideways.

- Left button 16×17 at sheet x=260. Default y=70, pressed y=90, hover y=110, disabled y=130.
- Right button 16×17 at sheet x=330, same rows.
- Track source 2×17 at (320, 70) default and pressed, (320, 130) disabled. Stretches horizontally.
- Thumb initial width 24, `width_min` 12. Layout 30×17: left 5×17, `grd` tiled, right 5×17 `move`. Template `cnt` is unused. Columns of the end caps: left x=280, right x=309. `grd` is 16×17 at x=290. Rows: default y=70, pressed y=90, hover y=110.

Files: `scrollbar3_button_left_*`, `scrollbar3_button_right_*`, `scrollbar3_track_hor_*`, `scrollbar3_lift_horizontal_{default,hovering,pressed}_24x17.png`, `heightmap_scroll_horizontal_160x13_default.png`, `scrollbar_horizontal_style3_160x17_default.png`.

States, highest first (`SkinContainer.statesByRenderPriority`): locked 64, disabled 32, pressed 16, selected 8, hovering 4, focused 2, active 1, default 0. A bit is used only when that skin registered it.

## Toolbar selection

`add_tile`, `remove_tile`, `increase_height`, `decrease_height`, and `set_enter_tile` are `container_button` style 3, 51×42. That style is `habbo_skin_button_shiny_thick_xml` / layout `button_shiny_thick`, the same gray sheet as the save button, with no `#0BB3E3` multiply.

`BCFloorPlanEditor` sets `state | 0x10` on the active tool and clears it with `& ~16` on the others. Bit 16 is the skin state `pressed`, not `selected` (bit 8). This skin has `default`, `hovering`, `pressed`, and `disabled`. It has no `selected` template. Pressed outranks hovering, so the active tool stays on the pressed slices even when the pointer is elsewhere.

Native box 11×24 (5+1+5 by 5+14+5). At 51×42 the 1px center gains +40 width and the 14px middle gains +18 height. `fixed` / `move` / `strech`, smoothing off. Slice coordinates are the save-button table in `PROVENANCE.md`.

Rendered: `toolbar_container_button_style3_51x42_default.png`, `_hovering.png`, `_pressed.png`, `_disabled.png`. Use `_pressed` for the active tool.
