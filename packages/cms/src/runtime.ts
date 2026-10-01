// While a dev server runs, the content can change underneath a module that has
// already been evaluated, so the virtual module hands out queries that look up
// the current snapshot on every call instead of closing over one.
export function live<S extends object, Q extends object>(
    bind: (snapshot: S) => Q,
    current: () => S,
): Q {
    const bound = new WeakMap<S, Q>();
    const queries = () => {
        const snapshot = current();
        let out = bound.get(snapshot);
        if (!out) bound.set(snapshot, (out = bind(snapshot)));
        return out;
    };
    return new Proxy({} as Q, {
        get: (_target, key) => Reflect.get(queries(), key),
        has: (_target, key) => Reflect.has(queries(), key),
        ownKeys: () => Reflect.ownKeys(queries()),
        getOwnPropertyDescriptor: (_target, key) =>
            Reflect.getOwnPropertyDescriptor(queries(), key),
    });
}
