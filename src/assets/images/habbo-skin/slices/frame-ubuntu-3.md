# Ubuntu frame 3 provenance

Source: official AIR `WIN63-202609091217-117204808`, exported under
`polaris/reference/habbo-air-WIN63-202609091217-117204808/decompiled`.

`2731_habbo_skin_frame_3_xml` defines the `habbo_skin_ubuntu_png` atlas rectangle
`(10, 10, 26, 55)`, with nine-slice boundaries `33 10 10 10`.
Only its top 33 rows are colorized. `BitmapSkinRenderer.configureWindowColorTransform`
multiplies each RGB channel by the window color, preserving alpha. The default
frame and `130_class_69` achievement window use `0xff418db0`; the committed
`frame-ubuntu-3.png` already applies that transform using integer channel values.
Its decoded RGBA pixels were compared directly with a fresh source crop and transform.
The body and bottom corners retain the source pixels.

`2119_frame_3_xml` supplies the header origin `(6, 6)`, content origin `(3, 36)`,
and shadow (distance 4, angle 45, alpha 0.35, blur 4). CSS draws the bitmap
without an additional fill, corner mask, or radius; the draggable wrapper owns
the shadow.

Output SHA-256: `c5c7213dda5a01ec51d49d65344a883803225612f4d89cdb8f50e158a712e195`.
