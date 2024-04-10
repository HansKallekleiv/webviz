import { ModuleViewProps } from "@framework/Module";
import { State } from "@modules/Pvt/state";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>) {
    return <div>Well Log Viewer View</div>;
}
