// @flow
import { PERSIST, REHYDRATE, DEFAULT_VERSION } from './constants'

import type {
  PersistConfig,
  MigrationManifest,
  PersistState,
  Persistoid,
} from './types'

import { migrateState } from './migrateState'
import { stateReconciler } from './stateReconciler'
import { createPersistoid } from './createPersistoid'
import { getStoredState } from './getStoredState'

type PersistPartial = { _persist: PersistState }
/* 
  @TODO add validation / handling for:
  - persisting a reducer which has nested _persist
  - handling actions that fire before reydrate is called
*/
export function persistReducer<State: Object, Action: Object>(
  config: PersistConfig,
  migrations: MigrationManifest = {},
  baseReducer: (State, Action) => State
): (State, Action) => State & PersistPartial {
  if (process.env.NODE_ENV !== 'production') {
    if (!config.key) throw new Error('key is required in persistor config')
    if (!config.storage)
      throw new Error('storage is required in persistor config')
    if (!config.version)
      throw new Error('version is required in persistor config')
  }

  const version = config.version || DEFAULT_VERSION
  const debug = config.debug || false
  let _persistoid = null

  // $FlowFixMe perhaps there is a better way to do this?
  let defaultState = baseReducer(undefined, { type: 'redux-p/default-probe' })

  return (state: State = defaultState, action: Action) => {
    let { _persist, ...rest } = state || {}
    let restState: State = rest

    switch (action.type) {
      case PERSIST:
        if (state._persist) {
          console.warn(
            'redux-p: unexpected _persist state before PERSIST action is handled. If you are doing hmr or code-splitting this may be a valid use case. Please open a ticket, requires further review.'
          )
          return state
        }
        if (typeof action.rehydrate !== 'function')
          throw new Error(
            'redux-p: action.rehydrate is not a function. This can happen if the action is being replayed. This is an unexplored use case, please open an issue and we will figure out a resolution.'
          )
        if (typeof action.register !== 'function')
          throw new Error(
            'redux-p: action.register is not a function. This can happen if the action is being replayed. This is an unexplored use case, please open an issue and we will figure out a resolution.'
          )

        let rehydrate = action.rehydrate
        action.register(config.key)

        getStoredState(config, (err, restoredState) => {
          _persistoid = createPersistoid(baseReducer, config)
          action.rehydrate(config.key, restoredState, err)
        })

        return { ...state, _persist: { version, rehydrated: false } }

      case REHYDRATE:
        // @NOTE if key does not match, will continue to default case
        if (action.key === config.key) {
          let reducedState = baseReducer(restState, action)
          let inboundState = action.payload
          let migratedInboundState = migrateState(
            inboundState,
            migrations,
            version,
            config
          )
          // $FlowFixMe: not sure what the deal is here
          let reconciledRest: State = stateReconciler(
            state,
            migratedInboundState,
            reducedState,
            config
          )
          return {
            ...reconciledRest,
            _persist: { ..._persist, rehydrated: true },
          }
        }

      default:
        let newState = {
          ...baseReducer(restState, action),
          _persist,
        }
        _persistoid && _persistoid.update(newState)
        return newState
    }
  }
}
