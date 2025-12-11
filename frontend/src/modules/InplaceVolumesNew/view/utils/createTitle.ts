import { InplaceVolumesSelectorMapping } from "@modules/_shared/InplaceVolumes/types";

import { ORDERED_VOLUME_DEFINITIONS } from "@assets/volumeDefinitions";

export function makeInplaceVolumesPlotTitle(firstResultName: string | null, groupByName?: string): string {
    let title = firstResultName
        ? `${ORDERED_VOLUME_DEFINITIONS[firstResultName].description} (${firstResultName})`
        : "";

    if (groupByName) {
        title += ` per ${InplaceVolumesSelectorMapping[groupByName] ?? groupByName}`;
    }

    return title;
}
