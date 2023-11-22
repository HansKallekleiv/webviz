import React from "react";
import { createRoot } from "react-dom/client";

import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";
import { ReactPlugin } from "@microsoft/applicationinsights-react-js";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { createBrowserHistory } from "history";

import App from "./App";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

if (import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING) {
    console.log("it works");
    const browserHistory = createBrowserHistory();
    const reactPlugin = new ReactPlugin();
    const appInsights = new ApplicationInsights({
        config: {
            instrumentationKey: import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
            extensions: [reactPlugin],
            extensionConfig: {
                [reactPlugin.identifier]: { history: browserHistory },
            },
        },
    });
    appInsights.loadAppInsights();
    appInsights.trackPageView();
}
/*
    If the `cleanStart` query parameter is given, 
    the application will clear all local storage before rendering the application.
*/
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has("cleanStart")) {
    localStorage.clear();
    urlParams.delete("cleanStart");
    window.location.search = urlParams.toString();
}

// --------------------------------------------------------------------

const container = document.getElementById("root");

if (!container) {
    throw new Error("Could not find root container");
}

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <GlobalErrorBoundary>
            <AuthProvider>
                <CustomQueryClientProvider>
                    <App />
                </CustomQueryClientProvider>
            </AuthProvider>
        </GlobalErrorBoundary>
    </React.StrictMode>
);
