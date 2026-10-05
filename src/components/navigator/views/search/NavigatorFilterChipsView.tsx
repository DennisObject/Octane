import { FC } from 'react';
import { LocalizeText, SearchFilterOptions } from '../../../../api';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';

interface NavigatorFilterChipsViewProps {
    value: number;
    onChange: (index: number) => void;
}

export const NavigatorFilterChipsView: FC<NavigatorFilterChipsViewProps> = ({ value, onChange }) => (
    <div className="octane-navigator-air__filter">
        <HabboDropMenuView
            label={LocalizeText('navigator.filter.anything')}
            value={value}
            options={SearchFilterOptions.map((filter, index) => ({ value: index, label: LocalizeText('navigator.filter.' + filter.name) }))}
            onSelect={onChange}
        />
    </div>
);
