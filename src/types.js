// @flow

export type PersistConfig = {
  version: number,
  storage: Object,
  key: string,
  keyPrefix?: string,
  debug?: boolean,
  blacklist?: Array<string>,
  whitelist?: Array<string>,
  transforms?: Array<Transform>,
  throttle?: number,
  noAutoRehydrate?: boolean,
};

export type MigrationManifest = {};

export type PersistState = {
  version: number,
  rehydrated: boolean,
};

export type Transform = {
  in: (Object, string) => Object,
  out: (Object, string) => Object,
  config?: PersistConfig,
};

export type RehydrateErrorType = any;

export type RehydrateAction = {
  type: 'redux-p/REHYDRATE',
  key: string,
  payload: ?Object,
  err: ?RehydrateErrorType,
};

export type Persistoid = {
  update: (Object) => void,
};
