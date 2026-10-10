import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button } from '../../../../common';
import { useHousekeepingStore } from '../../../../hooks';

const RECENT_LIMIT = 5;
const BLUR_CLOSE_MS = 120;

export const HousekeepingUserSearchView: FC = () => {
    const { lookupUserByName, lookupUserById, isUserLoading, userSuggestions, requestUserSuggestions, recentLookups, selectedUserIds, toggleUserSelection } =
        useHousekeepingStore();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => blurTimerRef.current && clearTimeout(blurTimerRef.current), []);

    const changeQuery = (value: string) => {
        setQuery(value);
        requestUserSuggestions(value);
    };

    const pick = (id: number, label: string) => {
        setQuery(label);
        setIsOpen(false);
        lookupUserById(id);
    };

    const submit = () => {
        const trimmed = query.trim();

        if (!trimmed.length || isUserLoading) return;

        setIsOpen(false);
        lookupUserByName(trimmed);
    };

    const recentUsers = recentLookups.filter((entry) => entry.kind === 'user').slice(0, RECENT_LIMIT);
    const showRecent = !userSuggestions.length && query.trim().length < 2 && recentUsers.length > 0;
    const showList = isOpen && (userSuggestions.length > 0 || showRecent);

    return (
        <div className="volt-housekeeping-search">
            <div className="volt-staff-row">
                <input
                    aria-label={LocalizeText('housekeeping.user.search.placeholder')}
                    autoComplete="off"
                    className="grow"
                    maxLength={64}
                    placeholder={LocalizeText('housekeeping.user.search.placeholder')}
                    type="text"
                    value={query}
                    onBlur={() => (blurTimerRef.current = setTimeout(() => setIsOpen(false), BLUR_CLOSE_MS))}
                    onChange={(event) => changeQuery(event.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') submit();

                        if (event.key === 'Escape' && isOpen) {
                            event.preventDefault();
                            setIsOpen(false);
                        }
                    }}
                />
                <Button disabled={isUserLoading || !query.trim().length} variant="secondary" onClick={submit}>
                    {LocalizeText('housekeeping.user.search.button')}
                </Button>
            </div>
            {showList && (
                <div className="volt-staff-list volt-housekeeping-suggestions" onMouseDown={(event) => event.preventDefault()}>
                    {showRecent && <div className="volt-staff-list-row volt-staff-muted">{LocalizeText('housekeeping.dashboard.recent_lookups')}</div>}
                    {showRecent &&
                        recentUsers.map((entry) => (
                            <button key={entry.id} className="volt-staff-list-row" type="button" onClick={() => pick(entry.id, entry.label)}>
                                <span className="grow truncate">{entry.label}</span>
                                <span className="volt-staff-muted">#{entry.id}</span>
                            </button>
                        ))}
                    {userSuggestions.map((entry) => (
                        <div key={entry.id} className="volt-staff-list-row is-interactive">
                            <input
                                aria-label={LocalizeText('housekeeping.bulk.apply')}
                                checked={selectedUserIds.includes(entry.id)}
                                type="checkbox"
                                onChange={() => toggleUserSelection(entry.id)}
                            />
                            <button className="volt-housekeeping-suggestion" type="button" onClick={() => pick(entry.id, entry.username)}>
                                <span className={`volt-housekeeping-presence ${entry.online ? 'is-online' : ''}`} />
                                <span className="grow truncate">{entry.username}</span>
                                <span className="volt-staff-muted">#{entry.id}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
