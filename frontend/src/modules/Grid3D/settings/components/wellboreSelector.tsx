import React from "react";

import { WellboreHeader_api } from "@api";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

export type WellboreSelectorProps = {
    wellboreHeaders: WellboreHeader_api[];
    selectedWellboreUuids: string[];
    onSelectedWellboreUuidsChange: (wellboreUuids: string[]) => void;
};

export function WellboreSelector(props: WellboreSelectorProps): React.ReactNode {
    function handleSelectAll() {
        props.onSelectedWellboreUuidsChange(props.wellboreHeaders.map((header) => header.wellbore_uuid));
    }
    function handleSelectNone() {
        props.onSelectedWellboreUuidsChange([]);
    }
    return (
        <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 items-center">
                <Label text="All" position="above">
                    <SelectAll titleAccess={"Select all"} className="cursor-pointer" onClick={handleSelectAll} />
                </Label>{" "}
                <Label text="None" position="above">
                    <Deselect titleAccess={"Select none"} className="cursor-pointer" onClick={handleSelectNone} />
                </Label>
            </div>
            <Select
                options={makeWellHeadersOptions(props.wellboreHeaders)}
                value={props.selectedWellboreUuids ?? []}
                onChange={props.onSelectedWellboreUuidsChange}
                size={5}
                filter
                multiple
                debounceTimeMs={600}
            />
        </div>
    );
}
function makeWellHeadersOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        label: wellHeader.unique_wellbore_identifier,
        value: wellHeader.wellbore_uuid,
    }));
}
