# Written Section — Technical Notes

### a) API Endpoints

#### 1. Get Order Details
- **Method & Path**: `GET /api/v1/orders/:orderId`
- **Response (`200 OK`)**:
```json
{
  "order_id": "ORD-10482",
  "status": "completed",
  "currency": "MYR",
  "delivery_fee": 5.0,
  "delivery_fee_status": "paid",
  "version": 1,
  "items": [
    {
      "line_id": "L1",
      "name": "Iced Spanish Latte",
      "unit_price": 13.9,
      "units": [
        {
          "unit_id": "L1-2",
          "status": "paid",
          "addons": [
            { "addon_id": "A1", "name": "Extra Shot", "unit_price": 2.0, "status": "paid" }
          ]
        }
      ]
    }
  ]
}
```

#### 2. Submit Refund
- **Method & Path**: `POST /api/v1/orders/:orderId/refunds`
- **Headers**:
  - `Idempotency-Key: <uuid-v4>` (prevents duplicate refunds on retries)
- **Request Body**:
```json
{
  "order_id": "ORD-10482",
  "order_version": 1,
  "unit_ids": ["L1-2"],
  "addon_refs": [{ "unit_id": "L1-2", "addon_id": "A1" }],
  "refund_delivery_fee": false,
  "expected_amount_minor": 1590,
  "currency": "MYR",
  "reason": "QUALITY_ISSUE",
  "reason_note": "Drink spilled in bag",
  "channel": "in_app_credit"
}
```
- **Response (`201 Created` or `200 OK` if deduplicated)**:
```json
{
  "refund_id": "RFD-1001",
  "idempotency_key": "8f14e45f-...",
  "deduplicated": false,
  "amount_minor": 1590,
  "currency": "MYR",
  "created_at": "2026-11-19T14:40:00.000Z",
  "order": { "...updated order object..." }
}
```
- **Error Responses**:
  - `400 Bad Request`: Empty selection or add-on selected without its paid parent drink.
  - `409 Conflict`: Stale `order_version` or an item was already refunded by another staff member.
  - `422 Unprocessable Entity`: `expected_amount_minor` does not match server-calculated refund total.
  - `500` / `504`: Transient gateway or timeout error (safe to retry with the same `Idempotency-Key`).

---

### b) Refund Calculation

Both sides have a clear role:
- **Frontend calculates live for UX**: As staff check and uncheck units in Step 1, the frontend sums prices using integer minor units (e.g. `13.90 -> 1390` sen) so there is no network lag and no JavaScript floating-point rounding drift.
- **Backend is the source of truth**: On submit, the client sends the selected `unit_ids`, `addon_refs`, `refund_delivery_fee`, and `expected_amount_minor`. The backend ignores client prices, recalculates from stored order records, and compares its total against `expected_amount_minor`.
- **Preventing mismatches**: If the two numbers ever differ (for example due to promo discounts, tax rules, or a concurrent update), the backend rejects the request with `422` instead of charging a different amount than what staff saw. The client then refreshes the order so staff see the updated numbers before confirming again.

---

### c) Assumptions, Questions & Comments for PM / Designer

- **Unit `L2-2` has a refunded drink with still-paid add-ons**: In the sample data, `L2-2` has `status: "refunded"`, while its add-ons (`Oat Milk`, `Brown Sugar Syrup`) are still `paid`. I assumed staff should be allowed to select and refund those remaining paid add-ons since the main drink is already refunded. Worth confirming with PM whether this state happens in production and whether refunding a drink should normally auto-include all its add-ons.
- **Paid drink + add-on coupling**: Checking a paid drink auto-selects its paid add-ons (staff can still uncheck individual add-ons if needed), checking an add-on auto-selects its paid parent drink, and unchecking the parent drink clears its add-ons.
- **Definition of "Full refund" with delivery fee**: Step 1 treats delivery fee as optional. When all remaining items are selected without the delivery fee, the UI labels it "Full item refund". Should "Select all" also include delivery fee, or keep delivery fee opt-in?
- **"Other" reason note**: Added an optional free-text note (250 char limit) when `Other` is selected. Should this note be mandatory for audit purposes?
- **Discounts, vouchers & tax**: The sample order has flat unit prices with no promos, bundles, or SST/VAT. Real orders with percentage vouchers or order-level discounts will need proration rules from backend before frontend can preview exact totals.
- **Currency & multi-country support**: Formatting uses `Intl.NumberFormat` with `order.currency` and handles 0-decimal currencies like `IDR` alongside 2-decimal currencies (`MYR`, `SGD`, `PHP`).
- **Role limits / approval thresholds**: No approval threshold or refund time window was specified; in production, larger refunds or original-payment-method refunds often require supervisor permission.

---

### d) Key Decisions & Trade-Offs

- **Radix UI + Tailwind CSS + Zustand architecture**: Split state cleanly into `useOrderStore` (fetched order snapshot, refund activity) and `useRefundStore` (modal step machine, normalized selection maps, form values, idempotency key). Using composite keys (`${unitId}::${addonId}`) avoids collisions because `addon_id` values repeat across units (`A1` on `L1-1` and `L1-2`).
- **Duplicate refund protection**: Layered five guards — a synchronous `useRef` lock against double-clicks, modal/button locking during `submitting`, a per-intent `Idempotency-Key` preserved across retries and rotated on payload edits, optimistic concurrency via `order_version`, and server-side idempotency caching in the mock API.
- **Performance**: Memoized per-unit and per-add-on rows (`React.memo`) with granular Zustand selectors so toggling one checkbox does not re-render the rest of the list. The refund modal only mounts when opened so the Order Page stays lightweight.
- **In-memory mock API vs MSW**: Used a typed in-memory mock service module instead of a Service Worker mock. Trade-off: requests do not show up in the browser Network tab, but setup is simpler, works reliably in static deployments (GitHub Pages), and simulates realistic latency and occasional transient errors out of the box.

---

### e) Known Limitations & Next Steps

- **No persistence across page reload**: Mock order state resets on browser refresh (could be backed by `localStorage` or a real API).
- **No order-level discount or tax breakdown**: Currently sums flat item, add-on, and delivery prices; would integrate a backend quote endpoint (`POST /orders/:id/refund-preview`) once discounts/taxes are introduced.
- **Single-order view**: Built around `ORD-10482` per scope; next step would be wiring route params (`/orders/:orderId`) and plugging into the host back-office auth context so staff identity is attached to audit logs automatically.
- **Testing scope**: Unit and integration tests cover money math, selection/pairing rules, `L2-2` edge cases, consecutive refunds, and API idempotency/conflict guards. Next step would be adding E2E tests (Playwright) for real browser keyboard navigation and tablet viewports.
