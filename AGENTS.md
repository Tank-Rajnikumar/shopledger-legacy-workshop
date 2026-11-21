# Repository Guidelines

## Stack

ShopLedger is a Node.js point-of-sale application using Express 4 and
`body-parser`. It uses CommonJS and ES5-style JavaScript. There is no build
tool, bundler, linter, formatter, or third-party test framework. Persistent
application state is JSON in `data/db.json`.

## Module Map

- `server.js` configures Express, serves `public/`, and mounts API routes.
- `routes/` contains HTTP handlers for products, orders, customers, and
  reports under `/api`.
- `lib/` contains domain logic: orders, pricing, tax, coupons, inventory,
  ledger, invoices, reporting, dates, and the JSON store.
- `public/` contains the browser UI (`index.html`, `js/app.js`, and
  `css/style.css`).
- `config.js` holds runtime shop and business settings; `data/db.json` is the
  live data store.

## Commands

- `npm install` installs the declared runtime dependencies.
- `npm start` runs `node server.js` on the configured `PORT` (default 3000).
- `npm test` intentionally exits with an error; no test script is configured.
- `node --test path/to/file.test.js` runs a focused built-in Node test when a
  characterization test has been added.

## Change and Test Rules

Before changing behavior, write a characterization test that records the
current behavior. Keep tests isolated: they must never read from, write to, or
modify `data/db.json`; use temporary fixtures or stubs instead. Do not add
dependencies. Change only the module named by the ticket; do not make related
refactors or edits elsewhere.

## Style

Match the existing code: CommonJS `require`, `module.exports`, `var`, function
callbacks, two-space indentation, semicolons, and lowercase file names. Keep
HTTP concerns in `routes/` and business rules in `lib/` when that is the module
in scope.
