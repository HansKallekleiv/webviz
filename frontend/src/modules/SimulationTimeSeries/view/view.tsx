import React from "react";

import { Download } from "@mui/icons-material";
import type ReactECharts from "echarts-for-react";
import { useAtomValue, useSetAtom } from "jotai";

import type { DeltaEnsemble } from "@framework/DeltaEnsemble";
import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useColorSet, useContinuousColorScale } from "@framework/WorkbenchSettings";
import { Button } from "@lib/components/Button";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { ContentError, ContentWarning } from "@modules/_shared/components/ContentMessage";
import type { ChartZoomState } from "@modules/_shared/eCharts";
import {
    Chart,
    useActiveTimestampMarker,
    useChartZoomSync,
    useClickToTimestamp,
} from "@modules/_shared/eCharts";

import type { Interfaces } from "../interfaces";
import type { VectorHexColorMap } from "../typesAndEnums";
import { GroupBy, SubplotOwner } from "../typesAndEnums";
import { isInvalidStatisticsResampleFrequency } from "../utils/resamplingFrequencyUtils";

import { resampleFrequencyAtom } from "./atoms/baseAtoms";
import {
    loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndObservationDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
    queryIsFetchingAtom,
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
} from "./atoms/derivedAtoms";
import { activeTimestampUtcMsAtom } from "./atoms/persistableFixableAtoms";
import { useDownloadData } from "./hooks/useDownloadData";
import { useMakeEnsembleDisplayNameFunc } from "./hooks/useMakeEnsembleDisplayNameFunc";
import { useMakeResampleFrequencyWarningMessage } from "./hooks/useMakeResampleFrequencyWarningMessage";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { buildEChartOption } from "./utils/buildEChartOption";
import { EnsemblesContinuousParameterColoring } from "./utils/ensemblesContinuousParameterColoring";

export const View = ({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) => {
    const statusWriter = useViewStatusWriter(viewContext);
    const chartRef = React.useRef<ReactECharts>(null);

    const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    const parameterIdent = viewContext.useSettingsToViewInterfaceValue("parameterIdent");
    const selectedEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedRegularEnsembles");
    const selectedDeltaEnsembles = viewContext.useSettingsToViewInterfaceValue("selectedDeltaEnsembles");
    const vectorSpecifications = viewContext.useSettingsToViewInterfaceValue("vectorSpecifications");
    const groupBy = viewContext.useSettingsToViewInterfaceValue("groupBy");
    const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");

    const hasRealizationsQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    const hasStatisticsQueryError = useAtomValue(statisticsQueryHasErrorAtom);
    const isAnyQueryLoading = useAtomValue(queryIsFetchingAtom);
    const resampleFrequency = useAtomValue(resampleFrequencyAtom);
    const realizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const statisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const historicalData = useAtomValue(loadedRegularEnsembleVectorSpecificationsAndHistoricalDataAtom);
    const observationData = useAtomValue(loadedVectorSpecificationsAndObservationDataAtom);

    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom).value;
    const setActiveTimestampUtcMs = useSetAtom(activeTimestampUtcMsAtom);

    const [zoomState, setZoomState] = React.useState<ChartZoomState>({});
    const { appliedZoomState, handleDataZoom } = useChartZoomSync(zoomState, setZoomState);

    const colorSet = useColorSet(workbenchSettings);
    const parameterColorScale = useContinuousColorScale(workbenchSettings, {
        gradientType: ColorScaleGradientType.Diverging,
    });

    const vectorHexColorMap: VectorHexColorMap = {};
    vectorSpecifications.forEach((vectorSpec, index) => {
        if (vectorSpec.vectorName in vectorHexColorMap) return;
        vectorHexColorMap[vectorSpec.vectorName] = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
    });

    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

    const ensemblesParameterColoring =
        colorByParameter && parameterIdent
            ? new EnsemblesContinuousParameterColoring(selectedEnsembles, parameterIdent, parameterColorScale)
            : null;

    const ensemblesWithoutParameter: (RegularEnsemble | DeltaEnsemble)[] = [];
    let parameterDisplayName: string | null = null;
    if (ensemblesParameterColoring) {
        ensemblesWithoutParameter.push(
            ...selectedEnsembles.filter(
                (ensemble) => !ensemblesParameterColoring.hasParameterForEnsemble(ensemble.getIdent()),
            ),
        );
        parameterDisplayName = ensemblesParameterColoring.getParameterDisplayName();
        ensemblesWithoutParameter.push(...selectedDeltaEnsembles);
    }

    useMakeViewStatusWriterMessages(statusWriter, parameterDisplayName, ensemblesWithoutParameter);
    usePublishToDataChannels(viewContext, subplotOwner, vectorHexColorMap);
    const resampleFrequencyWarningMessage = useMakeResampleFrequencyWarningMessage();
    const { assembleCsvAndDownload } = useDownloadData(viewContext);
    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    const invalidResampleFrequency = isInvalidStatisticsResampleFrequency(resampleFrequency, visualizationMode);

    const echartsOptions = React.useMemo(() => {
        if (invalidResampleFrequency) return { option: {}, timestamps: [] as number[] };
        return buildEChartOption({
            subplotOwner,
            selectedVectorSpecifications: vectorSpecifications,
            visualizationMode,
            statisticsSelection,
            realizationData,
            statisticsData,
            historicalData,
            observationData,
            vectorHexColorMap,
            ensemblesParameterColoring,
            showHistorical,
            showObservations,
            colorByParameter,
            resampleFrequency,
            makeEnsembleDisplayName,
            baseOptions: { zoomState: appliedZoomState },
        });
        // vectorHexColorMap is rebuilt every render; its contents are stable when vectorSpecifications are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        invalidResampleFrequency,
        subplotOwner,
        vectorSpecifications,
        visualizationMode,
        statisticsSelection,
        realizationData,
        statisticsData,
        historicalData,
        observationData,
        ensemblesParameterColoring,
        showHistorical,
        showObservations,
        colorByParameter,
        resampleFrequency,
        makeEnsembleDisplayName,
        appliedZoomState,
    ]);

    useClickToTimestamp(
        chartRef,
        echartsOptions.timestamps,
        activeTimestampUtcMs ?? null,
        setActiveTimestampUtcMs,
        echartsOptions.option,
    );
    useActiveTimestampMarker(chartRef, activeTimestampUtcMs ?? null, echartsOptions.option);

    const hasQueryErrors = hasRealizationsQueryError || hasStatisticsQueryError;
    const hasNoChart = vectorSpecifications.length === 0;

    const viewContent = (() => {
        if (resampleFrequencyWarningMessage !== null) {
            return <ContentWarning>{resampleFrequencyWarningMessage}</ContentWarning>;
        }
        if (hasQueryErrors) {
            return <ContentError>One or more queries have an error state. See the log for details.</ContentError>;
        }
        if (hasNoChart) {
            return <ContentWarning>Select vectors to visualize</ContentWarning>;
        }
        return (
            <Chart
                chartRef={chartRef}
                option={echartsOptions.option}
                onDataZoom={handleDataZoom}
            />
        );
    })();

    return (
        <div className="w-full h-full overflow-hidden relative">
            {!hasNoChart && !resampleFrequencyWarningMessage && !hasQueryErrors && (
                <div className="absolute top-2 right-14 z-10 flex gap-2">
                    <Button
                        size="small"
                        variant="outlined"
                        title="Download CSV"
                        onClick={assembleCsvAndDownload}
                        disabled={isAnyQueryLoading}
                        startIcon={<Download fontSize="small" />}
                    >
                        CSV
                    </Button>
                </div>
            )}
            {viewContent}
        </div>
    );
};
