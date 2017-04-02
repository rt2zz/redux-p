// @flow

import type { Config, MigrationManifest, RehydrateAction, RehydrateErrorType } from './types'

import { persistReducer } from './persistReducer'
import { REHYDRATE } from './constants'

type PendingRehydrate = [Object, RehydrateErrorType, Config]

export function createPersist(store: Object) {
  let _registry: { [key: string]: Config } = {}
  let _rehydrateQueue: Array<PendingRehydrate> = []
  let _store = null
  return {
    persist: (reducer: Function, config: Config, migrations: MigrationManifest) => {
      if (process.env.NODE_ENV !== 'production' && _registry[config.key]) console.error(`persistor with key '${config.key}' is already registered`)
      _registry[config.key] = config

      const rehydrate = (restoredState: Object, err: RehydrateErrorType, config: Config) => {
        if (!_store) _rehydrateQueue.push([restoredState, err, config])
        else _store.dispatch(rehydrate(restoredState, err, config))
      }

      return persistReducer(reducer, config, migrations, rehydrate)
    },
    enablePersistence: (store: Object) => {
      _store = store
      let pendingRehydrate = _rehydrateQueue.shift()
      while (pendingRehydrate) {
        _store.dispatch(rehydrateAction(...pendingRehydrate))
        pendingRehydrate = _rehydrateQueue.shift()
      }
    }
  }
}

function rehydrateAction (payload: ?Object, err: ?RehydrateErrorType, config: Config): RehydrateAction {
  return {
    type: REHYDRATE,
    persistorKey: config.key,
    payload,
    err,
  }
}
