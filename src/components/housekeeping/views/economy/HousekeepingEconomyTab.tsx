import { FC, useState } from 'react';
import { HousekeepingTabId, IHousekeepingActionResult, LocalizeText } from '../../../../api';
import { Button, LayoutCurrencyIcon, StaffEmpty, StaffSection } from '../../../../common';
import { useHousekeeping } from '../../../../hooks';
import { HousekeepingNumberInput } from '../HousekeepingNumberInput';

interface GrantRowProps {
    icon: number;
    label: string;
    initial: number;
    unit: string;
    disabled: boolean;
    onGrant: (amount: number) => Promise<IHousekeepingActionResult | null> | null;
}

const GrantRow: FC<GrantRowProps> = ({ icon, label, initial, unit, disabled, onGrant }) => {
    const [amount, setAmount] = useState(initial);

    return (
        <div className="volt-housekeeping-grant">
            <span>{icon !== null && <LayoutCurrencyIcon type={icon} />}</span>
            <HousekeepingNumberInput label={unit} value={amount} onChange={setAmount} />
            <Button disabled={disabled} variant="secondary" onClick={() => onGrant(amount)}>
                {label}
            </Button>
        </div>
    );
};

/** Grants for the user picked in the Users tab. */
export const HousekeepingEconomyTab: FC = () => {
    const { selectedUser, isActionPending, setActiveTab, giveCredits, giveDuckets, giveDiamonds, grantItem, setHcSubscription } = useHousekeeping();
    const [itemId, setItemId] = useState(0);
    const [itemQuantity, setItemQuantity] = useState(1);

    if (!selectedUser) {
        return (
            <StaffEmpty>
                <p>{LocalizeText('housekeeping.economy.select_user')}</p>
                <Button variant="secondary" onClick={() => setActiveTab(HousekeepingTabId.USERS)}>
                    {LocalizeText('housekeeping.tab.users')}
                </Button>
            </StaffEmpty>
        );
    }

    const userId = selectedUser.id;
    const disabled = isActionPending;
    const amountUnit = LocalizeText('housekeeping.economy.item_quantity');

    return (
        <>
            <StaffSection title={LocalizeText('housekeeping.economy.target', ['username', 'id'], [selectedUser.username, String(userId)])}>
                <GrantRow
                    disabled={disabled}
                    icon={-1}
                    initial={1000}
                    label={LocalizeText('housekeeping.economy.give_credits')}
                    unit={amountUnit}
                    onGrant={(amount) => giveCredits(userId, amount)}
                />
                <GrantRow
                    disabled={disabled}
                    icon={0}
                    initial={100}
                    label={LocalizeText('housekeeping.economy.give_duckets')}
                    unit={amountUnit}
                    onGrant={(amount) => giveDuckets(userId, amount)}
                />
                <GrantRow
                    disabled={disabled}
                    icon={5}
                    initial={10}
                    label={LocalizeText('housekeeping.economy.give_diamonds')}
                    unit={amountUnit}
                    onGrant={(amount) => giveDiamonds(userId, amount)}
                />
                <GrantRow
                    disabled={disabled}
                    icon={null}
                    initial={31}
                    label={LocalizeText('housekeeping.economy.set_hc_days')}
                    unit={LocalizeText('housekeeping.unit.days')}
                    onGrant={(days) => setHcSubscription(userId, days)}
                />
            </StaffSection>
            <StaffSection title={LocalizeText('housekeeping.economy.grant_item.label')}>
                <div className="volt-staff-row">
                    <HousekeepingNumberInput label={LocalizeText('housekeeping.economy.item_id')} value={itemId} onChange={setItemId} />
                    <HousekeepingNumberInput label={amountUnit} value={itemQuantity} onChange={setItemQuantity} />
                    <Button classNames={['ml-auto']} disabled={disabled || itemId <= 0} variant="secondary" onClick={() => grantItem(userId, itemId, itemQuantity)}>
                        {LocalizeText('housekeeping.economy.grant_item')}
                    </Button>
                </div>
            </StaffSection>
        </>
    );
};
