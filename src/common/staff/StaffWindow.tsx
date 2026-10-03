import { FC, KeyboardEvent, ReactNode } from 'react';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardTabsItemView, OctaneCardTabsView, OctaneCardView } from '../card';
import { DraggableWindowPosition } from '../draggable-window';

export interface StaffWindowTab<T extends string | number> {
    id: T;
    label: string;
    disabled?: boolean;
}

interface StaffWindowProps<T extends string | number> {
    uniqueKey: string;
    title: string;
    onClose: () => void;
    tabs?: StaffWindowTab<T>[];
    activeTab?: T;
    onTabChange?: (tab: T) => void;
    className?: string;
    windowPosition?: string;
    children?: ReactNode;
}

/**
 * Habbo frame-3 window (the inventory/navigator chrome) shared by the staff tools.
 * Escape closes the window only while focus is inside it, so it never steals the key
 * from chat or another window.
 */
export const StaffWindow = <T extends string | number>(props: StaffWindowProps<T>) => {
    const { uniqueKey, title, onClose, tabs = [], activeTab, onTabChange, className = '', windowPosition = DraggableWindowPosition.CENTER, children } = props;

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return;

        event.preventDefault();
        onClose();
    };

    return (
        <OctaneCardView
            className={`octane-staff-window ${className}`}
            frameStyle={3}
            isResizable={false}
            uniqueKey={uniqueKey}
            windowPosition={windowPosition}
            onKeyDown={onKeyDown}
        >
            <OctaneCardHeaderView headerText={title} onCloseClick={() => onClose()} />
            {tabs.length > 0 && (
                <OctaneCardTabsView classNames={['octane-staff-tabs']}>
                    {tabs.map((tab) => (
                        <OctaneCardTabsItemView
                            key={tab.id}
                            classNames={tab.disabled ? ['is-disabled'] : []}
                            isActive={tab.id === activeTab}
                            onClick={() => !tab.disabled && onTabChange?.(tab.id)}
                        >
                            {tab.label}
                        </OctaneCardTabsItemView>
                    ))}
                </OctaneCardTabsView>
            )}
            <OctaneCardContentView classNames={['octane-staff-body']}>{children}</OctaneCardContentView>
        </OctaneCardView>
    );
};

interface StaffSectionProps {
    title?: string;
    className?: string;
    children?: ReactNode;
}

/** A captioned, sunk panel - the grouping box the AIR staff windows use. */
export const StaffSection: FC<StaffSectionProps> = ({ title = '', className = '', children = null }) => (
    <section className={`octane-staff-section ${className}`}>
        {title && <h3 className="octane-staff-section-title">{title}</h3>}
        <div className="octane-staff-section-body">{children}</div>
    </section>
);

interface StaffFieldProps {
    label: string;
    className?: string;
    children?: ReactNode;
}

export const StaffField: FC<StaffFieldProps> = ({ label, className = '', children = null }) => (
    <label className={`octane-staff-field ${className}`}>
        <span className="octane-staff-field-label">{label}</span>
        {children}
    </label>
);

interface StaffStatusProps {
    tone: 'error' | 'success' | 'pending';
    message: string;
    onDismiss?: () => void;
    dismissLabel?: string;
}

export const StaffStatus: FC<StaffStatusProps> = ({ tone, message, onDismiss = null, dismissLabel = '' }) => (
    <div className={`octane-staff-status is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
        <span className="octane-staff-status-text">{message}</span>
        {onDismiss && <button aria-label={dismissLabel} className="octane-staff-status-dismiss" title={dismissLabel} type="button" onClick={onDismiss} />}
    </div>
);

export const StaffEmpty: FC<{ children?: ReactNode }> = ({ children = null }) => <div className="octane-staff-empty">{children}</div>;
