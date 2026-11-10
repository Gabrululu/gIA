# gIA — GPU Insurance Agent

**Plan for the changing cost of GPU compute. Built on Injective.**

gIA helps teams that rent GPUs understand how rising compute prices could affect
their budget and explore a hedge using SICI, a GPU rental price index.

Tell gIA your monthly spend, the GPUs you rent, and how long you want coverage.
The prototype shows an estimated cost, potential payouts, and how closely the
hedge matches your GPU mix. You can compare scenarios, share a recommendation,
and simulate the result.

## Current prototype

- Live SICI reference data from Injective testnet, with clearly labelled example
  data when the feed is unavailable.
- Coverage planning for one, three, or six months.
- Simulated execution with no wallet connection or transactions.

Premiums are estimates, not executable quotes. Real options trading and automatic
renewal are still pending. This prototype is not financial advice.

## Try it locally

```bash
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). No API keys are required for the
default setup.

For the technical design, configuration, and development checks, see
[architecture.md](architecture.md).
