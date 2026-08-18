import {getFilterAccessibilityLabel} from '@components/Search/FilterComponents/AdvancedFilters/FilterList';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

const translate = (key: TranslationPaths) => (key === 'search.filters.createdDate' ? 'Created date' : String(key));

describe('FilterList', () => {
    it('uses Created date as the Date filter accessibility label', () => {
        expect(getFilterAccessibilityLabel(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE, 'search.filters.createdDate', translate)).toBe('Created date');
    });

    it('keeps the existing accessibility labels for other filters', () => {
        expect(getFilterAccessibilityLabel(CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS, 'common.status', translate)).toBe(CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS);
    });
});
