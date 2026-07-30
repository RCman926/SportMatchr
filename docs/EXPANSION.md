# City expansion (Montreal & Toronto)

Ottawa is the **prove-it** city. Montreal and Toronto are the **prize** — expand after unaided meetups exist in Ottawa.

## Gate (must be true)

- [ ] Recurring meetups across multiple activities without founder babysitting chat  
- [ ] Return visits happening  
- [ ] Free-place + host playbook copyable ([SEED_PLAYBOOK.md](./SEED_PLAYBOOK.md))  

## Draft data (inactive)

- [`constants/cities.ts`](../constants/cities.ts) — only `ottawa` is `active: true`  
- [`constants/cities/montrealPlaces.ts`](../constants/cities/montrealPlaces.ts) — draft free pins  
- [`constants/cities/torontoPlaces.ts`](../constants/cities/torontoPlaces.ts) — draft free pins  

Do **not** show a Canada-wide city picker that lists MTL/TO with empty Online/Looking/Games.

## When activating a city

1. Mark city `active: true` in `cities.ts`  
2. Merge draft places into the live places source (or city-scoped loader)  
3. Recruit multi-activity hosts in 1–2 neighbourhood pockets  
4. Same success tests as Ottawa  
