import { CreateLinkEvent, PetRespectComposer, PetType, RoomControllerLevel, RoomObjectCategory, RoomObjectOperationType } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, ProcessRoomObjectOperation, SendMessageComposer } from '../../../../../api';
import { Button, Column, Flex, LayoutPetImageView } from '../../../../../common';
import { useRoom, useSessionInfo } from '../../../../../hooks';
import { HasPermission, Permission } from '../../../../../api/permissions';
import { InfoStandCenteredText } from './InfoStandCenteredText';
import energyIcon from '../../../../../assets/images/infostand/pet/icon_pet_energy.png';
import experienceIcon from '../../../../../assets/images/infostand/pet/icon_pet_experience.png';
import happinessIcon from '../../../../../assets/images/infostand/pet/icon_pet_happiness.png';
import respectIcon from '../../../../../assets/images/infostand/pet/icon_petrespect.png';
import wellbeingIcon from '../../../../../assets/images/infostand/pet/icon_pet_wellbeing.png';
import clockBackground from '../../../../../assets/images/infostand/pet/clock-background.png';

// TypeScript interface for AvatarInfoPet
interface AvatarInfoPet {
    id: number;
    roomIndex?: number;
    name: string;
    petType: number;
    petBreed: number;
    petFigure: string;
    posture: string;
    level: number;
    maximumLevel: number;
    age: number;
    ownerId: number;
    ownerName: string;
    respect: number;
    dead?: boolean;
    energy?: number;
    maximumEnergy?: number;
    happyness?: number;
    maximumHappyness?: number;
    experience?: number;
    levelExperienceGoal?: number;
    remainingGrowTime?: number;
    remainingTimeToLive?: number;
    maximumTimeToLive?: number;
    rarityLevel?: number;
    isOwner?: boolean;
}

interface InfoStandWidgetPetViewProps {
    avatarInfo: AvatarInfoPet;
    onClose: () => void;
}

// pet_view status bars: 162x16 bitmaps drawn by the controller (1px #dadada frame, #3a3a3a track, 4px highlight).
const PetStatusBar: FC<{ top: number; label: string; icon: string; value: number; maximum: number; color: string; highlight: string; text?: string }> = ({
    top,
    label,
    icon,
    value,
    maximum,
    color,
    highlight,
    text
}) => {
    const fill = Math.max(0, Math.min(Math.max(maximum, 1), value)) / Math.max(maximum, 1);

    return (
        <>
            <InfoStandCenteredText className="volt-pet-infostand__label" style={{ top }} width={169}>
                {label}
            </InfoStandCenteredText>
            <img alt="" className="volt-pet-infostand__status-icon" draggable={false} src={icon} style={{ top: top + 14 }} />
            <div className="volt-pet-infostand__bar" style={{ top: top + 15 }}>
                <div className="volt-pet-infostand__bar-fill" style={{ width: fill * 160, background: color }} />
                <div className="volt-pet-infostand__bar-highlight" style={{ width: fill * 160, background: highlight }} />
                <InfoStandCenteredText className="volt-pet-infostand__bar-value" width={160}>
                    {text ?? value + '/' + maximum}
                </InfoStandCenteredText>
            </div>
        </>
    );
};

const pad = (value: number) => value.toString().padStart(2, '0');

const formatWellbeing = (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));

    return Math.floor(total / 3600) + ':' + pad(Math.floor((total % 3600) / 60)) + ':' + pad(total % 60);
};

export const InfoStandWidgetPetView: FC<InfoStandWidgetPetViewProps> = ({ avatarInfo, onClose }) => {
    const [remainingGrowTime, setRemainingGrowTime] = useState(0);
    const [remainingTimeToLive, setRemainingTimeToLive] = useState(0);
    const { roomSession = null } = useRoom();
    const { petRespectRemaining = 0, respectPet = null } = useSessionInfo();

    useEffect(() => {
        setRemainingGrowTime(avatarInfo.remainingGrowTime || 0);
        setRemainingTimeToLive(avatarInfo.remainingTimeToLive || 0);
    }, [avatarInfo]);

    useEffect(() => {
        if (avatarInfo.petType !== PetType.MONSTERPLANT || avatarInfo.dead) return;

        const interval = setInterval(() => {
            setRemainingGrowTime((prev) => (prev <= 0 ? 0 : prev - 1));
            setRemainingTimeToLive((prev) => (prev <= 0 ? 0 : prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [avatarInfo]);

    const processButtonAction = useCallback(
        async (action: string) => {
            try {
                let hideMenu = true;
                if (!action) return;

                switch (action) {
                    case 'respect':
                        await respectPet(avatarInfo.id);
                        if (petRespectRemaining - 1 >= 1) hideMenu = false;
                        break;
                    case 'buyfood':
                        CreateLinkEvent('catalog/open/' + GetConfigurationValue('catalog.links')['pets.buy_food']);
                        break;
                    case 'train':
                        roomSession?.requestPetCommands(avatarInfo.id);
                        break;
                    case 'treat':
                        SendMessageComposer(new PetRespectComposer(avatarInfo.id));
                        break;
                    case 'move':
                        ProcessRoomObjectOperation(avatarInfo.roomIndex, RoomObjectCategory.UNIT, RoomObjectOperationType.OBJECT_MOVE);
                        break;
                    case 'rotate':
                        ProcessRoomObjectOperation(avatarInfo.roomIndex, RoomObjectCategory.UNIT, RoomObjectOperationType.OBJECT_ROTATE_POSITIVE);
                        break;
                    case 'pick_up':
                        roomSession?.pickupPet(avatarInfo.id);
                        break;
                }

                if (hideMenu) onClose();
            } catch (error) {
                console.error(`Failed to process action ${action}:`, error);
            }
        },
        [avatarInfo, petRespectRemaining, respectPet, roomSession, onClose]
    );

    // button_list: a 250px list whose regions are placed from the right edge in layout order (pick up, train, buy food,
    // respect, treat, kick) and wrap onto a new 25px row, 5px below, when the next one no longer fits.
    // The pet widget enables kick (and, for plants, move and rotate) for the pet's owner, the room owner, anyone with rooms rights or any room controller.
    const canManage = avatarInfo.isOwner || !!roomSession?.isRoomOwner || roomSession?.controllerLevel >= RoomControllerLevel.GUEST || HasPermission(Permission.RoomOwnerAny);
    const isPlant = avatarInfo.petType === PetType.MONSTERPLANT;

    const buttons = [
        {
            action: 'move',
            label: LocalizeText('infostand.button.move'),
            condition: isPlant && canManage
        },
        {
            action: 'rotate',
            label: LocalizeText('infostand.button.rotate'),
            condition: isPlant && canManage
        },
        {
            action: 'pick_up',
            label: LocalizeText('infostand.button.petkick'),
            condition: !isPlant && canManage
        },
        {
            action: 'treat',
            label: LocalizeText('infostand.button.pettreat'),
            condition: !avatarInfo.dead && avatarInfo.petType === PetType.MONSTERPLANT && avatarInfo.energy / avatarInfo.maximumEnergy < 0.98
        },
        {
            action: 'respect',
            label: LocalizeText('infostand.button.petrespect', ['count'], [petRespectRemaining.toString()]),
            condition: petRespectRemaining > 0 && avatarInfo.petType !== PetType.MONSTERPLANT
        },
        {
            action: 'buyfood',
            label: LocalizeText('infostand.button.buyfood'),
            condition: avatarInfo.petType !== PetType.MONSTERPLANT
        },
        {
            action: 'train',
            label: LocalizeText('infostand.button.train'),
            condition: avatarInfo.isOwner && avatarInfo.petType !== PetType.MONSTERPLANT
        },
        {
            action: 'pick_up',
            label: LocalizeText('inventory.pets.pickup'),
            condition: avatarInfo.isOwner
        }
    ];

    const actions = (
        <Flex className="volt-infostand-actions volt-infostand-actions--tight volt-pet-actions" justifyContent="end">
            {[...buttons].reverse().map(
                (button) =>
                    button.condition && (
                        <Button key={button.action + button.label} variant="dark" size={null} className="habbo-btn-black" onClick={() => processButtonAction(button.action)}>
                            {button.label}
                        </Button>
                    )
            )}
        </Flex>
    );

    if (avatarInfo.petType !== PetType.MONSTERPLANT)
        return (
            <Column alignItems="end" className="volt-pet-infostand-stack">
                <div className="volt-infostand volt-pet-infostand">
                    <button type="button" className="volt-infostand__close" aria-label={LocalizeText('generic.close')} title={LocalizeText('generic.close')} onClick={onClose} />
                    <InfoStandCenteredText className="volt-pet-infostand__name" width={173}>
                        {avatarInfo.name}
                    </InfoStandCenteredText>
                    <InfoStandCenteredText className="volt-pet-infostand__breed" width={173}>
                        {LocalizeText(`pet.breed.${avatarInfo.petType}.${avatarInfo.petBreed}`)}
                    </InfoStandCenteredText>
                    <div className="volt-pet-infostand__image">
                        <LayoutPetImageView direction={2} figure={avatarInfo.petFigure} posture={avatarInfo.posture} />
                    </div>
                    <div className="volt-pet-infostand__level">
                        {LocalizeText('pet.level', ['level', 'maxlevel'], [avatarInfo.level.toString(), avatarInfo.maximumLevel.toString()])}
                    </div>
                    <PetStatusBar
                        color="#009ac0"
                        highlight="#1fd1f2"
                        icon={happinessIcon}
                        label={LocalizeText('infostand.pet.text.happiness')}
                        maximum={avatarInfo.maximumHappyness}
                        top={121}
                        value={avatarInfo.happyness}
                    />
                    <PetStatusBar
                        color="#8547be"
                        highlight="#a06ad2"
                        icon={experienceIcon}
                        label={LocalizeText('infostand.pet.text.experience')}
                        maximum={avatarInfo.levelExperienceGoal}
                        top={155}
                        value={avatarInfo.experience}
                    />
                    <PetStatusBar
                        color="#5e9d00"
                        highlight="#8ac51e"
                        icon={energyIcon}
                        label={LocalizeText('infostand.pet.text.energy')}
                        maximum={avatarInfo.maximumEnergy}
                        top={189}
                        value={avatarInfo.energy}
                    />
                    <InfoStandCenteredText className="volt-pet-infostand__respect" width={173}>
                        {LocalizeText('infostand.text.petrespect', ['count'], [avatarInfo.respect.toString()])}
                        <img alt="" draggable={false} src={respectIcon} />
                    </InfoStandCenteredText>
                    <InfoStandCenteredText className="volt-pet-infostand__line" style={{ top: 281 }} width={173}>
                        {LocalizeText('pet.age', ['age'], [avatarInfo.age.toString()])}
                    </InfoStandCenteredText>
                    <InfoStandCenteredText className="volt-pet-infostand__line" style={{ top: 294 }} width={173}>
                        {LocalizeText('infostand.text.petowner', ['name'], [avatarInfo.ownerName])}
                    </InfoStandCenteredText>
                </div>
                {actions}
            </Column>
        );

    const total = Math.max(0, Math.floor(remainingGrowTime));
    const clock = [pad(Math.floor(total / 3600)), pad(Math.floor((total % 3600) / 60)), pad(total % 60)];
    const clockUnits = [LocalizeText('countdown_clock_unit_hours'), LocalizeText('countdown_clock_unit_minutes'), LocalizeText('countdown_clock_unit_seconds')];
    const wellbeing = avatarInfo.dead ? 0 : Math.max(0, remainingTimeToLive);

    return (
        <Column alignItems="end" className="volt-pet-infostand-stack">
            <div className="volt-infostand volt-pet-infostand volt-pet-infostand--plant">
                <button type="button" className="volt-infostand__close" aria-label={LocalizeText('generic.close')} title={LocalizeText('generic.close')} onClick={onClose} />
                <InfoStandCenteredText className="volt-pet-infostand__name" width={173}>
                    {avatarInfo.name}
                </InfoStandCenteredText>
                <div className="volt-pet-infostand__image">
                    <LayoutPetImageView direction={4} figure={avatarInfo.petFigure} posture={avatarInfo.posture} />
                </div>
                <PetStatusBar
                    color="#5e9d00"
                    highlight="#8ac51e"
                    icon={wellbeingIcon}
                    label={LocalizeText('infostand.pet.text.wellbeing')}
                    maximum={avatarInfo.maximumTimeToLive}
                    text={formatWellbeing(wellbeing)}
                    top={112}
                    value={wellbeing}
                />
                {remainingGrowTime > 0 && (
                    <>
                        <InfoStandCenteredText className="volt-pet-infostand__label" style={{ top: 147 }} width={169}>
                            {LocalizeText('infostand.pet.text.growth')}
                        </InfoStandCenteredText>
                        {clock.map((value, index) => (
                            <div key={index} className="volt-pet-infostand__clock" style={{ left: 46 + index * 36, backgroundImage: `url(${clockBackground})` }}>
                                <span>{value}</span>
                                <em>{clockUnits[index]}</em>
                                {index < 2 && <i>:</i>}
                            </div>
                        ))}
                    </>
                )}
                <InfoStandCenteredText className="volt-pet-infostand__label" style={{ top: 201 }} width={169}>
                    {LocalizeText('infostand.pet.text.raritylevel', ['level'], [LocalizeText(`infostand.pet.raritylevel.${avatarInfo.rarityLevel}`)])}
                </InfoStandCenteredText>
                <div className="volt-pet-infostand__rarity">
                    <div>{avatarInfo.rarityLevel}</div>
                </div>
                <InfoStandCenteredText className="volt-pet-infostand__line" style={{ top: 272 }} width={173}>
                    {LocalizeText('pet.age', ['age'], [avatarInfo.age.toString()])}
                </InfoStandCenteredText>
                <InfoStandCenteredText className="volt-pet-infostand__line" style={{ top: 285 }} width={173}>
                    {LocalizeText('infostand.text.petowner', ['name'], [avatarInfo.ownerName])}
                </InfoStandCenteredText>
            </div>
            {actions}
        </Column>
    );
};
