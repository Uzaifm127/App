import ONYXKEYS from '@src/ONYXKEYS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import {Str} from 'expensify-common';

import useOnyx from './useOnyx';

type UsePreferredPolicyResult = {
    /** Whether the user is restricted to use only the preferred policy */
    isRestrictedToPreferredPolicy: boolean;

    /** The ID of the preferred policy */
    preferredPolicyID: string | undefined;

    /** Whether the user is restricted from creating policies */
    isRestrictedPolicyCreation: boolean;

    /** Whether the domain security-group values needed for this decision are still loading */
    isLoadingSecurityGroup?: boolean;
};

/**
 * Hook to get the preferred policy settings from the user's domain security group
 */
function usePreferredPolicy(): UsePreferredPolicyResult {
    const [myDomainSecurityGroups, myDomainSecurityGroupsResult] = useOnyx(ONYXKEYS.MY_DOMAIN_SECURITY_GROUPS);
    const [securityGroups, securityGroupsResult] = useOnyx(ONYXKEYS.COLLECTION.SECURITY_GROUP);
    const [session, sessionResult] = useOnyx(ONYXKEYS.SESSION);

    // Get the user's domain from their email
    const userDomain = session?.email ? Str.extractEmailDomain(session.email) : undefined;

    // Get the security group ID for the user's domain
    const securityGroupID = userDomain && myDomainSecurityGroups?.[userDomain];

    // Get the security group details
    const securityGroupKey = `${ONYXKEYS.COLLECTION.SECURITY_GROUP}${securityGroupID}`;
    const securityGroup = securityGroupID ? securityGroups?.[securityGroupKey] : null;

    // Only restrict if both enableRestrictedPrimaryPolicy is true AND we have a valid policy ID
    const restrictedPolicyID = securityGroup?.restrictedPrimaryPolicyID;
    const hasValidPolicyID = !!restrictedPolicyID && typeof restrictedPolicyID === 'string' && restrictedPolicyID.trim() !== '';
    const isRestrictionEnabled = securityGroup?.enableRestrictedPrimaryPolicy === true;

    return {
        isRestrictedToPreferredPolicy: isRestrictionEnabled && hasValidPolicyID,
        preferredPolicyID: restrictedPolicyID,
        isRestrictedPolicyCreation: securityGroup?.enableRestrictedPolicyCreation === true,
        isLoadingSecurityGroup: isLoadingOnyxValue(myDomainSecurityGroupsResult, securityGroupsResult, sessionResult),
    };
}

export default usePreferredPolicy;
