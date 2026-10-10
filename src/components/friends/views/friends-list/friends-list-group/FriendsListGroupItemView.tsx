import { AvatarScaleType, AvatarSetType, GetAvatarRenderManager } from '@volt/renderer';
import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GetConfigurationValue, GetUserProfile, LocalizeText, MessengerFriend, OpenMessengerChat } from '../../../../../api';
import NativeListAtlas from '../../../../../assets/images/friends/native-list-atlas.png';
import { LayoutBadgeImageView } from '../../../../../common';
import { useFriends } from '../../../../../hooks';

const faceCache = new Map<string, string>();

export const FriendsListFaceView: FC<{ figure: string }> = ({ figure }) => {
    const [url, setUrl] = useState<string>(null);
    const zoom = GetConfigurationValue<boolean>('zoom.enabled', false);

    useEffect(() => {
        let disposed = false;
        let generation = 0;
        const cacheKey = `${figure}:${zoom}`;
        const render = () => {
            if (disposed || !figure) return;
            const request = ++generation;
            const avatar = GetAvatarRenderManager().createAvatarImage(figure, zoom ? AvatarScaleType.LARGE : AvatarScaleType.SMALL, null, {
                resetFigure: render, dispose: null, disposed: false
            });
            if (!avatar) return;
            avatar.setDirection(AvatarSetType.HEAD, 2);
            const source = avatar.processAsImageUrl(AvatarSetType.HEAD);
            const placeholder = avatar.isPlaceholder();
            avatar.dispose();
            if (!source) return;
            const image = new Image();
            image.onload = () => {
                if (disposed || request !== generation) return;
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 20;
                const context = canvas.getContext('2d');
                if (!context) return;
                const scale = zoom ? 0.5 : 1;
                let bitmap: CanvasImageSource = image;
                if (zoom) {
                    const scaled = document.createElement('canvas');
                    scaled.width = Math.round(image.width * scale);
                    scaled.height = Math.round(image.height * scale);
                    const scaledContext = scaled.getContext('2d');
                    if (!scaledContext) return;
                    // eh:72535 scales the whole bitmap with smoothing before copyPixels.
                    scaledContext.imageSmoothingEnabled = true;
                    scaledContext.drawImage(image, 0, 0, scaled.width, scaled.height);
                    bitmap = scaled;
                }
                context.imageSmoothingEnabled = false;
                // ic:79609 and A:58423 truncate crop/destination coordinates before copying.
                const size = Math.trunc(50 * scale);
                context.drawImage(bitmap, Math.trunc(21 * scale), Math.trunc(28 * scale), size, size, 0, Math.trunc((20 - size) / 2), size, size);
                const result = canvas.toDataURL();
                if (!placeholder) {
                    if (faceCache.size >= 200) faceCache.delete(faceCache.keys().next().value);
                    faceCache.set(cacheKey, result);
                }
                setUrl(result);
            };
            image.src = source;
        };
        setUrl(null);
        if (faceCache.has(cacheKey)) setUrl(faceCache.get(cacheKey));
        else render();
        return () => { disposed = true; };
    }, [figure, zoom]);

    return url && figure ? <img src={url} alt="" draggable={false} className="hfl-native-face" /> : null;
};

export const FriendsListProfileView: FC<{ userId: number }> = ({ userId }) => <button type="button" className="hfl-native-profile"
    title={LocalizeText('infostand.profile.link.tooltip')} onClick={(event) => { event.stopPropagation(); GetUserProfile(userId); }} />;

export const FriendsListSkinView: FC<{ border?: boolean }> = ({ border = false }) => {
    const edge = border ? 6 : 3;
    const originX = border ? 32 : 0;
    const sizes = [edge, 1, edge];
    const offsets = [0, edge, edge + 1];
    return <span aria-hidden="true" className={border ? 'hfl-native-border-skin' : 'hfl-native-button-skin'}>
        {sizes.flatMap((height, row) => sizes.map((width, column) => <svg key={`${row}:${column}`} width="100%" height="100%"
            viewBox={`${originX + offsets[column]} ${32 + offsets[row]} ${width} ${height}`} preserveAspectRatio="none">
            <image href={NativeListAtlas} width="160" height="64" />
        </svg>))}
    </span>;
};

export const FriendsListGroupItemView: FC<{ friend: MessengerFriend; selected: boolean; selectFriend: (userId: number) => void; rowIndex?: number }> = ({
    friend, selected, selectFriend, rowIndex = 0
}) => {
    const [relationshipPosition, setRelationshipPosition] = useState<{ left: number; top: number }>(null);
    const { followFriend, updateRelationship } = useFriends();
    const relationshipMenuRef = useRef<HTMLDivElement>(null);
    const relationshipButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!relationshipPosition) return;
        const outside = (event: globalThis.MouseEvent) => {
            if (!relationshipMenuRef.current?.contains(event.target as Node) && !relationshipButtonRef.current?.contains(event.target as Node)) setRelationshipPosition(null);
        };
        const close = () => setRelationshipPosition(null);
        const keydown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') close(); };
        window.addEventListener('mousedown', outside);
        window.addEventListener('keydown', keydown);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('mousedown', outside);
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [relationshipPosition]);

    const stop = (event: MouseEvent<HTMLElement>) => event.stopPropagation();
    const relationshipName = ['none', 'heart', 'smile', 'bobba'][friend.relationshipStatus] ?? 'none';
    const hasRelationship = friend.id > 0 && GetConfigurationValue<boolean>('relationship.status.enabled', false);
    const hasChat = friend.online || (GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', false) && (friend.persistedMessageUser || friend.pocketHabboUser));
    const name = friend.realName ? `${friend.name} (${friend.realName})` : friend.name;
    const setRelationship = (type: number) => {
        updateRelationship(friend, type);
        setRelationshipPosition(null);
        relationshipButtonRef.current?.focus();
    };

    return <div className={`hfl-friend${rowIndex % 2 ? ' alternate' : ''}${selected ? ' selected' : ''}`} role="button" tabIndex={0}
        onClick={() => selectFriend(friend.id)} onDoubleClick={() => friend.online && OpenMessengerChat(friend.id)}
        onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter') selectFriend(friend.id); }}>
        <div className="hfl-friend-avatar">
            {!!friend.figure && (friend.id < 0 ? <LayoutBadgeImageView badgeCode={friend.figure} isGroup scale={0.5} showInfo={false} />
                : <FriendsListFaceView figure={friend.figure} />)}
        </div>
        <span className="hfl-friend-profile"><FriendsListProfileView userId={friend.id} /></span>
        <span className="hfl-friend-name">{name}</span>
        <div className="hfl-friend-actions" onClick={stop}>
            {hasRelationship && <button ref={relationshipButtonRef} type="button" className={`hfl-relationship ${relationshipName}`}
                title={LocalizeText('friendlist.tip.relationship')} aria-expanded={!!relationshipPosition} onClick={() => {
                    const rect = relationshipButtonRef.current.getBoundingClientRect();
                    setRelationshipPosition((current) => current ? null : { left: rect.left, top: rect.top });
                }} />}
            {friend.followingAllowed && <button type="button" className="hfl-action follow" title={LocalizeText('friendlist.tip.follow')} onClick={() => followFriend(friend)} />}
            {hasChat && <button type="button" className="hfl-action chat" title={LocalizeText('friendlist.tip.im')} onClick={() => OpenMessengerChat(friend.id)} />}
        </div>
        {relationshipPosition && createPortal(<div ref={relationshipMenuRef} className="habbo-friend-relationship-menu" style={relationshipPosition}>
            <FriendsListSkinView border />
            {['none', 'heart', 'smile', 'bobba'].map((type, index) => <button key={type} type="button" className={type}
                aria-label={LocalizeText(`relationship.status.${type}`)} onClick={() => setRelationship(index)} />)}
        </div>, document.body)}
    </div>;
};
