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
    const removeSurfaceSelect = (index: number) => {
        setSurfaceAddresses(surfaceAddresses.filter((_, i) => i !== index));
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
                <div key={`surface-select-${index}`} style={{ position: "relative" }}>
                    {/* Absolutely positioned remove button */}
                    <button
                        onClick={() => removeSurfaceSelect(index)}
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            zIndex: 2,
                        }}
                    >
                        &#10006;
                    </button>
                    <div style={{ width: "90%" }}>
                        <CollapsibleGroup expanded={false} title={`Surface ${index + 1}`}>
                            <EnsembleSurfaceSelect
                                ensembleSetSurfaceMetas={ensembleSetSurfaceMetas}
                                workbenchSession={workbenchSession}
                                onChange={(data: SurfaceAddress) => handleSurfaceSelectChange(index, data)}
                            />
                        </CollapsibleGroup>
                    </div>
                </div>
            ))}
        </div>
    );
}
