import {getFilterAccessibilityLabel} from '@components/Search/FilterComponents/AdvancedFilters/FilterList';

import {getSearchFilterTranslationKey} from '@libs/SearchUIUtils';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';

const translate = (key: TranslationPaths) => {
    if (key === 'search.filters.createdDate') {
        return 'Created date';
    }
    if (key === 'common.date') {
        return 'Date';
    }
    return String(key);
};

describe('FilterList', () => {
    it('uses Created date for the Expense Report date filter accessibility label', () => {
        const labelKey = getSearchFilterTranslationKey(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE, CONST.SEARCH.DATA_TYPES.EXPENSE_REPORT);
        expect(getFilterAccessibilityLabel(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE, labelKey, translate)).toBe('Created date');
    });

    it('uses Date for the Expense date filter accessibility label', () => {
        const labelKey = getSearchFilterTranslationKey(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE, CONST.SEARCH.DATA_TYPES.EXPENSE);
        expect(getFilterAccessibilityLabel(CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE, labelKey, translate)).toBe('Date');
    });

    it('keeps the existing accessibility labels for other filters', () => {
        expect(getFilterAccessibilityLabel(CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS, 'common.status', translate)).toBe(CONST.SEARCH.SYNTAX_FILTER_KEYS.STATUS);
    });
});
