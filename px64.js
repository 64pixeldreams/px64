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
    // Performance & Memory Management Core
    
    // Batch DOM updates for performance
    const updateQueue = new Set();
    let isUpdateScheduled = false;
    
    function batchUpdate(updateFn) {
        updateQueue.add(updateFn);
        if (!isUpdateScheduled) {
            isUpdateScheduled = true;
            // Use requestAnimationFrame for smooth updates, fallback to setTimeout
            const scheduleUpdate = typeof requestAnimationFrame !== 'undefined' 
                ? requestAnimationFrame 
                : (fn) => setTimeout(fn, 16);
                
            scheduleUpdate(() => {
                // Apply all queued updates
                updateQueue.forEach(fn => {
                    try { fn(); } catch (e) { console.warn('px64 update error:', e); }
                });
                updateQueue.clear();
                isUpdateScheduled = false;
            });
        }
    }
    
    // Observer cleanup system for memory management
    const elementObservers = new WeakMap(); // element -> Set of cleanup functions
    const scopeRegistry = new Map(); // scope-id -> { scope, cleanupFns }
    let scopeCounter = 0;
    
    function registerObserver(element, cleanupFn) {
        if (!elementObservers.has(element)) {
            elementObservers.set(element, new Set());
        }
        elementObservers.get(element).add(cleanupFn);
    }
    
    function cleanupElement(element) {
        const observers = elementObservers.get(element);
        if (observers) {
            observers.forEach(cleanup => {
                try { cleanup(); } catch (e) { console.warn('px64 cleanup error:', e); }
            });
            elementObservers.delete(element);
        }
        
        // Cleanup child elements recursively
        if (element.children) {
            Array.from(element.children).forEach(child => cleanupElement(child));
        }
    }
    
    // Automatic cleanup when elements are removed from DOM
    let startDOMObserver;
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        cleanupElement(node);
                    }
                });
            });
        });
        
        // Start observing when first bind() is called
        let observerStarted = false;
        startDOMObserver = function() {
            if (!observerStarted && typeof document !== 'undefined') {
                observer.observe(document.body, { childList: true, subtree: true });
                observerStarted = true;
            }
        };
    } else {
        startDOMObserver = function() {}; // No-op for environments without MutationObserver
    }

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
        const apply = (v) => batchUpdate(() => { el.textContent = v ?? ''; });

        apply(resolvePath(scope, targetPath));

        // reactive hook (only if top-level key)
        const keys = targetPath.split('.');
        const lastKey = keys.pop();
        const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(lastKey, v => apply(v));
            registerObserver(el, unsubscribe);
        }
    });

    // ternary:condition:'true':'false' (dedicated ternary binder)
    addBinder('ternary', ({ el, scope, arg }) => {
        const parts = arg.split(':');
        if (parts.length !== 3) {
            console.warn('ternary binder requires format: condition:trueValue:falseValue');
            return;
        }
        const [conditionPath, trueValue, falseValue] = parts;
        
        const apply = () => batchUpdate(() => {
            const conditionResult = !!resolvePath(scope, conditionPath.trim());
            el.textContent = conditionResult ? trueValue : falseValue;
        });
        
        apply();
        
        // Set up observer for the condition
        const keys = conditionPath.trim().split('.');
        const lastKey = keys.pop();
        const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(lastKey, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // html:prop
    addBinder('html', ({ el, scope, arg }) => {
        const val = resolvePath(scope, arg);
        const apply = v => batchUpdate(() => { el.innerHTML = v ?? ''; });
        apply(val);
        const lastKey = arg.split('.').pop();
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(lastKey, v => apply(v));
            registerObserver(el, unsubscribe);
        }
    });

    // value:prop (two-way for inputs)
    addBinder('value', ({ el, scope, arg }) => {
        const parentPath = arg.split('.').slice(0, -1).join('.');
        const key = arg.split('.').pop();
        const parent = parentPath ? resolvePath(scope, parentPath) : scope;
        const apply = v => { if (el.value !== (v ?? '')) el.value = v ?? ''; };
        apply(parent[key]);
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, v => apply(v));
            registerObserver(el, unsubscribe);
        }
        el.addEventListener('input', () => {
            if (parent.$set) parent.$set(key, el.value);
            else parent[key] = el.value; // non-observable fallback
        });
    });

    // show:expr / hide:expr (truthy)
    const truthy = v => !!v;
    addBinder('show', ({ el, scope, arg }) => {
        const apply = () => batchUpdate(() => {
            el.style.display = truthy(resolvePath(scope, arg)) ? '' : 'none';
        });
        apply();
        if (scope.$observe) {
            const unsubscribe = scope.$observe('*', apply);
            registerObserver(el, unsubscribe);
        }
    });
    addBinder('hide', ({ el, scope, arg }) => {
        const apply = () => batchUpdate(() => {
            el.style.display = truthy(resolvePath(scope, arg)) ? 'none' : '';
        });
        apply();
        if (scope.$observe) {
            const unsubscribe = scope.$observe('*', apply);
            registerObserver(el, unsubscribe);
        }
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

        // Smart list rendering with diffing and batching
        let lastRenderedItems = [];
        let renderedNodes = [];
        
        function render() {
            if (state.sortBy && meta.sort) state.sortBy(meta.sort, meta.dir || 'asc');
            const rows = state.paged ? state.paged() : (state.items || []);
            
            // Smart diffing - only update if items actually changed
            const itemsChanged = !arraysEqual(rows, lastRenderedItems);
            if (!itemsChanged) return;
            
            // Batch the rendering operation
            batchUpdate(() => {
                // For large lists (>100 items), use incremental rendering
                if (rows.length > 100) {
                    renderIncremental(rows);
                } else {
                    renderFull(rows);
                }
                lastRenderedItems = rows.slice(); // shallow copy
            });
        }
        
        function arraysEqual(a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }
        
        function renderFull(rows) {
            // Cleanup existing nodes
            renderedNodes.forEach(node => cleanupElement(node));
            el.innerHTML = '';
            
            const frag = document.createDocumentFragment();
            renderedNodes = [];
            rows.forEach(row => {
                const node = template.cloneNode(true);
                // Don't double-wrap with observable if already observable
                const rowScope = (row && row.$set) ? row : observable(row);
                bindTree(node, rowScope);
                frag.appendChild(node);
                renderedNodes.push(node);
            });
            el.appendChild(frag);
        }
        
        function renderIncremental(rows) {
            // For large lists, render in chunks using requestIdleCallback
            let index = 0;
            const chunkSize = 20;
            
            function renderChunk() {
                const endIndex = Math.min(index + chunkSize, rows.length);
                const frag = document.createDocumentFragment();
                
                for (let i = index; i < endIndex; i++) {
                    const row = rows[i];
                    const node = template.cloneNode(true);
                    // Don't double-wrap with observable if already observable
                    const rowScope = (row && row.$set) ? row : observable(row);
                    bindTree(node, rowScope);
                    frag.appendChild(node);
                    renderedNodes.push(node);
                }
                
                if (index === 0) {
                    // First chunk - clear and append
                    renderedNodes.forEach(node => cleanupElement(node));
                    el.innerHTML = '';
                    renderedNodes = [];
                }
                
                el.appendChild(frag);
                index = endIndex;
                
                if (index < rows.length) {
                    // Schedule next chunk
                    const scheduleNext = typeof requestIdleCallback !== 'undefined'
                        ? requestIdleCallback
                        : (fn) => setTimeout(fn, 0);
                    scheduleNext(renderChunk);
                }
            }
            
            renderChunk();
        }
        
        render();
        // re-render on list changes
        const rerender = () => render();
        if (state.$observe) {
            const unsubscribe = state.$observe('*', rerender);
            registerObserver(el, unsubscribe);
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

    // image:imageUrl (sets src attribute for images)
    addBinder('image', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = v => batchUpdate(() => {
            el.src = v || '';
            // Handle broken images gracefully
            if (v && !el.onerror) {
                el.onerror = () => {
                    el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0xMiA2VjE4TTYgMTJIMTgiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'; // Simple placeholder
                };
            }
        });
        apply(resolvePath(scope, arg));
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // style:property:value OR style:backgroundColor:user.color
    addBinder('style', ({ el, scope, arg }) => {
        const parts = arg.split(':');
        if (parts.length !== 2) {
            console.warn('style binder requires format: property:valuePath');
            return;
        }
        const [styleProperty, valuePath] = parts;
        const parent = resolvePath(scope, valuePath.split('.').slice(0, -1).join('.')) || scope;
        const key = valuePath.split('.').pop();
        
        const apply = v => batchUpdate(() => {
            el.style[styleProperty] = v || '';
        });
        apply(resolvePath(scope, valuePath));
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // fade:loading (opacity transition for loading states)
    addBinder('fade', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const shouldFade = !!resolvePath(scope, arg);
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = shouldFade ? '0.3' : '1';
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // fadein:!loading (show with fade when condition is true)
    addBinder('fadein', ({ el, scope, arg }) => {
        // Handle negated expressions like "!loading"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;
        const parent = resolvePath(scope, cleanArg.split('.').slice(0, -1).join('.')) || scope;
        const key = cleanArg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const value = resolvePath(scope, cleanArg);
            const shouldShow = isNegated ? !value : !!value;
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = shouldShow ? '1' : '0';
            el.style.pointerEvents = shouldShow ? 'auto' : 'none';
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // loading:isSubmitting (Bootstrap spinner integration)
    addBinder('loading', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const isLoading = !!resolvePath(scope, arg);
            const spinner = el.querySelector('.spinner-border');
            if (isLoading) {
                el.disabled = true;
                if (spinner) spinner.style.display = 'inline-block';
            } else {
                el.disabled = false;
                if (spinner) spinner.style.display = 'none';
            }
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // disable:loading / enable:!loading (form control states)
    addBinder('disable', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            el.disabled = !!resolvePath(scope, arg);
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    addBinder('enable', ({ el, scope, arg }) => {
        // Handle negated expressions like "!isProcessing"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;
        const parent = resolvePath(scope, cleanArg.split('.').slice(0, -1).join('.')) || scope;
        const key = cleanArg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const value = resolvePath(scope, cleanArg);
            el.disabled = isNegated ? !!value : !value;
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // valid:isEmailValid / invalid:!isEmailValid (Bootstrap validation)
    addBinder('valid', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const isValid = !!resolvePath(scope, arg);
            el.classList.toggle('is-valid', isValid);
            el.classList.toggle('is-invalid', !isValid);
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    addBinder('invalid', ({ el, scope, arg }) => {
        // Handle negated expressions like "!isEmailValid"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;
        const parent = resolvePath(scope, cleanArg.split('.').slice(0, -1).join('.')) || scope;
        const key = cleanArg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const value = resolvePath(scope, cleanArg);
            const isInvalid = isNegated ? !value : !!value;
            el.classList.toggle('is-invalid', isInvalid);
            el.classList.toggle('is-valid', !isInvalid);
            el.style.display = isInvalid ? 'block' : 'none';
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // Date formatting binders
    const _dateFormats = {
        date: new Intl.DateTimeFormat(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric' 
        }),
        datetime: new Intl.DateTimeFormat(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit'
        })
    };

    // date:createdAt (format as "Dec 15, 2024")
    addBinder('date', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const format = v => {
            const date = v instanceof Date ? v : new Date(v);
            el.textContent = isNaN(date) ? '' : _dateFormats.date.format(date);
        };
        format(resolvePath(scope, arg));
        parent.$observe && parent.$observe(key, format);
    });

    // datetime:lastLogin (smart relative/absolute formatting)
    addBinder('datetime', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const format = v => {
            const date = v instanceof Date ? v : new Date(v);
            if (isNaN(date)) {
                el.textContent = '';
                return;
            }
            const now = new Date();
            const diffMs = now - date;
            const diffHours = diffMs / (1000 * 60 * 60);
            
            if (diffHours < 24) {
                // Less than 24 hours: "2 hours ago"
                if (diffHours < 1) {
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    el.textContent = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
                } else {
                    el.textContent = `${Math.floor(diffHours)} hours ago`;
                }
            } else if (diffHours < 48) {
                // Yesterday: "Yesterday 3:45 PM"
                const timeStr = date.toLocaleTimeString(undefined, { 
                    hour: 'numeric', minute: '2-digit' 
                });
                el.textContent = `Yesterday ${timeStr}`;
            } else {
                // Older: "Dec 12, 2024"
                el.textContent = _dateFormats.date.format(date);
            }
        };
        format(resolvePath(scope, arg));
        parent.$observe && parent.$observe(key, format);
    });

    // timeago:updatedAt ("2 minutes ago")
    addBinder('timeago', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const format = v => {
            const date = v instanceof Date ? v : new Date(v);
            if (isNaN(date)) {
                el.textContent = '';
                return;
            }
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) el.textContent = 'Just now';
            else if (diffMins < 60) el.textContent = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            else if (diffHours < 24) el.textContent = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            else if (diffDays < 7) el.textContent = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            else el.textContent = _dateFormats.date.format(date);
        };
        format(resolvePath(scope, arg));
        parent.$observe && parent.$observe(key, format);
    });

    // Bootstrap component binders
    // alert:error (Bootstrap alert integration)
    addBinder('alert', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const message = resolvePath(scope, arg);
            if (message) {
                el.textContent = message;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // badge:status (auto-colored badges)
    addBinder('badge', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const colorMap = {
            success: 'bg-success', active: 'bg-success', completed: 'bg-success', 
            warning: 'bg-warning', pending: 'bg-warning', 
            danger: 'bg-danger', error: 'bg-danger', failed: 'bg-danger',
            info: 'bg-info', processing: 'bg-info',
            secondary: 'bg-secondary', inactive: 'bg-secondary'
        };
        const apply = () => batchUpdate(() => {
            const value = resolvePath(scope, arg);
            el.textContent = value || '';
            // Remove existing bg-* classes
            el.className = el.className.replace(/bg-\w+/g, '');
            // Add appropriate color class
            const colorClass = colorMap[String(value).toLowerCase()] || 'bg-secondary';
            el.classList.add(colorClass);
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // progress:uploadPercent (Bootstrap progress bars)
    addBinder('progress', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const percent = Number(resolvePath(scope, arg)) || 0;
            const clampedPercent = Math.max(0, Math.min(100, percent));
            
            // Create progress bar if it doesn't exist
            let progressBar = el.querySelector('.progress-bar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.setAttribute('role', 'progressbar');
                el.appendChild(progressBar);
            }
            
            progressBar.style.width = `${clampedPercent}%`;
            progressBar.setAttribute('aria-valuenow', clampedPercent);
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
            progressBar.textContent = `${Math.round(clampedPercent)}%`;
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // checkbox:isChecked (two-way binding for checkboxes)
    addBinder('checkbox', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = v => { el.checked = !!v; };
        apply(resolvePath(scope, arg));
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, v => apply(v));
            registerObserver(el, unsubscribe);
        }
        el.addEventListener('change', () => {
            if (parent.$set) parent.$set(key, el.checked);
            else parent[key] = el.checked;
        });
    });

    // radio:selectedValue (radio group binding)
    addBinder('radio', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = v => { el.checked = (el.value === v); };
        apply(resolvePath(scope, arg));
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, v => apply(v));
            registerObserver(el, unsubscribe);
        }
        el.addEventListener('change', () => {
            if (el.checked && parent.$set) parent.$set(key, el.value);
            else if (el.checked) parent[key] = el.value;
        });
    });

    // tab:activeTab (tab navigation with content switching)
    addBinder('tab', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();
        const apply = () => batchUpdate(() => {
            const activeTab = resolvePath(scope, arg);
            const tabId = el.getAttribute('data-tab-id');
            const contentId = el.getAttribute('data-tab-content');
            
            if (tabId) {
                // This is a tab button
                el.classList.toggle('active', tabId === activeTab);
                el.setAttribute('aria-selected', tabId === activeTab);
            }
            
            if (contentId) {
                // This is tab content
                const isActive = contentId === activeTab;
                el.style.display = isActive ? 'block' : 'none';
                el.classList.toggle('active', isActive);
            }
        });
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
        
        // Handle tab clicks
        if (el.getAttribute('data-tab-id')) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = el.getAttribute('data-tab-id');
                if (parent.$set) parent.$set(key, tabId);
                else parent[key] = tabId;
            });
        }
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
            
            // Check if this is a function call with parameters like "setStatus('danger')"
            const functionCallMatch = action.match(/^(\w+)\('([^']+)'\)$/);
            if (functionCallMatch) {
                const [, functionName, parameter] = functionCallMatch;
                const fn = resolvePath(scope, functionName);
                if (isFn(fn)) {
                    const result = fn.call(scope, parameter);
                    // If the function returns another function (like setStatus does), call it
                    if (isFn(result)) {
                        result.call(scope, { el: target, scope, event: ev });
                    }
                }
            } else {
                // Handle simple function path
                const fn = resolvePath(scope, action);
                if (isFn(fn)) fn.call(scope, { el: target, scope, event: ev });
            }
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
            startDOMObserver(); // Start automatic cleanup observer
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