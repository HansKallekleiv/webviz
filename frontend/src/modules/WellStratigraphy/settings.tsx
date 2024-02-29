import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { useValidState } from "@lib/hooks/useValidState";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import { isEqual } from "lodash";

import { useBlockedWellNames } from "./queryHooks";
import { State } from "./state";

const WELLBORE_TYPE = "smda";

export const settings = (props: ModuleFCProps<State>) => {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = props.moduleContext.useStoreState("ensembleIdent");
    const setWellboreAddress = props.moduleContext.useSetStoreValue("wellboreAddress");
    const computedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        console.log("fixing ensemble ident", selectedEnsembleIdent, computedEnsembleIdent);
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(newEnsembleIdent);
    }
    const [selectedWellboreAddress, setSelectedWellboreAddress] = React.useState<Wellbore | null>(
        props.moduleContext.useStoreValue("wellboreAddress")
    );
    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: WELLBORE_TYPE,
            uwi: wellbore.unique_wellbore_identifier,
            uuid: wellbore.wellbore_uuid,
        })) || [];
    const computedWellboreAddress = fixupSyncedOrSelectedOrFirstWellbore(
        null,
        selectedWellboreAddress || null,
        availableWellboreList
    );
    React.useEffect(
        function propagateWellBoreAddressToView() {
            setWellboreAddress(selectedWellboreAddress);
        },
        [selectedWellboreAddress, setWellboreAddress]
    );
    if (!isEqual(computedWellboreAddress, selectedWellboreAddress)) {
        setSelectedWellboreAddress(computedWellboreAddress);
    }

    function handleWellChange(selectedWellboreUuids: string[], validWellboreList: Wellbore[]) {
        console.log(selectedWellboreUuids, selectedWellboreUuids.length, validWellboreList);
        if (selectedWellboreUuids.length === 0) {
            setSelectedWellboreAddress(null);
            console.log("why");
            return;
        }

        // Use only first wellbore
        const wellboreUuid = selectedWellboreUuids[0];
        console.log(wellboreUuid);
        const wellUwi = validWellboreList.find((wellbore) => wellbore.uuid === wellboreUuid)?.uwi;
        console.log("asd");
        console.log("asdasd", wellboreUuid, wellUwi);
        if (!wellUwi) return;

        const newWellboreAddress: Wellbore = { type: WELLBORE_TYPE, uuid: wellboreUuid, uwi: wellUwi };
        setSelectedWellboreAddress(newWellboreAddress);
        // syncHelper.publishValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore", newWellboreAddress);
    }
    return (
        <div className="flex flex-col gap-4">
            <Label text="Ensemble:">
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={computedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
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
                        onChange={(wellboreUuids: string[]) => handleWellChange(wellboreUuids, availableWellboreList)}
                        size={10}
                        multiple={true}
                    />
                </Label>
            </QueryStateWrapper>
        </div>
    );
};
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
