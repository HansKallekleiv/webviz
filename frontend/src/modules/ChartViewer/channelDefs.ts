import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    RESPONSE_PER_REALIZATION = "Chart response (with value per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.RESPONSE_PER_REALIZATION,
        displayName: "Chart response (with value per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];
