# px64 — Lightweight DOM Binding & Scope Engine

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![No Dependencies](https://img.shields.io/badge/Dependencies-0-green.svg)]()
[![Size](https://img.shields.io/badge/Size-~12kb-blue.svg)]()

Tiny, dependency-free binding for real-world UIs.
Bind plain JavaScript objects ("scopes") to your HTML with `data-bind` attributes. When your data changes, the DOM updates; when users type/click, your data updates. Reactive without the ceremony.

**Key Features:**
- 📦 **Size**: Small footprint, no dependencies
- 🎨 **Style**: Readable, minimal, pragmatic
- 📄 **License**: MIT
- 🚀 **Works**: Drop into any project, no build step needed

## 🚀 Demo Examples

| Example | Description | File |
|---------|-------------|------|
| **Hello World** | Dead simple binding demo | [`helloworld.html`](helloworld.html) |
| **Todo List** | List rendering, two-way input | [`todo.html`](todo.html) |
| **Quick Wins Demo** | Production-ready binders showcase | [`quickwins-demo.html`](quickwins-demo.html) |

> 💡 **Quick Start**: Open these files directly in your browser after placing `px64.js` in your project root.

## 📚 Table of Contents

- [Why px64?](#why-px64)
- [Quick Start](#quick-start)
- [Hello World Example](#hello-world-example)
- [Todo List Example](#todo-list-example)
- [Core API](#core-api)
  - [px64.bind(root, scope)](#px64bindroot-scope)
  - [px64.unbind(root)](#px64unbindroot)
  - [px64.observable(obj)](#px64observableobj)
  - [px64.listState(items)](#px64liststateitems)
  - [px64.addBinder(name, fn)](#px64addbindername-fn)
  - [px64.addBinders(binderObj)](#px64addbindersbinderobj)
  - [Batch Registration Helpers](#batch-registration-helpers)
- [Built-in Binders](#built-in-binders)
- [Patterns & Tips](#patterns--tips)
- [Performance Notes](#performance-notes)
- [Integration](#integration)
  - [Module Formats (UMD)](#module-formats-umd)
  - [With Build Tools](#with-build-tools)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## ❓ Why px64?

✅ **Plain JS first**: bind POJOs to DOM, no virtual-DOM, no compiler.

✅ **Predictable**: one-way (render) + selective two-way (`value:`) + delegated events (`tap:`).

✅ **Composable**: drop-in custom binders (`px64.addBinder`) for your project's needs.

✅ **Grab-and-go**: works in a `<script>` tag or in Node/CommonJS/AMD.

## ⚡ Quick Start

### Installation

Copy `px64.js` into your project (root or `public/`) and include:

```html
<script src="./px64.js"></script>
```

px64 exposes a global `px64`. It also supports CommonJS/AMD if you use bundlers.

## 📁 Project Structure

```
px64/
├── px64.js              # Main library file
├── helloworld.html      # Hello World demo
├── todo.html           # Todo List demo
├── index.html          # Project homepage/documentation
├── README.md           # This file
└── PX64_PRODUCTION_IMPROVEMENTS.md  # Development notes
```

## 👋 Hello World Example

> 📄 See [`helloworld.html`](helloworld.html) for the complete file.

**HTML:**
```html
<div id="app">
  <h1 data-bind="text:title"></h1>
  <input data-bind="value:name" placeholder="Your name" />
  <button data-bind="tap:greet">Greet</button>
  <p data-bind="text:greeting"></p>
</div>
```

**JavaScript:**
```html
<script src="./px64.js"></script>
<script>
  const state = {
    title: "px64 • Hello",
    name: "",
    greeting: "",
    greet() {
      const who = (this.name || "").trim() || "world";
      this.$set("greeting", `Hello, ${who}!`);
    }
  };

  px64.bind("#app", state);
</script>
```

## ✅ Todo List Example

> 📄 See [`todo.html`](todo.html) for the complete file (with Bootstrap 5 styling).

**HTML:**
```html
<div id="todos">
  <form onsubmit="event.preventDefault(); app.addTodo();">
    <input data-bind="value:newTodo" placeholder="New todo" />
    <button>Add</button>
  </form>

  <ul data-bind="list:todos">
    <template>
      <li>
        <input type="checkbox" data-bind="attr:checked:done" />
        <span data-bind="text:text"></span>
      </li>
    </template>
  </ul>
</div>
```

**JavaScript:**
```html
<script src="./px64.js"></script>
<script>
  const state = {
    newTodo: "",
    todos: px64.listState([
      { text: "Ship px64", done: true },
      { text: "Write README", done: false }
    ]),
    addTodo() {
      const t = (this.newTodo || "").trim();
      if (!t) return;
      const items = this.todos.items.slice();
      items.unshift({ text: t, done: false });
      this.todos.setItems(items);
      this.$set("newTodo", "");
    }
  };

  const app = px64.bind("#todos", state);
  window.app = app; // optional for console access
</script>
```

## 🔧 Core API

### `px64.bind(root, scope)`

Bind a DOM subtree to a reactive scope.

**Parameters:**
- `root`: CSS selector or DOM element
- `scope`: plain object; it will be wrapped (shallowly) by `px64.observable`

**Returns:** the observable scope

The bound root receives a private `data-scope-id` attribute so delegated events can find the right scope.

### `px64.unbind(root)`

Clean up and remove all bindings from a DOM subtree. Essential for SPAs and dynamic content.

**Parameters:**
- `root`: CSS selector or DOM element to unbind

**Returns:** `true` if successful

**What it does:**
- Removes all observers and event listeners (prevents memory leaks)
- Removes `data-bind` and `data-tap` attributes
- Removes `data-scope-id` attribute
- Calls `cleanupElement()` recursively on all children

**Example:**
```javascript
// Bind dynamic content
const scope = px64.bind('#dynamic-widget', { data: 'test' });

// Later, clean up when removing content
px64.unbind('#dynamic-widget');
// All observers cleaned up, no memory leaks
```

**Use Cases:**
- **SPA route changes** - Clean up old page bindings
- **Dynamic widgets** - Remove components safely
- **Modal/popup cleanup** - Prevent observer accumulation
- **Long-running apps** - Essential for memory management

### `px64.observable(obj)`

Wrap a plain object with change notifications.

**Adds:**
- `obj.$set(key, value)`: update and notify
- `obj.$observe(prop, fn)` / `obj.$observe('*', fn)`: subscribe; returns an unsubscribe function

**Notes:**
Wrapping is shallow: nested objects are wrapped once at creation. Assigning new nested objects? Either call `px64.observable(newObj)` yourself or reassign and rely on top-level observers.

### `px64.listState(items)`

Convenience wrapper for arrays with paging/sorting baked in.

**State fields:**
`items`, `page`, `pageSize`, `sortKey`, `sortDir`, `total`, `loading`

**Helpers:**
`setItems(arr)`, `sorted()`, `paged()`, `nextPage()`, `prevPage()`, `sortBy(key, dir)`

Use with `data-bind="list:myList"` or `data-bind="table:myList"`.

### `px64.addBinder(name, fn)`

Register a custom binder.

**Example:**
```javascript
px64.addBinder("upper", ({ el, scope, arg }) => {
  const parent = arg.split('.').slice(0, -1).join('.');
  const key = arg.split('.').pop();
  const src = parent ? parent.split('.').reduce((a,k)=>a&&a[k], scope) : scope;
  const apply = v => el.textContent = (v || '').toUpperCase();
  apply(src[key]);
  src.$observe && src.$observe(key, apply);
});
```

**HTML:**
```html
<span data-bind="upper:user.name"></span>
```

### `px64.addBinders(binderObj)`

Register multiple binders at once using an object. Returns `px64` for chaining.

**Example:**
```javascript
px64.addBinders({
  'upper': ({ el, scope, arg }) => {
    // Implementation here
  },
  'lower': ({ el, scope, arg }) => {
    // Implementation here
  },
  'capitalize': ({ el, scope, arg }) => {
    // Implementation here
  }
});
```

### Batch Registration Helpers

px64 includes pre-built batch registration methods for common binder groups:

**Bootstrap Components:**
```javascript
px64.registerBootstrapBinders();
// Registers: alert:, badge:, progress:
```

**Form Controls:**
```javascript
px64.registerFormBinders();
// Registers: checkbox:, radio:, enable:, disable:, valid:, invalid:
```

**Visual Effects:**
```javascript
px64.registerEffectBinders();
// Registers: fade:, fadein:, show:, hide:
```

**Usage:**
```javascript
// Register all at once
px64.registerBootstrapBinders()
     .registerFormBinders()
     .registerEffectBinders();
```

Binder signature receives `{ el, scope, arg, stack }`.

## 🎯 Built-in Binders

| Binder | Purpose |
|--------|---------|
| `text:prop` | Set `textContent` from scope. Also supports shorthand: `data-bind="title"` ⇒ `text:title`. |
| `html:prop` | Set `innerHTML` from scope. |
| `value:prop` | Two-way binding for inputs (`input` event). |
| `show:expr` | Toggle visibility (`display: none`) based on truthy value. |
| `hide:expr` | Inverse of `show`. |
| `attr:name:path` | Set attribute: `attr:title:user.fullName`, `attr:data-id:item.id`, `attr:checked:todo.done`. |
| `class:className:expr` | Toggle class based on truthy expression. |
| `tap:methodPath` | Delegated click handler; calls function on scope (e.g., `tap:logout`, `tap:user.remove`). |
| `view:subscopePath` | Starts a nested scope for the element's children. |
| `list:statePath` | Render a list from `listState()` or plain `{ items: [...] }`. Uses `<template>` or first child. |
| `table:statePath` | Render a table using `data-meta="cols:...;sort:..."`. |
| `money:prop` | Format a number with 2 decimals using locale `toLocaleString`. |
| **Loading States** | |
| `fade:loading` | Fade element opacity when condition is true (loading states). |
| `fadein:!loading` | Show element with fade when condition is true. |
| `loading:isSubmitting` | Bootstrap spinner integration - disables button and shows/hides spinner. |
| **Form Controls** | |
| `disable:loading` | Disable form elements when condition is true. |
| `enable:!loading` | Enable form elements when condition is true. |
| `valid:isEmailValid` | Add Bootstrap validation classes (`is-valid`/`is-invalid`). |
| `invalid:!isEmailValid` | Show/hide invalid feedback with Bootstrap styling. |
| **Date Formatting** | |
| `date:createdAt` | Format date as "Dec 15, 2024". |
| `datetime:lastLogin` | Smart relative/absolute formatting ("2 hours ago", "Yesterday 3:45 PM"). |
| `timeago:updatedAt` | Relative time formatting ("2 minutes ago"). |
| **Bootstrap Components** | |
| `alert:errorMessage` | Show/hide Bootstrap alerts with dynamic content. |
| `badge:status` | Auto-colored badges based on status (success→green, warning→yellow, etc.). |
| `progress:uploadPercent` | Bootstrap progress bars with percentage display. |
| **Form Controls (Advanced)** | | |
| `checkbox:isChecked` | Two-way binding for checkboxes. |
| `radio:selectedValue` | Radio group binding. |
| `tab:activeTab` | Tab navigation with content switching. |

### List Template Resolution

1. If element contains a `<template>`, its first child is used per item
2. Else the element's first child is cloned
3. Else it falls back to `<div data-bind="text:name"></div>`

## 💡 Patterns & Tips

- **Shallow reactivity**: To make newly assigned nested objects reactive, wrap them: `obj.user = px64.observable(obj.user)`

- **Computed display**: Prefer simple formatting binders (e.g., `money`) or inline computed props on the scope (`get full(){...}` is fine; call `$set` on dependencies to trigger updates)

- **Event handlers**: Methods run with `this === scope`. You can attach small helpers onto scope directly

- **Avoid over-binding**: Bind once to the nearest meaningful container; use `view:` to introduce sub-scopes

## ⚡ Performance Notes

- Binding walks the DOM once; subsequent updates are targeted by property observers

- `list` and `table` re-render their container when the list state changes. For very large lists, use paging (`pageSize`) and incremental rendering (`paged()`), or add your own virtualized binder

- Avoid heavy work inside `$observe('*', ...)` — prefer specific keys

## 🔗 Integration

### Module Formats (UMD)

`px64.js` works as:

**Browser global:**
```javascript
window.px64
```

**CommonJS (Node/bundlers):**
```javascript
const px64 = require('./px64');
```

**AMD:**
```javascript
define(['px64'], px64 => { /* ... */ });
```

> We export in-file at the bottom: CommonJS + AMD + `window.px64`.

### With Build Tools

You can import the file directly into your bundler. No special plugins needed. The library has no runtime dependencies.

## 🔧 Troubleshooting

### Nothing updates when I change a value

- Ensure your scope is observable (`px64.bind` wraps it automatically)
- If updating nested objects wholesale, make the new object observable or call `$set` on parent keys

### `tap:` doesn't fire

- Ensure the element is within the bound root and the method exists on the bound scope
- `tap:` uses delegated click on the root

### `list` shows nothing

- If you passed a plain object, it must have an `items` array (`{ items: [...] }`)
- Prefer `px64.listState(...)`

### Binding conflicts

- If you use `view:` to scope a region, remember it applies to the element's children, not the element itself

## 🤝 Contributing

Issues and PRs welcome!

**Guidelines:**
- Keep core minimal; prefer adding features as optional binders
- Add tests for new binders and edge cases
- Use clear, small commits and descriptive PR titles

### Dev Hints

**Custom binder checklist:**
1. Resolve scope value(s)
2. Initial apply
3. Hook into `$observe` for specific keys
4. Cleanly handle `null`/`undefined`

## 🗺️ Roadmap

- [ ] Optional unbind/dispose API for long-lived apps
- [ ] Async binder helpers (loading states, errors)
- [ ] Router binder (`route:`) for simple SPA demos
- [ ] Docs site with cookbook patterns

## 📄 License

**MIT** © You and contributors. Use, modify, and distribute freely.

## 📋 Appendix: Binder Cheat Sheet

```html
<!-- text -->
<h1 data-bind="text:title"></h1>
<!-- shorthand -->
<h1 data-bind="title"></h1>

<!-- two-way value -->
<input data-bind="value:user.name">

<!-- show/hide -->
<div data-bind="show:user.loggedIn">Welcome!</div>

<!-- attribute -->
<a data-bind="attr:href:user.profileUrl">Profile</a>

<!-- class toggle -->
<div data-bind="class:active:user.isActive"></div>

<!-- click/tap -->
<button data-bind="tap:doSomething">Run</button>

<!-- view (nested scope) -->
<section data-bind="view:details">
  <span data-bind="text:name"></span>
</section>

<!-- list -->
<ul data-bind="list:people">
  <template>
    <li><span data-bind="text:name"></span></li>
  </template>
</ul>

<!-- table -->
<table data-bind="table:orders" data-meta="cols:id,created,total;sort:created"></table>

<!-- money -->
<span data-bind="money:invoice.total"></span>
```

---

**Made with ❤️ by INC64 LLC**
