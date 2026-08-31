import type React from "react";

import type { ModuleSettingsProps } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ChartViewerMode } from "@modules/_shared/ChartViewer/config";
import type { Interfaces } from "@modules/_shared/ChartViewer/interfaces";
import { settingsToViewInterfaceInitialization } from "@modules/_shared/ChartViewer/interfaces";
import { serializeStateFunctions, type SerializedState } from "@modules/_shared/ChartViewer/persistence";
import { Settings } from "@modules/_shared/ChartViewer/settings/settings";
import { View } from "@modules/_shared/ChartViewer/view/view";

import { MODULE_NAME } from "./registerModule";

const module = ModuleRegistry.initModule<Interfaces, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    ...serializeStateFunctions,
});

module.settingsFC = function TimeSeriesChartSettings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    return <Settings {...props} mode={ChartViewerMode.TIME_SERIES} />;
};
module.viewFC = View;
