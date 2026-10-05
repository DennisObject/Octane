import { GetSessionDataManager, HabboSearchComposer, HabboSearchResultData } from '@octane/renderer';
import { FC, FormEvent } from 'react';
import { GetConfigurationValue, GetUserProfile, LocalizeText, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useFriends } from '../../../../hooks';
import { FriendsListFaceView, FriendsListProfileView, FriendsListSkinView } from './friends-list-group/FriendsListGroupItemView';

export const FriendsSearchView: FC<{ className?: string }> = ({ className = '' }) => {
    const { sentRequests, requestFriend, searchResults, searchValue, setSearchValue } = useFriends();
    const { friends: friendResults, others: otherResults } = searchResults;

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = searchValue.trim();
        if (value.length) SendMessageComposer(new HabboSearchComposer(value));
    };

    const renderResult = (result: HabboSearchResultData, other: boolean, index: number) => <div key={result.avatarId}
        className={`hfl-search-result${index % 2 ? ' alternate' : ''}`} role="button" tabIndex={0}
        onClick={() => { if (result.avatarId > 0) GetUserProfile(result.avatarId); }}
        onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter' && result.avatarId > 0) GetUserProfile(result.avatarId); }}>
        <div className="hfl-search-avatar">{!!result.avatarFigure && (result.avatarId < 0
            ? <LayoutBadgeImageView badgeCode={result.avatarFigure} isGroup scale={0.5} showInfo={false} />
            : <FriendsListFaceView figure={result.avatarFigure} />)}</div>
        {result.avatarId > 0 && <span className="hfl-search-profile"><FriendsListProfileView userId={result.avatarId} /></span>}
        <span className="hfl-search-name">{result.avatarName}</span>
        <div className="hfl-search-actions">
            {!other && (result.isAvatarOnline || GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', false)) && <button type="button" className="hfl-action chat"
                title={LocalizeText('friendlist.tip.im')} onClick={(event) => { event.stopPropagation(); OpenMessengerChat(result.avatarId); }} />}
            {other && result.avatarId !== GetSessionDataManager().userId && !sentRequests.includes(result.avatarId) && <button type="button" className="hfl-action add"
                title={LocalizeText('friendlist.tip.addfriend')} onClick={(event) => { event.stopPropagation(); requestFriend(result.avatarId, result.avatarName); }} />}
        </div>
    </div>;
    const heading = (kind: 'friends' | 'others', count: number) => LocalizeText(count ? `friendlist.search.${kind}caption` : `friendlist.search.no${kind}found`, ['cnt'], [String(count)]);

    return <div className={`hfl-search-results ${className}`}>
        <div className="hfl-search-results-scroll">
            <h4 className="hfl-search-heading">{heading('friends', friendResults.length)}</h4>
            {friendResults.map((result, index) => renderResult(result, false, index + 1))}
            <h4 className={`hfl-search-heading${(friendResults.length + 1) % 2 ? ' alternate' : ''}`}>{heading('others', otherResults.length)}</h4>
            {otherResults.map((result, index) => renderResult(result, true, friendResults.length + index + 2))}
        </div>
        <form className="hfl-search-form" onSubmit={submitSearch}>
            <FriendsListSkinView border />
            <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} aria-label={LocalizeText('generic.search')} />
            <button type="submit"><FriendsListSkinView /><i /><span>{LocalizeText('generic.search')}</span></button>
        </form>
    </div>;
};
