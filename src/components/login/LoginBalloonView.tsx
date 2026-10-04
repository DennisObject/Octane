import { FC, ReactNode } from 'react';

interface LoginErrorBalloonProps {
    text: string | null;
}

// LoginFlow.showErrorMessage: a dark balloon pointing down at the buttons.
export const LoginErrorBalloon: FC<LoginErrorBalloonProps> = ({ text }) =>
    text ? (
        <div className="login-flow-balloon" role="alert">
            {text}
        </div>
    ) : null;

interface LoginInfoPanelProps {
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}

// The dark information panel AvatarView draws under the chosen Habbo, used
// here for hotel status and ban details.
export const LoginInfoPanel: FC<LoginInfoPanelProps> = ({ title, children, action }) => (
    <div className="login-flow-panel" role="status">
        <div className="login-flow-panel-title">{title}</div>
        {children && <div className="login-flow-panel-text">{children}</div>}
        {action && <div className="login-flow-panel-action">{action}</div>}
    </div>
);
