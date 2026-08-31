import { atom } from "jotai";

import type { DataProviderManager } from "@framework/dataProviderFramework/framework/DataProviderManager/DataProviderManager";

export const dataProviderManagerAtom = atom<DataProviderManager | null>(null);
export const dataProviderStateAtom = atom<string>("");