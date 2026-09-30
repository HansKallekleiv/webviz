import type React from "react";

import { AuthProvider } from "@framework/internal/providers/AuthProvider";
import { CustomQueryClientProvider } from "@framework/internal/providers/QueryClientProvider";

/** The app's provider tree, nested as in main.tsx. */
export function AppProviders(props: { children: React.ReactElement }): React.JSX.Element {
    return (
        <AuthProvider>
            <CustomQueryClientProvider>{props.children}</CustomQueryClientProvider>
        </AuthProvider>
    );
}
