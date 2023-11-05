import React, { useState } from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { SurfaceAddress } from "@modules/_shared/Surface";

import { EnsembleSurfaceSelect } from "./components/ensembleSurfaceSelect";
import { useEnsembleSetSurfaceMetaQuery } from "./hooks/useEnsembleSetSurfaceMetaQuery";
import { State } from "./state";

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const ensembleSetSurfaceMetas = useEnsembleSetSurfaceMetaQuery(
        ensembleSet.getEnsembleArr().map((ens) => ens.getIdent())
    );

    // State to hold the data for all EnsembleSurfaceSelect components
    const [surfaceAddresses, setSurfaceAddresses] = useState<Array<SurfaceAddress | null>>([]);

    // Function to handle adding a new EnsembleSurfaceSelect
    const addSurfaceSelect = () => {
        setSurfaceAddresses([...surfaceAddresses, null]); // Add a new null entry to the array
    };

    // Function to handle the onChange event for each EnsembleSurfaceSelect
    const handleSurfaceSelectChange = (index: number, data: SurfaceAddress) => {
        const newData = [...surfaceAddresses];
        newData[index] = data; // Update the specific index with the new data
        setSurfaceAddresses(newData);
    };
    React.useEffect(function propogateSurfaceAddressesToView() {
        moduleContext
            .getStateStore()
            .setValue(
                "surfaceAddresses",
                surfaceAddresses.filter((address): address is SurfaceAddress => address != null) ?? []
            ),
            [surfaceAddresses];
    });

    return (
        <div>
            <button onClick={addSurfaceSelect}>Add Surface Select</button>
            {surfaceAddresses.map((data, index) => (
                <CollapsibleGroup key={index} expanded={false} title={`Surface ${index + 1}`}>
                    <EnsembleSurfaceSelect
                        key={index}
                        ensembleSetSurfaceMetas={ensembleSetSurfaceMetas}
                        workbenchSession={workbenchSession}
                        onChange={(data: SurfaceAddress) => handleSurfaceSelectChange(index, data)}
                    />
                </CollapsibleGroup>
            ))}
        </div>
    );
}
