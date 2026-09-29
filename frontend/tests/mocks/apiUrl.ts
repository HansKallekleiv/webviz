/** MSW path pattern for `/api` + a path exactly as written in sdk.gen.ts (`{param}` becomes `:param`). */
export function apiUrl(path: string): string {
    return `*/api${path.replace(/\{(\w+)\}/g, ":$1")}`;
}
