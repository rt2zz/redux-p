// @flow
import getStorage from './getStorage'

export function createSyncStorage(type: string) {
  let storage = getStorage(type)
  return {
    getItem: (key: string, cb: Function) => cb(null, storage.getItem(key)),
    setItem: (key: string, item: string, cb: Function) => {
      try {
        cb(null, storage.setItem(key, item))
      } catch (err) {
        cb(err)
      }
    },
    removeItem: (key: string, cb: Function) =>
      cb(null, storage.removeItem(key)),
    getAllKeys: (cb: Function) => cb(null, Object.keys(storage)),
  }
}
