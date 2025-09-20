/*!
 * px64 — Lightweight DOM Binding & Scope Engine (MIT License)
 *
 * Overview:
 * px64 is a tiny, dependency-free library that connects plain JavaScript objects
 * ("scopes") directly to your HTML using `data-bind` attributes. When scope data
 * changes, the DOM updates automatically. When a user interacts with inputs or
 * events, the scope is updated in turn. It’s reactive, but intentionally simple.
 *
 * Core Concepts:
 * - observable(obj): Wraps a plain object to make its properties reactive.
 *   When you call `obj.$set("prop", value)` all DOM elements bound to that
 *   property update automatically.
 * - bind(root, scope): Walks the DOM tree under `root`, parses `data-bind`
 *   attributes, and wires the DOM to the scope object.
 * - listState(): A helper for paged/sorted lists with built-in reactivity.
 * - addBinder(name, fn): Register new custom binders for your project.
 *
 * Built-in Binders:
 * - text:name      → <span data-bind="text:name"></span> sets textContent.
 * - html:content   → <div data-bind="html:content"></div> sets innerHTML.
 * - value:prop     → <input data-bind="value:username"> two-way binding.
 * - show:flag      → toggles element visibility based on truthy scope value.
 * - hide:flag      → opposite of show.
 * - attr:title:prop→ <div data-bind="attr:title:user.title"></div>.
 * - class:active:isActive → toggles a class based on a boolean.
 * - tap:method     → <button data-bind="tap:logout"></button> calls scope.logout.
 * - view:subscope  → creates a new nested binding scope for subtree.
 * - list:items     → <ul data-bind="list:todos"><li>…</li></ul> renders array items.
 * - table:items    → <table data-bind="table:rows" data-meta="cols:name,age"></table>.
 * - money:amount   → <span data-bind="money:invoice.total"></span> formatted numbers.
 *
 * Example:
 * const scope = px64.bind("#app", {
 *   user: px64.observable({ name: "Martin" }),
 *   logout() { alert("Logged out!"); }
 * });
 *
 * HTML:
 * <div id="app">
 *   <h1 data-bind="text:user.name"></h1>
 *   <button data-bind="tap:logout">Logout</button>
 * </div>
 *
 * Notes:
 * - Minimal core, no deps. Binders are tiny functions mapped from `data-bind`.
 * - `view:` forms a scope boundary for nested subtrees (and event resolution).
 * - Event delegation for `tap:` is installed once per bound root.
 * - Always wrap models with `px64.observable` for reactivity.
 * - `listState` helps with sorting & paging of array data.
 *
 * Environment:
 * - Works in browsers as `window.px64`.
 * - Supports CommonJS (Node.js) and AMD loaders.
 *
 * License: MIT — use, modify, and distribute freely.
 */

(function(global) {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────────
    // utils
    const isFn = v => typeof v === 'function';
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
    const toArray = v => Array.from(v);
    const by = (k, dir = 'asc') => {
        const mult = dir === 'desc' ? -1 : 1;
        return (a, b) => {
            const av = a && a[k];
            const bv = b && b[k];
            if (av === bv) return 0;
            if (av === undefined) return 1 * mult;
            if (bv === undefined) return -1 * mult;
            return (av > bv ? 1 : -1) * mult;
        };
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // tiny reactive core
    const OBS = Symbol('px64.observers');

    function observable(obj) {
        if (!isObj(obj)) return obj;
        if (obj[OBS]) return obj; // idempotent

        Object.defineProperty(obj, OBS, { value: new Map(), enumerable: false });

        const notify = (prop, value, old) => {
            const m = obj[OBS].get(prop);
            if (m) m.forEach(fn => fn(value, old));
            const any = obj[OBS].get('*');
            if (any) any.forEach(fn => fn(prop, value, old));
        };

        obj.$observe = function(prop, fn) {
            const key = prop || '*';
            if (!obj[OBS].has(key)) obj[OBS].set(key, new Set());
            obj[OBS].get(key).add(fn);
            return () => obj[OBS].get(key).delete(fn);
        };

        obj.$set = function(prop, value) {
            const old = obj[prop];
            if (old === value) return;
            obj[prop] = value;
            notify(prop, value, old);
        };

        // wrap nested objects shallowly
        Object.keys(obj).forEach(k => {
            if (isObj(obj[k]) && !obj[k][OBS]) obj[k] = observable(obj[k]);
        });

        return obj;
    }

    // Simple list wrapper with paging/sorting and change events
    function listState(items = []) {
        const state = observable({
            items: items.slice(),
            page: 1,
            pageSize: 20,
            sortKey: null,
            sortDir: 'asc',
            total: items.length,
            loading: false
        });

        state.setItems = (arr) => {
            state.$set('items', arr.slice());
            state.$set('total', arr.length);
        };

        state.sorted = () => {
            const { items, sortKey, sortDir } = state;
            if (!sortKey) return items;
            return items.slice().sort(by(sortKey, sortDir));
        };

        state.paged = () => {
            const { page, pageSize } = state;
            const src = state.sorted();
            const start = (page - 1) * pageSize;
            return src.slice(start, start + pageSize);
        };

        state.nextPage = () => state.$set('page', Math.min(Math.ceil(state.total / state.pageSize), state.page + 1));
        state.prevPage = () => state.$set('page', Math.max(1, state.page - 1));
        state.sortBy = (k, dir) => { state.$set('sortKey', k); if (dir) state.$set('sortDir', dir); };

        return state;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // binder registry
    const binders = Object.create(null);

    function addBinder(name, fn) { binders[name] = fn; }

    // parse `data-bind="text:name, attr:title:fullName"`
    // ALSO support shorthand: `data-bind="name"` → `text:name`
    function parseBinds(str) {
        return str
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(tok => {
                const parts = tok.split(':').map(s => s.trim());
                if (parts.length === 1) {
                    return { cmd: 'text', arg: parts[0] }; // shorthand
                }
                const cmd = parts.shift();
                const arg = parts.join(':'); // allow attr:data-id:user.id etc.
                return { cmd, arg };
            });
    }

    // scope stack walker
    function bindTree(root, scope) {
        const stack = [{ el: root, scope }];
        walk(root, scope, stack);
    }

    function walk(el, scope, stack) {
        // This element first
        if (el.hasAttribute && el.hasAttribute('data-bind')) {
            applyBinds(el, scope, stack);
        }

        // Then children
        const children = el.children ? toArray(el.children) : [];
        for (const child of children) {
            if (child.hasAttribute && child.hasAttribute('data-bind')) {
                const binds = child.getAttribute('data-bind');
                if (binds && /\bview\s*:/.test(binds)) {
                    // view binder will handle its subtree; don't double-walk
                    continue;
                }
            }
            walk(child, scope, stack);
        }
    }

    function resolvePath(scope, path) {
        if (!path) return scope;
        return path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), scope);
    }

    function applyBinds(el, scope, stack) {
        const binds = parseBinds(el.getAttribute('data-bind'));
        for (const b of binds) {
            const fn = binders[b.cmd];
            if (!fn) continue;
            fn({ el, scope, arg: b.arg, stack });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // We mark each scope root with an id so events can resolve the closest scope
    const scopeRegistry = new Map();
    let scopeCounter = 0;

    function assignScopeId(host, scope) {
        const sid = (++scopeCounter).toString(36);
        host.setAttribute('data-scope-id', sid);
        scopeRegistry.set(sid, scope);
        return sid;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Built-in binders

    // text:name OR shorthand "name"
    addBinder('text', ({ el, scope, arg }) => {
        const path = arg || el.getAttribute('data-bind'); // when single token w/o colon
        const targetPath = path.includes(':') ? path.split(':')[1] : path;
        const apply = (v) => { el.textContent = v ?? ''; };

        apply(resolvePath(scope, targetPath));

        // reactive hook (only if top-level key)
        const keys = targetPath.split('.');
        const lastKey = keys.pop();
        const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
        if (parent && parent.$observe) parent.$observe(lastKey, v => apply(v));
    });

    // html:prop
    addBinder('html', ({ el, scope, arg }) => {
        const val = resolvePath(scope, arg);
        const apply = v => { el.innerHTML = v ?? ''; };
        apply(val);
        const lastKey = arg.split('.').pop();
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        if (parent && parent.$observe) parent.$observe(lastKey, v => apply(v));
    });

    // value:prop (two-way for inputs)
    addBinder('value', ({ el, scope, arg }) => {
        const parentPath = arg.split('.').slice(0, -1).join('.');
        const key = arg.split('.').pop();
        const parent = parentPath ? resolvePath(scope, parentPath) : scope;
        const apply = v => { if (el.value !== (v ?? '')) el.value = v ?? ''; };
        apply(parent[key]);
        parent.$observe && parent.$observe(key, v => apply(v));
        el.addEventListener('input', () => {
            if (parent.$set) parent.$set(key, el.value);
            else parent[key] = el.value; // non-observable fallback
        });
    });

    // show:expr / hide:expr (truthy)
    const truthy = v => !!v;
    addBinder('show', ({ el, scope, arg }) => {
        const apply = () => el.style.display = truthy(resolvePath(scope, arg)) ? '' : 'none';
        apply();
        scope.$observe && scope.$observe('*', apply);
    });
    addBinder('hide', ({ el, scope, arg }) => {
        const apply = () => el.style.display = truthy(resolvePath(scope, arg)) ? 'none' : '';
        apply();
        scope.$observe && scope.$observe('*', apply);
    });

    // attr:title:prop OR attr:data-id:order.id
    addBinder('attr', ({ el, scope, arg }) => {
        const [attrName, path] = arg.split(':');
        const parent = resolvePath(scope, path.split('.').slice(0, -1).join('.')) || scope;
        const key = path.split('.').pop();
        const apply = v => el.setAttribute(attrName, v ?? '');
        apply(resolvePath(scope, path));
        parent.$observe && parent.$observe(key, v => apply(v));
    });

    // class:active:isActive
    addBinder('class', ({ el, scope, arg }) => {
        const [cls, path] = arg.split(':');
        const parent = resolvePath(scope, path.split('.').slice(0, -1).join('.')) || scope;
        const key = path.split('.').pop();
        const apply = () => el.classList.toggle(cls, !!resolvePath(scope, path));
        apply();
        parent.$observe && parent.$observe(key, apply);
    });

    // tap:logout (event delegation registered once on root)
    addBinder('tap', ({ el, scope, arg }) => {
        // We just annotate; global handler resolves when clicked
        el.setAttribute('data-tap', arg);
    });

    // view:page  (scoped subtree & scope boundary)
    addBinder('view', ({ el, scope, arg, stack }) => {
        const childScope = resolvePath(scope, arg);
        if (!childScope) return;
        const obs = observable(childScope);
        // mark this element as a new scope root so events resolve locally
        assignScopeId(el, obs);
        // bind only *children*, not the view host again
        toArray(el.children).forEach(ch => walk(ch, obs, stack.concat([{ el, scope: obs }])));
    });

    // list:items — renders <li> or any template element inside
    // Optional meta via data-meta="key:name;sort:created;dir:desc"
    addBinder('list', ({ el, scope, arg }) => {
        const state = resolvePath(scope, arg); // expected listState or { items: [...] }
        const meta = parseMeta(el.getAttribute('data-meta'));
        const template = findTemplate(el);

        function parseMeta(s) {
            const o = {};
            if (!s) return o;
            s.split(';').forEach(pair => {
                const [k, v] = pair.split(':').map(x => x && x.trim());
                if (k) o[k] = v;
            });
            return o;
        }

        function findTemplate(host) {
            // <template> … </template> or the first child as proto
            const tpl = host.querySelector('template');
            if (tpl) return tpl.content.firstElementChild;
            if (host.firstElementChild) return host.firstElementChild.cloneNode(true);
            // fallback simple <div><span data-bind="text:name"></span></div>
            const el = document.createElement('div');
            el.innerHTML = `<div data-bind="text:name"></div>`;
            return el.firstElementChild;
        }

        function render() {
            el.innerHTML = '';
            if (state.sortBy && meta.sort) state.sortBy(meta.sort, meta.dir || 'asc');
            const rows = state.paged ? state.paged() : (state.items || []);
            const frag = document.createDocumentFragment();
            rows.forEach(row => {
                const node = template.cloneNode(true);
                bindTree(node, observable(row));
                frag.appendChild(node);
            });
            el.appendChild(frag);
        }
        render();
        // re-render on list changes
        const rerender = () => render();
        if (state.$observe) {
            state.$observe('*', rerender); // page, pageSize, sortKey, items etc.
        }
    });

    // table:items — like list but expects columns via data-meta="cols:created,name,score;sort:created"
    addBinder('table', ({ el, scope, arg }) => {
        const state = resolvePath(scope, arg); // listState
        const meta = (el.getAttribute('data-meta') || '').split(';').reduce((a, s) => {
            const [k, v] = s.split(':');
            if (k) a[k.trim()] = (v || '').trim();
            return a;
        }, {});
        const cols = (meta.cols || '').split(',').map(s => s.trim()).filter(Boolean);

        function renderHead() {
            const thead = el.tHead || el.createTHead();
            thead.innerHTML = '';
            const tr = document.createElement('tr');
            cols.forEach(c => {
                const th = document.createElement('th');
                th.textContent = c;
                th.dataset.sortKey = c;
                th.style.cursor = 'pointer';
                tr.appendChild(th);
            });
            thead.appendChild(tr);
        }

        function renderBody() {
            const tbody = el.tBodies[0] || el.createTBody();
            tbody.innerHTML = '';
            const rows = state.paged ? state.paged() : (state.items || []);
            rows.forEach(row => {
                const tr = document.createElement('tr');
                cols.forEach(c => {
                    const td = document.createElement('td');
                    td.textContent = (row[c] ?? '');
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
        }

        function render() {
            if (!el.tHead) renderHead();
            renderBody();
        }
        render();
        // sorting
        el.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th) return;
            const k = th.dataset.sortKey;
            const dir = (state.sortKey === k && state.sortDir === 'asc') ? 'desc' : 'asc';
            state.sortBy && state.sortBy(k, dir);
        });
        state.$observe && state.$observe('*', render);
    });

    // money:prop (example custom formatter) — cached formatter
    const _moneyFmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    addBinder('money', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const format = v => el.textContent = _moneyFmt.format(Number(v || 0));
        format(resolvePath(scope, arg));
        parent.$observe && parent.$observe(key, format);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Event delegation for tap:* — install once per root
    function installTapDelegation(root) {
        if (root.__px64TapInstalled) return;
        root.__px64TapInstalled = true;

        root.addEventListener('click', (ev) => {
            const target = ev.target.closest('[data-tap]');
            if (!target) return;
            const action = target.getAttribute('data-tap');
            // Resolve scope for this node by walking up to nearest data-scope marker
            const scopeId = target.closest('[data-scope-id]')?.getAttribute('data-scope-id');
            const scope = scopeId && scopeRegistry.get(scopeId);
            if (!scope) return;
            // find handler on scope (fn or path)
            const fn = resolvePath(scope, action);
            if (isFn(fn)) fn.call(scope, { el: target, scope, event: ev });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // data access stubs (wire these to your API)
    const model = {
        // returns observable object
        async fetchObject(kind, params) {
            // replace with your API call
            const data = params?.mock || {};
            return observable(data);
        },
        // returns listState with helpers
        async fetchList(kind, params) {
            const arr = params?.mock || [];
            return listState(arr);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // public API
    const px64 = {
        addBinder,
        bind(root, scope) {
            const host = typeof root === 'string' ? document.querySelector(root) : root;
            if (!host) throw new Error('px64.bind: root not found');
            const sc = observable(scope || {});
            if (!host.hasAttribute('data-scope-id')) assignScopeId(host, sc);
            bindTree(host, sc);
            installTapDelegation(host);
            return sc;
        },
        model,
        observable,
        listState
    };

    // expose (browser)
    global.px64 = px64;

    // also support Node / CommonJS / AMD
    if (typeof module !== "undefined" && module.exports) {
        module.exports = px64; // Node / CommonJS
    }
    if (typeof define === "function" && define.amd) {
        define(() => px64); // AMD
    }

})(window);