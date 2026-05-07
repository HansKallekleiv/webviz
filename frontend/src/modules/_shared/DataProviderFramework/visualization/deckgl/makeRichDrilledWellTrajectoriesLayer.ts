import type { WellsLayer, WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";
import type { PerforationProperties, ScreenProperties } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { parse, type Rgb } from "culori";
import type { Feature, FeatureCollection, GeometryCollection } from "geojson";

import { point2Distance, vec2FromArray } from "@lib/utils/vec2";
import { DEFAULT_WELLS_LAYER_PROPS } from "@modules/_shared/constants/wellsLayer";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import type {
    DrilledWellboreTrajectoriesData,
    DrilledWellboreTrajectoriesSettings,
    DrilledWellboreTrajectoriesStoredData,
    DrilledWellboreTrajectoryData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/DrilledWellboreTrajectoriesProvider";
import type { SettingTypeDefinitions } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type { ExtendedWellFeature, ExtendedWellFeatureProperties } from "@modules/_shared/types/geojson";
import { simplifyWellTrajectoryRadialDist, wellTrajectoryToGeojson } from "@modules/_shared/utils/wellbore";

const SIMPLIFICATION_RADIAL_DIST = 1.5;
const FORMATION_FILTER_NAME = "WITHIN FILTER";

export type RichDrilledWellTrajectoriesLayerOptions = {
    positionFormat?: "XY" | "XYZ";
    depthTest?: boolean;
    outline?: boolean;
    pickable?: boolean;
    lineWidthScale?: number;
    defaultColor?: [number, number, number] | [number, number, number, number];
    showCompletionMarkers?: boolean;
    showScreenTrajectoryAsDash?: boolean;
    wellLabel?: WellsLayerProps["wellLabel"];
};

export type RichDrilledWellTrajectoriesFilterProps = Pick<
    WellsLayerProps,
    "enableFilters" | "mdFilterRange" | "formationFilter" | "wellNameFilter"
>;

export function makeRichDrilledWellTrajectoriesLayer(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
    options: RichDrilledWellTrajectoriesLayerOptions = {},
): WellsLayer | null {
    const { id, isLoading, getData, getSetting } = args;

    const wellboreTrajectoriesData = getData();
    const flowFilterType = getSetting(Setting.FLOW_FILTER_TYPE) ?? "none";
    const flowFilterSettings = getSetting(Setting.FLOW_FILTER);
    const showCompletionMarkers =
        options.showCompletionMarkers ?? getSetting(Setting.SHOW_WELLBORE_COMPLETIONS) ?? false;

    if (isLoading) {
        return null;
    }

    if (!wellboreTrajectoriesData) {
        return null;
    }

    const wellGeoJson = wellDataToGeoJson(wellboreTrajectoriesData);
    const filterProps = makeDrilledWellTrajectoryFilterProps(args);
    const wellLabel = filterProps.enableFilters
        ? undefined
        : (options.wellLabel ?? DEFAULT_WELLS_LAYER_PROPS.wellLabel);

    const wellsLayer = new AdjustedWellsLayer({
        ...DEFAULT_WELLS_LAYER_PROPS,
        id,
        positionFormat: options.positionFormat,
        outline: options.outline ?? DEFAULT_WELLS_LAYER_PROPS.outline,
        data: wellGeoJson,
        pickable: options.pickable ?? DEFAULT_WELLS_LAYER_PROPS.pickable,
        depthTest: options.depthTest ?? DEFAULT_WELLS_LAYER_PROPS.depthTest,
        lineWidthScale: options.lineWidthScale ?? DEFAULT_WELLS_LAYER_PROPS.lineWidthScale,
        markers: showCompletionMarkers
            ? {
                  showPerforations: true,
                  showScreens: true,
                  showScreenTrajectoryAsDash: options.showScreenTrajectoryAsDash ?? true,
              }
            : undefined,
        ...filterProps,
        lineStyle: {
            ...DEFAULT_WELLS_LAYER_PROPS.lineStyle,
            color: (d: Feature) => {
                const geoWellFeature = d as ExtendedWellFeature;
                const { productionData, injectionData, color = [128, 128, 128] } = geoWellFeature.properties;

                if (flowFilterType === "none") return options.defaultColor ?? color;

                const flowColor = setColorByFlowData(flowFilterSettings, productionData, injectionData);
                return flowColor ?? options.defaultColor ?? color;
            },
        },
        updateTriggers: {
            getLineColor: [flowFilterType, flowFilterSettings, options.defaultColor],
            getFillColor: [flowFilterType, flowFilterSettings, options.defaultColor],
        },
        wellLabel,
    });

    return wellsLayer;
}

export function makeDrilledWellTrajectoryFilterProps(
    args: TransformerArgs<
        DrilledWellboreTrajectoriesSettings,
        DrilledWellboreTrajectoriesData,
        DrilledWellboreTrajectoriesStoredData
    >,
): RichDrilledWellTrajectoriesFilterProps {
    const { getData, getSetting } = args;

    const wellboreTrajectoriesData = getData();
    const depthFilterType = getSetting(Setting.WELLBORE_DEPTH_FILTER_TYPE) ?? "none";
    const flowFilterType = getSetting(Setting.FLOW_FILTER_TYPE) ?? "none";
    const flowFilterSettings = getSetting(Setting.FLOW_FILTER);
    const mdRangeSetting = getSetting(Setting.MD_RANGE);

    let mdFilterRange: WellsLayerProps["mdFilterRange"] = [-1, -1];
    let formationFilter: WellsLayerProps["formationFilter"] = [];
    const filteredWellNames: string[] = [];
    const filtersEnabled = depthFilterType !== "none" || flowFilterType !== "none";

    if (depthFilterType === "md_range" && mdRangeSetting) {
        mdFilterRange = [mdRangeSetting[0] ?? -1, mdRangeSetting[1] ?? -1];
    } else if (depthFilterType === "surface_based") {
        formationFilter = [FORMATION_FILTER_NAME];
    }

    if (flowFilterType === "production_injection") {
        filteredWellNames.push("DUMMY");

        for (const wellTrajectory of wellboreTrajectoriesData ?? []) {
            const flowSetting = getApplicableFlowDataSetting(
                flowFilterSettings,
                wellTrajectory.productionData,
                wellTrajectory.injectionData,
            );

            if (flowSetting) {
                filteredWellNames.push(wellTrajectory.uniqueWellboreIdentifier);
            }
        }
    }

    return {
        enableFilters: filtersEnabled,
        mdFilterRange,
        formationFilter,
        wellNameFilter: filteredWellNames,
    };
}

export function wellDataToGeoJson(
    wellboreTrajectoriesData: DrilledWellboreTrajectoriesData,
): FeatureCollection<GeometryCollection, ExtendedWellFeatureProperties> {
    const wellboreFeatures: ExtendedWellFeature[] = [];

    for (const fullTrajectory of wellboreTrajectoriesData) {
        const trajectory = createSimplifiedTrajectory(fullTrajectory);
        const wellboreFeature = wellTrajectoryToGeojson(trajectory) as ExtendedWellFeature;

        wellboreFeature.properties = {
            ...wellboreFeature.properties,
            formations: trajectory.formationSegments.map((formationSegment) => ({
                mdEnter: formationSegment.mdEnter,
                mdExit: formationSegment.mdExit,
                name: FORMATION_FILTER_NAME,
            })),
            screens: trajectory.screens.map<ScreenProperties>((screen) => ({
                name: screen.symbolName ?? "Screen",
                description: screen.description ?? undefined,
                mdStart: screen.mdTop,
                mdEnd: screen.mdBottom,
            })),
            perforations: trajectory.perforations.map<PerforationProperties>((perforation) => ({
                name: "Perforation",
                md: (perforation.mdTop + perforation.mdBottom) / 2,
                status: perforation.status,
                dateClosed: perforation.dateClosed ?? undefined,
                dateShot: perforation.dateShot ?? undefined,
            })),

            status: trajectory.wellboreStatus,
            purpose: trajectory.wellborePurpose,

            injectionData: trajectory.injectionData,
            productionData: trajectory.productionData,
        };

        wellboreFeatures.push(wellboreFeature);
    }

    return {
        type: "FeatureCollection",
        features: wellboreFeatures,
    };
}

function createSimplifiedTrajectory(trajectory: DrilledWellboreTrajectoryData) {
    return simplifyWellTrajectoryRadialDist(trajectory, SIMPLIFICATION_RADIAL_DIST, (point1, point2) => {
        const vecPoint1 = vec2FromArray([point1.easting, point1.northing]);
        const vecPoint2 = vec2FromArray([point2.easting, point2.northing]);

        return point2Distance(vecPoint1, vecPoint2);
    });
}

function hexToRgb(hex: string): [r: number, g: number, b: number] {
    const color = parse(hex);

    if (!color || !("r" in color && "g" in color && "b" in color)) {
        return [128, 128, 128];
    }

    const rgb = color as Rgb;

    return [Math.round(rgb.r * 255), Math.round(rgb.g * 255), Math.round(rgb.b * 255)];
}

function setColorByFlowData(
    flowFilterSettings: SettingTypeDefinitions[Setting.FLOW_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
): [r: number, g: number, b: number] | null {
    if (!productionData && !injectionData) return null;
    if (!flowFilterSettings) return null;

    const flowSetting = getApplicableFlowDataSetting(flowFilterSettings, productionData, injectionData);

    if (!flowSetting) return null;
    return hexToRgb(flowSetting.color);
}

function getApplicableFlowDataSetting(
    flowFilterSettings: SettingTypeDefinitions[Setting.FLOW_FILTER]["externalValue"],
    productionData: ExtendedWellFeatureProperties["productionData"],
    injectionData: ExtendedWellFeatureProperties["injectionData"],
) {
    if (!flowFilterSettings) return null;

    const { production, injection } = flowFilterSettings;

    if (productionData) {
        if (productionData.oilProductionSm3 > flowFilterSettings.production.oil.value) {
            return production.oil;
        }
        if (productionData.gasProductionSm3 > flowFilterSettings.production.gas.value) {
            return production.gas;
        }
        if (productionData.waterProductionM3 > flowFilterSettings.production.water.value) {
            return production.water;
        }
    }

    if (injectionData) {
        if (injectionData.waterInjection > flowFilterSettings.injection.water.value) {
            return injection.water;
        }
        if (injectionData.gasInjection > flowFilterSettings.injection.gas.value) {
            return injection.gas;
        }
    }

    return null;
}
