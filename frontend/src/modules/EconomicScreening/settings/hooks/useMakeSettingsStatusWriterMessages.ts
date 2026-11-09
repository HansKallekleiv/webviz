import { useCallback, useState } from "react";

import { isEqual } from "lodash-es";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import type { SettingAnnotation } from "@lib/components/Setting";

import { SetupIssueKind, type SetupReadiness } from "../../utils/setupReadiness";

/**
 * Flags as ActionRequired everything the user must change in Settings before the selected result can be
 * shown: invalid field values (error annotations reported by `Setting.Panel`) and missing inputs from the
 * setup readiness. Source-data issues are not flagged, since no input resolves them.
 */
export function useMakeSettingsStatusWriterMessages(
    statusWriter: SettingsStatusWriter,
    readiness: SetupReadiness,
): { handlePanelAnnotationsChange: (annotations: SettingAnnotation[]) => void } {
    const [invalidValueMessages, setInvalidValueMessages] = useState<string[]>([]);

    const handlePanelAnnotationsChange = useCallback(function handlePanelAnnotationsChange(
        annotations: SettingAnnotation[],
    ) {
        const messages = annotations
            .filter((annotation) => annotation.type === "error")
            .map((annotation) => annotation.message);
        setInvalidValueMessages((previous) => (isEqual(previous, messages) ? previous : messages));
    }, []);

    // An invalid saved ensemble also leaves no ensemble selected; its annotation already says why.
    const missingInputMessages = readiness.issues
        .filter(
            (issue) =>
                issue.kind === SetupIssueKind.INPUT && !(issue.field === "ensemble" && invalidValueMessages.length > 0),
        )
        .map((issue) => issue.message);

    for (const message of [...invalidValueMessages, ...missingInputMessages]) {
        statusWriter.flagActionRequired(message);
    }

    return { handlePanelAnnotationsChange };
}
