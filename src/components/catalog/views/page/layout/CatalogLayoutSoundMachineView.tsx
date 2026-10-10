import { GetOfficialSongIdMessageComposer, GetSoundManager, MusicPriorities, OfficialSongIdMessageEvent, SongInfoReceivedEvent } from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { LayoutFurniImageView } from '../../../../../common';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useMessageEvent, useVoltEvent } from '../../../../../hooks';
import { VoltButton } from '../../../../../layout';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPriceDisplayWidgetView } from '../widgets/CatalogPriceDisplayWidgetView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutSoundMachineView: FC<CatalogLayoutProps> = (props) => {
    const [songId, setSongId] = useState(-1);
    const [officialSongId, setOfficialSongId] = useState('');
    const [songLength, setSongLength] = useState<number | null>(null);
    const { currentOffer = null } = useCatalogData();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    const updateSongLength = useCallback((id: number) => {
        if (id <= 0) return;

        const controller = GetSoundManager().musicController;
        const songInfo = controller?.getSongInfo(id);

        if (!songInfo) {
            controller?.requestSongInfoWithoutSamples(id);
            return;
        }

        setSongLength(Math.max(0, Math.floor(songInfo.length / 1000)));
    }, []);

    const previewSong = (previewSongId: number) => {
        if (previewSongId <= 0 || songLength === null) return;

        const controller = GetSoundManager().musicController;

        if (!controller) return;

        controller.playSong(previewSongId, MusicPriorities.PRIORITY_PURCHASE_PREVIEW, 15, 40, 0.5, 2);
    };

    useMessageEvent<OfficialSongIdMessageEvent>(OfficialSongIdMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.officialSongId !== officialSongId) return;

        setSongId(parser.songId > 0 ? parser.songId : -1);
    });

    useVoltEvent<SongInfoReceivedEvent>(SongInfoReceivedEvent.SIR_TRAX_SONG_INFO_RECEIVED, (event) => {
        if (event.id !== songId) return;

        updateSongLength(event.id);
    });

    useEffect(() => {
        setSongLength(null);
        setSongId(-1);
        setOfficialSongId('');

        if (!currentOffer) return;

        const product = currentOffer.product;

        if (!product) return;

        if (product.extraParam.length > 0) {
            const id = parseInt(product.extraParam);

            if (id > 0) {
                setSongId(id);
            } else {
                setOfficialSongId(product.extraParam);
                SendMessageComposer(new GetOfficialSongIdMessageComposer(product.extraParam));
            }
        }

        return () => GetSoundManager().musicController?.stop(MusicPriorities.PRIORITY_PURCHASE_PREVIEW);
    }, [currentOffer]);

    useEffect(() => {
        updateSongLength(songId);
    }, [songId, updateSongLength]);

    useEffect(() => {
        return () => GetSoundManager().musicController?.stop(MusicPriorities.PRIORITY_PURCHASE_PREVIEW);
    }, []);

    const formattedSongLength = useMemo(() => {
        if (songLength === null) return '';

        const minutes = Math.floor(songLength / 60);
        const seconds = String(songLength % 60).padStart(2, '0');

        return LocalizeText('catalog.song.length', ['min', 'sec'], [String(minutes), seconds]);
    }, [songLength]);

    return (
        <div className="volt-catalog-sound-layout">
            <section className="volt-catalog-sound-product">
                {currentOffer ? (
                    <>
                        <strong className="volt-catalog-sound-title">{currentOffer.localizationName}</strong>
                        <span className="volt-catalog-sound-description">{currentOffer.localizationDescription}</span>
                        <span className="volt-catalog-sound-length">{formattedSongLength}</span>
                        <div className="volt-catalog-sound-product-render">
                            <LayoutFurniImageView
                                direction={2}
                                extraData={currentOffer.product.extraParam}
                                productClassId={currentOffer.product.productClassId}
                                productType={currentOffer.product.productType}
                            />
                        </div>
                        <div className="volt-catalog-sound-price">
                            <CatalogPriceDisplayWidgetView offer={currentOffer} />
                        </div>
                        {currentOffer.product.extraParam.length > 0 && (
                            <div className="volt-catalog-sound-listen-panel">
                                <span>{LocalizeText('play_preview')}</span>
                                <VoltButton
                                    className="volt-catalog-sound-listen-button"
                                    disabled={songId <= 0 || songLength === null}
                                    onClick={() => previewSong(songId)}
                                >
                                    {LocalizeText('play_preview_button')}
                                </VoltButton>
                            </div>
                        )}
                    </>
                ) : (
                    <span className="volt-catalog-sound-select-product">{LocalizeText('catalog_selectproduct')}</span>
                )}
            </section>

            <div className="volt-catalog-sound-grid">
                <CatalogItemGridWidgetView
                    className={`volt-catalog-grid volt-catalog-grid-density-${density}`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>

            <div className="volt-catalog-sound-purchase">{currentOffer ? <CatalogPurchaseWidgetView /> : <CatalogPurchaseSelectionPrompt />}</div>
        </div>
    );
};
