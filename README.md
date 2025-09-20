px64 — Lightweight DOM Binding & Scope Engine

Tiny, dependency-free binding for real-world UIs.
Bind plain JavaScript objects (“scopes”) to your HTML with data-bind attributes. When your data changes, the DOM updates; when users type/click, your data updates. Reactive without the ceremony.

Size: small, no deps

Style: readable, minimal, pragmatic

License: MIT

Demo Examples

Hello World (dead simple): examples/hello.html

Todo List (list rendering, two-way input): examples/todo.html

Open those files directly in a browser (no build step needed) after placing px64.js in your project root.

Table of Contents

Why px64?

Quick Start

Hello World

Todo List

Core API

px64.bind(root, scope)

px64.observable(obj)

px64.listState(items)

px64.addBinder(name-fn)

Built-in Binders

Patterns & Tips

Performance Notes

Integration

Module Formats (UMD)

With Build Tools

Troubleshooting

Contributing

Roadmap

License

Why px64?

Plain JS first: bind POJOs to DOM, no virtual-DOM, no compiler.

Predictable: one-way (render) + selective two-way (value:) + delegated events (tap:).

Composable: drop-in custom binders (px64.addBinder) for your project’s needs.

Grab-and-go: works in a <script> tag or in Node/CommonJS/AMD.

Quick Start
Install

Copy px64.js into your project (root or public/) and include:

<script src="./px64.js"></script>


px64 exposes a global px64. It also supports CommonJS/AMD if you use bundlers.

Hello World

See examples/hello.html
 for the complete file.

<div id="app">
  <h1 data-bind="text:title"></h1>
  <input data-bind="value:name" placeholder="Your name" />
  <button data-bind="tap:greet">Greet</button>
  <p data-bind="text:greeting"></p>
</div>

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

Todo List

See examples/todo.html
 for the complete file (with Bootstrap 5 styling).

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

Core API
px64.bind(root, scope)

Bind a DOM subtree to a reactive scope.

root: CSS selector or DOM element.

scope: plain object; it will be wrapped (shallowly) by px64.observable.

Returns: the observable scope.

The bound root receives a private data-scope-id attribute so delegated events can find the right scope.

px64.observable(obj)

Wrap a plain object with change notifications.

Adds:

obj.$set(key, value): update and notify.

obj.$observe(prop, fn) / obj.$observe('*', fn): subscribe; returns an unsubscribe function.

Notes:

Wrapping is shallow: nested objects are wrapped once at creation. Assigning new nested objects? Either call px64.observable(newObj) yourself or reassign and rely on top-level observers.

px64.listState(items)

Convenience wrapper for arrays with paging/sorting baked in.

State fields:

items, page, pageSize, sortKey, sortDir, total, loading

Helpers:

setItems(arr), sorted(), paged(), nextPage(), prevPage(), sortBy(key, dir)

Use with data-bind="list:myList" or data-bind="table:myList".

px64.addBinder(name, fn)

Register a custom binder.

px64.addBinder("upper", ({ el, scope, arg }) => {
  const parent = arg.split('.').slice(0, -1).join('.');
  const key = arg.split('.').pop();
  const src = parent ? parent.split('.').reduce((a,k)=>a&&a[k], scope) : scope;
  const apply = v => el.textContent = (v || '').toUpperCase();
  apply(src[key]);
  src.$observe && src.$observe(key, apply);
});


HTML:

<span data-bind="upper:user.name"></span>


Binder signature receives { el, scope, arg, stack }.

Built-in Binders
Binder	Purpose
text:prop	Set textContent from scope. Also supports shorthand: data-bind="title" ⇒ text:title.
html:prop	Set innerHTML from scope.
value:prop	Two-way binding for inputs (input event).
show:expr	Toggle visibility (display: none) based on truthy value.
hide:expr	Inverse of show.
attr:name:path	Set attribute: attr:title:user.fullName, attr:data-id:item.id, attr:checked:todo.done.
class:className:expr	Toggle class based on truthy expression.
tap:methodPath	Delegated click handler; calls function on scope (e.g., tap:logout, tap:user.remove).
view:subscopePath	Starts a nested scope for the element’s children.
list:statePath	Render a list from listState() or plain { items: [...] }. Uses <template> or first child.
table:statePath	Render a table using data-meta="cols:...;sort:...".
money:prop	Format a number with 2 decimals using locale toLocaleString.

list template resolution

If element contains a <template>, its first child is used per item.

Else the element’s first child is cloned.

Else it falls back to <div data-bind="text:name"></div>.

Patterns & Tips

Shallow reactivity: To make newly assigned nested objects reactive, wrap them: obj.user = px64.observable(obj.user).

Computed display: Prefer simple formatting binders (e.g., money) or inline computed props on the scope (get full(){...} is fine; call $set on dependencies to trigger updates).

Event handlers: Methods run with this === scope. You can attach small helpers onto scope directly.

Avoid over-binding: Bind once to the nearest meaningful container; use view: to introduce sub-scopes.

Performance Notes

Binding walks the DOM once; subsequent updates are targeted by property observers.

list and table re-render their container when the list state changes. For very large lists, use paging (pageSize) and incremental rendering (paged()), or add your own virtualized binder.

Avoid heavy work inside $observe('*', ...)—prefer specific keys.

Integration
Module Formats (UMD)

px64.js works as:

Browser global: window.px64

CommonJS (Node/bundlers):

const px64 = require('./px64');


AMD:

define(['px64'], px64 => { /* ... */ });


(We export in-file at the bottom: CommonJS + AMD + window.px64.)

With Build Tools

You can import the file directly into your bundler. No special plugins needed. The library has no runtime dependencies.

Troubleshooting

Nothing updates when I change a value

Ensure your scope is observable (px64.bind wraps it automatically).

If updating nested objects wholesale, make the new object observable or call $set on parent keys.

tap: doesn’t fire

Ensure the element is within the bound root and the method exists on the bound scope. tap: uses delegated click on the root.

list shows nothing

If you passed a plain object, it must have an items array ({ items: [...] }). Prefer px64.listState(...).

Binding conflicts

If you use view: to scope a region, remember it applies to the element’s children, not the element itself.

Contributing

Issues and PRs welcome!

Keep core minimal; prefer adding features as optional binders.

Add tests for new binders and edge cases.

Use clear, small commits and descriptive PR titles.

Dev hints

Custom binder checklist:

Resolve scope value(s)

Initial apply

Hook into $observe for specific keys

Cleanly handle null/undefined

Roadmap

Optional unbind/dispose API for long-lived apps

Async binder helpers (loading states, errors)

Router binder (route:) for simple SPA demos

Docs site with cookbook patterns

License

MIT © You and contributors. Use, modify, and distribute freely.

Appendix: Binder Cheat Sheet
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