import { createAction } from 'redux-actions';

export const playerCountChanged = createAction('PLAYER_COUNT_CHANGED');
export const cpuPlayerCountChanged = createAction('CPU_PLAYER_COUNT_CHANGED');
export const playerNameChanged = createAction('PLAYER_NAME_CHANGED');
