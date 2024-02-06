import React from "react";

import { StatisticFunction_api, SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { ColorSet } from "@lib/utils/ColorSet";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { SurfaceDirectory, SurfaceTimeType, useSurfaceDirectoryQuery } from "@modules/_shared/Surface";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import { isEqual } from "lodash";

import { IntersectionSettingsSelect } from "./components/intersectionSettings";
import { RealizationsSelect } from "./components/realizationsSelect";
import { TogglableMultiSelect } from "./components/togglableMultiSelect";
import { State } from "./state";
import { StatisticFunctionEnumToStringMapping, StratigraphyColorMap, SurfaceSetAddress, VisualizationMode, VisualizationModeEnumToStringMapping } from "./types";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { RadioGroup } from "@lib/components/RadioGroup";

export function Settings({ moduleContext, workbenchSession, workbenchSettings, workbenchServices }: ModuleFCProps<State>) {
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const ensembleSet = useEnsembleSet(workbenchSession);

    const statusWriter = useSettingsStatusWriter(moduleContext);
    const colorSet = workbenchSettings.useColorSet();
    const wellboreType = "smda";

    const [statisticFunctions, setStatisticFunctions] = moduleContext.useStoreState("statisticFunctions");
    const [visualizationMode, setVisualizationMode] = moduleContext.useStoreState("visualizationMode");

    const setWellboreAddress = moduleContext.useSetStoreValue("wellboreAddress");
    const setSurfaceSetAddress = moduleContext.useSetStoreValue("SurfaceSetAddress");
    const [intersectionSettings, setIntersectionSettings] = moduleContext.useStoreState("intersectionSettings");

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    const [selectedWellboreAddress, setSelectedWellboreAddress] = React.useState<Wellbore | null>(
        moduleContext.useStoreValue("wellboreAddress")
    );

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);

    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const availableReals = selectedEnsembleIdent
        ? ensembleSet.findEnsemble(selectedEnsembleIdent)?.getRealizations()
        : null;
    const [selectedReals, setSelectedReals] = React.useState<number[] | null>(null);
    if (!selectedReals && availableReals) {
        setSelectedReals(availableReals.map((real) => real));
    }
    // Queries
    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );
    if (wellHeadersQuery.isError) {
        statusWriter.addError("Error loading well headers");
    }
    if (surfaceDirectoryQuery.isError) {
        statusWriter.addError("Error loading surface directory");
    }

    // Handling well headers query
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: wellboreType,
            uwi: wellbore.unique_wellbore_identifier,
            uuid: wellbore.wellbore_uuid,
        })) || [];
    const computedWellboreAddress = fixupSyncedOrSelectedOrFirstWellbore(
        syncedWellBore || null,
        selectedWellboreAddress || null,
        availableWellboreList
    );

    if (!isEqual(computedWellboreAddress, selectedWellboreAddress)) {
        setSelectedWellboreAddress(computedWellboreAddress);
    }

    const surfaceDirectory = surfaceDirectoryQuery.data
        ? new SurfaceDirectory({
            surfaceMetas: surfaceDirectoryQuery.data,
            timeType: SurfaceTimeType.None,
            includeAttributeTypes: [SurfaceAttributeType_api.DEPTH],
        })
        : null;

    const [selectedSurfaceAttribute, setSelectedSurfaceAttribute] = useValidState<string | null>({
        initialState: null,
        validStates: surfaceDirectory?.getAttributeNames(null) ?? [],
    });

    const [realizationsSurfaceNames, setRealizationsSurfaceNames] = React.useState<string[] | null>(null);
    const availableSurfaceNames = surfaceDirectory ? surfaceDirectory.getSurfaceNames(selectedSurfaceAttribute) : null;
    if (!realizationsSurfaceNames && availableSurfaceNames) {
        setRealizationsSurfaceNames([availableSurfaceNames[0]]);
    }
    const surfaceAttrOptions = surfaceDirectory
        ? surfaceDirectory.getAttributeNames(null).map((attribute) => {
            return { label: attribute, value: attribute };
        })
        : [];

    React.useEffect(
        function propogateSurfaceSetAddress() {
            let surfaceSetSpec: SurfaceSetAddress | null = null;
            if (computedEnsembleIdent && selectedSurfaceAttribute && realizationsSurfaceNames) {
                surfaceSetSpec = {
                    caseUuid: computedEnsembleIdent.getCaseUuid(),
                    ensembleName: computedEnsembleIdent.getEnsembleName(),
                    realizationNums: selectedReals,
                    attribute: selectedSurfaceAttribute,
                    names: realizationsSurfaceNames,
                };
            }
            setSurfaceSetAddress(surfaceSetSpec);
        },
        [
            computedEnsembleIdent,
            selectedSurfaceAttribute,
            realizationsSurfaceNames,
            selectedReals,

        ]
    );
    React.useEffect(
        function propagateWellBoreAddressToView() {
            setWellboreAddress(selectedWellboreAddress);
        },
        [selectedWellboreAddress, setWellboreAddress]
    );
    React.useEffect(
        function propogateColorsToView() {
            if (surfaceDirectory && realizationsSurfaceNames) {

                const surfaceColorMap = createStratigraphyColors(
                    availableSurfaceNames?.sort() ?? [],
                    colorSet
                );
                moduleContext.getStateStore().setValue("stratigraphyColorMap", surfaceColorMap);
            }
        }
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
        if (newEnsembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [newEnsembleIdent]);
        }
    }

    function handleSurfaceAttributeChange(values: string[]) {
        if (values.length === 0) {
            setSelectedSurfaceAttribute(null);
            return;
        }
        setSelectedSurfaceAttribute(values[0]);
    }

    function handleWellChange(selectedWellboreUuids: string[], validWellboreList: Wellbore[]) {
        if (selectedWellboreUuids.length === 0) {
            setSelectedWellboreAddress(null);
            return;
        }

        // Use only first wellbore
        const wellboreUuid = selectedWellboreUuids[0];
        const wellUwi = validWellboreList.find((wellbore) => wellbore.uuid === wellboreUuid)?.uwi;

        if (!wellUwi) return;

        const newWellboreAddress: Wellbore = { type: wellboreType, uuid: wellboreUuid, uwi: wellUwi };
        setSelectedWellboreAddress(newWellboreAddress);
        syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", newWellboreAddress);
    }
    function makeStatisticCheckboxes() {
        return Object.values(StatisticFunction_api).map((value: StatisticFunction_api) => {
            return (
                <Checkbox
                    key={value}
                    label={StatisticFunctionEnumToStringMapping[value]}
                    checked={statisticFunctions?.includes(value)}
                    onChange={(event) => {
                        handleStatisticsChange(event, value);
                    }}
                />
            );
        });
    }


    function handleStatisticsChange(
        event: React.ChangeEvent<HTMLInputElement>,
        statistic: StatisticFunction_api
    ) {
        setStatisticFunctions((prev) => {
            if (event.target.checked) {
                return prev ? [...prev, statistic] : [statistic]
            } else {
                return prev ? prev.filter((item) => item !== statistic) : []
            }
        });
    }
    function handleVisualizationModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setVisualizationMode(event.target.value as VisualizationMode);
    }
    return (
        <div className="flex flex-col gap-4 overflow-y-auto">
            <CollapsibleGroup title="Ensemble and Realization" expanded={true}>
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                        <SingleEnsembleSelect
                            ensembleSet={ensembleSet}
                            value={computedEnsembleIdent ? computedEnsembleIdent : null}
                            onChange={handleEnsembleSelectionChange}
                        />
                    </Label>

                    <RealizationsSelect
                        availableRealizations={availableReals?.map((real) => real) ?? []}
                        selectedRealizations={selectedReals ?? []}
                        onChange={setSelectedReals}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well trajectory">
                <QueryStateWrapper
                    queryResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Official Wells">
                        <Select
                            options={availableWellboreList.map((header) => ({
                                label: header.uwi,
                                value: header.uuid,
                            }))}
                            value={computedWellboreAddress ? [computedWellboreAddress.uuid] : []}
                            onChange={(wellboreUuids: string[]) =>
                                handleWellChange(wellboreUuids, availableWellboreList)
                            }
                            size={10}
                            multiple={true}
                        />
                    </Label>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Surfaces" expanded>
                <QueryStateWrapper
                    queryResult={surfaceDirectoryQuery}
                    errorComponent={"Error loading seismic directory"}
                    loadingComponent={<CircularProgress />}
                >
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        <Label text="Surface attribute">
                            <Select
                                options={surfaceAttrOptions}
                                value={selectedSurfaceAttribute ? [selectedSurfaceAttribute] : []}
                                size={5}
                                onChange={handleSurfaceAttributeChange}
                            />
                        </Label>
                        <Label text="Surface names">
                            <Select
                                options={availableSurfaceNames?.map((name) => ({ label: name, value: name })) || []}
                                onChange={(e) => setRealizationsSurfaceNames(e)}
                                value={realizationsSurfaceNames || []}
                                size={5}
                                multiple={true}
                            />
                        </Label>

                    </div>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Visualization">
                <RadioGroup
                    value={visualizationMode}
                    options={Object.values(VisualizationMode).map((val: VisualizationMode) => {
                        return { value: val, label: VisualizationModeEnumToStringMapping[val] };
                    })}
                    onChange={handleVisualizationModeChange}
                />
                <div className="mt-4">
                    <Label text="Statistics Options">
                        <div
                            className={resolveClassNames({
                                "pointer-events-none opacity-40":
                                    visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS,
                            })}
                        >
                            {makeStatisticCheckboxes()}
                        </div>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection Settings" expanded={false}>
                <IntersectionSettingsSelect
                    intersectionSettings={intersectionSettings}
                    onChange={setIntersectionSettings}
                />
            </CollapsibleGroup>
        </div>
    );
}

function fixupSyncedOrSelectedOrFirstWellbore(
    syncedWellbore: Wellbore | null,
    selectedWellbore: Wellbore | null,
    legalWellbores: Wellbore[]
): Wellbore | null {
    const allUuids = legalWellbores.map((elm) => elm.uuid);
    if (syncedWellbore && allUuids.includes(syncedWellbore.uuid)) {
        return syncedWellbore;
    }
    if (selectedWellbore && allUuids.includes(selectedWellbore.uuid)) {
        return selectedWellbore;
    }
    if (legalWellbores.length !== 0) {
        return legalWellbores[0];
    }
    return null;
}




export function createStratigraphyColors(surfaceNames: string[], colorSet: ColorSet): StratigraphyColorMap {
    const colorMap: StratigraphyColorMap = {};
    surfaceNames.forEach((surfaceName, index) => {
        colorMap[surfaceName] = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
    });
    return colorMap;
}
