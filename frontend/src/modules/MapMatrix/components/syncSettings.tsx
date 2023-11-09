import React from "react";

import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";

import { SyncedSettings } from "../settings";

type SyncSettingsProps = {
    syncedSettings: SyncedSettings;
    onChange: (syncedSettings: SyncedSettings) => void;
};

export const SyncSettings: React.FC<SyncSettingsProps> = (props) => {
    function handleSyncedSettingsChange(key: any, value: boolean) {
        const updatedSyncedSettings = { ...props.syncedSettings, [key]: value };
        props.onChange(updatedSyncedSettings);
    }

    return (
        <>
            {Object.keys(props.syncedSettings).map((key: any) => (
                <div className="flex gap-2" key={key}>
                    <Switch
                        checked={props.syncedSettings[key as keyof SyncedSettings]}
                        onChange={(e) => handleSyncedSettingsChange(key, e.target.checked)}
                    />
                    {key}
                </div>
            ))}
        </>
    );
};
