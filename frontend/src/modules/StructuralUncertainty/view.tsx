import React from "react";

import { SmdaWellIdent_api, StaticSurfaceRealizationsIntersectionRequest_api } from "@api";
import { StatisticFunction_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { indexOf } from "lodash";

import { BroadcastChannelNames } from "./channelDefs";
import { useStaticSurfaceRealizations } from "./queryHooks";
import { State } from "./state";

export const view = ({ moduleContext, workbenchSession }: ModuleFCProps<State>) => {
    const intersectionAddress = moduleContext.useStoreValue("intersectionAddress");
    const surfaceAddresses = moduleContext.useStoreValue("surfaceAddresses");

    console.log(intersectionAddress);
    console.log(surfaceAddresses);
    const data: StaticSurfaceRealizationsIntersectionRequest_api = {
        intersection_spec: { source: { well_uuid: "55/33-A-4" } },

        case_uuid: "10f41041-2c17-4374-a735-bb0de62e29dc",
        ensemble_name: "iter-0",
        name: "Therys Fm. Top",
        attribute: "DS_extract_postprocess",
    };
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const staticSurfaceRealizations = useStaticSurfaceRealizations(data);
    console.log(staticSurfaceRealizations);

    return <div></div>;
};
