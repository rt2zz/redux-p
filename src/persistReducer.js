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
) {
  if (process.env.NODE_ENV !== 'production') {
    if (!config.key) throw new Error('key is required in persistor config')
    if (!config.storage) throw new Error('storage is required in persistor config')
    if (!config.version) throw new Error('version is required in persistor config')
  }
  let persistedReducer = enhanceReducer(reducer, config, migrations)
  let persistor = null
  getStoredState(config, (err, restoredState) => {
    persistor = createPersistor(persistedReducer, config)
    // store.dispatch(rehydrateAction(restoredState, err, config))
  })
  return persistedReducer
}

const enhanceReducer = (reducer: Function, config: Config, migrations: MigrationManifest) => {
  const version = config.version || DEFAULT_VERSION
  const debug = config.debug || false

  return (state: Object, action: Object) => {
    if (reducer._persist) throw new Error('source reducer cannot already contain _persist key')
    let { _persist, ...restState } = state || {}

    let workingPersistState: ?PersistState = _persist
    if (!_persist || version !== _persist.version) workingPersistState = { version, rehydrated: false }

    if (action.type === REHYDRATE) {
      let reducedState = reducer(state, action)
      let inboundState = action.payload
      let migratedInboundState = migrateState(inboundState, migrations, version, config)
      workingPersistState = { ...workingPersistState, rehydrated: true }
      return {
        ...stateReconciler(state, migratedInboundState, reducedState, config),
        _persist: workingPersistState,
      }
    } else {
      return {
        ...reducer(restState, action),
        _persist: workingPersistState,
      }
    }
  }
}