import { GetSoundManager, ISoundboardCatalogSound } from '@octane/renderer';
import { DragEvent, FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, StaffField, StaffSection, StaffStatus } from '../../../../common';
import { useSoundboardCatalog, useSoundboardManifest } from '../../../../hooks';
import {
    filterCatalogSounds,
    reorderCatalog,
    SoundboardCatalogDraft,
    SoundboardCatalogFilter,
    validateCatalogDraft
} from '../../../../hooks/soundboard/soundboardCatalogState';
import { resolveSoundboardSoundUrl } from '../../../../hooks/soundboard/soundboardUrl';

const EMPTY_DRAFT: SoundboardCatalogDraft = { id: 0, name: '', classname: '', url: '', minRank: 1, enabled: true };
const RESULT_KEYS = [
    'success',
    'forbidden',
    'invalid_name',
    'invalid_url',
    'invalid_rank',
    'invalid_order',
    'not_found',
    'persistence_failure',
    'catalog_full'
];

export const HousekeepingSoundboardTab: FC = () => {
    const { sounds, lastResult, pendingOperation, request, upsert, reorder } = useSoundboardCatalog();
    const { manifest, classnames: knownClassnames } = useSoundboardManifest();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<SoundboardCatalogFilter>('all');
    const [draft, setDraft] = useState<SoundboardCatalogDraft>(EMPTY_DRAFT);
    const [orderedIds, setOrderedIds] = useState<number[]>([]);
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [previewFailed, setPreviewFailed] = useState(false);

    useEffect(() => request(), [request]);
    useEffect(() => setOrderedIds(sounds.map((sound) => sound.id)), [sounds]);
    useEffect(() => {
        if (lastResult?.operation !== 1 || lastResult.resultCode !== 0 || lastResult.soundId <= 0) return;

        setDraft((current) => (current.id === 0 ? { ...current, id: lastResult.soundId } : current));
    }, [lastResult]);

    const orderedSounds = useMemo(
        () => orderedIds.map((id) => sounds.find((sound) => sound.id === id)).filter((sound): sound is ISoundboardCatalogSound => !!sound),
        [orderedIds, sounds]
    );
    const filteredSounds = useMemo(() => filterCatalogSounds(orderedSounds, query, filter), [orderedSounds, query, filter]);
    const validation = validateCatalogDraft(draft);
    const draftLocked = pendingOperation !== null;

    const editSound = (sound: ISoundboardCatalogSound) => {
        setDraft({
            id: sound.id,
            name: sound.name,
            classname: sound.classname ?? '',
            url: sound.url,
            minRank: sound.minRank,
            enabled: sound.enabled
        });
    };

    const preview = (candidate: SoundboardCatalogDraft) => {
        if (!validateCatalogDraft(candidate).valid) return;

        setPreviewFailed(false);
        void GetSoundManager()
            .playSoundboard(resolveSoundboardSoundUrl({ classname: candidate.classname?.trim() ?? '', url: candidate.url?.trim() ?? '' }, manifest))
            .then((played) => setPreviewFailed(!played));
    };

    const moveByOffset = (id: number, offset: number) => {
        setOrderedIds((current) => {
            const source = [...new Set(current)];
            const index = source.indexOf(id);
            const target = index + offset;
            if (index < 0 || target < 0 || target >= source.length) return source;

            [source[index], source[target]] = [source[target], source[index]];
            return source;
        });
    };

    const dropOn = (event: DragEvent, targetId: number) => {
        event.preventDefault();
        if (draggedId !== null) setOrderedIds((current) => reorderCatalog(current, draggedId, targetId));
        setDraggedId(null);
    };

    const resultKey = lastResult ? (RESULT_KEYS[lastResult.resultCode] ?? 'persistence_failure') : null;

    const setField = <K extends keyof SoundboardCatalogDraft>(key: K, value: SoundboardCatalogDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

    return (
        <>
            <div className="octane-staff-row">
                <input
                    aria-label={LocalizeText('housekeeping.soundboard.search')}
                    className="grow"
                    placeholder={LocalizeText('housekeeping.soundboard.search')}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <select aria-label={LocalizeText('housekeeping.soundboard.filter')} value={filter} onChange={(event) => setFilter(event.target.value as SoundboardCatalogFilter)}>
                    <option value="all">{LocalizeText('housekeeping.soundboard.filter.all')}</option>
                    <option value="enabled">{LocalizeText('housekeeping.soundboard.filter.enabled')}</option>
                    <option value="disabled">{LocalizeText('housekeeping.soundboard.filter.disabled')}</option>
                </select>
            </div>
            {resultKey && (
                <StaffStatus message={LocalizeText(`housekeeping.soundboard.result.${resultKey}`)} tone={lastResult.resultCode === 0 ? 'success' : 'error'} />
            )}
            {previewFailed && <StaffStatus message={LocalizeText('housekeeping.soundboard.preview_failed')} tone="error" />}
            <StaffSection title={LocalizeText(draft.id ? 'housekeeping.soundboard.edit' : 'housekeeping.soundboard.create')}>
                <div className="octane-staff-grid">
                    <StaffField label={LocalizeText('housekeeping.soundboard.name')}>
                        <input disabled={draftLocked} maxLength={64} value={draft.name} onChange={(event) => setField('name', event.target.value)} />
                    </StaffField>
                    <StaffField label={LocalizeText('housekeeping.soundboard.classname')}>
                        <input
                            disabled={draftLocked}
                            list="soundboard-classnames"
                            placeholder={knownClassnames[0] ?? ''}
                            value={draft.classname}
                            onChange={(event) => setField('classname', event.target.value)}
                        />
                        <datalist id="soundboard-classnames">
                            {knownClassnames.map((classname) => (
                                <option key={classname} value={classname} />
                            ))}
                        </datalist>
                    </StaffField>
                    <StaffField label={LocalizeText('housekeeping.soundboard.url')}>
                        <input disabled={draftLocked} value={draft.url} onChange={(event) => setField('url', event.target.value)} />
                    </StaffField>
                    <StaffField label={LocalizeText('housekeeping.soundboard.min_rank')}>
                        <input disabled={draftLocked} min={1} step={1} type="number" value={draft.minRank} onChange={(event) => setField('minRank', Number(event.target.value))} />
                    </StaffField>
                </div>
                <label className="octane-staff-row">
                    <input checked={draft.enabled} disabled={draftLocked} type="checkbox" onChange={(event) => setField('enabled', event.target.checked)} />
                    {LocalizeText('housekeeping.soundboard.enabled')}
                </label>
                {!validation.valid && (draft.name || draft.url || draft.classname) && (
                    <span className="octane-staff-error-text" role="alert">
                        {Object.values(validation.errors)
                            .map((error) => LocalizeText(`housekeeping.soundboard.validation.${error}`))
                            .join(' · ')}
                    </span>
                )}
                <div className="octane-staff-row justify-end">
                    <Button disabled={draftLocked} variant="secondary" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
                        {LocalizeText('housekeeping.soundboard.create')}
                    </Button>
                    <Button disabled={!validation.valid} variant="secondary" onClick={() => preview(draft)}>
                        {LocalizeText('housekeeping.soundboard.preview')}
                    </Button>
                    <Button disabled={!validation.valid || draftLocked} variant="primary" onClick={() => upsert(draft)}>
                        {LocalizeText('housekeeping.soundboard.save')}
                    </Button>
                </div>
            </StaffSection>
            <div className="octane-staff-list octane-housekeeping-sounds">
                {filteredSounds.map((sound) => {
                    const orderIndex = orderedIds.indexOf(sound.id);

                    return (
                        <div
                            key={sound.id}
                            draggable
                            className={`octane-staff-list-row ${draft.id === sound.id ? 'is-selected' : ''}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDragStart={() => setDraggedId(sound.id)}
                            onDrop={(event) => dropOn(event, sound.id)}
                        >
                            <span className="grow truncate">
                                {sound.name} <span className="octane-staff-muted">#{sound.id}</span>
                                <br />
                                <span className="octane-staff-muted">
                                    {sound.classname || sound.url} · {LocalizeText('housekeeping.soundboard.min_rank')} {sound.minRank} ·{' '}
                                    {LocalizeText(sound.enabled ? 'housekeeping.soundboard.filter.enabled' : 'housekeeping.soundboard.filter.disabled')}
                                </span>
                            </span>
                            <Button variant="secondary" onClick={() => preview(sound)}>
                                {LocalizeText('housekeeping.soundboard.preview')}
                            </Button>
                            <Button disabled={draftLocked} variant="secondary" onClick={() => editSound(sound)}>
                                {LocalizeText('housekeeping.soundboard.edit')}
                            </Button>
                            <Button aria-label={LocalizeText('housekeeping.soundboard.move_up')} disabled={orderIndex <= 0} variant="secondary" onClick={() => moveByOffset(sound.id, -1)}>
                                ▲
                            </Button>
                            <Button
                                aria-label={LocalizeText('housekeeping.soundboard.move_down')}
                                disabled={orderIndex < 0 || orderIndex >= orderedIds.length - 1}
                                variant="secondary"
                                onClick={() => moveByOffset(sound.id, 1)}
                            >
                                ▼
                            </Button>
                        </div>
                    );
                })}
            </div>
            <div className="octane-staff-row justify-end">
                <Button disabled={!orderedIds.length || pendingOperation !== null} variant="primary" onClick={() => reorder(orderedIds)}>
                    {LocalizeText('housekeeping.soundboard.save_order')}
                </Button>
            </div>
        </>
    );
};
