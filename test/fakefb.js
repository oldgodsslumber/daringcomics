// In-memory Firebase stand-in with a security-rule simulator.
// The rule checks mirror MULTIPLAYER.md — the point of this harness is to prove
// a PLAYER cannot read loreGM, so the rules have to be modelled, not assumed.

function makeBackend() {
  const store = {};
  const listeners = []; // {path, cb, uid, onErr}

  const seg = p => String(p).split('/').filter(Boolean);
  function rawGet(path) {
    let n = store;
    for (const s of seg(path)) { if (n == null || typeof n !== 'object') return null; n = n[s]; }
    return n === undefined ? null : n;
  }
  function rawSet(path, val) {
    const parts = seg(path);
    if (!parts.length) return;
    let n = store;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof n[parts[i]] !== 'object' || n[parts[i]] === null) n[parts[i]] = {};
      n = n[parts[i]];
    }
    if (val === null) delete n[parts[parts.length - 1]];
    else n[parts[parts.length - 1]] = val;
  }

  // ---- security rules ----
  // Models the rules in MULTIPLAYER.md. Deliberately NON-cascading: read is
  // decided per subtree, never granted at the $code level. Real RTDB rules
  // cascade, so granting .read at $code there would expose loreGM — which is
  // exactly why the documented rules omit it.
  function can(op, path, uid) {
    const p = seg(path);
    if (!uid) return false;
    if (p[0] === 'codes') return true;
    if (p[0] === 'users') return p[1] === uid;
    if (p[0] === 'universes') {
      const code = p[1];
      const meta = rawGet('universes/' + code + '/meta');
      const isGM = !!(meta && meta.gmUid === uid);
      const isMember = !!rawGet('universes/' + code + '/members/' + uid);
      // meta is readable pre-join (the join flow must read it before you are a
      // member) and writable when it does not exist yet (universe creation).
      if (p[2] === 'meta') return op === 'read' ? true : (isGM || !meta);
      if (p[2] === 'loreGM') return isGM;                        // <-- the boundary
      // You may always write your OWN member row — that is how joining works,
      // and it must not require already being a member.
      if (p[2] === 'members') {
        if (op === 'read') return isMember;
        return p[3] ? (p[3] === uid || isGM) : isGM;
      }
      if (p[2] === 'heroes') {
        if (op === 'read') return isMember;
        return p[3] ? (p[3] === uid || isGM) : isGM;             // your sheet is yours
      }
      if (!p[2]) return isMember || !meta;                       // creating the universe
      return isMember;                                           // collaborative world content
    }
    return false;
  }

  function notify(changedPath) {
    listeners.slice().forEach(l => {
      const a = changedPath + '/', b = l.path + '/';
      if (!(a.startsWith(b) || b.startsWith(a))) return;
      if (!can('read', l.path, l.uid)) return;
      try { l.cb(JSON.parse(JSON.stringify(rawGet(l.path)))); } catch (e) { /* listener threw */ }
    });
  }
  function resolveTs(v) {
    if (v && typeof v === 'object') {
      if (v.__SERVER_TS__) return Date.now();
      const out = Array.isArray(v) ? [] : {};
      Object.keys(v).forEach(k => { out[k] = resolveTs(v[k]); });
      return out;
    }
    return v;
  }

  const ops = {
    get(path, uid) {
      if (!can('read', path, uid)) throw new Error('PERMISSION_DENIED: read ' + path);
      return JSON.parse(JSON.stringify(rawGet(path)));
    },
    set(path, val, uid) {
      if (!can('write', path, uid)) throw new Error('PERMISSION_DENIED: write ' + path);
      rawSet(path, resolveTs(val)); notify(path);
    },
    update(path, patch, uid) {
      if (!can('write', path, uid)) throw new Error('PERMISSION_DENIED: write ' + path);
      const cur = rawGet(path) || {};
      rawSet(path, Object.assign({}, cur, resolveTs(patch))); notify(path);
    },
    remove(path, uid) {
      if (!can('write', path, uid)) throw new Error('PERMISSION_DENIED: write ' + path);
      rawSet(path, null); notify(path);
    },
    push(path, val, uid) {
      if (!can('write', path, uid)) throw new Error('PERMISSION_DENIED: write ' + path);
      const key = 'k' + (ops._n = (ops._n || 0) + 1).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      rawSet(path + '/' + key, resolveTs(val)); notify(path);
      return key;
    },
    transaction(path, fn, uid) {
      if (!can('write', path, uid)) throw new Error('PERMISSION_DENIED: write ' + path);
      const cur = rawGet(path);
      const next = fn(cur);
      if (next === undefined) return { committed: false, value: cur };
      rawSet(path, next); notify(path);
      return { committed: true, value: next };
    },
    on(path, cb, uid, onErr) {
      const l = { path, cb, uid, onErr };
      listeners.push(l);
      if (can('read', path, uid)) { try { cb(JSON.parse(JSON.stringify(rawGet(path)))); } catch (e) {} }
      else if (onErr) onErr(new Error('PERMISSION_DENIED: read ' + path));
      return l;
    },
    off(l) { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); },
    _store: store,
    _raw: rawGet
  };
  return ops;
}

// A per-window firebase shim bound to one backend and one signed-in user.
function makeFirebase(backend, user) {
  let authCb = null;
  function makeRef(path, query) {
    // Synthetic RTDB node used by the connectivity probe.
    if (path === '.info/connected') {
      return { on(evt, cb){ setTimeout(()=>cb({val:()=>true}),0); return {}; }, off(){} };
    }
    query = query || {};
    const uid = () => (user && user.uid);
    const api = {
      _path: path,
      child(p) { return makeRef(path + '/' + p, {}); },
      orderByChild(k) { return makeRef(path, Object.assign({}, query, { orderBy: k })); },
      limitToLast(n) { return makeRef(path, Object.assign({}, query, { limit: n })); },
      async get() {
        const v = backend.get(path, uid());
        return { exists: () => v !== null && v !== undefined, val: () => v };
      },
      async set(v) { backend.set(path, v, uid()); },
      async update(v) { backend.update(path, v, uid()); },
      async remove() { backend.remove(path, uid()); },
      async push(v) { const k = backend.push(path, v, uid()); return { key: k }; },
      async transaction(fn) {
        const r = backend.transaction(path, fn, uid());
        return { committed: r.committed, snapshot: { val: () => r.value } };
      },
      on(evt, cb, errCb) {
        const wrapped = val => {
          let v = val;
          if (query.limit && v && typeof v === 'object') {
            const keys = Object.keys(v).sort((a, b) => (v[a][query.orderBy || 'ts'] || 0) - (v[b][query.orderBy || 'ts'] || 0));
            const keep = keys.slice(-query.limit);
            const out = {}; keep.forEach(k => { out[k] = v[k]; });
            v = out;
          }
          cb({ val: () => v });
        };
        return backend.on(path, wrapped, uid(), errCb);
      },
      off(evt, handle) { backend.off(handle); }
    };
    return api;
  }
  const fb = {
    initializeApp() { return {}; },
    auth() {
      return {
        onAuthStateChanged(cb) { authCb = cb; setTimeout(() => cb(user), 0); },
        setPersistence() { return Promise.resolve(); },
        getRedirectResult() { return Promise.resolve({ user: null }); },
        signInWithPopup() { if (authCb) authCb(user); return Promise.resolve({ user }); },
        signInWithRedirect() { return Promise.resolve(); },
        signOut() { if (authCb) authCb(null); return Promise.resolve(); }
      };
    },
    database() { return { ref: p => makeRef(p, {}) }; }
  };
  fb.auth.GoogleAuthProvider = function () { this.setCustomParameters = function () {}; };
  fb.auth.Auth = { Persistence: { LOCAL: 'local' } };
  fb.database.ServerValue = { TIMESTAMP: { __SERVER_TS__: true } };
  return fb;
}

module.exports = { makeBackend, makeFirebase };
