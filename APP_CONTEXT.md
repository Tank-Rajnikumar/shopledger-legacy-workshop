# ShopLedger: application context and risk record

_Prepared from repository inspection. No dependencies were installed and the server was not started. The source tree was not changed during the inspection; this document was added afterwards at the request of the project team._

## I am sure

### Purpose

ShopLedger is a small internal point-of-sale application for **Corner Shop Kirana & Wholesale**. Staff can browse a fixed product catalogue, create cash, UPI, or customer-credit ("khata") orders, apply coupons, track inventory and customer balances, record settlements, print HTML GST invoices, and view dashboard/reconciliation reports.

It is a single Node/Express process with a static browser UI. Products, customers, orders, settlements, and audit records are all kept in `data/db.json`.

### Module map

| Area | Files | Responsibility |
|---|---|---|
| Startup / HTTP | `server.js`, `config.js` | Express app, static UI, route mounting, shop/tax/coupon configuration |
| Browser UI | `public/index.html`, `public/js/app.js`, `public/css/style.css` | POS, order register, khata, and audit/reconciliation screens |
| Products | `routes/products.js`, `lib/inventory.js`, `lib/tax.js` | Catalogue, HSN-based GST display, stock availability |
| Orders | `routes/orders.js`, `lib/orders.js`, `lib/pricing.js`, `lib/coupons.js` | Create/list/cancel orders and calculate discounts/GST |
| Customer credit | `routes/customers.js`, `lib/ledger.js` | Customer balances, credit-limit checks, and settlements |
| Reporting / invoices | `routes/reports.js`, `lib/reports.js`, `lib/invoice.js` | Dashboard, reconciliation, printable invoice |
| Persistence / dates | `lib/store.js`, `lib/dates.js` | Synchronous JSON persistence, audit entries, DD/MM/YYYY dates |

### Order placement flow

1. The browser sends `POST /api/orders` with item IDs/quantities, customer, payment mode, status, and coupon.
2. The server re-loads products from `db.json`; submitted names and prices are ignored.
3. It validates products, converts quantity to an integer, checks stock, validates the coupon, and calculates subtotal, discount, HSN GST, and total.
4. For `khata`, it requires a registered customer, checks the credit limit, and increases that customer’s billed amount/balance.
5. It deducts ordered units from `product.stock`.
6. It creates the order with `nextOrderId`, prepends an `ORDER_CREATED` audit entry, and synchronously rewrites the entire JSON database.
7. The UI refreshes product, dashboard, and customer data and presents an invoice link.

### Risks and out-of-date areas

- **Critical: no authentication or authorization.** Any service user can read customer data/orders, create orders, cancel orders, and record settlements.
- **Critical: complete database export uses a hard-coded source secret** (`shopledger-admin-2021`) sent in a query string: `GET /api/admin/export?key=...`. Query strings may be retained in logs, history, and referrer data.
- **Critical inventory cancellation defect:** creation deducts `product.stock`, but cancellation calls `inventory.release`, which deducts `product.reserved` rather than restoring stock. Cancelled units do not return to stock and unrelated reservations can be altered.
- **Critical settlement arithmetic defect:** the browser sends a settlement amount as a string; `ledger.recordSettlement` adds it to `totalSettled` without converting it to a number. This can concatenate numbers (for example, `1200 + "100"` becomes `"1200100"`) and corrupt balances.
- **Material tax/invoice inconsistency:** order pricing uses HSN GST slabs and applies a coupon before tax. Invoice rendering defaults most lines to 18% unless an order line has `gstRate`, and calculates percentage coupons after tax. The built-in reconciliation report detects this mismatch.
- **Duplicate-line inventory bypass:** stock is checked per line, then deducted for all lines. Multiple lines for one product can collectively exceed stock.
- **Stored XSS exposure:** the UI inserts multiple API-returned values into `innerHTML` without escaping, including customer/order/settlement fields. A malicious custom customer name or settlement note can execute script for staff who open the UI.
- **Data durability/concurrency risk:** every mutation reads and rewrites one JSON file; there is no locking, transaction, backup, or recovery mechanism. Concurrent writes can overwrite each other.
- **Date filtering and sorting are unreliable across months/years:** DD/MM/YYYY strings are compared lexically, not as dates.
- **No allowlist validates order status or payment mode.** API callers can persist arbitrary values; pending orders still deduct stock and count toward revenue/tax.
- **No automated tests are defined.** `npm test` intentionally fails.
- **The application is old:** latest commit inspected was 17 November 2021; code comments/data cluster in 2021–22. The manifest specifies Express 4 and standalone `body-parser`.
- **Dependency reproducibility is uncertain:** `package-lock.json` was untracked at inspection time, so it is not part of recorded repository history.
- **Encoding damage is present:** strings intended to show the rupee symbol appear as `â‚¹` in source/data output.

## I suspect

- The application was intended for a trusted shop LAN rather than public internet use; the absence of identity controls and hard-coded admin key support this interpretation.
- `reserved` stock probably represents external wholesale-quote holds, as indicated by code comments. The order flow does not create those reservations, so cancellation can corrupt a separate workflow.
- `db.json` likely contains demo or stale operational data: its newest displayed order/audit record is March 2022, while the latest commit is from 2021.
- The untracked `package-lock.json` may be a generated/local artifact rather than an intentional repository change. It was not modified during the inspection.
