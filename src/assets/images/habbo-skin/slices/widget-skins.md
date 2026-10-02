# Widget skin sources

Official AIR build: `WIN63-202609091217-117204808`. Source exports live in
`polaris/reference/habbo-air-WIN63-202609091217-117204808/decompiled`.

The four `button-black-{default,hover,pressed,disabled}.png` assets follow
`habbo_skin_button_default_black_xml`, on `habbo_blue_skin_png`
(`2378_class_840.png`). They retain the 3px corners and compress the repeatable
center to one pixel, yielding 7x7 nine-slices. Default origin is (89,100);
state rectangles come directly from the skin templates. Registry
`2319_class_836.bin` maps button style 1 to this skin. `941_class_629.bin` and
`1103_class_1322.bin` use it for furniture and pet actions. The text layout
`2928_button_black_xml` specifies white Volter 9 and margins 8/4/8/4.

Group neutral shiny-thick slices already exist. Registry button_thick style 3
maps to `habbo_skin_button_shiny_thick_xml`, five-pixel caps with Ubuntu Bold 12.
The room-info control is 175x29 at (10,79) in `1188_class_760.bin`.

The group popup backgrounds are whole images, not nine-slices:
`groups/swf/group_bg.png` is the 195x119 `guilds/group_bg.png` image named by
`1188_class_760.bin`; `groups/swf/event_bg_contracted.png` is the 195x25
`Events/event_bg_contracted.png` image named by the same layout. These external
c_images assets retain their original decoded pixels and alpha.

Frame 3 provenance and tint verification are recorded in `frame-ubuntu-3.md`.

Furniture `border-colorless-3d3d3d.png` is a 13x13 compact nine-slice from
`2939_class_848.bin` (6px corners, one-pixel center, atlas y=229/235/241,
x=0/6/12), RGB multiplied by the furniture widget's default #3d3d3d.
`close-black.png` already exactly matches atlas (377,116,15,15), specified by
`2559_class_855.bin`; default, active and pressed share this template.
The bitmap is at control (0,0), unscaled, inside the 18x16 hit area.

`border-6-79756e.png` is the ubuntu atlas rectangle (80,10,20,20), with 8px
caps and a 4px center (`2727_habbo_skin_border_6_xml`), multiplied by the
Me menu window color #79756e. `class_4233.as:171` defaults a missing colorize
attribute to true. RGB multiplication truncates channel values and preserves
alpha; no CSS tint or rounded rectangle is layered over these bitmaps.
