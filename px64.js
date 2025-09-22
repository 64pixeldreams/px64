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
 * - html:content   → <div data-bind="html:content"></div> sets innerHTML (UNSAFE).
 * - html-safe:content → <div data-bind="html-safe:userContent"></div> sanitized HTML.
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

(function (global) {
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
    // HTML Sanitizer for XSS Protection

    // Allowed HTML tags and attributes for safe content
    const ALLOWED_TAGS = new Set([
        'p', 'div', 'span', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'b', 'em', 'i', 'u', 'small', 'mark', 'del', 'ins', 'sub', 'sup',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'code',
        'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ]);

    const ALLOWED_ATTRS = new Set([
        'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'
    ]);

    const URL_PROTOCOLS = /^(https?|mailto):/i;

    function sanitizeHTML(html) {
        if (!html || typeof html !== 'string') return '';

        // Create a temporary DOM element to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Recursively clean the DOM tree
        function cleanElement(element) {
            const tagName = element.tagName?.toLowerCase();

            // Remove disallowed tags
            if (!ALLOWED_TAGS.has(tagName)) {
                element.remove();
                return;
            }

            // Clean attributes
            const attrs = Array.from(element.attributes || []);
            attrs.forEach(attr => {
                const name = attr.name.toLowerCase();

                if (!ALLOWED_ATTRS.has(name)) {
                    element.removeAttribute(attr.name);
                } else if (name === 'href' || name === 'src') {
                    // Validate URLs
                    const value = attr.value.trim();
                    if (value && !URL_PROTOCOLS.test(value) && !value.startsWith('#') && !value.startsWith('/')) {
                        element.removeAttribute(attr.name);
                    }
                }
            });

            // Clean child elements
            Array.from(element.children || []).forEach(cleanElement);
        }

        // Clean all child elements
        Array.from(temp.children).forEach(cleanElement);

        return temp.innerHTML;
    }

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

    // One-liner reactive helper - handles path resolution, initial call, and observer setup
    function reactive(el, scope, path, applyFn) {
        applyFn(resolvePath(scope, path));
        const keys = path.split('.');
        const lastKey = keys.pop();
        const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
        if (parent && parent.$observe) {
            registerObserver(el, parent.$observe(lastKey, applyFn));
        }
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
        startDOMObserver = function () {
            if (!observerStarted && typeof document !== 'undefined') {
                observer.observe(document.body, { childList: true, subtree: true });
                observerStarted = true;
            }
        };
    } else {
        startDOMObserver = function () { }; // No-op for environments without MutationObserver
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

        obj.$observe = function (prop, fn) {
            const key = prop || '*';
            if (!obj[OBS].has(key)) obj[OBS].set(key, new Set());
            obj[OBS].get(key).add(fn);
            return () => obj[OBS].get(key).delete(fn);
        };

        obj.$set = function (prop, value) {
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
        if (!path || path === '') return scope;
        
        // Handle edge cases: remove empty segments and trailing dots
        const keys = path.split('.').filter(k => k !== '');
        if (keys.length === 0) return scope;
        
        return keys.reduce((acc, k) => {
            // Handle null/undefined gracefully
            if (acc === null || acc === undefined) return undefined;
            return acc[k];
        }, scope);
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
        reactive(el, scope, targetPath, (v) => batchUpdate(() => {
            el.textContent = v ?? '';
        }));
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
    // html:content (UNSAFE - raw HTML, use html-safe: for user content)
    addBinder('html', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (v) => batchUpdate(() => {
            el.innerHTML = v ?? '';
        }));
    });

    // html-safe:content (SAFE - sanitized HTML, recommended for user content)
    addBinder('html-safe', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (v) => batchUpdate(() => {
            el.innerHTML = sanitizeHTML(v);
        }));
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
        reactive(el, scope, arg, (value) => batchUpdate(() => {
            el.style.display = truthy(value) ? '' : 'none';
        }));
    });
    addBinder('hide', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (value) => batchUpdate(() => {
            el.style.display = truthy(value) ? 'none' : '';
        }));
    });

    // attr:title:prop OR attr:data-id:order.id
    addBinder('attr', ({ el, scope, arg }) => {
        const [attrName, path] = arg.split(':');
        const parent = resolvePath(scope, path.split('.').slice(0, -1).join('.')) || scope;
        const key = path.split('.').pop();
        const apply = v => el.setAttribute(attrName, v ?? '');
        apply(resolvePath(scope, path));
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
    });

    // class:active:isActive
    addBinder('class', ({ el, scope, arg }) => {
        const [cls, path] = arg.split(':');
        const parent = resolvePath(scope, path.split('.').slice(0, -1).join('.')) || scope;
        const key = path.split('.').pop();
        const apply = () => el.classList.toggle(cls, !!resolvePath(scope, path));
        apply();
        if (parent && parent.$observe) {
            const unsubscribe = parent.$observe(key, apply);
            registerObserver(el, unsubscribe);
        }
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
        reactive(el, scope, arg, (v) => batchUpdate(() => {
            el.src = v || '';
            // Handle broken images gracefully
            if (v && !el.onerror) {
                el.onerror = () => {
                    el.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0xMiA2VjE4TTYgMTJIMTgiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9zdmc+'; // Simple placeholder
                };
            }
        }));
    });

    // style:property:value OR style:backgroundColor:user.color
    addBinder('style', ({ el, scope, arg }) => {
        const parts = arg.split(':');
        if (parts.length !== 2) {
            console.warn('style binder requires format: property:valuePath');
            return;
        }
        const [styleProperty, valuePath] = parts;

        reactive(el, scope, valuePath, (v) => batchUpdate(() => {
            el.style[styleProperty] = v || '';
        }));
    });

    // fade:loading (opacity transition for loading states)
    addBinder('fade', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (v) => batchUpdate(() => {
            el.style.opacity = v ? '1' : '0';
            el.style.transition = 'opacity 0.3s ease';
        }));
    });

    // fadein:!loading (show with fade when condition is true)
    addBinder('fadein', ({ el, scope, arg }) => {
        // Handle negated expressions like "!loading"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;

        reactive(el, scope, cleanArg, (value) => batchUpdate(() => {
            const shouldShow = isNegated ? !value : !!value;
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = shouldShow ? '1' : '0';
            el.style.pointerEvents = shouldShow ? 'auto' : 'none';
        }));
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
        reactive(el, scope, arg, (value) => batchUpdate(() => {
            el.disabled = !!value;
        }));
    });

    addBinder('enable', ({ el, scope, arg }) => {
        // Handle negated expressions like "!isProcessing"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;

        reactive(el, scope, cleanArg, (value) => batchUpdate(() => {
            el.disabled = isNegated ? !!value : !value;
        }));
    });

    // valid:isEmailValid / invalid:!isEmailValid (Bootstrap validation)
    addBinder('valid', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (isValid) => batchUpdate(() => {
            el.classList.toggle('is-valid', !!isValid);
            el.classList.toggle('is-invalid', !isValid);
        }));
    });

    addBinder('invalid', ({ el, scope, arg }) => {
        // Handle negated expressions like "!isEmailValid"
        const isNegated = arg.startsWith('!');
        const cleanArg = isNegated ? arg.slice(1) : arg;

        reactive(el, scope, cleanArg, (value) => batchUpdate(() => {
            const isInvalid = isNegated ? !value : !!value;
            el.classList.toggle('is-invalid', isInvalid);
            el.classList.toggle('is-valid', !isInvalid);
            el.style.display = isInvalid ? 'block' : 'none';
        }));
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
        reactive(el, scope, arg, (v) => {
            const date = v instanceof Date ? v : new Date(v);
            el.textContent = isNaN(date) ? '' : _dateFormats.date.format(date);
        });
    });

    // datetime:lastLogin (smart relative/absolute formatting)
    addBinder('datetime', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (v) => {
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
        });
    });

    // timeago:updatedAt ("2 minutes ago")
    addBinder('timeago', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (v) => {
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
        });
    });

    // Bootstrap component binders
    // alert:message (show/hide alert messages)
    addBinder('alert', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (message) => batchUpdate(() => {
            if (message) {
                el.textContent = message;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        }));
    });

    // badge:status (auto-colored badges)
    addBinder('badge', ({ el, scope, arg }) => {
        const colorMap = {
            success: 'bg-success', active: 'bg-success', completed: 'bg-success',
            warning: 'bg-warning', pending: 'bg-warning',
            danger: 'bg-danger', error: 'bg-danger', failed: 'bg-danger',
            info: 'bg-info', processing: 'bg-info',
            secondary: 'bg-secondary', inactive: 'bg-secondary'
        };
        reactive(el, scope, arg, (value) => batchUpdate(() => {
            el.textContent = value || '';
            // Remove existing bg-* classes
            el.className = el.className.replace(/bg-\w+/g, '');
            // Add appropriate color class
            const colorClass = colorMap[String(value).toLowerCase()] || 'bg-secondary';
            el.classList.add(colorClass);
        }));
    });

    // progress:uploadPercent (Bootstrap progress bars)
    addBinder('progress', ({ el, scope, arg }) => {
        reactive(el, scope, arg, (percent) => batchUpdate(() => {
            const clampedPercent = Math.max(0, Math.min(100, Number(percent) || 0));

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
        }));
    });

    // checkbox:isChecked (two-way binding for checkboxes)
    addBinder('checkbox', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();

        // Use reactive helper for initial setup and observer
        reactive(el, scope, arg, (v) => {
            el.checked = !!v;
        });

        // Two-way binding on change
        el.addEventListener('change', () => {
            if (parent.$set) parent.$set(key, el.checked);
            else parent[key] = el.checked;
        });
    });

    // radio:selectedValue (radio group binding)
    addBinder('radio', ({ el, scope, arg }) => {
        const parent = resolvePath(scope, arg.split('.').slice(0, -1).join('.')) || scope;
        const key = arg.split('.').pop();

        // Use reactive helper for initial setup and observer
        reactive(el, scope, arg, (v) => {
            el.checked = (el.value === v);
        });

        // Two-way binding on change
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
        addBinders(binderObj) {
            Object.keys(binderObj).forEach(name => {
                addBinder(name, binderObj[name]);
            });
            return this; // For chaining
        },
        reactive, // Expose reactive helper for external use
        sanitizeHTML, // Expose HTML sanitizer for manual use

        // ─────────────────────────────────────────────────────────────────────────────
        // Batch Registration Examples
        // ─────────────────────────────────────────────────────────────────────────────

        // Bootstrap Components (Class-only versions)
        registerBootstrapBinders() {
            return this.addBinders({
                'alert-class': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        // Remove existing alert-* classes
                        el.className = el.className.replace(/alert-\w+/g, '').trim();
                        // Add new alert class
                        const alertClass = v ? `alert-${v}` : 'alert-primary';
                        el.classList.add(alertClass);
                    }));
                },
                'badge-class': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        // Remove existing bg-* classes
                        el.className = el.className.replace(/bg-\w+/g, '').trim();
                        // Add new bg class
                        const badgeClass = v ? `bg-${v}` : 'bg-primary';
                        el.classList.add(badgeClass);
                    }));
                },
                'progress': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        const percent = Math.max(0, Math.min(100, v || 0));
                        const progressBar = el.querySelector('.progress-bar') || (() => {
                            const bar = document.createElement('div');
                            bar.className = 'progress-bar';
                            el.appendChild(bar);
                            return bar;
                        })();
                        progressBar.style.width = `${percent}%`;
                        progressBar.setAttribute('aria-valuenow', percent);
                    }));
                }
            });
        },

        // Form Controls
        registerFormBinders() {
            return this.addBinders({
                'checkbox': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        el.checked = !!v;
                    }));
                    el.addEventListener('change', () => {
                        const keys = arg.split('.');
                        const lastKey = keys.pop();
                        const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
                        if (parent && parent.$set) {
                            parent.$set(lastKey, el.checked);
                        }
                    });
                },
                'radio': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        el.checked = el.value === v;
                    }));
                    el.addEventListener('change', () => {
                        if (el.checked) {
                            const keys = arg.split('.');
                            const lastKey = keys.pop();
                            const parent = keys.length ? resolvePath(scope, keys.join('.')) : scope;
                            if (parent && parent.$set) {
                                parent.$set(lastKey, el.value);
                            }
                        }
                    });
                },
                'enable': ({ el, scope, arg }) => {
                    const isNegated = arg.startsWith('!');
                    const path = isNegated ? arg.slice(1) : arg;
                    reactive(el, scope, path, (v) => batchUpdate(() => {
                        const shouldEnable = isNegated ? !v : v;
                        el.disabled = !shouldEnable;
                    }));
                },
                'disable': ({ el, scope, arg }) => {
                    const isNegated = arg.startsWith('!');
                    const path = isNegated ? arg.slice(1) : arg;
                    reactive(el, scope, path, (v) => batchUpdate(() => {
                        const shouldDisable = isNegated ? !v : v;
                        el.disabled = shouldDisable;
                    }));
                },
                'valid': ({ el, scope, arg }) => {
                    const isNegated = arg.startsWith('!');
                    const path = isNegated ? arg.slice(1) : arg;
                    reactive(el, scope, path, (v) => batchUpdate(() => {
                        const isValid = isNegated ? !v : v;
                        el.classList.toggle('is-valid', isValid);
                        el.classList.toggle('is-invalid', !isValid);
                    }));
                },
                'invalid': ({ el, scope, arg }) => {
                    const isNegated = arg.startsWith('!');
                    const path = isNegated ? arg.slice(1) : arg;
                    reactive(el, scope, path, (v) => batchUpdate(() => {
                        const isInvalid = isNegated ? !v : v;
                        el.classList.toggle('is-invalid', isInvalid);
                        el.classList.toggle('is-valid', !isInvalid);
                    }));
                }
            });
        },

        // Visual Effects
        registerEffectBinders() {
            return this.addBinders({
                'fade': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        el.style.opacity = v ? '1' : '0';
                        el.style.transition = 'opacity 0.3s ease';
                    }));
                },
                'fadein': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        if (v) {
                            el.style.opacity = '0';
                            el.style.display = '';
                            requestAnimationFrame(() => {
                                el.style.opacity = '1';
                                el.style.transition = 'opacity 0.3s ease';
                            });
                        } else {
                            el.style.opacity = '0';
                            el.style.transition = 'opacity 0.3s ease';
                            setTimeout(() => { el.style.display = 'none'; }, 300);
                        }
                    }));
                },
                'show': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        el.style.display = v ? '' : 'none';
                    }));
                },
                'hide': ({ el, scope, arg }) => {
                    reactive(el, scope, arg, (v) => batchUpdate(() => {
                        el.style.display = v ? 'none' : '';
                    }));
                }
            });
        },

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
        
        unbind(root) {
            const host = typeof root === 'string' ? document.querySelector(root) : root;
            if (!host) throw new Error('px64.unbind: root not found');
            
            // Clean up all observers for this element and its children
            cleanupElement(host);
            
            // Remove scope ID and tap delegation
            host.removeAttribute('data-scope-id');
            
            // Remove all data-bind attributes to prevent re-binding
            const elements = [host, ...host.querySelectorAll('[data-bind]')];
            elements.forEach(el => {
                el.removeAttribute('data-bind');
                el.removeAttribute('data-tap');
            });
            
            return true;
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
