import { SyncSettingKey } from "@framework/SyncSettings";
import { Template, TemplateRegistry } from "@framework/TemplateRegistry";

const template: Template = {
    description: "Dashboard for evaluating structural uncertainty.",
    moduleInstances: [
        {
            instanceRef: "SubsurfaceMapInstance",
            moduleName: "SubsurfaceMap",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE, SyncSettingKey.WELLBORE],
        },
        {
            instanceRef: "StructuralUncertaintyIntersectionInstance",
            moduleName: "StructuralUncertaintyIntersection",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0,
            },
            syncedSettings: [SyncSettingKey.ENSEMBLE, SyncSettingKey.WELLBORE],
        },
        {
            instanceRef: "MapMatrixInstance",
            moduleName: "MapMatrix",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.WELLBORE],
        },
        {
            instanceRef: "WellStratigraphyInstance",
            moduleName: "WellStratigraphy",
            layout: {
                relHeight: 0.5,
                relWidth: 0.5,
                relX: 0.5,
                relY: 0.5,
            },
            syncedSettings: [SyncSettingKey.WELLBORE],
        },
    ],
};

TemplateRegistry.registerTemplate("Evaluate structural uncertainty", template);
