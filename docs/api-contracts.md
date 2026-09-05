# Frontend API contracts

The mock transport in `blacksmith_pro/src/lib/api/mock-service.ts` mirrors the production booking boundary: availability is read-only and provisional; `createHold` accepts an idempotency key; `commitHold` is the only path to confirmation; `getBookingAttempt` resolves uncertain outcomes; alternatives return independently bookable slots.

Errors carry `{ code, message, retryable, bookingCreated, alternatives, correlationId }`. Patient copy never exposes infrastructure or concurrency terminology.
