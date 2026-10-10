import { CSSProperties, FC, PropsWithChildren, ReactNode } from 'react';
import boxLines from '../../assets/images/wired/native/menu_box_lines.png';
import discordIcon from '../../assets/images/wired/native/menu_discord.png';
import { VoltCardHeaderView, VoltCardView } from '../../common';

interface Rect {
    x: number;
    y: number;
    w?: number;
    h?: number;
}

const place = ({ x, y, w, h }: Rect): CSSProperties => ({ left: x, top: y, width: w, height: h });

/** An absolutely placed element of the wired_menu_view layout: the XML rect is the contract. */
export const WiredMenuItem: FC<PropsWithChildren<Rect & { className?: string; style?: CSSProperties }>> = ({ x, y, w, h, className = '', style, children }) => (
    <div className={`volt-wired-menu__item ${className}`} style={{ ...place({ x, y, w, h }), ...style }}>
        {children}
    </div>
);

/** The `border` windows of the menu: a flat 0xdadada panel. */
export const WiredMenuPanel: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item volt-wired-menu__panel ${className}`} style={place(rect)}>
        {children}
    </div>
);

export const WiredMenuTitle: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item volt-wired-menu__text volt-wired-menu__text--bold ${className}`} style={place(rect)}>
        {children}
    </div>
);

export const WiredMenuText: FC<PropsWithChildren<Rect & { className?: string }>> = ({ className = '', children, ...rect }) => (
    <div className={`volt-wired-menu__item volt-wired-menu__text ${className}`} style={place(rect)}>
        {children}
    </div>
);

interface WiredMenuCheckboxProps extends Rect {
    checked: boolean;
    disabled?: boolean;
    label: ReactNode;
    onChange: (checked: boolean) => void;
}

/** `option_box`: a 20px checkbox window at (0,1) and its label at x=20. */
export const WiredMenuCheckbox: FC<WiredMenuCheckboxProps> = ({ checked, disabled = false, label, onChange, ...rect }) => (
    <label className={`volt-wired-menu__item volt-wired-menu__option ${disabled ? 'is-disabled' : ''}`} style={place(rect)}>
        <input checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span className="volt-wired-menu__text">{label}</span>
    </label>
);

interface WiredMenuButtonProps extends Rect {
    disabled?: boolean;
    danger?: boolean;
    className?: string;
    title?: string;
    onClick: () => void;
}

/** The menu's `button_shiny_regular` buttons; the red ones use the 0xe33934 style 5 skin. */
export const WiredMenuButton: FC<PropsWithChildren<WiredMenuButtonProps>> = ({ disabled = false, danger = false, className = '', title, onClick, children, ...rect }) => (
    <button
        className={`volt-wired-menu__item volt-wired-menu__button ${danger ? 'is-danger' : ''} ${className}`}
        disabled={disabled}
        title={title}
        style={place(rect)}
        type="button"
        onClick={onClick}
    >
        {children}
    </button>
);

export interface WiredMenuTab {
    key: string;
    label: string;
}

interface WiredMenuFrameProps {
    title: string;
    tabs: WiredMenuTab[];
    activeTab: string;
    headerTitle: string;
    onTabChange: (key: string) => void;
    onClose: () => void;
}

const BOX_LINES = [8, 78, 148, 218, 288, 358, 428];

/** wired_menu_view: a 500x500 frame-3 window; every child below sits at the XML's client coordinates. */
export const WiredMenuFrame: FC<PropsWithChildren<WiredMenuFrameProps>> = ({ title, tabs, activeTab, headerTitle, onTabChange, onClose, children }) => (
    <VoltCardView
        className="volt-wired-menu"
        frameStyle={3}
        initialPosition={{ x: 36, y: 35 }}
        isResizable={false}
        theme="primary-slim"
        uniqueKey="wired-creator-tools"
    >
        <VoltCardHeaderView headerText={title} onCloseClick={onClose} />
        <div className="volt-wired-menu__client">
            <div className="volt-wired-menu__tabs" role="tablist">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.key}
                        aria-selected={tab.key === activeTab}
                        className={`volt-wired-menu__tab ${tab.key === activeTab ? 'is-active' : ''}`}
                        role="tab"
                        style={{ left: 8 + index * 96 }}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                    >
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="volt-wired-menu__header">
                <div className="volt-wired-menu__header-inner" />
                {BOX_LINES.map((x, index) => (
                    <img key={x} alt="" className="volt-wired-menu__box-lines" draggable={false} src={boxLines} style={{ left: x, top: index % 2 === 0 ? 20 : -20 }} />
                ))}
                <div className="volt-wired-menu__header-title">{headerTitle}</div>
                <div className="volt-wired-menu__discord">
                    <img alt="" draggable={false} src={discordIcon} />
                </div>
            </div>
            <div className="volt-wired-menu__body">{children}</div>
        </div>
    </VoltCardView>
);

export interface WiredMenuTableColumn {
    key: string;
    title: string;
    /** TableColumn.widthFactor: the share of the table's inner width. */
    factor: number;
    /** TableColumn.alignment; the official default is centred. */
    align?: 'left' | 'center' | 'right';
}

export interface WiredMenuTableRow {
    key: string;
    cells: Record<string, ReactNode>;
    linkColumn?: string;
    onLink?: () => void;
    selected?: boolean;
    onSelect?: () => void;
}

interface WiredMenuTableProps extends Rect {
    columns: WiredMenuTableColumn[];
    rows: WiredMenuTableRow[];
    emptyText?: string;
}

/** The shared TableView layout: a bordered panel, a 23px bold title row, a splitter and 20px rows. */
export const WiredMenuTable: FC<WiredMenuTableProps> = ({ columns, rows, emptyText = 'Nothing to display', ...rect }) => {
    const innerWidth = (rect.w ?? 472) - 10;
    const cellStyle = (column: WiredMenuTableColumn): CSSProperties => ({ width: Math.round(column.factor * innerWidth), textAlign: column.align ?? 'center' });

    return (
        <div className="volt-wired-menu__item volt-wired-menu__table" style={place(rect)}>
            <div className="volt-wired-menu__table-title">
                {columns.map((column) => (
                    <div key={column.key} className="volt-wired-menu__text volt-wired-menu__text--bold volt-wired-menu__cell" style={cellStyle(column)}>
                        {column.title}
                    </div>
                ))}
            </div>
            <div className="volt-wired-menu__table-splitter" />
            <div className="volt-wired-menu__table-rows has-classic-scrollbar">
                {rows.length === 0 && <div className="volt-wired-menu__table-empty volt-wired-menu__text">{emptyText}</div>}
                {rows.map((row, index) => (
                    <div key={row.key} className={`volt-wired-menu__table-row ${index % 2 === 0 ? 'is-even' : ''} ${row.selected ? 'is-selected' : ''}`} onClick={row.onSelect}>
                        {columns.map((column) => (
                            <div key={column.key} className="volt-wired-menu__text volt-wired-menu__cell" style={cellStyle(column)}>
                                {row.linkColumn === column.key ? (
                                    <button className="volt-wired-menu__link" type="button" onClick={row.onLink}>
                                        {row.cells[column.key]}
                                    </button>
                                ) : (
                                    row.cells[column.key]
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
