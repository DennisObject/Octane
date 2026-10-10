import { FC } from 'react';
import { LocalizeText } from '../../../../../api';

interface InfoStandHeaderViewProps {
    name: string;
    onClose: () => void;
}

/**
 * The name line and close button of the pet and bot infostands, drawn like the
 * user infostand's: the name in the Volter identity style and the skin's close
 * button in the corner.
 */
export const InfoStandHeaderView: FC<InfoStandHeaderViewProps> = ({ name, onClose }) => (
    <>
        <button
            type="button"
            className="volt-infostand__close"
            aria-label={LocalizeText('generic.close')}
            title={LocalizeText('generic.close')}
            onClick={onClose}
        />
        <div className="volt-infostand__header">
            <span className="volt-infostand__identity volt-infostand__identity--plain">{name}</span>
        </div>
    </>
);
