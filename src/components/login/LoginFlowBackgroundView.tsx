import { CSSProperties, FC, useState } from 'react';

interface LoginFlowBackgroundViewProps {
    leftUrl: string;
    rightUrl: string;
}

// LoginFlow's own stage: login.Background (the #0c5a7f to #0c3a65 gradient
// under the background_tiles scanline asset, filling the stage) and the two
// landing-view images, faded in over 1.2s once loaded. AIR places the left
// one at x=-50 and the right one at max(400, stageWidth - width + 50), both
// 50px below the bottom edge.
export const LoginFlowBackgroundView: FC<LoginFlowBackgroundViewProps> = ({ leftUrl, rightUrl }) =>
{
    const [rightWidth, setRightWidth] = useState(0);
    const [loaded, setLoaded] = useState<Record<string, boolean>>({});
    const markLoaded = (key: string) => setLoaded((current) => ({ ...current, [key]: true }));

    return (
        <div className="login-flow-stage" aria-hidden="true">
            <div className="login-flow-background" />
            {leftUrl && <img className={`login-flow-landing-left${loaded.left ? ' is-loaded' : ''}`} src={leftUrl} alt="" draggable={false} onLoad={() => markLoaded('left')} />}
            {rightUrl && (
                <img
                    className={`login-flow-landing-right${loaded.right ? ' is-loaded' : ''}`}
                    style={{ '--landing-right-width': `${rightWidth}px` } as CSSProperties}
                    src={rightUrl}
                    alt=""
                    draggable={false}
                    onLoad={(event) =>
                    {
                        setRightWidth(event.currentTarget.naturalWidth);
                        markLoaded('right');
                    }}
                />
            )}
        </div>
    );
};
