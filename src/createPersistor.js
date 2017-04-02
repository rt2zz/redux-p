// @flow

import { KEY_PREFIX, REHYDRATE } from './constants'
import stringify from 'json-stringify-safe'

import type { Config, Transform } from './types'

export function createPersistor(store: Object, config: Config) {
  // defaults
  const blacklist: ?Array<string> = config.blacklist || null
  const whitelist: ?Array<string> = config.whitelist || null
  const transforms = config.transforms || []
  const throttle = config.throttle || 0
  const storageKey = `${config.keyPrefix !== undefined ? config.keyPrefix : KEY_PREFIX}${config.key}`

  // storage with keys -> getAllKeys for localForage support
  let storage = config.storage
  if (storage.keys && !storage.getAllKeys) {
    storage.getAllKeys = storage.keys
  }

  // initialize stateful values
  let lastState = {}
  let paused = false
  let keysToProcess = []
  let timeIterator: ?number = null

  const updateState = (state: Object) => {
    if (paused) return

    Object.keys(state).forEach(key => {
      let subState = state[key]
      if (!passWhitelistBlacklist(key)) return // is keyspace ignored? noop
      if (lastState[key] === state[key]) return // value unchanged? noop
      if (keysToProcess.indexOf(key) !== -1) return // is key already queued? noop
      keysToProcess.push(key) // add key to queue
    })

    // time iterator (read: throttle)
    if (timeIterator === null) {
      timeIterator = setInterval(
        () => {
          if (keysToProcess.length === 0) {
            if (timeIterator) clearInterval(timeIterator)
            timeIterator = null
            return
          }

          let key = keysToProcess.shift()
          let endState = transforms.reduce(
            (subState, transformer) => {
              return transformer.in(subState, key)
            },
            lastState[key]
          )
          if (typeof endState !== 'undefined') stagedWrite(key, endState)
        },
        throttle
      )
    }

    lastState = state
  }

  let stagedState = {}
  function stagedWrite(key: string, endState: any) {
    stagedState[key] = serializer(endState)
    if (keysToProcess.length === 0) {
      storage.setItem(storageKey, serializer(stagedState), onWriteFail)
    }
  }

  function passWhitelistBlacklist(key) {
    if (whitelist && whitelist.indexOf(key) === -1) return false
    if (blacklist && blacklist.indexOf(key) !== -1) return false
    return true
  }

  function onWriteFail() {
    return function setError(err) {
      // @TODO add fail handlers (typically storage full)
      if (err && process.env.NODE_ENV !== 'production') {
        console.error('Error storing data', err)
      }
    }
  }

  // return `persistor`
  return {
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    updateState,
  }
}

function serializer(data) {
  return stringify(data, null, null, (k, v) => {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        `
        redux-persist: cannot process cyclical state.
        Consider changing your state structure to have no cycles.
        Alternatively blacklist the corresponding reducer key.
        Cycle encounted at key "${k}" with value "${v}".
      `
      )
    }
    return null
  })
}

function deserializer(serial) {
  return JSON.parse(serial)
}
