import { FC, useEffect, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredLegacySlider as Slider } from '../WiredSlider';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

/** The prizes the server awards: badges and furniture by base item id. */
type RewardType = 'badge' | 'furni';

interface RewardEntry {
    rewardType: RewardType;
    rewardValue: string;
    probability: number;
}

const DEFAULT_PROBABILITY = 100;
const MAX_REWARDS = 20;
const MAX_BADGE_CODE_LENGTH = 35;
const MAX_LIMIT = 1000;

const REWARD_TYPES: { value: RewardType; key: string; label: string }[] = [
    { value: 'badge', key: 'wiredfurni.params.reward.type.badge', label: 'Badge' },
    { value: 'furni', key: 'wiredfurni.params.reward.type.furni', label: 'Furni' }
];

const clampInt = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min);

const createReward = (): RewardEntry => ({ rewardType: 'furni', rewardValue: '', probability: DEFAULT_PROBABILITY });

const getRewardValueLabel = (rewardType: RewardType) => (rewardType === 'badge' ? 'Badge code' : 'Furni base item id');

/** The code of one prize as the server reads it: "badge" or "furni#<base item id>"; null when the server would refuse it. */
const rewardCodeOf = (reward: RewardEntry): string | null => {
    const value = reward.rewardValue.trim();

    if (reward.rewardType === 'badge') return value.length > 0 && value.length <= MAX_BADGE_CODE_LENGTH && !/[,;\s]/.test(value) ? value : null;

    return /^\d+$/.test(value) && Number(value) > 0 ? `furni#${value}` : null;
};

/** Reads one "type,code,chance" entry of the text; entries the server never writes are dropped. */
const parseRewardEntry = (rawType: string, rawCode: string, rawChance: string): RewardEntry | null => {
    const chance = Number(rawChance);
    const probability = clampInt(Number.isFinite(chance) ? chance : DEFAULT_PROBABILITY, 0, 100);

    if (rawType === '0') return { rewardType: 'badge', rewardValue: rawCode, probability };

    if (rawType === '1' && rawCode.startsWith('furni#')) return { rewardType: 'furni', rewardValue: rawCode.slice('furni#'.length), probability };

    return null;
};

export const WiredActionGiveRewardView: FC<{}> = (props) => {
    const [limitEnabled, setLimitEnabled] = useState(false);
    const [rewardTime, setRewardTime] = useState(0);
    const [uniqueRewards, setUniqueRewards] = useState(false);
    const [rewardsLimit, setRewardsLimit] = useState(1);
    const [limitationInterval, setLimitationInterval] = useState(1);
    const [rewards, setRewards] = useState<RewardEntry[]>([]);
    const { trigger = null, setIntParams = null, setStringParam = null, setUserSources = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSources?.[0] ?? 0);

    const filledRewards = rewards.filter((reward) => reward.rewardValue.trim().length > 0);
    const invalidRewards = filledRewards.some((reward) => rewardCodeOf(reward) === null);
    const tooManyRewards = filledRewards.length > MAX_REWARDS;

    const addReward = () => setRewards((prevValue) => [...prevValue, createReward()]);

    const removeReward = (index: number) => setRewards((prevValue) => prevValue.filter((_, rewardIndex) => rewardIndex !== index));

    const updateReward = (index: number, updater: (reward: RewardEntry) => RewardEntry) => {
        setRewards((prevValue) => prevValue.map((reward, rewardIndex) => (rewardIndex === index ? updater(reward) : reward)));
    };

    const validate = () => !invalidRewards && !tooManyRewards;

    // Always saved, so an empty list clears the text and the counted fields instead of keeping the last save.
    const save = () => {
        const entries = filledRewards.map((reward) => `${reward.rewardType === 'badge' ? '0' : '1'},${rewardCodeOf(reward)},${uniqueRewards ? DEFAULT_PROBABILITY : clampInt(reward.probability, 0, 100)}`);

        setStringParam(entries.join(';'));
        // owned: [interval unit (0 once), unique, limit (0 none), interval count (1..1000)]; the receiving user is the U tail.
        setIntParams([rewardTime, uniqueRewards ? 1 : 0, limitEnabled ? clampInt(rewardsLimit, 1, MAX_LIMIT) : 0, clampInt(limitationInterval, 1, MAX_LIMIT)]);
        setUserSources([userSource]);
    };

    useEffect(() => {
        if (!trigger) return;

        const readRewards: RewardEntry[] = [];

        for (const rawReward of (trigger.stringData ?? '').split(';')) {
            const parts = rawReward.split(',');

            if (parts.length !== 3) continue;

            const reward = parseRewardEntry(parts[0], parts[1], parts[2]);

            if (reward) readRewards.push(reward);
        }

        if (readRewards.length === 0) readRewards.push(createReward());

        const limit = trigger.intData.length > 2 ? trigger.intData[2] : 0;

        setRewards(readRewards);
        setRewardTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUniqueRewards(trigger.intData.length > 1 ? trigger.intData[1] === 1 : false);
        setLimitEnabled(limit > 0);
        setRewardsLimit(limit > 0 ? limit : 1);
        setLimitationInterval(trigger.intData.length > 3 ? trigger.intData[3] : 1);
        setUserSource(trigger.userSources.length > 0 ? trigger.userSources[0] : 0);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex items-center gap-1">
                <input checked={limitEnabled} className="form-check-input" id="limitEnabled" type="checkbox" onChange={(event) => setLimitEnabled(event.target.checked)} />
                <Text>{LocalizeText('wiredfurni.params.prizelimit', ['amount'], [limitEnabled ? rewardsLimit.toString() : ''])}</Text>
            </div>
            {limitEnabled && <Slider max={MAX_LIMIT} min={1} value={rewardsLimit} onChange={(event) => setRewardsLimit(event)} />}
            <hr className="m-0 bg-dark" />
            <div className="flex flex-col gap-1">
                <Text bold>How often can a user be rewarded?</Text>
                <div className="flex gap-1">
                    <select className="w-full form-select form-select-sm" value={rewardTime} onChange={(event) => setRewardTime(Number(event.target.value))}>
                        <option value="0">Once</option>
                        <option value="3">Once every {limitationInterval} minutes</option>
                        <option value="2">Once every {limitationInterval} hours</option>
                        <option value="1">Once every {limitationInterval} days</option>
                    </select>
                    {rewardTime > 0 && (
                        <OctaneInput type="number" min={1} max={MAX_LIMIT} value={limitationInterval} onChange={(event) => setLimitationInterval(Number(event.target.value))} />
                    )}
                </div>
            </div>
            <hr className="m-0 bg-dark" />
            <div className="flex items-center gap-1">
                <input checked={uniqueRewards} className="form-check-input" id="uniqueRewards" type="checkbox" onChange={(event) => setUniqueRewards(event.target.checked)} />
                <Text>{localizeWithFallback('wiredfurni.params.reward.unique', 'Unique rewards')}</Text>
            </div>
            <Text center small className="p-1 rounded bg-muted">
                {localizeWithFallback(
                    'wiredfurni.params.reward.unique.info',
                    'If checked each reward will be given once to each user. This will disable the probabilities option.'
                )}
            </Text>
            <hr className="m-0 bg-dark" />
            <div className="flex items-center justify-between">
                <Text bold>Rewards</Text>
                <Button variant="success" onClick={addReward}>
                    <FaPlus className="fa-icon" />
                </Button>
            </div>
            <div className="flex flex-col gap-2">
                {rewards.map((reward, index) => (
                    <div key={index} className="flex flex-col gap-1 p-1 rounded bg-muted">
                        <div className="flex items-center gap-1">
                            <select
                                aria-label="Reward type"
                                className="min-w-0 grow form-select form-select-sm"
                                value={reward.rewardType}
                                onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, rewardType: event.target.value as RewardType, rewardValue: '' }))}
                            >
                                {REWARD_TYPES.map((entry) => (
                                    <option key={entry.value} value={entry.value}>
                                        {localizeWithFallback(entry.key, entry.label)}
                                    </option>
                                ))}
                            </select>
                            {index > 0 && (
                                <Button variant="danger" onClick={() => removeReward(index)}>
                                    <FaTrash className="fa-icon" />
                                </Button>
                            )}
                        </div>
                        <div className="flex flex-col gap-[2px]">
                            <Text small bold>
                                {getRewardValueLabel(reward.rewardType)}
                            </Text>
                            <OctaneInput
                                aria-label={getRewardValueLabel(reward.rewardType)}
                                placeholder={getRewardValueLabel(reward.rewardType)}
                                type={reward.rewardType === 'badge' ? 'text' : 'number'}
                                value={reward.rewardValue}
                                onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, rewardValue: event.target.value }))}
                            />
                        </div>
                        <div className="flex flex-col gap-[2px] min-w-0">
                            <Text small bold>
                                Chance %
                            </Text>
                            {uniqueRewards ? (
                                <Text small className="px-1">
                                    Unique
                                </Text>
                            ) : (
                                <OctaneInput
                                    aria-label="Chance %"
                                    min={0}
                                    max={100}
                                    type="number"
                                    value={reward.probability}
                                    onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, probability: clampInt(Number(event.target.value), 0, 100) }))}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {invalidRewards && (
                <Text center small className="p-1 rounded bg-muted">
                    A badge needs a code of up to 35 characters without spaces or commas; furni needs a base item id.
                </Text>
            )}
            {tooManyRewards && (
                <Text center small className="p-1 rounded bg-muted">
                    A box holds at most {MAX_REWARDS} rewards.
                </Text>
            )}
        </WiredActionBaseView>
    );
};
