import { RedeemVoucherMessageComposer, VoucherRedeemErrorMessageEvent, VoucherRedeemOkMessageEvent } from '@octane/renderer';
import { FC, KeyboardEvent, useState } from 'react';
import { LocalizeText, SanitizeHtml, SendMessageComposer } from '../../../../../api';
import { useMessageEvent, useNotification } from '../../../../../hooks';

export interface CatalogRedeemVoucherViewProps {
    text: string;
}

export const CatalogRedeemVoucherView: FC<CatalogRedeemVoucherViewProps> = (props) => {
    const { text = null } = props;
    const [voucher, setVoucher] = useState<string>('');
    const [isWaiting, setIsWaiting] = useState(false);
    const { simpleAlert = null } = useNotification();

    const redeemVoucher = (event?: KeyboardEvent<HTMLInputElement>) => {
        event?.preventDefault();

        if (isWaiting) return;

        if (!voucher || !voucher.length)
            return simpleAlert(LocalizeText('catalog.voucher.empty.desc'), null, null, null, LocalizeText('catalog.voucher.empty.title'));

        SendMessageComposer(new RedeemVoucherMessageComposer(voucher));
        setVoucher('');
        setIsWaiting(true);
    };

    useMessageEvent<VoucherRedeemOkMessageEvent>(VoucherRedeemOkMessageEvent, (event) => {
        const parser = event.getParser();

        let message = LocalizeText('catalog.alert.voucherredeem.ok.description');

        if (parser.productName)
            message = LocalizeText(
                'catalog.alert.voucherredeem.ok.description.furni',
                ['productName', 'productDescription'],
                [parser.productName, parser.productDescription]
            );

        simpleAlert(message, null, null, null, LocalizeText('catalog.alert.voucherredeem.ok.title'));

        setIsWaiting(false);
        setVoucher('');
    });

    useMessageEvent<VoucherRedeemErrorMessageEvent>(VoucherRedeemErrorMessageEvent, (event) => {
        const parser = event.getParser();

        simpleAlert(
            LocalizeText(`catalog.alert.voucherredeem.error.description.${parser.errorCode}`),
            null,
            null,
            null,
            LocalizeText('catalog.alert.voucherredeem.error.title')
        );

        setIsWaiting(false);
    });

    return (
        <div className="octane-cfp-voucher">
            <div className="octane-cfp-voucher-text" dangerouslySetInnerHTML={{ __html: SanitizeHtml(text ?? '') }} />
            <div className="octane-cfp-voucher-input">
                <input
                    name="voucher_code"
                    type="text"
                    value={voucher}
                    onChange={(event) => setVoucher(event.target.value)}
                    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => event.key === 'Enter' && redeemVoucher(event)}
                />
            </div>
            <button className="octane-cfp-voucher-button" type="button" onClick={() => redeemVoucher()}>
                {LocalizeText('redeem')}
            </button>
        </div>
    );
};
