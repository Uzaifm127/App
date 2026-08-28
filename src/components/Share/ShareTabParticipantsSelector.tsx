import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import useDefaultExpensePolicy from '@hooks/useDefaultExpensePolicy';
import useOnyx from '@hooks/useOnyx';
import usePreferredPolicy from '@hooks/usePreferredPolicy';

import {clearMoneyRequest} from '@libs/actions/IOU/MoneyRequest';
import {clearUnknownUserDetails, saveUnknownUserDetails} from '@libs/actions/Share';
import Navigation from '@libs/Navigation/Navigation';
import {getPolicyExpenseChat} from '@libs/ReportUtils';
import shouldUseDefaultExpensePolicy from '@libs/shouldUseDefaultExpensePolicy';
import {cancelSpan, getSpan, startSpan} from '@libs/telemetry/activeSpans';

import MoneyRequestParticipantsSelector from '@pages/iou/request/MoneyRequestParticipantsSelector';

import {getOptimisticChatReport, saveReportDraft} from '@userActions/Report';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import {validTransactionDraftIDsSelector} from '@src/selectors/TransactionDraft';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React, {useEffect, useRef, useState} from 'react';

const nullSelector = () => null;

type ShareTabParticipantsSelectorProps = {
    detailsPageRouteObject: typeof ROUTES.SHARE_SUBMIT_DETAILS | typeof ROUTES.SHARE_DETAILS;
};

function ShareTabParticipantsSelectorComponent({detailsPageRouteObject}: ShareTabParticipantsSelectorProps) {
    const {accountID: currentUserAccountID} = useCurrentUserPersonalDetails();
    const [draftTransactionIDs] = useOnyx(ONYXKEYS.COLLECTION.TRANSACTION_DRAFT, {selector: validTransactionDraftIDsSelector});
    const [selectedReportID, setSelectedReportID] = useState<string | number | undefined>();

    const isSubmitFlow = detailsPageRouteObject === ROUTES.SHARE_SUBMIT_DETAILS;

    const {isRestrictedToPreferredPolicy, preferredPolicyID, isLoadingSecurityGroup} = usePreferredPolicy();

    const defaultExpensePolicy = useDefaultExpensePolicy();
    const [amountOwed, amountOwedResult] = useOnyx(ONYXKEYS.NVP_PRIVATE_AMOUNT_OWED);
    const [userBillingGracePeriodEnds, userBillingGracePeriodEndsResult] = useOnyx(ONYXKEYS.COLLECTION.SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END);
    const [ownerBillingGracePeriodEnd, ownerBillingGracePeriodEndResult] = useOnyx(ONYXKEYS.NVP_PRIVATE_OWNER_BILLING_GRACE_PERIOD_END);
    const [, policyCollectionResult] = useOnyx(ONYXKEYS.COLLECTION.POLICY, {selector: nullSelector});
    const [, reportCollectionResult] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {selector: nullSelector});
    const isSecurityGroupLoading = isLoadingSecurityGroup === true;

    // When the user's domain security group restricts submission to a single workspace, skip the participant picker and
    // go straight to confirmation for the locked workspace's expense chat, matching the in-product submit flow. Falls back
    // to the picker if the locked policy's expense chat isn't in Onyx yet, so we never navigate to an empty report.
    const lockedExpenseChatReportID =
        isSubmitFlow && isRestrictedToPreferredPolicy && preferredPolicyID ? getPolicyExpenseChat(currentUserAccountID, preferredPolicyID)?.reportID : undefined;

    // The share-sheet Submit flow intentionally uses the default group workspace's expense chat even when
    // auto-reporting is disabled. The existing utility is called with CREATE because it owns the policy and billing
    // eligibility rules, while the destination is deliberately resolved here for the SUBMIT flow.
    const canUseDefaultExpensePolicy =
        isSubmitFlow &&
        !isRestrictedToPreferredPolicy &&
        !isSecurityGroupLoading &&
        shouldUseDefaultExpensePolicy(CONST.IOU.TYPE.CREATE, defaultExpensePolicy, amountOwed, userBillingGracePeriodEnds, ownerBillingGracePeriodEnd, currentUserAccountID);
    const defaultExpenseChatReportID = canUseDefaultExpensePolicy && defaultExpensePolicy?.id ? getPolicyExpenseChat(currentUserAccountID, defaultExpensePolicy.id)?.reportID : undefined;

    // If no destination is available yet, wait for the values that can change the decision. Once the picker is shown,
    // do not redirect later when an unrelated policy/report update makes a destination appear.
    const isLoadingAutoNavigationDecision =
        isSubmitFlow &&
        !isRestrictedToPreferredPolicy &&
        !lockedExpenseChatReportID &&
        !defaultExpenseChatReportID &&
        (isSecurityGroupLoading || isLoadingOnyxValue(policyCollectionResult, reportCollectionResult, amountOwedResult, userBillingGracePeriodEndsResult, ownerBillingGracePeriodEndResult));

    const autoNavigationReportID = lockedExpenseChatReportID ?? defaultExpenseChatReportID;

    // Synchronous one-shot guards for the auto-navigation effect. Refs (rather than the render state below) are used so
    // the guards flip immediately: clearing the draft transaction mutates draftTransactionIDs, which re-runs the effect
    // before a state update could commit, so a state-based guard would navigate twice.
    const hasAutoNavigatedToLockedReportRef = useRef(false);
    const hasAutoNavigatedToDefaultReportRef = useRef(false);
    const [hasCommittedToPicker, setHasCommittedToPicker] = useState(false);

    // Drives rendering: once the one-shot auto-navigation has run, we stop returning null and render the picker
    // underneath instead, so backing out of the details page lands on a usable screen rather than a blank Submit tab.
    const [hasAutoNavigatedToReport, setHasAutoNavigatedToReport] = useState(false);

    // This span belongs to the submit flow, so the share flow instance must not cancel a span it never started. For the submit flow this cancels an attempt that closes before SubmitDetailsPage mounts to end the span, so it is
    useEffect(
        () => () => {
            if (!isSubmitFlow) {
                return;
            }
            cancelSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW);
        },
        [isSubmitFlow],
    );

    // A picker is a valid fallback when the default destination cannot be resolved. Mark it as committed after the
    // decision is complete so a later Onyx update cannot unexpectedly move the user to a different screen.
    useEffect(() => {
        if (!isSubmitFlow || lockedExpenseChatReportID || defaultExpenseChatReportID || isLoadingAutoNavigationDecision || hasCommittedToPicker) {
            return;
        }
        // This state records that the fallback picker has already been exposed. It is intentionally set in an effect
        // because the decision is based on values that can hydrate after the component mounts.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasCommittedToPicker(true);
    }, [defaultExpenseChatReportID, hasCommittedToPicker, isLoadingAutoNavigationDecision, isSubmitFlow, lockedExpenseChatReportID]);

    // One-shot: auto-navigate to the locked workspace or the resolved default workspace's confirmation. The locked
    // domain path remains authoritative and can still take over if its report resolves after the picker fallback.
    useEffect(() => {
        if (!autoNavigationReportID) {
            return;
        }

        const isLockedReport = !!lockedExpenseChatReportID;
        if (isLockedReport ? hasAutoNavigatedToLockedReportRef.current : hasAutoNavigatedToDefaultReportRef.current) {
            return;
        }

        if (!isLockedReport && hasCommittedToPicker) {
            return;
        }

        if (isLockedReport) {
            hasAutoNavigatedToLockedReportRef.current = true;
        } else {
            hasAutoNavigatedToDefaultReportRef.current = true;
        }

        // clear the existing draft transaction from the previous flow to prevent the old data from being displayed
        clearMoneyRequest(CONST.IOU.OPTIMISTIC_TRANSACTION_ID, draftTransactionIDs);

        startSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW, {
            name: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
            op: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
            forceTransaction: true,
            attributes: {
                [CONST.TELEMETRY.ATTRIBUTE_REPORT_ID]: autoNavigationReportID.toString(),
                [CONST.TELEMETRY.ATTRIBUTE_ROUTE_FROM]: Navigation.getActiveRoute() || 'unknown',
            },
        });

        // Flip the render state once the transition to the details page completes so the picker mounts underneath it,
        // giving the user a usable screen when they back out. Doing this in the afterTransition callback (rather than
        // calling setState synchronously in the effect body) avoids the react-hooks/set-state-in-effect violation.
        Navigation.navigate(detailsPageRouteObject.getRoute(autoNavigationReportID.toString()), {
            afterTransition: () => setHasAutoNavigatedToReport(true),
        });
    }, [autoNavigationReportID, draftTransactionIDs, detailsPageRouteObject, hasCommittedToPicker, lockedExpenseChatReportID]);

    // Render null while the destination decision is pending or while an automatic navigation is in progress. After
    // the transition, render the picker underneath the details page so backing out still shows a usable screen.
    const shouldWaitForAutoNavigation =
        !hasAutoNavigatedToReport && (isLoadingAutoNavigationDecision || !!lockedExpenseChatReportID || (!!defaultExpenseChatReportID && !hasCommittedToPicker));
    if (shouldWaitForAutoNavigation) {
        return null;
    }

    return (
        <MoneyRequestParticipantsSelector
            iouType={CONST.IOU.TYPE.SUBMIT}
            initiallySelectedReportID={typeof selectedReportID === 'string' ? selectedReportID : undefined}
            onParticipantsAdded={(value) => {
                // clear the existing draft transaction from the previous flow to prevent the old data from being displayed
                clearMoneyRequest(CONST.IOU.OPTIMISTIC_TRANSACTION_ID, draftTransactionIDs);

                const participant = value.at(0);
                let reportID = participant?.reportID ?? CONST.DEFAULT_NUMBER_ID;
                const accountID = participant?.accountID;

                if (isSubmitFlow) {
                    startSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW, {
                        name: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
                        op: CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW,
                        forceTransaction: true,
                        attributes: {
                            [CONST.TELEMETRY.ATTRIBUTE_REPORT_ID]: reportID.toString(),
                            [CONST.TELEMETRY.ATTRIBUTE_ROUTE_FROM]: Navigation.getActiveRoute() || 'unknown',
                        },
                    });
                }

                if (accountID && !reportID) {
                    saveUnknownUserDetails(participant);
                    const optimisticReport = getOptimisticChatReport(accountID, currentUserAccountID);
                    reportID = optimisticReport.reportID;

                    if (isSubmitFlow) {
                        getSpan(CONST.TELEMETRY.SPAN_SHARE_EXTENSION_OPEN_SUBMIT_FLOW)?.setAttribute(CONST.TELEMETRY.ATTRIBUTE_REPORT_ID, reportID.toString());
                    }

                    setSelectedReportID(reportID);
                    saveReportDraft(reportID, optimisticReport).then(() => {
                        Navigation.navigate(detailsPageRouteObject.getRoute(reportID.toString()));
                    });
                } else {
                    // A previous unknown-recipient selection must not override the known workspace in SubmitDetailsPage.
                    clearUnknownUserDetails();
                    setSelectedReportID(reportID);
                    Navigation.navigate(detailsPageRouteObject.getRoute(reportID.toString()));
                }
            }}
            action="create"
        />
    );
}

export default ShareTabParticipantsSelectorComponent;
