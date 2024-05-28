import React from "react";

import { WellboreHeader_api } from "@api";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Radio } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import { userSelectedCustomIntersectionPolylineIdAtom, userSelectedWellboreUuidAtom } from "./atoms/baseAtoms";
import {
    availableUserCreatedIntersectionPolylinesAtom,
    selectedCustomIntersectionPolylineIdAtom,
    selectedWellboreAtom,
} from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { Layers } from "./components/layers";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";
import { ViewAtoms } from "../view/atoms/atomDefinitions";

export function Settings(
    props: ModuleSettingsProps<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>
): JSX.Element {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [intersectionExtensionLength, setIntersectionExtensionLength] =
        props.settingsContext.useSettingsToViewInterfaceState("intersectionExtensionLength");
    const [epsilon, setEpsilon] = props.settingsContext.useSettingsToViewInterfaceState("curveFittingEpsilon");

    const [prevSyncedIntersection, setPrevSyncedIntersection] = React.useState<Intersection | null>(null);

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");

    const [intersectionType, setIntersectionType] =
        props.settingsContext.useSettingsToViewInterfaceState("intersectionType");

    const wellHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);

    const selectedWellboreHeader = useAtomValue(selectedWellboreAtom);
    const setSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);

    const availableUserCreatedIntersectionPolylines = useAtomValue(availableUserCreatedIntersectionPolylinesAtom);
    const selectedCustomIntersectionPolylineId = useAtomValue(selectedCustomIntersectionPolylineIdAtom);
    const setSelectedCustomIntersectionPolylineId = useSetAtom(userSelectedCustomIntersectionPolylineIdAtom);

    if (!isEqual(syncedIntersection, prevSyncedIntersection)) {
        setPrevSyncedIntersection(syncedIntersection);
        if (syncedIntersection) {
            setIntersectionType(syncedIntersection.type);

            if (syncedIntersection.type === IntersectionType.WELLBORE) {
                setSelectedWellboreHeader(syncedIntersection.uuid);
            } else if (syncedIntersection.type === IntersectionType.CUSTOM_POLYLINE) {
                setSelectedCustomIntersectionPolylineId(syncedIntersection.uuid);
            }
        }
    }

    let wellHeadersErrorMessage = "";
    if (wellHeaders.isError) {
        statusWriter.addError("Failed to load well headers");
        wellHeadersErrorMessage = "Failed to load well headers";
    }

    function handleWellHeaderSelectionChange(wellHeader: string[]) {
        const uuid = wellHeader.at(0);
        setSelectedWellboreHeader(uuid ?? null);
        const intersection: Intersection = {
            type: IntersectionType.WELLBORE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleIntersectionExtensionLengthChange(event: React.ChangeEvent<HTMLInputElement>) {
        setIntersectionExtensionLength(parseFloat(event.target.value));
    }

    function handleEpsilonChange(event: React.ChangeEvent<HTMLInputElement>) {
        setEpsilon(parseFloat(event.target.value));
    }

    function handleIntersectionTypeChange(type: IntersectionType) {
        setIntersectionType(type);
        const uuid =
            type === IntersectionType.WELLBORE ? selectedWellboreHeader?.uuid : selectedCustomIntersectionPolylineId;
        const intersection: Intersection = {
            type: type,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleCustomPolylineSelectionChange(customPolylineId: string[]) {
        const uuid = customPolylineId.at(0) ?? null;
        setSelectedCustomIntersectionPolylineId(uuid);
        const intersection: Intersection = {
            type: IntersectionType.CUSTOM_POLYLINE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Intersection" expanded>
                <div className="flex flex-col gap-4 text-sm mb-4">
                    <Radio
                        name="intersectionType"
                        value={intersectionType}
                        checked={intersectionType === IntersectionType.WELLBORE}
                        onChange={() => handleIntersectionTypeChange(IntersectionType.WELLBORE)}
                        label={<strong>Use wellbore</strong>}
                    />
                    <div
                        className={resolveClassNames("flex flex-col gap-2", {
                            "opacity-30 pointer-events-none": intersectionType !== IntersectionType.WELLBORE,
                        })}
                    >
                        <PendingWrapper isPending={wellHeaders.isFetching} errorMessage={wellHeadersErrorMessage}>
                            <Select
                                options={makeWellHeaderOptions(wellHeaders.data ?? [])}
                                value={selectedWellboreHeader ? [selectedWellboreHeader.uuid] : []}
                                onChange={handleWellHeaderSelectionChange}
                                size={5}
                                filter
                                debounceTimeMs={600}
                                disabled={intersectionType !== IntersectionType.WELLBORE}
                            />
                        </PendingWrapper>
                        <Label text="Epsilon">
                            <Input type="number" value={epsilon} min={0} onChange={handleEpsilonChange} />
                        </Label>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Radio
                            name="intersectionType"
                            value={intersectionType}
                            checked={intersectionType === IntersectionType.CUSTOM_POLYLINE}
                            onChange={() => handleIntersectionTypeChange(IntersectionType.CUSTOM_POLYLINE)}
                            label={<strong>Use custom polyline</strong>}
                        />
                        <Select
                            options={makeCustomIntersectionPolylineOptions(availableUserCreatedIntersectionPolylines)}
                            value={selectedCustomIntersectionPolylineId ? [selectedCustomIntersectionPolylineId] : []}
                            onChange={handleCustomPolylineSelectionChange}
                            size={5}
                            disabled={intersectionType !== IntersectionType.CUSTOM_POLYLINE}
                            placeholder="No custom polylines"
                        />
                    </div>
                    <Label text="Intersection extension length">
                        <Input
                            type="number"
                            value={intersectionExtensionLength}
                            min={0}
                            onChange={handleIntersectionExtensionLengthChange}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <div className="flex-grow flex flex-col min-h-0">
                <Layers
                    ensembleSet={ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            </div>
        </div>
    );
}

function makeWellHeaderOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        value: wellHeader.wellbore_uuid,
        label: wellHeader.unique_wellbore_identifier,
    }));
}

function makeCustomIntersectionPolylineOptions(polylines: IntersectionPolyline[]): SelectOption[] {
    return polylines.map((polyline) => ({
        label: polyline.name,
        value: polyline.id,
    }));
}
