/*
 * Native layout maps: every card is keyed by the native code the server sends for its family
 * (the registry native code), and opens its editor window. Codes absent here open nothing.
 * Generated from the registry and the Octane editor windows; a card without a matching window is not listed.
 */
import { WIRED_FX_CATEGORY } from '../../../api';
import { WiredActionAdjustClockView } from './actions/WiredActionAdjustClockView';
import { WiredActionSetFurniStateToView } from './actions/WiredActionSetFurniStateToView';
import { WiredExtraProjectileView } from './extras/WiredExtraProjectileView';
import { WiredActionBotChangeFigureView } from './actions/WiredActionBotChangeFigureView';
import { WiredActionBotFollowAvatarView } from './actions/WiredActionBotFollowAvatarView';
import { WiredActionBotGiveHandItemView } from './actions/WiredActionBotGiveHandItemView';
import { WiredActionBotMoveView } from './actions/WiredActionBotMoveView';
import { WiredActionBotTalkToAvatarView } from './actions/WiredActionBotTalkToAvatarView';
import { WiredActionBotTalkView } from './actions/WiredActionBotTalkView';
import { WiredActionBotTeleportView } from './actions/WiredActionBotTeleportView';
import { WiredActionCallAnotherStackView } from './actions/WiredActionCallAnotherStackView';
import { WiredActionCancelTransactionView } from './actions/WiredActionCancelTransactionView';
import { WiredActionChangeVariableValueView } from './actions/WiredActionChangeVariableValueView';
import { WiredActionChaseView } from './actions/WiredActionChaseView';
import { WiredActionChatView } from './actions/WiredActionChatView';
import { WiredActionClickSettingsView } from './actions/WiredActionClickSettingsView';
import { WiredActionControlClockView } from './actions/WiredActionControlClockView';
import { WiredActionFleeView } from './actions/WiredActionFleeView';
import { WiredActionFreezeView } from './actions/WiredActionFreezeView';
import { WiredActionFurniToFurniView } from './actions/WiredActionFurniToFurniView';
import { WiredActionGiveCurrencyFromChestView } from './actions/WiredActionGiveCurrencyFromChestView';
import { WiredActionGiveFurniFromChestView } from './actions/WiredActionGiveFurniFromChestView';
import { WiredActionGiveRewardView } from './actions/WiredActionGiveRewardView';
import { WiredActionGiveScoreToPredefinedTeamView } from './actions/WiredActionGiveScoreToPredefinedTeamView';
import { WiredActionGiveScoreView } from './actions/WiredActionGiveScoreView';
import { WiredActionGiveVariableView } from './actions/WiredActionGiveVariableView';
import { WiredActionInitTransactionView } from './actions/WiredActionInitTransactionView';
import { WiredActionJoinTeamView } from './actions/WiredActionJoinTeamView';
import { WiredActionKickFromRoomView } from './actions/WiredActionKickFromRoomView';
import { WiredActionLeaveTeamView } from './actions/WiredActionLeaveTeamView';
import { WiredActionMoveAndRotateFurniView } from './actions/WiredActionMoveAndRotateFurniView';
import { WiredActionMoveFurniAsGroupView } from './actions/WiredActionMoveFurniAsGroupView';
import { WiredActionMoveFurniToView } from './actions/WiredActionMoveFurniToView';
import { WiredActionMoveFurniView } from './actions/WiredActionMoveFurniView';
import { WiredActionMoveRotateUserView } from './actions/WiredActionMoveRotateUserView';
import { WiredActionMuteUserView } from './actions/WiredActionMuteUserView';
import { WiredActionNegativeCallAnotherStackView } from './actions/WiredActionNegativeCallAnotherStackView';
import { WiredActionPlaceFurniView } from './actions/WiredActionPlaceFurniView';
import { WiredActionRelativeMoveView } from './actions/WiredActionRelativeMoveView';
import { WiredActionRemoveFurniView } from './actions/WiredActionRemoveFurniView';
import { WiredActionRemoveVariableView } from './actions/WiredActionRemoveVariableView';
import { WiredActionResetView } from './actions/WiredActionResetView';
import { WiredActionSendSignalView } from './actions/WiredActionSendSignalView';
import { WiredActionSetAltitudeView } from './actions/WiredActionSetAltitudeView';
import { WiredActionTeleportToRoomView } from './actions/WiredActionTeleportToRoomView';
import { WiredActionTeleportView } from './actions/WiredActionTeleportView';
import { WiredActionToggleFurniStateView } from './actions/WiredActionToggleFurniStateView';
import { WiredActionToggleToRandomStateView } from './actions/WiredActionToggleToRandomStateView';
import { WiredActionUnfreezeView } from './actions/WiredActionUnfreezeView';
import { WiredActionWriteToLogsView } from './actions/WiredActionWriteToLogsView';
import { WiredCustomContractView } from './extras/WiredCustomContractView';
import { WiredExtraAnimationTimeView } from './extras/WiredExtraAnimationTimeView';
import { WiredExtraContextVariableView } from './extras/WiredExtraContextVariableView';
import { WiredExtraExecuteInOrderView } from './extras/WiredExtraExecuteInOrderView';
import { WiredExtraExecutionLimitView } from './extras/WiredExtraExecutionLimitView';
import { WiredExtraFilterFurniByVariableView } from './extras/WiredExtraFilterFurniByVariableView';
import { WiredExtraFilterFurniView } from './extras/WiredExtraFilterFurniView';
import { WiredExtraFilterUserView } from './extras/WiredExtraFilterUserView';
import { WiredExtraFilterUsersByVariableView } from './extras/WiredExtraFilterUsersByVariableView';
import { WiredExtraFurniVariableView } from './extras/WiredExtraFurniVariableView';
import { WiredExtraMoveCarryUsersView } from './extras/WiredExtraMoveCarryUsersView';
import { WiredExtraMoveNoAnimationView } from './extras/WiredExtraMoveNoAnimationView';
import { WiredExtraMovePhysicsView } from './extras/WiredExtraMovePhysicsView';
import { WiredExtraMovementCurveView } from './extras/WiredExtraMovementCurveView';
import { WiredExtraOrEvalView } from './extras/WiredExtraOrEvalView';
import { WiredExtraQuestChainView } from './extras/WiredExtraQuestChainView';
import { WiredExtraQuestView } from './extras/WiredExtraQuestView';
import { WiredExtraRandomView } from './extras/WiredExtraRandomView';
import { WiredExtraRoomVariableView } from './extras/WiredExtraRoomVariableView';
import { WiredExtraTextInputVariableView } from './extras/WiredExtraTextInputVariableView';
import { WiredExtraTextOutputFurniNameView } from './extras/WiredExtraTextOutputFurniNameView';
import { WiredExtraTextOutputUsernameView } from './extras/WiredExtraTextOutputUsernameView';
import { WiredExtraTextOutputVariableView } from './extras/WiredExtraTextOutputVariableView';
import { WiredExtraTimeUtilitiesView } from './extras/WiredExtraTimeUtilitiesView';
import { WiredExtraUnseenView } from './extras/WiredExtraUnseenView';
import { WiredExtraUserVariableView } from './extras/WiredExtraUserVariableView';
import { WiredExtraVariableEchoView } from './extras/WiredExtraVariableEchoView';
import { WiredExtraVariableFxView } from './extras/WiredExtraVariableFxView';
import { WiredExtraVariableLevelUpSystemView } from './extras/WiredExtraVariableLevelUpSystemView';
import { WiredExtraVariableReferenceView } from './extras/WiredExtraVariableReferenceView';
import { WiredExtraVariableTextConnectorView } from './extras/WiredExtraVariableTextConnectorView';
import { WiredActionFurniAreaView } from './selectors/WiredActionFurniAreaView';
import { WiredSelectorFurniAltitudeView } from './selectors/WiredSelectorFurniAltitudeView';
import { WiredSelectorFurniByTypeView } from './selectors/WiredSelectorFurniByTypeView';
import { WiredSelectorFurniNeighborhoodView } from './selectors/WiredSelectorFurniNeighborhoodView';
import { WiredSelectorFurniOnFurniView } from './selectors/WiredSelectorFurniOnFurniView';
import { WiredSelectorFurniPicksView } from './selectors/WiredSelectorFurniPicksView';
import { WiredSelectorFurniSignalView } from './selectors/WiredSelectorFurniSignalView';
import { WiredSelectorFurniWithVariableView } from './selectors/WiredSelectorFurniWithVariableView';
import { WiredSelectorRemoteView } from './selectors/WiredSelectorRemoteView';
import { WiredSelectorScanChestFurniByType } from './selectors/WiredSelectorScanChestFurniByType';
import { WiredSelectorUsersAreaView } from './selectors/WiredSelectorUsersAreaView';
import { WiredSelectorUsersByActionView } from './selectors/WiredSelectorUsersByActionView';
import { WiredSelectorUsersByNameView } from './selectors/WiredSelectorUsersByNameView';
import { WiredSelectorUsersByTypeView } from './selectors/WiredSelectorUsersByTypeView';
import { WiredSelectorUsersGroupView } from './selectors/WiredSelectorUsersGroupView';
import { WiredSelectorUsersHandItemView } from './selectors/WiredSelectorUsersHandItemView';
import { WiredSelectorUsersNeighborhoodView } from './selectors/WiredSelectorUsersNeighborhoodView';
import { WiredSelectorUsersOnFurniView } from './selectors/WiredSelectorUsersOnFurniView';
import { WiredSelectorUsersSignalView } from './selectors/WiredSelectorUsersSignalView';
import { WiredSelectorUsersTeamView } from './selectors/WiredSelectorUsersTeamView';
import { WiredSelectorUsersWithVariableView } from './selectors/WiredSelectorUsersWithVariableView';

/** Native action codes (registry native code) to their editor window. */
export const NativeWiredActionLayoutView = (code: number) => {
    switch (code) {
        case 3: return <WiredActionSetFurniStateToView />;  // wf_act_match_to_sshot (editor window: set furni state)
        case 0: return <WiredActionToggleFurniStateView />;  // wf_act_toggle_state
        case 1: return <WiredActionResetView />;  // wf_act_reset_timers
        case 4: return <WiredActionMoveFurniView />;  // wf_act_move_rotate
        case 6: return <WiredActionGiveScoreView />;  // wf_act_give_score
        case 7: return <WiredActionChatView />;  // wf_act_show_message
        case 8: return <WiredActionTeleportView />;  // wf_act_teleport_to
        case 9: return <WiredActionJoinTeamView />;  // wf_act_join_team
        case 10: return <WiredActionLeaveTeamView />;  // wf_act_leave_team
        case 11: return <WiredActionChaseView />;  // wf_act_chase
        case 12: return <WiredActionFleeView />;  // wf_act_flee
        case 13: return <WiredActionMoveAndRotateFurniView />;  // wf_act_move_to_dir
        case 14: return <WiredActionGiveScoreToPredefinedTeamView />;  // wf_act_give_score_tm
        case 15: return <WiredActionToggleToRandomStateView />;  // wf_act_toggle_to_rnd
        case 16: return <WiredActionMoveFurniToView />;  // wf_act_move_furni_to
        case 17: return <WiredActionGiveRewardView />;  // wf_act_give_reward
        case 18: return <WiredActionCallAnotherStackView />;  // wf_act_call_stacks
        case 19: return <WiredActionKickFromRoomView />;  // wf_act_kick_user
        case 20: return <WiredActionMuteUserView />;  // wf_act_mute_triggerer
        case 21: return <WiredActionBotTeleportView />;  // wf_act_bot_teleport
        case 22: return <WiredActionBotMoveView />;  // wf_act_bot_move
        case 23: return <WiredActionBotTalkView />;  // wf_act_bot_talk
        case 24: return <WiredActionBotGiveHandItemView />;  // wf_act_bot_give_handitem
        case 25: return <WiredActionBotFollowAvatarView />;  // wf_act_bot_follow_avatar
        case 26: return <WiredActionBotChangeFigureView />;  // wf_act_bot_clothes
        case 27: return <WiredActionBotTalkToAvatarView />;  // wf_act_bot_talk_to_avatar
        case 28: return <WiredActionControlClockView />;  // wf_act_control_clock
        case 29: return <WiredActionSetAltitudeView />;  // wf_act_set_altitude
        case 30: return <WiredActionSendSignalView />;  // wf_act_send_signal
        case 31: return <WiredActionFreezeView />;  // wf_act_freeze
        case 32: return <WiredActionUnfreezeView />;  // wf_act_unfreeze
        case 33: return <WiredActionRelativeMoveView />;  // wf_act_rel_mov
        case 34: return <WiredActionFurniToFurniView />;  // wf_act_furni_to_furni
        case 35: return <WiredActionTeleportView />;  // wf_act_furni_to_user
        case 36: return <WiredActionNegativeCallAnotherStackView />;  // wf_act_neg_call_stacks
        case 37: return <WiredActionSendSignalView />;  // wf_act_neg_send_signal
        case 38: return <WiredActionAdjustClockView />;  // wf_act_adjust_clock
        case 39: return <WiredActionGiveVariableView />;  // wf_act_give_var
        case 40: return <WiredActionRemoveVariableView />;  // wf_act_remove_var
        case 41: return <WiredActionChangeVariableValueView />;  // wf_act_change_var_val
        case 42: return <WiredActionMoveRotateUserView />;  // wf_act_move_rotate_user
        case 43: return <WiredActionTeleportView />;  // wf_act_user_to_furni
        case 44: return <WiredActionTeleportToRoomView />;  // wf_act_teleport_to_room
        case 45: return <WiredActionGiveCurrencyFromChestView />;  // wf_act_give_currency
        case 46: return <WiredActionGiveFurniFromChestView />;  // wf_act_give_furni
        case 47: return <WiredActionInitTransactionView />;  // wf_act_init_transaction
        case 48: return <WiredActionCancelTransactionView />;  // wf_act_cancel_transaction
        case 49: return <WiredActionWriteToLogsView />;  // wf_act_log
        case 50: return <WiredActionWriteToLogsView />;  // wf_act_neg_log
        case 54: return <WiredActionClickSettingsView />;  // wf_act_click_conf
        case 55: return <WiredActionPlaceFurniView />;  // wf_act_place_furni
        case 56: return <WiredActionRemoveFurniView />;  // wf_act_remove_furni
        case 57: return <WiredActionMoveFurniAsGroupView />;  // wf_act_move_furni_as_group
    }

    return null;
};


/** Native selector codes (registry native code) to their editor window. */
export const NativeWiredSelectorLayoutView = (code: number) => {
    switch (code) {
        case 0: return <WiredSelectorFurniByTypeView />;  // wf_slc_furni_bytype
        case 1: return <WiredSelectorFurniPicksView />;  // wf_slc_furni_picks
        case 2: return <WiredSelectorUsersByTypeView />;  // wf_slc_users_bytype
        case 3: return <WiredSelectorUsersTeamView />;  // wf_slc_users_team
        case 4: return <WiredSelectorFurniOnFurniView />;  // wf_slc_furni_onfurni
        case 5: return <WiredSelectorFurniSignalView />;  // wf_slc_furni_signal
        case 6: return <WiredSelectorFurniNeighborhoodView />;  // wf_slc_furni_neighborhood
        case 7: return <WiredActionFurniAreaView />;  // wf_slc_furni_area
        case 8: return <WiredSelectorUsersOnFurniView />;  // wf_slc_users_onfurni
        case 9: return <WiredSelectorUsersByActionView />;  // wf_slc_users_byaction
        case 10: return <WiredSelectorUsersSignalView />;  // wf_slc_users_signal
        case 11: return <WiredSelectorUsersByNameView />;  // wf_slc_users_byname
        case 12: return <WiredSelectorUsersNeighborhoodView />;  // wf_slc_users_neighborhood
        case 13: return <WiredSelectorUsersAreaView />;  // wf_slc_users_area
        case 14: return <WiredSelectorUsersHandItemView />;  // wf_slc_users_handitem
        case 15: return <WiredSelectorUsersGroupView />;  // wf_slc_users_group
        case 16: return <WiredSelectorFurniAltitudeView />;  // wf_slc_furni_altitude
        case 17: return <WiredSelectorFurniWithVariableView />;  // wf_slc_furni_with_var
        case 18: return <WiredSelectorUsersWithVariableView />;  // wf_slc_users_with_var
        case 19: return <WiredSelectorRemoteView />;  // wf_slc_remote
    }

    return null;
};


/** Native addon codes (registry native code) to their editor window. */
export const NativeWiredAddonLayoutView = (code: number) => {
    switch (code) {
        case 21: return <WiredExtraProjectileView />;  // wf_xtra_rotate_to_dir
        case 0: return <WiredExtraOrEvalView />;  // wf_xtra_or_eval
        case 1: return <WiredExtraRandomView />;  // wf_xtra_random
        case 2: return <WiredExtraUnseenView />;  // wf_xtra_unseen
        case 5: return <WiredExtraExecutionLimitView />;  // wf_xtra_execution_limit
        case 6: return <WiredExtraMoveNoAnimationView />;  // wf_xtra_mov_no_animation
        case 7: return <WiredExtraMovePhysicsView />;  // wf_xtra_mov_physics
        case 8: return <WiredExtraMoveCarryUsersView />;  // wf_xtra_mov_carry_users
        case 9: return <WiredExtraAnimationTimeView />;  // wf_xtra_anim_time
        case 10: return <WiredExtraFilterFurniView />;  // wf_xtra_filter_furni
        case 11: return <WiredExtraFilterUserView />;  // wf_xtra_filter_users
        case 12: return <WiredExtraFilterFurniByVariableView />;  // wf_xtra_filter_furni_by_var
        case 13: return <WiredExtraFilterUsersByVariableView />;  // wf_xtra_filter_users_by_var
        case 14: return <WiredExtraTextOutputUsernameView />;  // wf_xtra_text_output_username
        case 15: return <WiredExtraTextOutputVariableView />;  // wf_xtra_text_output_variable
        case 16: return <WiredExtraTextInputVariableView />;  // wf_xtra_text_input_variable
        case 17: return <WiredExtraExecuteInOrderView />;  // wf_xtra_exec_in_order
        case 18: return <WiredSelectorScanChestFurniByType />;  // wf_xtra_scan_chest_furni_by_type
        case 19: return <WiredExtraTextOutputFurniNameView />;  // wf_xtra_text_output_furni_name
        case 20: return <WiredCustomContractView />;  // wf_xtra_custom_contract
        case 22: return <WiredExtraMovementCurveView />;  // wf_xtra_mov_curve
        case 1000: return <WiredExtraVariableTextConnectorView />;  // wf_xtra_var_text_connector
        case 1001: return <WiredExtraVariableLevelUpSystemView />;  // wf_xtra_var_lvlup_system
        case 1002: return <WiredExtraTimeUtilitiesView />;  // wf_xtra_var_time_util
        case 1200: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.HEALTH_POINTS} />;  // wf_xtra_var_fx_health
        case 1201: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.PROGRESS_BAR} />;  // wf_xtra_var_fx_progress
        case 1202: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.LEVELLING_PROGRESS} />;  // wf_xtra_var_fx_level
        case 1203: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.STATUS_BAR} />;  // wf_xtra_var_fx_status
        case 1204: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.BOSS_BAR} />;  // wf_xtra_var_fx_boss
        case 1205: return <WiredExtraVariableFxView category={WIRED_FX_CATEGORY.NUMBER_DISPLAY} />;  // wf_xtra_var_fx_number
    }

    return null;
};


/** Native variable codes (registry native code) to their editor window. */
export const NativeWiredVariableLayoutView = (code: number) => {
    switch (code) {
        case 0: return <WiredExtraFurniVariableView />;  // wf_var_furni
        case 1: return <WiredExtraUserVariableView />;  // wf_var_user
        case 2: return <WiredExtraRoomVariableView />;  // wf_var_room
        case 3: return <WiredExtraContextVariableView />;  // wf_var_context
        case 4: return <WiredExtraVariableReferenceView />;  // wf_var_reference
        case 5: return <WiredExtraQuestView />;  // wf_var_quest
        case 6: return <WiredExtraQuestChainView />;  // wf_var_quest_chain
        case 7: return <WiredExtraVariableEchoView />;  // wf_var_echo
    }

    return null;
};

