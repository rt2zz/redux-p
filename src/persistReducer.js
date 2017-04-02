// @flow
import { REHYDRATE, DEFAULT_VERSION } from './constants'

import type { Config, MigrationManifest, PersistState } from './types'

import { migrateState } from './migrateState'
import { stateReconciler } from './stateReconciler'
import { createPersistor } from './createPersistor'
import { getStoredState } from './getStoredState'

export function persistReducer<State: Object, Action: Object>(
  reducer: (State, Action) => State,
  config: Config,
  migrations: MigrationManifest = {},
  rehydrate: *,
) {
  if (process.env.NODE_ENV !== 'production') {
    if (!config.key) throw new Error('key is required in persistor config')
    if (!config.storage) throw new Error('storage is required in persistor config')
    if (!config.version) throw new Error('version is required in persistor config')
  }

  let persistor = null
  // @TODO there should be a cleaner / more performant way to do this
  let postReduceHook = (state: Object) => {
    if (persistor) persistor.updateState(state)
    return state
  }
  let persistedReducer = enhanceReducer(reducer, config, migrations, postReduceHook)
  getStoredState(config, (err, restoredState) => {
    persistor = createPersistor(persistedReducer, config)
    rehydrate(restoredState, err, config)
  })
  return persistedReducer
}

const enhanceReducer = (reducer: Function, config: Config, migrations: MigrationManifest, postReduce: (Object) => Object) => {
  const version = config.version || DEFAULT_VERSION
  const debug = config.debug || false

  return (state: Object, action: Object) => {
    /* @TODO add validation / handling for:
        - persisting a reducer which has nested _persist
        - handling actions that fire before reydrate is called
    */
    if (reducer._persist) throw new Error('source reducer cannot already contain _persist key')
    let { _persist, ...restState } = state || {}

    let workingPersistState: ?PersistState = _persist
    if (!_persist || version !== _persist.version) workingPersistState = { version, rehydrated: false }

    if (action.type === REHYDRATE) {
      let reducedState = reducer(restState, action)
      let inboundState = action.payload
      let migratedInboundState = migrateState(inboundState, migrations, version, config)
      workingPersistState = { ...workingPersistState, rehydrated: true }
      return {
        ...stateReconciler(state, migratedInboundState, reducedState, config),
        _persist: workingPersistState,
      }
    } else {
      return postReduce({
        ...reducer(restState, action),
        _persist: workingPersistState,
      })
    }
  }
}
