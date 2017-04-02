// @flow

import { DEFAULT_VERSION } from './constants'

import type { Config, MigrationManifest } from './types'

export function migrateState (state: Object, migrations: MigrationManifest, currentVersion: number, { debug }: Config) {
  let inboundVersion = state.version || DEFAULT_VERSION
  if (inboundVersion === currentVersion) {
    if (debug) console.log('redux-persist-state-manager: verions match, noop migration')
    return state
  }
  if (inboundVersion > currentVersion) {
    if (debug) console.error('redux-persist-state-manager: downgrading version is not supported')
    return state
  }

  let migrationKeys = Object.keys(migrations).map(ver => parseInt(ver)).filter(key => key > inboundVersion).sort()

  if (debug) console.log('redux-persist-state-manager: migrationKeys', migrationKeys)
  let migratedState = migrationKeys.reduce(
    (state, versionKey) => {
      if (debug) console.log('redux-persist-state-manager: running migration for versionKey', versionKey)
      return migrations[versionKey](state)
    },
    state,
  )

  return migratedState
}
