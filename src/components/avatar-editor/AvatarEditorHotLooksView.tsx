import { FC } from 'react';
import { LocalizeText } from '../../api';
import { NativeText } from '../../common/native-text/NativeText';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorHotLookThumbnailView } from './AvatarEditorHotLookThumbnailView';

export const AvatarEditorHotLooksView: FC = () =>
{
    const { hotLooks, gender, loadAvatarData } = useAvatarEditor();

    // HotLooksModel.selectHotLook: a look without a figure stays listed but is not loaded.
    return <div className="octane-avatar-editor-hotlooks">
        <NativeText className="octane-avatar-editor-hotlooks-title" text={LocalizeText('avatareditor.hotlooks.title')} textStyle="u_bold" background={0xe9e9e1} overrides={{ size: 20 }} />
        <NativeText className="octane-avatar-editor-hotlooks-choose" text={LocalizeText('avatareditor.hotlooks.choose')} textStyle="u_regular" background={0xe9e9e1} />
        <div className="octane-avatar-editor-hotlooks-grid">
            {hotLooks.filter(look => look.gender.toUpperCase() === gender).map((look, index) => <button
                type="button" key={index} className="octane-avatar-editor-hotlook" aria-label={LocalizeText('avatareditor.hotlooks.choose')}
                onClick={() => look.figureString && loadAvatarData(look.figureString, look.gender.toUpperCase())}
            >
                <AvatarEditorHotLookThumbnailView figure={look.figureString} gender={look.gender.toUpperCase()} />
            </button>)}
        </div>
    </div>;
};
