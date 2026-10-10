import { ButtonHTMLAttributes, FC } from 'react';

export type ChestButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    /** Footer / dialog buttons with longer captions (auto width, min 73px). */
    wide?: boolean;
    /** Compact square control (upgrade +, 24×24). */
    icon?: boolean;
    /** Fixed 73×22 like coins_chest_contents.xml withdraw_btn. */
    fixed?: boolean;
    /** chest_generic.xml footer buttons (89–92×30). */
    footer?: boolean;
};

/** Habbo wired-chest Putyhef-style button (chest_generic.xml / coins_chest_contents.xml). */
export const ChestButton: FC<ChestButtonProps> = ({
    wide = false,
    icon = false,
    fixed = false,
    footer = false,
    className = '',
    type = 'button',
    children,
    ...rest
}) => {
    const classes = [
        'volt-chest__btn',
        wide ? 'volt-chest__btn--wide' : '',
        icon ? 'volt-chest__btn--icon' : '',
        fixed ? 'volt-chest__btn--fixed' : '',
        footer ? 'volt-chest__btn--footer' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} className={classes} {...rest}>
            {children}
        </button>
    );
};
