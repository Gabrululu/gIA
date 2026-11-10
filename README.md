# GIA — GPU Insurance Agent
**The GPU Hedge Layer on Injective.** Prototype (Injective **testnet only**, no mainnet, no key custody).

AI teams that *rent* GPUs lose when rental rates rise. GIA recommends a fully collateralized,
cash-settled **capped call** (call spread) on SICI, as a monthly ladder, and shows the worst case (the premium).
It never recommends puts to a renter.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain logic (SICI weights, pricing, basis risk, adapter)
```

## Flow
1. `/` — visual landing page
2. `/start` — monthly spend, chip mix, horizon (1/3/6 months), provider
3. `/recommendation` — strike/cap/expiry/premium/max payout, basis-risk badge, payoff + what-if, shareable URL (state lives in the query string)
4. `/execute` — "Hedge this budget" → **mocked** testnet adapter (every fill labelled SIMULATED, no tx hash)

## Layout
- `lib/sici.ts` — real SICI weights + **fixture** level (113 pts, from Injective's Options post; **not live**) + `fetchLiveSici()` hook (TODO)
- `lib/basis.ts` — basis-risk assessment vs SICI weights, single-chip stress table
- `lib/pricing.ts` — INDICATIVE Black-76 call-spread premium (assumed 45% vol, 10% LP loading). Not a quote.
- `lib/recommend.ts` — mapping spend → contracts (`spend / (0.01 × index)`), profiles, ladder legs
- `lib/adapter/` — `OptionsAdapter` interface, `MockTestnetAdapter` (default), `InjectiveTestnetOptionsAdapter` (stub + TODOs)
- `lib/rollover.ts` — AuthZ auto-roll design + stub (nothing signed)

## Known gaps (by design in v1)
- No public API docs found for the Oct-2026 Options primitive; the Injective docs index (2026-03-31) only covers the old Binary Options. Do not wire to those.
- Premium vol/loading are assumptions; replace with LP quotes from testnet.
- Options writing is whitelist-only at launch; simulate fills when no liquidity.
- Out of scope: new index, options exchange, writer/LP vault, mainnet, KYC.

Sources: injective.com/blog/injective-options, injective.com/blog/super-intelligence-compute-index, lo.tech/news/compute-now-has-a-reference-price, docs.injective.network (AuthZ, USDC, network info).


## Integración del prototipo

El código ejecutable está en la raíz: Next.js conserva el motor de cálculo, las rutas API,
los adaptadores y las pruebas de `gia`. La portada, la imagen y el sistema visual del
frontend se adaptaron a Next.js. No se necesitan cuentas ni servicios del constructor visual.
Los ZIP originales se eliminaron después de integrar ambos proyectos.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

La simulación hace POST a `/api/hedge`; el servidor recalcula la recomendación y devuelve
fills simulados. No conecta una wallet ni envía transacciones. El índice usa 113 puntos
de ejemplo y la integración real de Injective y el auto-roll siguen pendientes.


## Validación de la integración

- 20 pruebas de dominio y API pasan (`npm test`).
- ESLint y TypeScript pasan sin errores.
- Compilación de producción verificada con Webpack y Tailwind/PostCSS.
- Webpack se utiliza para evitar el puerto interno del procesador CSS de Turbopack
  en entornos restringidos.
- Las fuentes web usan Google Fonts con fuentes de sistema como alternativa.
