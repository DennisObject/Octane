import { FC } from 'react';
import { buildFigureString, Gender, loginText, NAME_ALLOWED_CHARACTERS, parseFigureString } from '../../../api';
import randomizeIcon from '../../../assets/images/login/rnd_button.png';
import { LayoutAvatarImageView } from '../../../common';
import { Registration } from '../../../hooks/login';
import { LoginInputField } from '../LoginInputField';
import { RegistrationAvatarWardrobe } from './RegistrationAvatarWardrobe';

interface RegistrationAvatarViewProps {
    registration: Registration;
}

const GENDERS: { gender: Gender; key: string; fallback: string }[] = [
    { gender: 'F', key: 'avatareditor.generic.girl', fallback: 'Girl' },
    { gender: 'M', key: 'avatareditor.generic.boy', fallback: 'Boy' }
];

// "Choose your Habbo avatar": name the Habbo, pick one of the predefined looks
// (drawn like AvatarView's character row, with its glow and halo) and fine-tune
// it in the avatar editor's wardrobe.
export const RegistrationAvatarView: FC<RegistrationAvatarViewProps> = ({ registration }) =>
{
    const { figure, nameRules } = registration;

    return (
        <>
            <LoginInputField
                name="username"
                caption={loginText('login.create_avatar.choose_name.title', 'Name your habbo.')}
                prompt={loginText('login.create_avatar.choose_name.name', 'name')}
                value={registration.username}
                onChange={registration.setUsername}
                autoComplete="username"
                maxLength={nameRules.max}
                autoFocus
            />
            <p className="login-flow-hint">
                {loginText('login.create_avatar.choose_name.character_count', '%minLength%-%maxLength% characters.', { minLength: String(nameRules.min), maxLength: String(nameRules.max) })}{' '}
                {loginText(
                    'login.create_avatar.choose_name.description',
                    'Your name can contain lowercase and uppercase letters, numbers and the characters %allowedCharacters%',
                    { allowedCharacters: NAME_ALLOWED_CHARACTERS }
                )}
            </p>
            <div className="login-flow-field-caption">{loginText('login.create_avatar.choose_looks.title', 'Choose one of these predefined looks.')}</div>
            <p className="login-flow-hint">{loginText('login.create_avatar.choose_looks.description', 'You can modify it anytime later.')}</p>
            <div className="registration-look-row">
                <div className="registration-gender" role="radiogroup">
                    {GENDERS.map(({ gender, key, fallback }) => (
                        <label key={gender} className="login-flow-checkbox">
                            <input type="radio" name="gender" checked={figure.gender === gender} onChange={() => figure.changeGender(gender)} />
                            <span>{loginText(key, fallback)}</span>
                        </label>
                    ))}
                </div>
                <div className="registration-looks">
                    {figure.predefinedLooks.map((look) =>
                    {
                        const selected = buildFigureString(parseFigureString(look.figure, look.gender)) === buildFigureString(figure.selection);

                        return (
                            <button
                                key={look.figure}
                                type="button"
                                className={`registration-look${selected ? ' is-selected' : ''}`}
                                aria-pressed={selected}
                                aria-label={loginText('login.create_avatar.choose_looks.title', 'Choose one of these predefined looks.')}
                                onClick={() => figure.applyLook(look)}
                            >
                                <LayoutAvatarImageView figure={look.figure} gender={look.gender} direction={2} />
                            </button>
                        );
                    })}
                </div>
                <button type="button" className="registration-randomize" disabled={!figure.canRandomize} onClick={figure.randomize} title={loginText('nitro.login.register.randomlook', 'Random Look')} aria-label={loginText('nitro.login.register.randomlook', 'Random Look')}>
                    <img src={randomizeIcon} alt="" draggable={false} />
                </button>
            </div>
            <RegistrationAvatarWardrobe
                gender={figure.gender}
                figure={figure.figure}
                selection={figure.selection}
                partOptions={figure.partOptions}
                paletteOptions={figure.paletteOptions}
                onSelectPart={figure.selectPart}
                onSelectColor={figure.selectColor}
            />
        </>
    );
};
