import { FC } from 'react';
import { loginText } from '../../../api';
import { Registration } from '../../../hooks/login';

interface RegistrationRoomViewProps {
    registration: Registration;
}

interface RoomChoiceProps {
    selected: boolean;
    title: string;
    description: string;
    thumbnail?: string;
    onSelect: () => void;
}

const RoomChoice: FC<RoomChoiceProps> = ({ selected, title, description, thumbnail, onSelect }) => (
    <label className={`registration-room${selected ? ' is-selected' : ''}`}>
        <input type="radio" name="first-room" checked={selected} onChange={onSelect} />
        <span className="registration-room-thumbnail">{thumbnail && <img src={thumbnail} alt="" onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />}</span>
        <span className="registration-room-copy">
            <span className="registration-room-title">{title}</span>
            {description && <span className="registration-room-description">{description}</span>}
        </span>
    </label>
);

// "Choose a room for your Habbo": the hotel's starter rooms in AvatarView's
// dark information panels, plus the option to start without one.
export const RegistrationRoomView: FC<RegistrationRoomViewProps> = ({ registration }) => (
    <div className="registration-rooms" role="radiogroup">
        <RoomChoice
            selected={registration.templateId === null}
            title={loginText('login.select_first_room.skip', 'No room for now')}
            description={loginText('login.select_first_room.skip.description', 'Start with an empty inventory and build your own room later.')}
            onSelect={() => registration.setTemplateId(null)}
        />
        {registration.templates === null && <p className="login-flow-hint">{loginText('generic.loading', 'Loading...')}</p>}
        {registration.templates?.map((template) => (
            <RoomChoice
                key={template.templateId}
                selected={registration.templateId === template.templateId}
                title={template.title}
                description={template.description}
                thumbnail={template.thumbnail}
                onSelect={() => registration.setTemplateId(template.templateId)}
            />
        ))}
    </div>
);
