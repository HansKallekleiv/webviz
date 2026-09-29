import { http, HttpResponse } from "msw";
import type { PathParams } from "msw";

import type { GraphUserPhoto_api, UserInfo_api } from "@api";

import { apiUrl } from "../apiUrl";
import { SYNTH } from "../syntheticField";

export const authHandlers = [
    http.get<PathParams, never, UserInfo_api>(apiUrl("/logged_in_user"), () =>
        HttpResponse.json({
            user_id: "synthetic-user-id",
            username: SYNTH.userName,
            display_name: "Synthetic User",
            avatar_b64str: null,
            has_sumo_access: true,
            has_smda_access: true,
        }),
    ),

    http.get<PathParams, never, GraphUserPhoto_api>(apiUrl("/graph/user_photo/"), () =>
        HttpResponse.json({ avatar_b64str: null }),
    ),
];
