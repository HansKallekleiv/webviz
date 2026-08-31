import { DataProviderType } from "../dataProviderTypes";
import { InplaceVolumesProvider } from "../implementations/InplaceVolumesProvider";
import {
    SummaryVectorHistoryProvider,
    SummaryVectorObservationsProvider,
} from "../implementations/SummaryVectorAuxiliaryProviders";
import { SummaryVectorProvider } from "../implementations/SummaryVectorProvider";

import { DataProviderRegistry } from "./_DataProviderRegistry";

DataProviderRegistry.registerDataProvider(DataProviderType.SUMMARY_VECTOR, SummaryVectorProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.SUMMARY_VECTOR_HISTORY, SummaryVectorHistoryProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.SUMMARY_VECTOR_OBSERVATIONS, SummaryVectorObservationsProvider);
DataProviderRegistry.registerDataProvider(DataProviderType.INPLACE_VOLUMES, InplaceVolumesProvider);