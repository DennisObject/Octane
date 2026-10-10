import { ButtonHTMLAttributes, DetailedHTMLProps, PropsWithChildren, Ref } from 'react';
import { classNames } from './classNames';

const classes = {
    base: 'inline-flex justify-center items-center gap-2 rounded-none leading-tight cursor-pointer select-none',
    disabled: 'opacity-55 pointer-events-none',
    size: {
        default: '',
        lg: 'px-5 py-1 min-h-[28px] text-sm font-bold',
        xl: 'px-6 py-1.5 min-h-[32px] text-sm font-bold'
    },
    variant: {
        default: 'habbo-btn-secondary',
        primary: 'habbo-btn-primary',
        buy: 'habbo-btn-buy',
        success: 'habbo-btn-success',
        danger: 'habbo-btn-danger'
    }
};

type VoltButtonProps = PropsWithChildren<{
    color?: 'default' | 'primary' | 'buy' | 'success' | 'danger' | 'dark' | 'ghost';
    size?: 'default' | 'lg' | 'xl';
    outline?: boolean;
    ref?: Ref<HTMLButtonElement>;
}> &
    DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

export const VoltButton = ({
    ref,
    color = 'default',
    size = 'default',
    outline = false,
    disabled = false,
    type = 'button',
    className = null,
    ...rest
}: VoltButtonProps) => {
    const variantClass = color === 'dark'
        ? 'btn-dark'
        : color === 'ghost'
          ? 'habbo-btn-secondary !bg-transparent'
          : classes.variant[color in classes.variant ? color : 'default'];

    return (
        <button
            ref={ref}
            className={classNames(
                classes.base,
                classes.size[size],
                color === 'dark' && size === 'default' && 'px-3 py-0.5 min-h-[22px] font-bold text-[11px]',
                outline ? 'habbo-btn-secondary !bg-transparent' : variantClass,
                disabled && classes.disabled,
                className
            )}
            disabled={disabled}
            type={type}
            {...rest}
        />
    );
};
