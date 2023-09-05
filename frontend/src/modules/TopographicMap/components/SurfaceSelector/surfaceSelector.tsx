import React from "react";

import { SurfaceMeta_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SurfAddr } from "@modules/TopographicMap/SurfaceAddress";
import { useSurfaceDirectoryQuery } from "@modules/TopographicMap/queryHooks";
import { CircularProgress } from "@mui/material";

import { SurfaceDirectoryProvider, TimeType } from "./surfaceDirectoryProvider";

export interface SurfaceSelectorProps {
    title: string;
    ensembleIdent: EnsembleIdent | null;
    surfaceAddress?: SurfAddr | null;
    setSurfaceAddress?: React.Dispatch<React.SetStateAction<SurfAddr | null>>;
    content: string[];
    timeType: TimeType;
    moduleContext: ModuleContext<any>;
    workbenchServices: WorkbenchServices;
}

export function SurfaceSelector(props: SurfaceSelectorProps): JSX.Element {
    const [selectedSurfaceName, setSelectedSurfaceName] = React.useState<string | null>(null);
    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string | null>(null);
    const syncedSettingKeys = props.moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        props.ensembleIdent?.getCaseUuid(),
        props.ensembleIdent?.getEnsembleName()
    );
    const SurfDirProvider = new SurfaceDirectoryProvider(surfaceDirectoryQuery, props.timeType, props.content);

    const attributes = SurfDirProvider.getAttributes();
    const computedSurfaceAttribute = SurfDirProvider.NameAttributePairExists(
        selectedSurfaceName,
        selectedSurfaceAttribute
    )
        ? selectedSurfaceAttribute
        : attributes[0] ?? null;

    const computedSurfaceName = SurfDirProvider.NameAttributePairExists(selectedSurfaceName, computedSurfaceAttribute)
        ? selectedSurfaceName
        : SurfDirProvider.getNames(computedSurfaceAttribute)[0] ?? null;

    if (computedSurfaceName && computedSurfaceName !== selectedSurfaceName) {
        setSelectedSurfaceName(computedSurfaceName);
    }
    if (computedSurfaceAttribute && computedSurfaceAttribute !== selectedSurfaceAttribute) {
        setSelectedSurfaceAttribute(computedSurfaceAttribute);
    }

    let SurfNameOptions: SelectOption[] = [];
    let SurfAttributeOptions: SelectOption[] = [];
    SurfNameOptions = SurfDirProvider.getNames(computedSurfaceAttribute).map((name) => ({
        value: name,
        label: name,
    }));
    SurfAttributeOptions = SurfDirProvider.getAttributes().map((attr) => ({
        value: attr,
        label: attr,
    }));

    function handleSurfNameSelectionChange(selectedSurfNames: string[]) {
        const newName = selectedSurfNames[0] ?? null;
        setSelectedSurfaceName(newName);
        if (newName && computedSurfaceAttribute) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: newName,
                attribute: computedSurfaceAttribute,
            });
        }
    }
    function handleSurfAttributeSelectionChange(selectedSurfAttributes: string[]) {
        const newAttr = selectedSurfAttributes[0] ?? null;
        setSelectedSurfaceAttribute(newAttr);
        if (newAttr && computedSurfaceName) {
            syncHelper.publishValue(SyncSettingKey.SURFACE, "global.syncValue.surface", {
                name: computedSurfaceName,
                attribute: newAttr,
            });
        }
    }
    return (
        <ApiStateWrapper
            apiResult={surfaceDirectoryQuery}
            errorComponent={"Error loading surface directory"}
            loadingComponent={<CircularProgress />}
        >
            <CollapsibleGroup expanded={false} title={props.title}>
                <Label
                    text="Stratigraphic name"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={SurfNameOptions}
                        value={computedSurfaceName ? [computedSurfaceName] : []}
                        onChange={handleSurfNameSelectionChange}
                        size={5}
                    />
                </Label>
                <Label
                    text="Attribute"
                    labelClassName={syncHelper.isSynced(SyncSettingKey.SURFACE) ? "bg-indigo-700 text-white" : ""}
                >
                    <Select
                        options={SurfAttributeOptions}
                        value={computedSurfaceAttribute ? [computedSurfaceAttribute] : []}
                        onChange={handleSurfAttributeSelectionChange}
                        size={5}
                    />
                </Label>
            </CollapsibleGroup>
        </ApiStateWrapper>
    );
}
