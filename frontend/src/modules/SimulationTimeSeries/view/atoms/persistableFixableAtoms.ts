import { persistableFixableAtom } from "@framework/utils/atomUtils";

export const activeTimestampUtcMsAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: () => {
        return true;
    },
    fixupFunction: ({ value }) => {
        return value ?? null;
    },
});
