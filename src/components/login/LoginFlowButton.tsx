import { FC, ReactNode } from 'react';

interface LoginFlowButtonProps {
    colour: 'green' | 'red';
    type?: 'button' | 'submit';
    disabled?: boolean;
    onClick?: () => void;
    children: ReactNode;
}

// The official onboarding ColouredButton: 40px tall, sized to its caption.
export const LoginFlowButton: FC<LoginFlowButtonProps> = ({ colour, type = 'button', disabled = false, onClick, children }) => (
    <button type={type} className={`login-flow-button login-flow-button-${colour}`} disabled={disabled} onClick={onClick}>
        {children}
    </button>
);
