# Testing in Webviz

## Installation

In order to run `e2e` or `component` tests, you might need to install the required browser executables for `Playwright`.

```bash
npx playwright install --with-deps
```

If this command does not work, try to install all dependencies manually:

```bash
sudo apt install libopenjp2-7 libflite1 gstreamer1.0-libav
```

## Unit tests

Unit tests are performed using `vitest`. All code (classes, functions, etc.) that is not depending on the GUI (i.e. all files that are not components or hooks) should be covered by a unit test.

### How to write unit tests

https://vitest.dev/guide/#writing-tests

### Where to place unit tests

All unit tests have to be placed in the `tests/unit/` folder.

### Additional information

A check for test coverage is automatically performed using `istanbul / nyc`. The results are written to `coverage/unit`.

## e2e tests

End-to-end tests are performed using `Playwright`. Each module author is encouraged to write one or more e2e tests for their respective module.

### How to write e2e tests

https://playwright.dev/docs/writing-tests

### Where to place e2e tests

All e2e tests have to be placed in the `tests/e2e/` folder.

### Additional information

You can run e2e tests in `ui` mode by running `npm run test:e2e:ui`.

You can also generate e2e test dynamically by using `Playwright`'s test generator.

Start the Webviz docker container on your local computer as usual and then run:

```bash
npx playwright codegen http://localhost:8080
```

Read more: https://playwright.dev/docs/codegen-intro

## Component tests

Component tests are performed using `Playwright`. Each author of a generic component (i.e. placed in the `src/lib/components/` folder) is encouraged to write one or more component tests for their respective component.

### How to write component tests

https://playwright.dev/docs/test-components

### Where to place component tests

All component tests have to be placed in the `tests/ct/` folder.

### Additional information

Unfortunately, `Playwright` does not yet provide `coverage` for component tests. However, it would be beneficial to check how many components actually do have a related test such that we can improve our code base. This is a feature that should be implemented as soon as it becomes easier available.

## Mocked e2e and component tests

These tests run the real frontend without a backend, Sumo or login. Every `/api` request is intercepted in the browser and answered by [MSW](https://mswjs.io/) handlers that serve deterministic synthetic data. Everything above the network layer (React Query, the generated API client, atoms, modules) runs as in production.

### How to run mocked tests

```bash
npm run test:e2e:mocked                                # vite build + vite preview on port 5174 (default)
E2E_MOCKED_SKIP_BUILD=1 npm run test:e2e:mocked        # preview the existing dist/ (e.g. after npm run build)
E2E_MOCKED_DEV=1 npm run test:e2e:mocked -- --ui       # Vite dev server, for writing specs
npx playwright test -c playwright.ct.config.ts caseExplorer   # component test on the same mocks
```

The `--` is required to pass `--ui` (or any other Playwright flag) through `npm run`. The dev server is slower and gets flaky with many workers, so use it only while writing specs.

### Where mocked tests live

- `tests/mocks/syntheticField/`: the synthetic data model (asset, case, ensemble, realizations, parameters, vectors), generated from a seeded PRNG.
- `tests/mocks/handlers/`: MSW handlers, one file per API tag.
- `tests/mocks/scenarios/`: named handler sets, e.g. `basicEnsembleHandlers`.
- `tests/mocks/playwright/`: `installMockApi`, which routes browser requests through the handlers.
- `tests/e2e/mocked/`: mocked e2e specs (config: `tests/e2e/_playwright.mocked.config.ts`).
- `tests/ct/support/mockApi.ts` and `tests/ct/support/AppProviders.tsx`: the component test fixture and the app's provider tree.

### Rules

- An `/api` request without a handler is answered with `501` and fails the test, listing the request.
- Requests to other hosts are blocked and also fail the test.
- Handler responses are typed with the generated `*_api` types from `@api`, so a breaking API change fails `npm run typecheck`.
- All data comes from `syntheticField`: it is deterministic (no `Math.random`, no current time) and coherent (the case listed by `/cases` is the one the ensemble endpoints describe).

### How to add a mocked test

1. Start from an existing scenario, or extend one with new handlers derived from `syntheticField`. Select a scenario with `test.use({ scenario: myScenarioHandlers })`.
2. Override single endpoints per test with `mockApi.use(...)`, e.g. to return an error:

    ```ts
    mockApi.use(http.get(apiUrl("/cases"), () => HttpResponse.json({}, { status: 500 })));
    ```

3. For e2e, import `test` and `expect` from `tests/e2e/support/mockApi`.
4. For component tests, import `test` and `expect` from `tests/ct/support/mockApi`, and wrap the component in `AppProviders` inside a `.tsx` harness under `tests/ct/support/`. Keep plain `.ts` helpers out of harness files.

The existing e2e tests in `tests/e2e/stories/` are not mocked: they still need the full docker stack and access to live Sumo.
