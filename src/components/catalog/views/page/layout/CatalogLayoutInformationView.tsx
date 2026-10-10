import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback, SanitizeHtml } from '../../../../../api';
import { CatalogLayoutProps } from './CatalogLayout.types';

interface NativeInfoLayout {
    text: { x: number; y: number; width: number; height: number };
    illustration: { asset: string; x: number; y: number; width: number; height: number };
}

// layout_info_duckets (class_1088): html ctlg_description and the fixed illustration, inside the 360x460 page.
const NATIVE_INFO_LAYOUTS: Record<string, NativeInfoLayout> = {
    info_duckets: {
        text: { x: 24, y: 19, width: 226, height: 420 },
        illustration: { asset: 'catalogue/duckets_info_illustration.gif', x: 236, y: 10, width: 123, height: 360 }
    }
};

// The html widget keeps a font colour and the sanitizer drops font/list tags. Lists become line breaks so the text stays.
const toNativeHtml = (html: string): string =>
    (html ?? '')
        .replace(/<font\b[^>]*?\bcolor\s*=\s*["']?(#[0-9a-fA-F]{3,8})["']?[^>]*>/gi, '<span style="color:$1">')
        .replace(/<font\b[^>]*>/gi, '<span>')
        .replace(/<\/font>/gi, '</span>')
        .replace(/<li\b[^>]*>/gi, '')
        .replace(/<\/li>/gi, '<br>')
        .replace(/<\/?(ul|ol)\b[^>]*>/gi, '');

export const CatalogLayoutInformationView: FC<CatalogLayoutProps> = ({ page }) => {
    const native = NATIVE_INFO_LAYOUTS[page.layoutCode];

    if (native) {
        const libraryUrl = GetConfigurationValue<string>('image.library.url', '');
        const imageUrl = libraryUrl ? `${libraryUrl}${native.illustration.asset}` : null;

        return (
            <div className="volt-catalog-info-native">
                <div
                    className="volt-catalog-info-native-text"
                    style={{ left: native.text.x, top: native.text.y, width: native.text.width, height: native.text.height }}
                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(toNativeHtml(page.localization.getText(0))) }}
                />
                {!!imageUrl && (
                    <img
                        alt=""
                        className="volt-catalog-info-native-illustration"
                        src={imageUrl}
                        style={{
                            left: native.illustration.x,
                            top: native.illustration.y,
                            width: native.illustration.width,
                            height: native.illustration.height
                        }}
                    />
                )}
            </div>
        );
    }

    const images = Array.from({ length: 4 }, (_, index) => page.localization.getImage(index)).filter(Boolean);
    const texts = Array.from({ length: 8 }, (_, index) => page.localization.getText(index)).filter(Boolean);

    if (!images.length && !texts.length) {
        return (
            <div className="volt-catalog-specialized-state" role="status">
                {localizeWithFallback('catalog.layout.info.empty', 'Information will be available here soon.')}
            </div>
        );
    }

    return (
        <article className="volt-catalog-information-layout">
            {!!images.length && (
                <div className="volt-catalog-information-images">
                    {images.map((image, index) => (
                        <img key={`${image}-${index}`} alt="" src={image} />
                    ))}
                </div>
            )}
            <div className="volt-catalog-information-copy">
                {texts.map((text, index) => (
                    <section key={index} dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />
                ))}
            </div>
        </article>
    );
};
