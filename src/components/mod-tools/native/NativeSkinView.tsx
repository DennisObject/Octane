import { CSSProperties, FC, useMemo } from 'react';
import { layoutNativeSkin, NativeSkin } from './NativeSkin';

interface NativeSkinViewProps {
    skin: NativeSkin;
    layout: string;
    atlas: string;
    atlasWidth: number;
    atlasHeight: number;
    width: number;
    height: number;
    className?: string;
    style?: CSSProperties;
}

/** Draws a window-manager skin layout at an exact size from its atlas bitmap (nearest neighbour, like the pixel copy of the classic skin renderer). */
export const NativeSkinView: FC<NativeSkinViewProps> = ({ skin, layout, atlas, atlasWidth, atlasHeight, width, height, className = '', style }) => {
    const pieces = useMemo(() => layoutNativeSkin(skin.layouts[layout], width, height), [skin, layout, width, height]);

    return (
        <div aria-hidden="true" className={`native-skin ${className}`.trim()} style={{ width, height, ...style }}>
            {pieces.map((piece, index) => {
                const scaleX = piece.width / piece.source.width;
                const scaleY = piece.height / piece.source.height;

                if (piece.width <= 0 || piece.height <= 0) return null;

                return (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            left: piece.x,
                            top: piece.y,
                            width: piece.width,
                            height: piece.height,
                            backgroundImage: `url(${atlas})`,
                            backgroundSize: `${atlasWidth * scaleX}px ${atlasHeight * scaleY}px`,
                            backgroundPosition: `${-piece.source.x * scaleX}px ${-piece.source.y * scaleY}px`,
                            backgroundRepeat: 'no-repeat',
                            imageRendering: 'pixelated'
                        }}
                    />
                );
            })}
        </div>
    );
};
