import Icon from '@components/Icon';
import {PressableWithFeedback} from '@components/Pressable';
import ScrollView from '@components/ScrollView';
import type {Filter} from '@components/Search/types';
import SpacerView from '@components/SpacerView';
import Text from '@components/Text';

import useAdvancedSearchFilters from '@hooks/useAdvancedSearchFilters';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';

import getButtonState from '@libs/getButtonState';
import {FILTER_VIEW_MAP, getSearchFilterTranslationKey} from '@libs/SearchUIUtils';
import type {SearchFilter} from '@libs/SearchUIUtils';

import variables from '@styles/variables';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import type {SearchDataTypes} from '@src/types/onyx/SearchResults';

import type {StyleProp, ViewStyle} from 'react-native';

import React from 'react';
import {View} from 'react-native';

type ItemCallback = (filter: SearchFilter['key']) => void;
type FilterItemCallbacks = {
    onHoverIn?: ItemCallback;
    onFocus?: ItemCallback;
    onPress?: ItemCallback;
};

type FilterListProps = FilterItemCallbacks & {
    type: SearchDataTypes | undefined;
    policyID: Filter;
    selectedFilter?: SearchFilter['key'];
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
};

type FilterItemProps = FilterItemCallbacks & {
    filterKey: SearchFilter['key'];
    type: SearchDataTypes | undefined;
    isSelected?: boolean;
};

function getFilterAccessibilityLabel(filterKey: SearchFilter['key'], labelKey: TranslationPaths, translate: (key: TranslationPaths) => string) {
    return filterKey === CONST.SEARCH.SYNTAX_FILTER_KEYS.DATE ? translate(labelKey) : filterKey;
}

function FilterItem({filterKey, type, isSelected, onPress, onHoverIn, onFocus}: FilterItemProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const theme = useTheme();

    const {icon} = FILTER_VIEW_MAP[filterKey];
    const labelKey = getSearchFilterTranslationKey(filterKey, type);
    const icons = useMemoizedLazyExpensifyIcons(['ArrowRight', icon]);

    const getPressableBackgroundStyle = (pressed: boolean) => {
        if (pressed) {
            return styles.buttonHoveredBG;
        }

        if (isSelected) {
            return styles.hoveredComponentBG;
        }

        return undefined;
    };

    return (
        <PressableWithFeedback
            style={({pressed}) => [styles.typeFilterMenu, getPressableBackgroundStyle(pressed)]}
            accessible
            accessibilityLabel={getFilterAccessibilityLabel(filterKey, labelKey, translate)}
            onHoverIn={() => onHoverIn?.(filterKey)}
            onFocus={() => onFocus?.(filterKey)}
            onPress={() => onPress?.(filterKey)}
            sentryLabel={`Search-Advanced-Filter-${filterKey}`}
        >
            {({pressed}) => (
                <>
                    <Icon
                        src={icons[icon]}
                        fill={theme.icon}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                    />
                    <Text
                        numberOfLines={2}
                        style={[styles.flex1]}
                    >
                        {translate(labelKey)}
                    </Text>
                    <Icon
                        src={icons.ArrowRight}
                        fill={StyleUtils.getIconFillColor(getButtonState(isSelected, pressed))}
                        width={variables.iconSizeNormal}
                        height={variables.iconSizeNormal}
                    />
                </>
            )}
        </PressableWithFeedback>
    );
}

function FilterList({type, policyID, selectedFilter, style, contentContainerStyle, onHoverIn, onFocus, onPress}: FilterListProps) {
    const styles = useThemeStyles();
    const typeFiltersKeys = useAdvancedSearchFilters(type, policyID);

    return (
        <ScrollView
            style={[style]}
            contentContainerStyle={[contentContainerStyle]}
            showsVerticalScrollIndicator={false}
        >
            {typeFiltersKeys.map((section, index) => (
                <View key={`${section.at(0)}`}>
                    {index !== 0 && (
                        <SpacerView
                            shouldShow
                            style={[styles.reportHorizontalRule]}
                        />
                    )}
                    {section.map((item) => (
                        <FilterItem
                            key={item}
                            filterKey={item}
                            type={type}
                            isSelected={item === selectedFilter}
                            onHoverIn={onHoverIn}
                            onFocus={onFocus}
                            onPress={onPress}
                        />
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}

export {getFilterAccessibilityLabel};
export default FilterList;
