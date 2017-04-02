// @flow

export type Config = {
  version: number,
  storage: Object,
  key: string,
  keyPrefix?: string,
  debug?: boolean,
  blacklist?: Array<string>,
  whitelist?: Array<string>,
  transforms?: Array<Transform>,
  throttle?: number,
}

export type MigrationManifest = {

}

export type PersistState = {
  version: number,
  rehydrated: boolean,
}

export type Transform = {
  in: () => {},
  out: () => {},
  config: Config,
}
