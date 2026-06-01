import React from 'react';
import FocusableMenuItem from '@components/FocusableMenuItem';
import type {MenuItemProps} from '@components/MenuItem';
import CONST from '@src/CONST';
import useFABMenuItem from './useFABMenuItem';

type FABFocusableMenuItemProps = Omit<MenuItemProps, 'focused' | 'onFocus' | 'wrapperStyle' | 'shouldCheckActionAllowedOnPress' | 'role' | 'onPress'> & {
    itemId: string;
    isVisible?: boolean;
    onPress?: () => void;
    shouldAvoidSafariException?: boolean;
    shouldCallAfterModalHide?: boolean;
};

function FABFocusableMenuItem({itemId, isVisible = true, onPress, shouldAvoidSafariException, shouldCallAfterModalHide, ...props}: FABFocusableMenuItemProps) {
    const {itemIndex, isFocused, wrapperStyle, setFocusedIndex, onItemPress} = useFABMenuItem(itemId, isVisible);

    if (!isVisible) {
        return null;
    }

    return (
        <FocusableMenuItem
            // FABFocusableMenuItemProps is a strict subset of MenuItemProps — spreading forwards all remaining props safely

            {...(props as MenuItemProps)}
            focused={isFocused}
            onFocus={() => setFocusedIndex(itemIndex)}
            wrapperStyle={wrapperStyle}
            shouldCheckActionAllowedOnPress={false}
            role={CONST.ROLE.BUTTON}
            onPress={onPress ? () => onItemPress(onPress, {shouldAvoidSafariException, shouldCallAfterModalHide}) : undefined}
        />
    );
}

export default FABFocusableMenuItem;
