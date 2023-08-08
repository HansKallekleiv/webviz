import React from "react";

import { VectorRealizationData_api } from "@api";
import { StatisticFunction_api } from "@api";
import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { indexOf } from "lodash";

import { BroadcastChannelNames } from "./channelDefs";

import { State } from "./state";

export const view = ({ moduleContext, workbenchSession }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    return <div></div>
}