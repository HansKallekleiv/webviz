import React from "react";

import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps, ValueToStringArgs } from "../../interfaces";
import { SettingRegistry } from "../SettingRegistry";
import { SettingType } from "../settingsTypes";

export class EnsembleSetting implements Setting<RegularEnsembleIdent | DeltaEnsembleIdent | null> {
    private _delegate: SettingDelegate<RegularEnsembleIdent | DeltaEnsembleIdent | null>;

    constructor() {
        this._delegate = new SettingDelegate<RegularEnsembleIdent | DeltaEnsembleIdent | null>(null, this);
    }

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Ensemble";
    }

    getDelegate(): SettingDelegate<RegularEnsembleIdent | DeltaEnsembleIdent | null> {
        return this._delegate;
    }

    serializeValue(value: RegularEnsembleIdent | DeltaEnsembleIdent | null): string {
        return value?.toString() ?? "";
    }

    deserializeValue(serializedValue: string): RegularEnsembleIdent | DeltaEnsembleIdent | null {
        if (RegularEnsembleIdent.isValidEnsembleIdentString(serializedValue)) {
            return RegularEnsembleIdent.fromString(serializedValue);
        }
        if (DeltaEnsembleIdent.isValidEnsembleIdentString(serializedValue)) {
            return DeltaEnsembleIdent.fromString(serializedValue);
        }
        return null;

        // return serializedValue !== "" ? RegularEnsembleIdent.fromString(serializedValue) : null;
    }

    makeComponent(): (
        props: SettingComponentProps<RegularEnsembleIdent | DeltaEnsembleIdent | null>
    ) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<RegularEnsembleIdent | DeltaEnsembleIdent | null>) {
            const ensembles = props.globalSettings.ensembles.filter((ensemble) =>
                props.availableValues.includes(ensemble.getIdent())
            );

            return (
                <EnsembleDropdown
                    ensembles={ensembles}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    allowDeltaEnsembles
                    showArrows
                />
            );
        };
    }

    valueToString(args: ValueToStringArgs<RegularEnsembleIdent | DeltaEnsembleIdent | null>): string {
        const { value, workbenchSession } = args;
        if (value === null) {
            return "-";
        }

        return workbenchSession.getEnsembleSet().findEnsemble(value)?.getDisplayName() ?? "-";
    }
}

SettingRegistry.registerSetting(EnsembleSetting);
