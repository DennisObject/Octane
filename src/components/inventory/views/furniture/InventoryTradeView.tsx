import { FC, useEffect, useState } from 'react';
import creditsIcon from '@/assets/images/inventory/trading/credits-icon.png';
import { GetConfigurationValue, GroupItem, LocalizeText, TradeState, TradeUserData } from '../../../../api';
import { useInventoryTrade } from '../../../../hooks';
import { OctaneButton, OctaneItemCountBadge } from '../../../../layout';
import { InventoryThumbIconView } from '../InventoryThumbIconView';
import { MAX_ITEMS_TO_TRADE } from './inventoryTradeOffer';

interface InventoryTradeViewProps {
    isMinimized?: boolean;
    cancelTrade: () => void;
    continueTrade?: () => void;
}

const COUNTDOWN_SECONDS = 3;

// v75 lights the accept button once either grid shows anything, credit pile included.
const hasOffers = (user: TradeUserData) => user.itemCount > 0 || user.creditsCount > 0 || user.userItems.length > 0;

const TradeOfferView: FC<{
    side: 'own' | 'other';
    user: TradeUserData;
    disabledText?: string;
    onRemove?: (groupItem: GroupItem) => void;
}> = (props) => {
    const { side, user, disabledText = null, onRemove = null } = props;
    const isOwn = side === 'own';
    // v75 only fills content_text_*_a/b while trading.warning.enabled (on in the legacy variables).
    const showTotals = GetConfigurationValue<boolean>('trading.warning.enabled', true);

    return (
        <div className={`octane-trade-offer is-${side}`}>
            <div className="octane-trade-offer-title">
                <span className="octane-trade-offer-name">{isOwn ? LocalizeText('inventory.trading.you') : user.userName}</span>
                <span>{LocalizeText(isOwn ? 'inventory.trading.areoffering' : 'inventory.trading.isoffering')}</span>
            </div>
            {!!disabledText && <div className="octane-trade-offer-info">{disabledText}</div>}
            <div className="octane-trade-offer-grid" hidden={disabledText !== null}>
                {Array.from(Array(MAX_ITEMS_TO_TRADE), (_, slotIndex) => {
                    // v75 builds a CreditTradingItem out of the credit total and lists it before the furni.
                    const hasCredits = user.creditsCount > 0;
                    const isCreditSlot = hasCredits && slotIndex === 0;
                    const groupItem = isCreditSlot ? null : user.userItems.getWithIndex(hasCredits ? slotIndex - 1 : slotIndex) || null;
                    const index = slotIndex;

                    return (
                        <div key={index} className="octane-trade-slot">
                            {isCreditSlot && (
                                <div className="octane-inventory-thumb octane-trade-item is-credit" title={LocalizeText('purse.coins')}>
                                    <img className="octane-trade-credit-icon" src={creditsIcon} alt="" draggable={false} />
                                    <span className="octane-trade-credit-count">{user.creditsCount}</span>
                                </div>
                            )}
                            {groupItem && (
                                <div
                                    className={`octane-inventory-thumb octane-trade-item ${isOwn && !user.accepts ? 'is-removable' : ''}`}
                                    title={groupItem.name}
                                    onClick={isOwn ? () => onRemove?.(groupItem) : undefined}
                                >
                                    <InventoryThumbIconView iconUrl={groupItem.iconUrl} />
                                    {groupItem.getTotalCount() > 1 && <OctaneItemCountBadge count={groupItem.getTotalCount()} />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className={`octane-trade-lock ${user.accepts ? 'is-locked' : ''}`} />
            {showTotals && (
                <>
                    <div className="octane-trade-total is-items">{LocalizeText('inventory.trading.info.itemcount', ['value'], [String(user.itemCount)])}</div>
                    <div className="octane-trade-total is-credits">
                        {LocalizeText('inventory.trading.info.creditvalue', ['value'], [String(user.creditsCount)])}
                    </div>
                </>
            )}
        </div>
    );
};

export const InventoryTradeView: FC<InventoryTradeViewProps> = (props) => {
    const { isMinimized = false, cancelTrade = null, continueTrade = null } = props;
    const [countdownTick, setCountdownTick] = useState(COUNTDOWN_SECONDS);
    const {
        ownUser = null,
        otherUser = null,
        tradeState = TradeState.TRADING_STATE_READY,
        progressTrade = null,
        removeItem = null,
        setTradeState = null,
        closeTrade = null
    } = useInventoryTrade();

    useEffect(() => {
        if (tradeState !== TradeState.TRADING_STATE_COUNTDOWN) return;

        let remaining = COUNTDOWN_SECONDS;

        setCountdownTick(remaining);

        const interval = setInterval(() => {
            remaining -= 1;
            setCountdownTick(remaining);

            if (remaining > 0) return;

            clearInterval(interval);
            setTradeState(TradeState.TRADING_STATE_CONFIRMING);
        }, 1000);

        return () => clearInterval(interval);
    }, [tradeState, setTradeState]);

    if (tradeState === TradeState.TRADING_STATE_READY || !ownUser || !otherUser) return null;

    // inventory_trading_minimized_xml: shown while another inventory tab is open.
    if (isMinimized) {
        return (
            <div className="octane-trade is-minimized">
                <div className="octane-trade-minimized-panel" />
                <div className="octane-trade-minimized-icon" />
                <div className="octane-trade-minimized-help">{LocalizeText('inventory.trading.minimized.trade_in_progress')}</div>
                <div className="octane-trade-buttons">
                    <OctaneButton className="octane-trade-continue" onClick={continueTrade}>
                        {LocalizeText('inventory.trading.minimized.continue_trade')}
                    </OctaneButton>
                    <OctaneButton className="octane-trade-cancel" onClick={closeTrade}>
                        {LocalizeText('generic.cancel')}
                    </OctaneButton>
                </div>
            </div>
        );
    }

    let helpKey = 'inventory.trading.info.add';
    let buttonCaption = LocalizeText('inventory.trading.accept');
    let buttonEnabled = false;

    switch (tradeState) {
        case TradeState.TRADING_STATE_RUNNING:
            buttonEnabled = hasOffers(ownUser) || hasOffers(otherUser);
            buttonCaption = LocalizeText(ownUser.accepts ? 'inventory.trading.modify' : 'inventory.trading.accept');
            break;
        case TradeState.TRADING_STATE_COUNTDOWN:
            helpKey = 'inventory.trading.info.confirm';
            buttonCaption = LocalizeText('inventory.trading.countdown', ['counter'], [countdownTick.toString()]);
            break;
        case TradeState.TRADING_STATE_CONFIRMING:
            helpKey = 'inventory.trading.info.confirm';
            buttonEnabled = true;
            buttonCaption = LocalizeText('inventory.trading.confirm');
            break;
        case TradeState.TRADING_STATE_CONFIRMED:
            // v75 keeps the caption of the previous step and only disables the button.
            helpKey = 'inventory.trading.info.waiting';
            buttonCaption = LocalizeText('inventory.trading.confirm');
            break;
    }

    // v75 trading view setup(): a side whose account cannot trade swaps its grid for a warning text.
    const helpText = !ownUser.canTrade && !otherUser.canTrade ? 'inventory.trading.warning.both_accounts_disabled' : helpKey;

    return (
        <div className="octane-trade">
            <div className="octane-trade-panel">
                <div className="octane-trade-help">{LocalizeText(helpText)}</div>
                <TradeOfferView
                    side="own"
                    user={ownUser}
                    disabledText={ownUser.canTrade ? null : otherUser.canTrade ? LocalizeText('inventory.trading.warning.own_account_disabled') : ''}
                    onRemove={ownUser.accepts ? null : removeItem}
                />
                <div className="octane-trade-separator" />
                <TradeOfferView
                    side="other"
                    user={otherUser}
                    disabledText={otherUser.canTrade ? null : ownUser.canTrade ? LocalizeText('inventory.trading.warning.others_account_disabled') : ''}
                />
            </div>
            {(ownUser.creditsCount > 0 || otherUser.creditsCount > 0) && (
                <div className="octane-trade-note">{LocalizeText('inventory.trading.warning.credits')}</div>
            )}
            <div className="octane-trade-buttons">
                <OctaneButton className="octane-trade-accept" disabled={!buttonEnabled} onClick={progressTrade}>
                    {buttonCaption}
                </OctaneButton>
                <OctaneButton
                    className="octane-trade-cancel"
                    onClick={tradeState === TradeState.TRADING_STATE_RUNNING || tradeState === TradeState.TRADING_STATE_CONFIRMING ? cancelTrade : undefined}
                >
                    {LocalizeText('generic.cancel')}
                </OctaneButton>
            </div>
        </div>
    );
};
