import { CreateLinkEvent, HabboWebTools } from '@octane/renderer';

// v75 Notification link handling: "event:" links run a link event and close the alert, everything else opens a page.
export const openNativeNotificationLink = (url: string) => {
    if (!url) return;

    if (url.startsWith('event:')) CreateLinkEvent(url.substring(6));
    else HabboWebTools.openWebPage(url);
};
