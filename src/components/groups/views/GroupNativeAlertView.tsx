import { createContext, FC, useContext } from 'react';
import { VoltCardHeaderView, VoltCardView } from '../../../common';
import { GroupText, GroupWindowTitle } from './GroupNativeLayout';

export interface GroupAlert {
    title: string;
    message: string;
}

/** Lets the step views raise the window manager's plain alert owned by the group window. */
export const GroupAlertContext = createContext<(alert: GroupAlert) => void>(() => undefined);

export const useGroupAlert = () => useContext(GroupAlertContext);

// habbo_window_alert_xml: 278x141 frame, text (27,14 210x57) and a thick Ok in the 215px button list at (26,81),
// both below the frame's 25px top margin and inside its 6px side margins.
export const GroupNativeAlertView: FC<{ alert: GroupAlert; onClose: () => void }> = ({ alert, onClose }) => (
    <VoltCardView
        aria-label={alert.title}
        className="volt-group-alert"
        frameStyle={3}
        isResizable={false}
        role="alertdialog"
        uniqueKey="group-alert"
    >
        <VoltCardHeaderView headerText="" onCloseClick={onClose} />
        <GroupWindowTitle title={alert.title} width={278} />
        <GroupText height={57} text={alert.message} wrap width={210} x={33} y={39} />
        <button autoFocus className="volt-group-native__button volt-group-alert__ok" type="button" onClick={onClose}>
            <GroupText blend="multiply" className="is-static" text="Ok" textStyle="u_bold" x={0} y={0} />
        </button>
    </VoltCardView>
);
