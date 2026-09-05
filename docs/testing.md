# Frontend testing

Once dependencies are installed, run `npm run test --workspace blacksmith_pro`. Unit coverage will focus first on booking-state transitions, error mapping, slot versioning, and mock scenarios. Browser checks must exercise successful booking, last-slot conflict, expired hold, unknown outcome resolution, and the reconciliation queue. The mock service contains deterministic variants for each of these conditions.
