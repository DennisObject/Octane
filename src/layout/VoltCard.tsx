import { DetailedHTMLProps, HTMLAttributes, MouseEvent, PropsWithChildren, Ref, useRef, useImperativeHandle } from 'react';
import { DraggableWindow, DraggableWindowPosition, DraggableWindowProps } from '../common';
import { CardResizeHandle } from '../common/card/CardResizeHandle';
import { classNames } from './classNames';
import { VoltItemCountBadge } from './VoltItemCountBadge';

type VoltCardRootProps = PropsWithChildren<
    {
        ref?: Ref<HTMLDivElement>;
    } & DraggableWindowProps
> &
    DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const VoltCardRoot = ({
    ref,
    uniqueKey = null,
    handleSelector = '.drag-handler',
    windowPosition = DraggableWindowPosition.CENTER,
    disableDrag = false,
    dragStyle = {},
    offsetLeft = 0,
    offsetTop = 0,
    className = null,
    children,
    ...rest
}: VoltCardRootProps) => {
    const elementRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => elementRef.current);
    const isWired = className?.split(/\s+/).includes('volt-wired');
    const isResizable = !className?.split(/\s+/).includes('resize-none') && rest.style?.resize !== 'none';

    return (
        <DraggableWindow
            disableDrag={disableDrag}
            dragStyle={isWired ? dragStyle : { filter: 'drop-shadow(2.828px 2.828px 4px rgba(0, 0, 0, 0.349))', ...dragStyle }}
            handleSelector={handleSelector}
            offsetLeft={offsetLeft}
            offsetTop={offsetTop}
            uniqueKey={uniqueKey}
            windowPosition={windowPosition}
        >
            <div
                ref={elementRef}
                className={classNames(
                    'volt-card volt-card-shell flex flex-col min-w-full min-h-full max-w-full max-h-full',
                    !className?.includes('volt-card-frame-') && !className?.includes('volt-wired') && 'volt-card-frame-3',
                    className
                )}
                {...rest}
            >
                {children}
                {!isWired && isResizable && <CardResizeHandle uniqueKey={uniqueKey} elementRef={elementRef} />}
            </div>
        </DraggableWindow>
    );
};

type VoltCardHeaderProps = {
    headerText: string;
    onCloseClick?: (event: MouseEvent) => void;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const VoltCardHeader = ({ ref, headerText = '', onCloseClick = null, className = null, ...rest }: VoltCardHeaderProps) => {
    const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
    };

    return (
        <div
            ref={ref}
            className={classNames(
                'volt-card-header-shell relative flex items-center justify-center flex-col drag-handler min-h-card-header max-h-card-header',
                className
            )}
        >
            <div className="flex items-center justify-center w-full ">
                <span className="volt-card-title text-white">{headerText}</span>
                <div
                    className="volt-card-close-button absolute flex items-center justify-center cursor-pointer"
                    onClick={onCloseClick}
                    onMouseDownCapture={onMouseDown}
                />
            </div>
        </div>
    );
};

type VoltCardContentProps = {
    isLoading?: boolean;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const VoltCardContent = ({ ref, isLoading = false, className = null, children = null, ...rest }: VoltCardContentProps) => {
    return (
        <div ref={ref} className={classNames('volt-card-content-shell flex flex-col overflow-auto p-[10px] h-full', className)} {...rest}>
            {isLoading && <div className="absolute top-0 left-0 z-10 opacity-50 size-full bg-muted" />}
            {children}
        </div>
    );
};

type VoltCardTabsProps = {
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const VoltCardTabs = ({ ref, className = null, ...rest }: VoltCardTabsProps) => {
    return (
        <div
            ref={ref}
            className={classNames('volt-card-tabs-shell justify-center gap-1 flex min-h-card-tabs max-h-card-tabs px-2 pt-1', className)}
            {...rest}
        />
    );
};

type VoltCardTabItemProps = {
    isActive?: boolean;
    count?: number;
    ref?: Ref<HTMLDivElement>;
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

const VoltCardTabItem = ({ ref, isActive = false, count = 0, className = null, children = null, ...rest }: VoltCardTabItemProps) => {
    return (
        <div
            ref={ref}
            className={classNames(
                'volt-card-tab-item overflow-hidden relative cursor-pointer rounded-t-[8px] flex px-3 py-[6px] z-1',
                isActive && 'volt-card-tab-item-active -mb-px',
                className
            )}
            {...rest}
        >
            <div className="flex items-center justify-center shrink-0">{children}</div>
            {count > 0 && <VoltItemCountBadge count={count} />}
        </div>
    );
};

export const VoltCard = Object.assign(VoltCardRoot, {
    Header: VoltCardHeader,
    Content: VoltCardContent,
    Tabs: VoltCardTabs,
    TabItem: VoltCardTabItem
});
