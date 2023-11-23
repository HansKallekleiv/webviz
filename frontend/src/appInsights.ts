import { ClickAnalyticsPlugin } from "@microsoft/applicationinsights-clickanalytics-js";
import { ReactPlugin } from "@microsoft/applicationinsights-react-js";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

const clickPluginInstance = new ClickAnalyticsPlugin();
// Click Analytics configuration
const clickPluginConfig = {
    autoCapture: true,
};

const reactPlugin = new ReactPlugin();
const appInsights = new ApplicationInsights({
    config: {
        connectionString: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
        extensions: [clickPluginInstance],
        extensionConfig: {
            [clickPluginInstance.identifier]: clickPluginConfig,
        },
    },
});

export { reactPlugin, appInsights };
