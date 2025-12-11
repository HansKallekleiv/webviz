import React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import { InplaceVolumesSelectorMapping } from "@modules/_shared/InplaceVolumes/types";
import type { Interfaces } from "@modules/InplaceVolumesNew/interfaces";
import { useAtomValue } from "jotai";

import { ORDERED_VOLUME_DEFINITIONS } from "@assets/volumeDefinitions";

import { firstResultNameAtom, subplotByAtom } from "../atoms/baseAtoms";

export function useSetModuleTitle(viewContext: ViewContext<Interfaces>): void {
    const firstResultName = useAtomValue(firstResultNameAtom);
    const subplotBy = useAtomValue(subplotByAtom);
    let title = firstResultName
        ? `${ORDERED_VOLUME_DEFINITIONS[firstResultName].description} (${firstResultName})`
        : "";

    if (subplotBy) {
        title += ` per ${InplaceVolumesSelectorMapping[subplotBy] ?? subplotBy}`;
    }
    React.useEffect(() => {
        viewContext.setInstanceTitle(title);
    }, [viewContext, title]);
}
