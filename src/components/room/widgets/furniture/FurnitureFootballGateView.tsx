import { AvatarFigurePartType, CreateLinkEvent } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, VoltCardContentView, VoltCardHeaderView, VoltCardView, Text } from '../../../../common';
import { useFurnitureFootballGateWidget } from '../../../../hooks';

export const FurnitureFootballGateView: FC<{}> = (props) => {
    const { objectId = -1, setObjectId = null, onClose = null } = useFurnitureFootballGateWidget();

    const onGender = (gender: string) => {
        CreateLinkEvent(`avatar-editor/show/${gender}/${objectId}`);
        setObjectId(-1);
    };

    if (objectId === -1) return null;

    return (
        <VoltCardView className="volt-football-gate w-[300px]" theme="primary-slim" uniqueKey="football-gate">
            <VoltCardHeaderView headerText={LocalizeText('widget.furni.clothingchange.gender.title')} onCloseClick={onClose} />
            <VoltCardContentView>
                <div className="flex justify-center w-full">
                    <Text>{LocalizeText('widget.furni.clothingchange.gender.info')}</Text>
                </div>
                <div className="flex justify-between gap-2 px-2 mt-4">
                    <Button onClick={(event) => onGender(AvatarFigurePartType.MALE)}>
                        {LocalizeText('widget.furni.clothingchange.gender.male')}
                    </Button>
                    <Button onClick={(event) => onGender(AvatarFigurePartType.FEMALE)}>
                        {LocalizeText('widget.furni.clothingchange.gender.female')}
                    </Button>
                </div>
            </VoltCardContentView>
        </VoltCardView>
    );
};
