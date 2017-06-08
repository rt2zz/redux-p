// @flow

import type {
  PersistConfig,
  MigrationManifest,
  RehydrateAction,
  RehydrateErrorType,
} from './types';

import { createStore } from 'redux';
import { persistReducer } from './persistReducer';
import { PERSIST, REGISTER, REHYDRATE } from './constants';
import { curry } from './utils/curry';

type PendingRehydrate = [Object, RehydrateErrorType, PersistConfig];
type Persist = <R>(PersistConfig, MigrationManifest) => R => R;
type CreatePersistor = Object => void;

// singleton used for performance, does not work with SSR
let _pendingPersists = [];

const initialState = {
  registry: [],
};

const persistorReducer = (state = initialState, action) => {
  switch (action.type) {
    case REGISTER:
      return { ...state, registry: [...state.registry, action.key] };
    case REHYDRATE:
      let firstIndex = state.registry.indexOf(action.key);
      let registry = Array.from(state.registry).splice(firstIndex, 1);
      return { ...state, registry, bootstrapped: registry.length === 0 };
    default:
      return state;
  }
};

export const persistStore = (store: Object) => {
  let persistor = createStore(persistorReducer, undefined);

  let register = (key: string) => {
    persistor.dispatch({
      type: REGISTER,
      key,
    });
  };

  let rehydrate = (payload: Object, err: any, key: string) => {
    let rehydrateAction = {
      type: REHYDRATE,
      payload,
      err,
      key,
    };
    // dispatch to `store` to rehydrate and `persistor` to track result
    store.dispatch(rehydrateAction);
    persistor.dispatch(rehydrateAction);
  };

  store.dispatch({ type: PERSIST, register, rehydrate });
};
