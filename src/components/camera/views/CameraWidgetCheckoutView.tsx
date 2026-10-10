import {
    CameraPublishStatusMessageEvent,
    CameraPurchaseOKMessageEvent,
    CompetitionStatusMessageEvent,
    CreateLinkEvent,
    GetEventDispatcher,
    GetSessionDataManager,
    VoltToolbarAnimateIconEvent,
    PhotoCompetitionMessageComposer,
    PublishPhotoMessageComposer,
    PurchasePhotoMessageComposer,
    ToolbarIconEnum
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CameraEffectSelection, CameraPicture, GetConfigurationValue, loadTrustedCameraImage, LocalizeText, NotificationAlertType, OpenUrl, renderTrustedCamera, SendMessageComposer } from '../../../api';
import creditIcon from '../../../assets/images/camera/checkout/credit.png';
import ducketIcon from '../../../assets/images/camera/checkout/ducket.png';
import { VoltCardView } from '../../../common';
import { useMessageEvent, useNotification, usePurse } from '../../../hooks';
import { CAMERA_BOX_COLOR, CAMERA_COMPETITION_COLOR, CameraCenteredText, CameraNativeText } from './CameraNativeText';
import { CameraSkinButton } from './CameraSkinButton';

export interface CameraWidgetCheckoutViewProps {
    picture: CameraPicture;
    effects: CameraEffectSelection[];
    zoom: boolean;
    onCloseClick: () => void;
    onCancelClick: () => void;
    price: { credits: number; duckets: number; publishDucketPrice: number };
}

const CAMERA_POINT_CURRENCY_TYPE = 0;

// photo_purchase_confirmation_xml (HabboRoomUICom): frame 340 wide, list at (10,39), boxes 316 wide, buttons 110x27.
export const CameraWidgetCheckoutView: FC<CameraWidgetCheckoutViewProps> = (props) => {
    const { picture = null, effects = [], zoom = false, onCloseClick = null, onCancelClick = null, price = null } = props;
    const [pictureUrl, setPictureUrl] = useState<string>(null);
    const [checkoutId, setCheckoutId] = useState<string>(null);
    const [publishId, setPublishId] = useState<string>(null);
    const [picturesBought, setPicturesBought] = useState(0);
    const [wasPicturePublished, setWasPicturePublished] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [hasRenderingFailed, setHasRenderingFailed] = useState(false);
    const [isWaiting, setIsWaitingState] = useState(false);
    // Set in the same task as the send, so a second click handled before React re-renders cannot send again.
    const pendingRef = useRef(false);
    // disableButtons(true) renames Cancel to Close and the caption is never restored.
    const [cancelIsClose, setCancelIsClose] = useState(false);
    const [publishCooldown, setPublishCooldown] = useState(0);
    const [statusLocalization, setStatusLocalization] = useState('camera.purchase.pleasewait');
    const [competitionState, setCompetitionState] = useState<'idle' | 'submitted' | 'limit' | 'email' | 'error'>('idle');
    const setIsWaiting = useCallback((value: boolean) => {
        pendingRef.current = value;
        setIsWaitingState(value);
    }, []);
    const productImageContainerRef = useRef<HTMLDivElement>(null);
    const productImageRef = useRef<HTMLImageElement>(null);
    // setPrices runs once when the dialog opens; later price updates only reach the purchase checks.
    const [shownPrice, setShownPrice] = useState(price);
    const { getCurrencyAmount = null } = usePurse();
    const { showConfirm = null, simpleAlert = null } = useNotification();

    const publishDisabled = useMemo(
        () => GetConfigurationValue<boolean>('camera.publish.disabled', false) || !GetConfigurationValue<boolean>('camera.photo.publishing.enabled', true),
        []
    );
    const competitionEnabled = useMemo(() => GetConfigurationValue<boolean>('camera.competition.enabled', false), []);
    const spendingDisclaimerEnabled = useMemo(() => GetConfigurationValue<boolean>('disclaimer.credit_spending.enabled', false), []);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(!spendingDisclaimerEnabled);

    const publishedPhotoUrl = useMemo(() => {
        if (!publishId) return '';
        if (/^(?:https?:)?\/\//i.test(publishId) || publishId.startsWith('/')) return publishId;

        const userName = GetSessionDataManager()?.userName ?? '';

        return `/profile/${encodeURIComponent(userName)}/photo/${encodeURIComponent(publishId)}`;
    }, [publishId]);

    // windowManager.alert: the plain Ok frame, not the hotel message frame.
    const showWindowAlert = useCallback(
        (message: string) => simpleAlert(message, NotificationAlertType.WINDOW, null, null, LocalizeText('generic.alert.title')),
        [simpleAlert]
    );

    const reportRenderingFailure = useCallback(() => {
        setPictureUrl(null);
        setCheckoutId(null);
        setIsImageLoaded(false);
        setHasRenderingFailed(true);
        setStatusLocalization('');
        showWindowAlert(LocalizeText('camera.render.count.info'));
    }, [showWindowAlert]);

    // catalog.showNotEnoughCreditsAlert / showNotEnoughActivityPointsAlert: a confirm whose OK opens the web page for the missing currency.
    const showNotEnoughCreditsAlert = useCallback(() => {
        showConfirm(
            LocalizeText('catalog.alert.notenough.credits.description'),
            () => {
                const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

                if (shopUrl) OpenUrl(shopUrl);
            },
            () => undefined,
            LocalizeText('generic.ok'),
            null,
            LocalizeText('catalog.alert.notenough.title')
        );
    }, [showConfirm]);

    const showNotEnoughDucketsAlert = useCallback(() => {
        const currencyName = LocalizeText(GetConfigurationValue<string>(`activitypoint.name.${CAMERA_POINT_CURRENCY_TYPE}`, 'tooltip.duckets'));

        showConfirm(
            LocalizeText('catalog.alert.notenough.activitypoints.description', ['currencyname'], [currencyName]),
            () => {
                const ducketsUrl = GetConfigurationValue<string>('link.format.duckets', '');

                if (ducketsUrl) OpenUrl(ducketsUrl);
            },
            () => undefined,
            LocalizeText('generic.ok'),
            null,
            LocalizeText('catalog.alert.notenough.activitypoints.title', ['currencyname'], [currencyName])
        );
    }, [showConfirm]);

    const animatePictureToInventory = useCallback(() => {
        const sourceImage = productImageRef.current;
        const sourceContainer = productImageContainerRef.current;

        if (!sourceImage || !sourceContainer) return;

        const transitionImage = sourceImage.cloneNode(true) as HTMLImageElement;
        const sourceBounds = sourceContainer.getBoundingClientRect();
        const transitionEvent = new VoltToolbarAnimateIconEvent(transitionImage, sourceBounds.x, sourceBounds.y);

        transitionImage.width = 120;
        transitionImage.height = 120;
        transitionEvent.iconName = ToolbarIconEnum.INVENTORY;
        GetEventDispatcher().dispatchEvent(transitionEvent);
    }, []);

    useMessageEvent<CameraPurchaseOKMessageEvent>(CameraPurchaseOKMessageEvent, () => {
        animatePictureToInventory();
        setPicturesBought((value) => value + 1);
        setStatusLocalization('camera.purchase.successful');
        setIsWaiting(false);
    });

    useMessageEvent<CameraPublishStatusMessageEvent>(CameraPublishStatusMessageEvent, (event) => {
        const parser = event.getParser();
        const secondsToWait = Math.max(0, parser.secondsToWait);

        setWasPicturePublished(parser.ok);
        setStatusLocalization(parser.ok ? 'camera.publish.successful' : '');
        setIsWaiting(false);

        if (parser.ok) {
            setPublishId(parser.extraDataId);
            setPublishCooldown(0);
            return;
        }

        setPublishCooldown(secondsToWait);
        showWindowAlert(LocalizeText('camera.publish.wait', ['minutes'], [(Math.floor(secondsToWait / 60) + 1).toString()]));
    });

    useMessageEvent<CompetitionStatusMessageEvent>(CompetitionStatusMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.ok) {
            setCompetitionState('submitted');
            setStatusLocalization('camera.competition.submitted.status');
        } else {
            switch (parser.errorReason) {
                case 'too-many-submits':
                    setCompetitionState('limit');
                    break;
                case 'email-not-verified':
                    setCompetitionState('email');

                    showConfirm(
                        LocalizeText('camera.competition.email.not.verified'),
                        () => {
                            const verificationUrl = GetConfigurationValue<string>('email.verification.url', '');

                            if (verificationUrl) OpenUrl(verificationUrl);
                        },
                        () => undefined,
                        LocalizeText('email.settings'),
                        LocalizeText('groupforum.settings.cancel'),
                        LocalizeText('generic.alert.title')
                    );
                    break;
                default:
                    setCompetitionState('error');
                    break;
            }

            setStatusLocalization('generic.failed');
        }

        setIsWaiting(false);
    });

    const processAction = (type: string) => {
        switch (type) {
            case 'close':
                onCloseClick();
                return;
            case 'buy':
                if (pendingRef.current || isWaiting || !isImageLoaded || !disclaimerAccepted) return;

                if (price.credits > getCurrencyAmount(-1)) {
                    showNotEnoughCreditsAlert();
                    return;
                }

                if (price.duckets > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                setIsWaiting(true);
                setCancelIsClose(true);
                setStatusLocalization('camera.purchase.pleasewait');

                if (spendingDisclaimerEnabled) setDisclaimerAccepted(false);

                SendMessageComposer(new PurchasePhotoMessageComposer(checkoutId));
                return;
            case 'publish':
                if (pendingRef.current || isWaiting || !isImageLoaded || publishCooldown > 0) return;

                if (price.publishDucketPrice > getCurrencyAmount(CAMERA_POINT_CURRENCY_TYPE)) {
                    showNotEnoughDucketsAlert();
                    return;
                }

                setIsWaiting(true);
                setCancelIsClose(true);
                setStatusLocalization('camera.purchase.pleasewait');
                SendMessageComposer(new PublishPhotoMessageComposer(checkoutId));
                return;
            case 'competition':
                if (pendingRef.current || isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState)) return;

                setIsWaiting(true);
                setCancelIsClose(true);
                setStatusLocalization('camera.purchase.pleasewait');
                SendMessageComposer(new PhotoCompetitionMessageComposer(checkoutId));
                return;
            case 'cancel':
                onCancelClick();
                return;
        }
    };

    useEffect(() => {
        if (!shownPrice && price) setShownPrice(price);
    }, [price, shownPrice]);

    useEffect(() => {
        let active = true;
        setPictureUrl(null);
        setCheckoutId(null);
        setIsImageLoaded(false);
        setHasRenderingFailed(false);
        if (!picture?.draftId) {
            reportRenderingFailure();
            return;
        }

        renderTrustedCamera(picture.draftId, effects, zoom)
            .then(async (capture) => {
                if (!active) return;

                const image = await loadTrustedCameraImage(capture);

                if (active) {
                    setPictureUrl(image.src);
                    setCheckoutId(capture.url.slice('/camera/'.length, -'.png'.length));
                }
            })
            .catch(() => {
                if (active) reportRenderingFailure();
            });

        return () => {
            active = false;
        };
    }, [picture, effects, zoom, reportRenderingFailure]);

    useEffect(() => {
        if (!isWaiting) return;
        const timeout = window.setTimeout(() => {
            setIsWaiting(false);
            setStatusLocalization('generic.failed');
        }, 30_000);
        return () => window.clearTimeout(timeout);
    }, [isWaiting]);

    useEffect(() => {
        if (publishCooldown <= 0) return;

        const timer = window.setTimeout(() => setPublishCooldown(0), publishCooldown * 1000);

        return () => window.clearTimeout(timer);
    }, [publishCooldown]);

    if (!price || !shownPrice) return null;

    const buyDisabled = isWaiting || !isImageLoaded || !disclaimerAccepted;
    const publishButtonDisabled = isWaiting || !isImageLoaded || publishCooldown > 0;
    const competitionDisabled = isWaiting || !isImageLoaded || ['submitted', 'limit', 'error'].includes(competitionState);
    const costLabel = LocalizeText('catalog.purchase.confirmation.dialog.cost');
    const renderButton = (key: string, className: string, label: string, disabled: boolean, variant: 'green' | 'gray', onClick: () => void) => (
        <CameraSkinButton key={key} className={className} disabled={disabled} label={label} variant={variant} onClick={onClick} />
    );

    return (
        <VoltCardView className="volt-camera-checkout" frameStyle={3} isResizable={false} theme="primary-slim">
            <div className="volt-card-header-shell">
                <span className="volt-card-title">
                    <CameraCenteredText background={0x484949} color={0xffffff} text={LocalizeText('camera.confirm_phase.title')} textStyle="u_frame_title" width={340} />
                </span>
                <button aria-label={LocalizeText('generic.close')} className="volt-card-close-button" type="button" onClick={() => processAction('close')} />
            </div>
            <div className="volt-camera-checkout__list">
                <div ref={productImageContainerRef} className={`volt-camera-checkout__image${hasRenderingFailed ? ' is-failed' : ''}`}>
                    {!isImageLoaded && !hasRenderingFailed && (
                        <div className="volt-camera-checkout__loading">
                            <CameraNativeText background={0xcccccc} color={0xffffff} size={36} text={LocalizeText('camera.loading')} />
                        </div>
                    )}
                    {pictureUrl && !hasRenderingFailed && (
                        <img
                            ref={productImageRef}
                            alt=""
                            src={pictureUrl}
                            style={{ visibility: isImageLoaded ? 'visible' : 'hidden' }}
                            onLoad={() => {
                                setIsImageLoaded(true);
                                setHasRenderingFailed(false);
                                setStatusLocalization('camera.confirm_phase.info');
                            }}
                            onError={reportRenderingFailure}
                        />
                    )}
                </div>

                <div className={`volt-camera-checkout__status${statusLocalization ? '' : ' is-empty'}`}>
                    {!!statusLocalization && <CameraNativeText maxWidth={320} text={LocalizeText(statusLocalization)} />}
                </div>

                {competitionEnabled && (
                    <section className="volt-camera-checkout__box is-competition">
                        <div className="volt-camera-checkout__box-name">
                            <CameraNativeText
                                background={CAMERA_COMPETITION_COLOR}
                                color={0xffffff}
                                size={14}
                                text={LocalizeText(
                                    competitionState === 'submitted'
                                        ? 'camera.competition.submitted.info'
                                        : competitionState === 'limit'
                                          ? 'camera.competition.limit.info'
                                          : 'camera.competition.header'
                                )}
                                textStyle="u_bold"
                            />
                        </div>
                        <div className="volt-camera-checkout__competition-info">
                            <CameraNativeText background={CAMERA_COMPETITION_COLOR} color={0xffffff} maxWidth={190} text={LocalizeText('camera.competition.info')} />
                        </div>
                        {renderButton('competition', 'is-competition-button', LocalizeText('generic.submit'), competitionDisabled, 'green', () => processAction('competition'))}
                    </section>
                )}

                <section className={`volt-camera-checkout__box is-purchase${picturesBought > 0 ? ' has-inventory-link' : ''}`}>
                    <div className="volt-camera-checkout__box-name">
                        <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={LocalizeText('camera.purchase.header')} textStyle="u_bold" />
                    </div>
                    <div className="volt-camera-checkout__price-row">
                        <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={costLabel} />
                        <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={String(shownPrice.credits)} textStyle="u_bold" />
                        <img alt="" className="volt-camera-checkout__icon" src={creditIcon} />
                        {shownPrice.duckets > 0 && (
                            <>
                                <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={String(shownPrice.duckets)} textStyle="u_bold" />
                                <img alt="" className="volt-camera-checkout__icon" src={ducketIcon} />
                            </>
                        )}
                    </div>
                    {picturesBought > 0 && (
                        <div className="volt-camera-checkout__inventory-row">
                            <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={LocalizeText('camera.purchase.count.info')} textStyle="u_bold" />
                            <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={String(picturesBought)} />
                            <button className="volt-camera-checkout__link" type="button" onClick={() => CreateLinkEvent('inventory/open/furni')}>
                                <CameraNativeText background={CAMERA_BOX_COLOR} text={LocalizeText('camera.open.inventory')} underline />
                            </button>
                        </div>
                    )}
                    {renderButton(
                        'buy',
                        'is-buy-button',
                        LocalizeText(picturesBought ? 'camera.buy.another.button.text' : 'catalog.purchase_confirmation.buy'),
                        buyDisabled,
                        'green',
                        () => processAction('buy')
                    )}
                </section>

                {!publishDisabled && (
                    <section className={`volt-camera-checkout__box is-publish${wasPicturePublished ? ' is-published' : ''}`}>
                        <div className="volt-camera-checkout__box-name">
                            <CameraNativeText
                                background={CAMERA_BOX_COLOR}
                                maxWidth={300}
                                size={14}
                                text={LocalizeText(wasPicturePublished ? 'camera.publish.successful' : 'camera.publish.explanation')}
                                textStyle="u_bold"
                            />
                        </div>
                        <div className="volt-camera-checkout__publish-info">
                            <CameraNativeText
                                background={CAMERA_BOX_COLOR}
                                maxWidth={191}
                                text={LocalizeText(wasPicturePublished ? 'camera.publish.success.short.info' : 'camera.publish.detailed.explanation')}
                            />
                        </div>
                        {!wasPicturePublished && (
                            <div className="volt-camera-checkout__price-row is-publish-price">
                                <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={costLabel} />
                                <CameraNativeText background={CAMERA_BOX_COLOR} size={14} text={String(shownPrice.publishDucketPrice)} textStyle="u_bold" />
                                <img alt="" className="volt-camera-checkout__icon" src={ducketIcon} />
                            </div>
                        )}
                        {wasPicturePublished && !!publishedPhotoUrl && (
                            <a className="volt-camera-checkout__link is-publish-link" href={publishedPhotoUrl} rel="noreferrer" target="_blank">
                                <CameraNativeText background={CAMERA_BOX_COLOR} text={LocalizeText('camera.link.to.published')} underline />
                            </a>
                        )}
                        {!wasPicturePublished &&
                            renderButton('publish', 'is-publish-button', LocalizeText('camera.publish.button.text'), publishButtonDisabled, 'green', () => processAction('publish'))}
                    </section>
                )}

                <div className="volt-camera-checkout__removal">
                    <CameraNativeText maxWidth={320} text={LocalizeText('camera.warning.disclaimer')} />
                </div>

                {spendingDisclaimerEnabled && (
                    <label className="volt-camera-checkout__spending">
                        <input checked={disclaimerAccepted} type="checkbox" onChange={(event) => setDisclaimerAccepted(event.target.checked)} />
                        <span className="volt-camera-checkout__spending-text">
                            <CameraNativeText maxWidth={278} text={LocalizeText('disclaimer.credit_spending')} />
                        </span>
                    </label>
                )}

                <div className="volt-camera-checkout__buttons">
                    {renderButton(
                        'cancel',
                        'is-cancel-button',
                        LocalizeText(cancelIsClose ? 'generic.close' : 'catalog.purchase_confirmation.cancel'),
                        false,
                        'gray',
                        () => processAction('cancel')
                    )}
                </div>
            </div>
        </VoltCardView>
    );
};
