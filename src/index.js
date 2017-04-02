// @flow

import { persistReducer } from './persistReducer'

export function createPersist(store: Object) {
  let persistorRegistry = {}
  return function persist (reducer: Function, config: Config, migrations: MigrationManifest) {
      let persistor = persistReducer(reducer, config, migrations)
      persistorRegistry.push(persistor)
    }
  }
}
