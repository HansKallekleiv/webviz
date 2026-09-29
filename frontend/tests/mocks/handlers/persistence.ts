import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type { PageSessionMetadata_api, PageSnapshotAccessLog_api } from "@api";

import { apiUrl } from "../apiUrl";

export const persistenceHandlers = [
    http.get<PathParams, never, PageSessionMetadata_api>(apiUrl("/persistence/sessions"), () =>
        HttpResponse.json({ items: [], pageToken: null }),
    ),
    http.get<PathParams, never, PageSnapshotAccessLog_api>(apiUrl("/persistence/snapshot_access_logs"), () =>
        HttpResponse.json({ items: [], pageToken: null }),
    ),
];
