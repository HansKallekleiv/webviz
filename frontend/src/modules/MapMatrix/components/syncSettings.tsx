import React from "react";

import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";

type SyncedSettings = {
    [key: string]: boolean;
};

type SyncSettingsProps = {
    syncedSettings: SyncedSettings;
    onChange: (syncedSettingKey: string) => void;
};

export const SyncSettings: React.FC<SyncSettingsProps> = (props) => {
    return (
        <>
            {Object.entries(props.syncedSettings).map(([key, value]) => (
                <div className="flex gap-2" key={key}>
                    {key}
                    <Switch checked={value} onChange={() => props.onChange(key)} />
                </div>
            ))}
        </>
    );
};
