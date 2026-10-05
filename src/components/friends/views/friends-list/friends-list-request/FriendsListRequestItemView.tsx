import { FC } from 'react';
import { GetUserProfile, LocalizeText, MessengerRequest } from '../../../../../api';
import { useFriends } from '../../../../../hooks';
import { FriendsListProfileView } from '../friends-list-group/FriendsListGroupItemView';

export const FriendsListRequestItemView: FC<{ request: MessengerRequest }> = (props) => {
    const { request = null } = props;
    const { requestResponse = null } = useFriends();

    if (!request) return null;

    return (
        <div className="hfl-request" role="button" tabIndex={0} onClick={() => GetUserProfile(request.requesterUserId)}
            onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter') GetUserProfile(request.requesterUserId); }}>
                <div className="hfl-request-profile">
                    <FriendsListProfileView userId={request.requesterUserId} />
                </div>
                <span className="hfl-request-name">{request.name}</span>
            {request.state === MessengerRequest.PENDING ? <div className="hfl-request-actions">
                <button type="button" className="accept" title={LocalizeText('friendlist.tip.accept')} onClick={(event) => { event.stopPropagation(); requestResponse(request.id, true); }} />
                <button type="button" className="decline" title={LocalizeText('friendlist.tip.decline')} onClick={(event) => { event.stopPropagation(); requestResponse(request.id, false); }} />
            </div> : <span className="hfl-request-outcome">{LocalizeText(request.state === MessengerRequest.ACCEPTED ? 'friendlist.request.accepted'
                : request.state === MessengerRequest.DECLINED ? 'friendlist.request.declined' : 'friendlist.request.failed')}</span>}
        </div>
    );
};
