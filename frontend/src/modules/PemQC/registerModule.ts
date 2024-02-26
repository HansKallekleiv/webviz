import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "PemQC",
    defaultTitle: "Pem QC",
    description: "QC of PEM results",
});

ModuleRegistry.registerModule<State>({ moduleName: "PemQC", defaultTitle: "Pem QC" });
