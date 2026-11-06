const prefix='inf03-exam-progress-v1:';
/** @param {Storage} storage @param {string} key */
export function readProgress(storage,key){try{return storage.getItem(prefix+key)==='done'?'done':'unmarked'}catch{return 'unavailable'}}
/** @param {Storage} storage @param {string} key @param {boolean} done */
export function writeProgress(storage,key,done){try{if(done)storage.setItem(prefix+key,'done');else storage.removeItem(prefix+key);return true}catch{return false}}
