import { WiredActionDefinition } from '@octane/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType, WIRED_SLIDER_PULSES } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSlider';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredActionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    hideDelay?: boolean;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    selectionPreview?: ReactNode;
    nativeLayout?: boolean;
}

export const WiredActionBaseView: FC<PropsWithChildren<WiredActionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        hideDelay = false,
        footer = null,
        footerCollapsible = true,
        selectionPreview = null,
        nativeLayout = false
    } = props;
    const { trigger = null, actionDelay = 0, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition).delayInPulses);
    }, [trigger, setActionDelay]);

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            wiredType="action"
            cardStyle={cardStyle}
            footer={footer}
            footerCollapsible={footerCollapsible}
            selectionPreview={selectionPreview}
            nativeLayout={nativeLayout}
            delay={
                !hideDelay && (
                    <WiredSliderSection
                        className="octane-wired__section--delay"
                        converter={WIRED_SLIDER_PULSES}
                        max={20}
                        min={0}
                        titleKey="wiredfurni.params.delay"
                        unit="seconds"
                        value={actionDelay}
                        withInput={false}
                        onChange={setActionDelay}
                    />
                )
            }
            legacyDelay={
                !hideDelay && (
                    <>
                        {!!children && <div className="octane-wired__divider" />}
                        <div className="flex flex-col octane-wired__section octane-wired__section--delay">
                            <Text bold>{LocalizeText('wiredfurni.params.delay', ['seconds'], [GetWiredTimeLocale(actionDelay)])}</Text>
                            <Slider max={20} min={0} value={actionDelay} onChange={(event) => setActionDelay(event)} />
                        </div>
                    </>
                )
            }
        >
            {children}
        </WiredBaseView>
    );
};
