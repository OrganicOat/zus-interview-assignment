# Order Refund Flow

Back-office web app for operations staff to view orders and issue partial or full refunds on desktop and tablet browsers.

| Reference            | Link                                                              |
| :------------------- | :---------------------------------------------------------------- |
| Live Demo            | _(add GitHub Pages / Vercel URL after deploying)_                 |
| Technical Notes      | [DOCS.md](./DOCS.md)                                              |

## 1. Application Summary

Staff open an order (`ORD-10482`) to view each item per unit, nested add-ons, delivery fee, and payment status (`Paid` / `Refunded`).

| Step                 | Behavior                                                          |
| :------------------- | :---------------------------------------------------------------- |
| 1. Select Items      | Pick units, add-ons, or all items; delivery fee is optional.      |
| 2. Review & Details  | Verify preview and total, pick a reason, and choose a channel.    |
| 3. Confirm & Submit  | Confirm in nested dialog; cancel keeps the refund modal open.     |

| Safeguard            | Implementation                                                    |
| :------------------- | :---------------------------------------------------------------- |
| Exact Money Math     | Integer minor-unit math prevents float drift across currencies.   |
| Duplicate Protection | Ref lock, UI lock, idempotency keys, and order version checks.    |
| Mock API             | Simulates network latency and transient failures with safe retry. |

## 2. Technology & Stack

| Category             | Stack                                                             |
| :------------------- | :---------------------------------------------------------------- |
| Framework            | React 19, TypeScript, Vite 8                                      |
| UI & Styling         | Radix UI, Tailwind CSS v4, Lucide Icons                           |
| State Management     | Zustand                                                           |
| Testing & Lint       | Vitest, React Testing Library, jsdom, oxlint                      |

## 3. Setup, Run & Test

```bash
npm install
npm run dev
```

| Command              | Description                                                       |
| :------------------- | :---------------------------------------------------------------- |
| `npm run dev`        | Start local development server (`http://localhost:5173`)          |
| `npm run test`       | Run all unit and integration tests (Vitest)                       |
| `npm run typecheck`  | Run TypeScript type checking                                      |
| `npm run lint`       | Run oxlint across the project                                     |
| `npm run build`      | Type-check and build the production bundle (`dist/`)              |
