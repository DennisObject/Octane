import { GetSessionDataManager, IProductData } from '@volt/renderer';

export function GetProductDataForLocalization(localizationId: string): IProductData {
    if (!localizationId) return null;

    return GetSessionDataManager().getProductData(localizationId);
}
