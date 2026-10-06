import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText } from '../../api';
import clearSrc from '../../assets/images/avatareditor/clear-icon.png';
import fxSrc from '../../assets/images/avatareditor/air/effects-fx.png';
import { ClassicScrollAreaView } from '../../common/scroll-area/ClassicScrollAreaView';
import { NativeText } from '../../common/native-text/NativeText';
import { useAvatarEditor } from '../../hooks';
import { getEditorEffectSeconds } from '../../hooks/avatar-editor/useAvatarEditorEffects';
import { useAvatarEditorGridWheel } from '../../hooks/avatar-editor/useAvatarEditorGridWheel';

const EFFECT_ICONS = import.meta.glob('../../assets/images/avatareditor/effects/*.png', { eager: true, import: 'default' }) as Record<string, string>;

export const AvatarEditorEffectsView: FC = () => {
    const container = useRef<HTMLDivElement>(null);
    useAvatarEditorGridWheel(container);
    const { effects, selectedEffect, selectEditorEffect } = useAvatarEditor();
    const [, setTick] = useState(0);
    const selected = effects.find(effect => effect.type === selectedEffect);
    // Native WJ paints grid progress when R3e rebuilds the inventory;
    // b3e's timer updates only the selected effect's details panel.
    const gridProgress = useMemo(() => new Map(effects.map(effect => [effect.type,
        Math.floor(40 * (effect.permanent ? 1 : getEditorEffectSeconds(effect) / effect.duration))
    ])), [effects]);

    useEffect(() => {
        if (!selected?.active || selected.permanent) return;

        const timer = window.setInterval(() => setTick(tick => tick + 1), 1000);
        return () => window.clearInterval(timer);
    }, [selected]);

    const secondsLeft = selected ? getEditorEffectSeconds(selected) : 0;
    const getTimeText = () => {
        if (selected.permanent) return LocalizeText('avatareditor.effects.active.permanent');
        if (secondsLeft > 86400) return LocalizeText('avatareditor.effects.active.daysleft', ['days_left'], [String(Math.floor(secondsLeft / 86400))]);

        const hours = Math.floor(secondsLeft / 3600);
        const minutes = String(Math.floor(secondsLeft / 60) % 60).padStart(2, '0');
        const seconds = String(secondsLeft % 60).padStart(2, '0');
        const time = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${minutes}:${seconds}`;
        return LocalizeText('avatareditor.effects.active.timeleft', ['time_left'], [time]);
    };

    return <div ref={container} className="octane-avatar-editor-effects">
        <div className="octane-avatar-editor-effects-heading">
            <img src={fxSrc} alt="" draggable={false} />
            <NativeText text={LocalizeText('inventory.effects')} textStyle="u_bold" background={0xe9e9e1} overrides={{ size: 20 }} />
        </div>
        <button type="button" className="octane-avatar-editor-effects-shop" onClick={() => CreateLinkEvent(`catalog/open/${GetConfigurationValue<string>('avatareditor.effects.buy.button.catalog.page.name', '')}`)}>
            <NativeText text={LocalizeText('avatareditor.effects.shop')} textStyle="button_shiny_bold" background={0xffffff} />
        </button>
        {effects.length === 0 ? <div className="octane-avatar-editor-effects-empty">
            <NativeText text={LocalizeText('avatar.editor.content.title')} textStyle="u_bold" background={0xe9e9e1} overrides={{ size: 20 }} />
            <NativeText className="octane-avatar-editor-effects-notification" text={LocalizeText('avatar.editor.content.notification')} textStyle="u_regular" background={0xe9e9e1} maxWidth={298} />
        </div> : <div className="octane-avatar-editor-parts-grid octane-avatar-editor-effects-grid">
            <ClassicScrollAreaView contentClassName="octane-avatar-editor-effect-items" scrollStep={50}>
                {[null, ...effects].map(effect => {
                    const type = effect?.type ?? -1;
                    const icon = effect ? EFFECT_ICONS[`../../assets/images/avatareditor/effects/fx_icon_${type}.png`] : clearSrc;
                    return <button type="button" key={type} className={`octane-avatar-editor-effect-item avatar-parts${selectedEffect === type ? ' part-selected' : ''}`} aria-pressed={selectedEffect === type} aria-label={effect ? LocalizeText(`fx_${type}`) : LocalizeText('avatareditor.clear')} onMouseDown={() => selectEditorEffect(type)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') selectEditorEffect(type); }}>
                        {icon && <img src={icon} alt="" draggable={false} />}
                        {effect?.amount > 1 && <div className="octane-avatar-editor-effect-amount"><NativeText text={String(effect.amount)} textStyle="regular" background={0x666666} overrides={{ color: 0xeeeeee, antiAliasType: 'advanced', sharpness: 0, thickness: 0, kerning: false }} /></div>}
                        {effect && (effect.active || effect.permanent) && <div className="octane-avatar-editor-effect-duration"><div style={{ width: gridProgress.get(type) }} /></div>}
                    </button>;
                })}
            </ClassicScrollAreaView>
        </div>}
        {selected && <>
            <div className="octane-avatar-editor-effect-name"><NativeText text={LocalizeText(`fx_${selected.type}`)} textStyle="u_bold" background={0xe9e9e1} overrides={{ color: 0x666666 }} maxWidth={120} /></div>
            {!selected.active && !selected.permanent ? <div className="octane-avatar-editor-effect-activate"><NativeText text={LocalizeText('avatareditor.save.to.activate')} textStyle="u_regular" background={0xe9e9e1} overrides={{ color: 0x666666 }} maxWidth={300} /></div> : <div className="octane-avatar-editor-effect-time">
                <div className="octane-avatar-editor-effect-time-bar"><div style={{ width: Math.floor(120 * (selected.permanent ? 1 : secondsLeft / selected.duration)) }} /></div>
                <NativeText text={getTimeText()} textStyle="u_regular" background={0xffffff} />
                <span aria-hidden="true" className="octane-avatar-editor-effect-time-ink"><NativeText text={getTimeText()} textStyle="u_regular" background={0xffffff} /></span>
            </div>}
        </>}
    </div>;
};
