import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { FaultPolygonsSpecification } from "@modules/MapMatrix/types";
import { PolygonsDirectory, usePolygonsDirectoryQuery } from "@modules/_shared/Polygons";

export type FaultPoygonsSelectProps = {
    ensembleIdent: EnsembleIdent | null;
    faultPolygonsSpecification: FaultPolygonsSpecification;
    onChange: (faultPolygonsSpecification: FaultPolygonsSpecification) => void;
};

export const FaultPolygonsSelect: React.FC<FaultPoygonsSelectProps> = (props) => {
    let computedEnsembleIdent = props.ensembleIdent;
    const polygonsDirectoryQuery = usePolygonsDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    const polygonsDirectory = new PolygonsDirectory({ polygonsMetas: polygonsDirectoryQuery?.data || [] });

    const polygonsAttributeNames = polygonsDirectory.getAttributeNames(null);

    function handleFaultPolygonsAttributeChange(attribute: string | null) {
        const names = polygonsDirectory.getPolygonsNames(attribute);
        let newName = props.faultPolygonsSpecification.defaultPolygonsName;
        if (!newName || !names.includes(newName)) {
            newName = names[0] || null;
        }
        props.onChange({
            ...props.faultPolygonsSpecification,
            defaultPolygonsName: newName,
            polygonsAttribute: attribute,
        });
    }
    if (polygonsAttributeNames.length > 0) {
        if (
            !props.faultPolygonsSpecification.polygonsAttribute ||
            !polygonsAttributeNames.includes(props.faultPolygonsSpecification.polygonsAttribute)
        ) {
            handleFaultPolygonsAttributeChange(polygonsAttributeNames[0]);
        }
    } else if (props.faultPolygonsSpecification.polygonsAttribute) {
        handleFaultPolygonsAttributeChange(null);
    }
    const polygonsAttributeOptions = polygonsAttributeNames.map((attribute) => ({
        value: attribute,
        label: attribute,
    }));
    function handleShowPolygonsChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange({
            ...props.faultPolygonsSpecification,
            useFaultPolygons: e.target.checked,
        });
    }

    const polygonsNameOptions = polygonsDirectory
        .getPolygonsNames(props.faultPolygonsSpecification.polygonsAttribute)
        .map((name) => ({ value: name, label: name }));

    function handleFaultPolygonsNameChange(name: string) {
        props.onChange({
            ...props.faultPolygonsSpecification,
            defaultPolygonsName: name,
        });
    }
    function handleUseSurfaceNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange({
            ...props.faultPolygonsSpecification,
            useSurfaceName: e.target.checked,
        });
    }
    function handleUseDefaultPolygonsNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange({
            ...props.faultPolygonsSpecification,
            useDefaultPolygonsName: e.target.checked,
        });
    }
    return (
        <>
            <Checkbox
                label="Show fault polygons"
                checked={props.faultPolygonsSpecification.useFaultPolygons}
                onChange={handleShowPolygonsChange}
            />

            <Label text="Attribute name" position="above" wrapperClassName="mt-2 mb-2">
                <Dropdown
                    options={polygonsAttributeOptions}
                    value={props.faultPolygonsSpecification.polygonsAttribute ?? ""}
                    onChange={handleFaultPolygonsAttributeChange}
                    disabled={!props.faultPolygonsSpecification.useFaultPolygons}
                />
            </Label>
            <Checkbox
                label="Attempt to find from surface name"
                checked={props.faultPolygonsSpecification.useSurfaceName}
                onChange={handleUseSurfaceNameChange}
                disabled={!props.faultPolygonsSpecification.useFaultPolygons}
            />
            <Checkbox
                label="Use fallback name"
                checked={props.faultPolygonsSpecification.useDefaultPolygonsName}
                onChange={handleUseDefaultPolygonsNameChange}
                disabled={!props.faultPolygonsSpecification.useFaultPolygons}
            />
            <Label text="Fallback name" position="above" wrapperClassName="mt-2 mb-2">
                <Dropdown
                    options={polygonsNameOptions}
                    value={props.faultPolygonsSpecification.defaultPolygonsName ?? ""}
                    onChange={handleFaultPolygonsNameChange}
                    disabled={
                        !props.faultPolygonsSpecification.useFaultPolygons ||
                        !props.faultPolygonsSpecification.useDefaultPolygonsName
                    }
                />
            </Label>
        </>
    );
};
