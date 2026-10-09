import { FurnitureType, IWiredTradeNode, WiredChestRewardEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, ProductImageUtility } from '../../../../api';
import { Button, Column, Flex, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent } from '../../../../hooks';

export const FurnitureWiredChestRewardView: FC = () => {
    const [receipt, setReceipt] = useState<{ nodes: IWiredTradeNode[]; text: string }>(null);
    const [open, setOpen] = useState(false);
    useMessageEvent<WiredChestRewardEvent>(WiredChestRewardEvent, event => {
        const parser = event.getParser();
        setReceipt({ nodes: [...parser.nodes], text: parser.text });
        setOpen(parser.openByDefault);
    });
    if (!receipt) return null;
    const title = localizeWithFallback('wired_transactions.notification.reward.popup.title', 'You received a reward');
    if (!open) return <Button className="fixed bottom-20 right-4" onClick={() => setOpen(true)}>{title}</Button>;
    return <OctaneCardView theme="primary-slim" className="octane-wired-chest-reward" style={{ width: 340 }}>
        <OctaneCardHeaderView headerText={title} onCloseClick={() => { setOpen(false); setReceipt(null); }} />
        <OctaneCardContentView><Column gap={2}>
            {receipt.text && <Text>{receipt.text}</Text>}
            {receipt.nodes.map((node, index) => <Flex key={index} alignItems="center" gap={2}>
                {node.kind === 0 ? <LayoutCurrencyIcon type={-1} /> : <img alt="" width={64} height={64} src={ProductImageUtility.getProductImageUrl(node.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR, node.spriteId, '')} />}
                <Text bold>{node.amount}{node.kind === 0 ? ' credits' : ''}</Text>
            </Flex>)}
            <Button onClick={() => { setOpen(false); setReceipt(null); }}>{localizeWithFallback('generic.ok', 'OK')}</Button>
        </Column></OctaneCardContentView>
    </OctaneCardView>;
};
