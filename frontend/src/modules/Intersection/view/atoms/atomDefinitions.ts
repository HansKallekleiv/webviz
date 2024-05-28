import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { BaseLayer } from "@modules/Intersection/utils/layers/BaseLayer";
import { isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { atom } from "jotai";

import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export type ViewAtoms = {
    layers: BaseLayer<any, any>[];
    intersectionReferenceSystemAtom: IntersectionReferenceSystem | null;
    polylineAtom: number[];
};

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const selectedCustomIntersectionPolylineAtom = atom((get) => {
        const customIntersectionPolylineId = get(
            settingsToViewInterface.getAtom("selectedCustomIntersectionPolylineId")
        );
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);

        return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
    });

    const intersectionReferenceSystemAtom = atom((get) => {
        const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);
        const customIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

        if (intersectionType === IntersectionType.WELLBORE) {
            if (!wellboreTrajectoryQuery.data) {
                return null;
            }

            const wellboreTrajectory = wellboreTrajectoryQuery.data;

            if (wellboreTrajectoryQuery) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northing_arr.entries()) {
                    const easting = wellboreTrajectory.easting_arr[index];
                    const tvd_msl = wellboreTrajectory.tvd_msl_arr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.tvd_msl_arr[0];

                const referenceSystem = new IntersectionReferenceSystem(path);
                referenceSystem.offset = offset;

                return referenceSystem;
            }
        } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
            if (customIntersectionPolyline.points.length < 2) {
                return null;
            }
            const referenceSystem = new IntersectionReferenceSystem(
                customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
            );
            referenceSystem.offset = 0;

            return referenceSystem;
        }

        return null;
    });

    const polylineAtom = atom((get) => {
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));
        const intersectionExtensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));
        const curveFittingEpsilon = get(settingsToViewInterface.getAtom("curveFittingEpsilon"));
        const selectedCustomIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);

        const polylineUtmXy: number[] = [];

        if (intersectionReferenceSystem) {
            if (intersectionType === IntersectionType.WELLBORE) {
                const path = intersectionReferenceSystem.path;
                polylineUtmXy.push(
                    ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                        path,
                        intersectionExtensionLength,
                        curveFittingEpsilon
                    ).flat()
                );
            } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && selectedCustomIntersectionPolyline) {
                for (const point of selectedCustomIntersectionPolyline.points) {
                    polylineUtmXy.push(point[0], point[1]);
                }
            }
        }

        return polylineUtmXy;
    });

    const layers = atom((get) => {
        const layers = get(settingsToViewInterface.getAtom("layers"));
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
        const wellbore = get(settingsToViewInterface.getAtom("wellboreHeader"));
        const polyline = get(polylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);
        const extensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));

        for (const layer of layers) {
            if (isGridLayer(layer)) {
                layer.maybeUpdateSettings({ polylineXyz: polyline, extensionLength });
            }
            if (isSeismicLayer(layer)) {
                layer.maybeUpdateSettings({ intersectionReferenceSystem, extensionLength });
            }
            if (isSurfaceLayer(layer)) {
                layer.maybeUpdateSettings({ intersectionReferenceSystem, extensionLength });
            }
            if (isWellpicksLayer(layer)) {
                layer.maybeUpdateSettings({ ensembleIdent, wellboreUuid: wellbore?.uuid });
            }
        }

        return layers;
    });

    return {
        layers,
        intersectionReferenceSystemAtom,
        polylineAtom,
    };
}
