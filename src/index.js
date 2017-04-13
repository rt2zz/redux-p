// @flow

import type {
  PersistConfig,
  MigrationManifest,
  RehydrateAction,
  RehydrateErrorType,
} from './types'

import { persistReducer } from './persistReducer'
import { REHYDRATE } from './constants'
import { curry } from './utils/curry'

type PendingRehydrate = [Object, RehydrateErrorType, PersistConfig];
type Persist = <R>(PersistConfig, MigrationManifest) => (R) => R;
type CreatePersistor = (Object) => void;

// @TODO get proper curried types working
export function configurePersist() {
  let _registry: { [key: string]: PersistConfig } = {}
  let _rehydrateQueue: Array<PendingRehydrate> = []
  let _store = null

  // $FlowFixMe
  const persist: Persist = curry(
    (config: PersistConfig, migrations: MigrationManifest, reducer: <S, A>(
      S,
      A
    ) => S) => {
      if (process.env.NODE_ENV !== 'production' && _registry[config.key])
        console.error(
          `persistor with key '${config.key}' is already registered`
        )
      _registry[config.key] = config

      const rehydrate = (
        restoredState: Object,
        err: RehydrateErrorType,
        config: PersistConfig
      ) => {
        if (!_store) _rehydrateQueue.push([restoredState, err, config])
        else _store.dispatch(rehydrateAction(restoredState, err, config))
      }

      return persistReducer(reducer, config, migrations, rehydrate)
    }
  )
  const createPersistor: CreatePersistor = (store: Object) => {
    _store = store
    let pendingRehydrate = _rehydrateQueue.shift()
    while (pendingRehydrate) {
      _store.dispatch(rehydrateAction(...pendingRehydrate))
      pendingRehydrate = _rehydrateQueue.shift()
    }
  }

  return {
    persist,
    createPersistor,
  }
}

function rehydrateAction(
  payload: ?Object,
  err: ?RehydrateErrorType,
  config: PersistConfig
): RehydrateAction {
  return {
    type: REHYDRATE,
    key: config.key,
    payload,
    err,
  }
}
