import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { State } from "./state";

export function view({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const surfaceAddresses = moduleContext.useStoreValue("surfaceAddresses");
    console.log(surfaceAddresses);
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <div>MapMatrix</div>
        </div>
    );
}
