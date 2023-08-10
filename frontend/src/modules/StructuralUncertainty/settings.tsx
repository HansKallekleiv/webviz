import React from "react";

import { StaticSurfaceDirectory_api, SumoContent_api, SurfaceStatisticFunction_api, WellBoreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";

import { IntersectionAddr, IntersectionAddrFactory } from "./IntersectionAddr";
import { SurfAddr, SurfAddrFactory } from "./SurfAddr";
import { useStaticSurfaceDirectoryQuery, useWellBoreHeaderQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------

export function settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    console.debug(`${myInstanceIdStr} -- render SimulationTimeSeries settings`);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    const [surfaceAddresses, setSurfaceAddresses] = moduleContext.useStoreState("surfaceAddresses");
    const [intersectionAddress, setIntersectionAddress] = moduleContext.useStoreState("intersectionAddress");

    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = React.useState<string>("");
    const [selectedSurfaceNames, setSelectedSurfaceNames] = React.useState<string[]>([]);
    const [selectedWell, setSelectedWell] = React.useState<string>("");
    const [showRealizations, setShowRealizations] = React.useState<boolean>(false);
    const [showMean, setShowMean] = React.useState<boolean>(true);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    const staticSurfDirQuery = useStaticSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName(),
        [SumoContent_api.DEPTH],
        true
    );

    const wellBoreHeaderQuery = useWellBoreHeaderQuery(computedEnsembleIdent?.getCaseUuid());

    function handleEnsembleSelectionChange(ensembleIdentArr: EnsembleIdent[]) {
        console.debug("handleEnsembleSelectionChange()", ensembleIdentArr);
        const newEnsembleIdent = ensembleIdentArr[0] ?? null;
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }
    React.useEffect(
        function propagateSurfaceAddressesToView() {
            const surfAddresses: SurfAddr[] = [];
            if (selectedEnsembleIdent && selectedSurfaceAttribute && selectedSurfaceNames) {
                for (const surfaceName of selectedSurfaceNames) {
                    const surfAddrFactory: SurfAddrFactory = new SurfAddrFactory(
                        selectedEnsembleIdent?.getCaseUuid(),
                        selectedEnsembleIdent?.getEnsembleName(),
                        selectedSurfaceAttribute,
                        surfaceName
                    );
                    if (showRealizations) {
                        surfAddresses.push(surfAddrFactory.createRealizationAddr([]));
                    }
                    if (showMean) {
                        surfAddresses.push(
                            surfAddrFactory.CreateStatisticalSurfAddr(SurfaceStatisticFunction_api.MEAN, [])
                        );
                    }
                }
            }
            setSurfaceAddresses(surfAddresses);
        },
        [selectedEnsembleIdent, selectedSurfaceAttribute, selectedSurfaceNames, showRealizations, showMean]
    );

    React.useEffect(
        function propagateIntersectionAddressToView() {
            if (selectedEnsembleIdent && selectedWell) {
                const newIntersectionAddress: IntersectionAddr =
                    new IntersectionAddrFactory().createWellIntersectionAddr(selectedWell);
                setIntersectionAddress(newIntersectionAddress);
            }
        },
        [selectedEnsembleIdent, selectedWell]
    );
    return (
        <>
            <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent ? [computedEnsembleIdent] : []}
                    onChange={handleEnsembleSelectionChange}
                    size={5}
                />
            </Label>
            <ApiStateWrapper
                apiResult={staticSurfDirQuery}
                errorComponent={"Error loading surface directory"}
                loadingComponent={<CircularProgress />}
            >
                <Label text="Surface attribute">
                    <Dropdown
                        options={makeSurfaceAttributeOptions(staticSurfDirQuery.data)}
                        value={selectedSurfaceAttribute ? selectedSurfaceAttribute : ""}
                        onChange={setSelectedSurfaceAttribute}
                    />
                </Label>
                <Label text="Surface names">
                    <Select
                        options={makeSurfaceNameOptions(staticSurfDirQuery.data, selectedSurfaceAttribute)}
                        value={selectedSurfaceNames ? selectedSurfaceNames : []}
                        onChange={setSelectedSurfaceNames}
                        size={5}
                        multiple={true}
                    />
                </Label>
                <Label text="Drilled well">
                    <Dropdown
                        options={makeWellNameOptions(wellBoreHeaderQuery.data)}
                        value={selectedWell ? selectedWell : ""}
                        onChange={setSelectedWell}
                    />
                </Label>
                <Label text="Surface visualization">
                    <>
                        <Checkbox
                            checked={showRealizations}
                            onChange={(e) => setShowRealizations(e.target.checked)}
                            label="Realizations"
                        />
                        <Checkbox checked={showMean} onChange={(e) => setShowMean(e.target.checked)} label="Mean" />
                    </>
                </Label>
            </ApiStateWrapper>
        </>
    );
}

function makeSurfaceAttributeOptions(surfaceDirectory: StaticSurfaceDirectory_api | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (surfaceDirectory && surfaceDirectory.attributes) {
        for (const attr of surfaceDirectory.attributes) {
            itemArr.push({ value: attr, label: attr });
        }
    }
    return itemArr;
}

function makeSurfaceNameOptions(
    surfaceDirectory: StaticSurfaceDirectory_api | undefined,
    attribute: string | undefined
): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (surfaceDirectory && surfaceDirectory.names && attribute) {
        const attributeIndex = surfaceDirectory.attributes.indexOf(attribute);
        for (const [nameIndex, name] of surfaceDirectory.names.entries()) {
            if (surfaceDirectory.valid_attributes_for_name[nameIndex].includes(attributeIndex)) {
                itemArr.push({ value: name, label: name });
            }
        }
    }
    return itemArr;
}

function makeWellNameOptions(wellBoreHeaderDirectory: WellBoreHeader_api[] | undefined): SelectOption[] {
    const itemArr: SelectOption[] = [];
    if (wellBoreHeaderDirectory) {
        for (const [wellIndex, well] of wellBoreHeaderDirectory.entries()) {
            itemArr.push({ value: well.wellbore_uuid, label: well.unique_wellbore_identifier });
        }
    }
    return itemArr;
}
