import React from "react";

import { InplaceVolumetricTableDefinition_api, InplaceVolumetricsCategoryValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";
import { UseQueryResult } from "@tanstack/react-query";

import { table } from "console";
import { isEqual } from "lodash";

import { useTableDescriptionsQuery } from "./queryHooks";
import { State } from "./state";
import { VolumetricResponseNamesMapping } from "./types";

//-----------------------------------------------------------------------------------------------------------

function sortedResponses(responses: string[]): string[] {
    return Object.keys(VolumetricResponseNamesMapping).filter((response) => responses.includes(response));
}
function responsesToSelectOptions(responses: string[]): { value: string; label: string }[] {
    return (
        responses.map((response: string) => ({
            value: response,
            label: VolumetricResponseNamesMapping[response as keyof typeof VolumetricResponseNamesMapping],
        })) ?? []
    );
}
function getTableNameOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricTableDefinition_api[]>
): { value: string; label: string }[] {
    return (
        tableDescriptionsQuery.data?.map((table: InplaceVolumetricTableDefinition_api) => ({
            value: table.name,
            label: table.name,
        })) ?? []
    );
}
function getTableCategoricalOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricTableDefinition_api[]>,
    tableName: string | null
): InplaceVolumetricsCategoryValues_api[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    return tableDescription?.categories ?? [];
}
function getTableResponseOptions(
    tableDescriptionsQuery: UseQueryResult<InplaceVolumetricTableDefinition_api[]>,
    tableName: string | null
): { value: string; label: string }[] {
    const tableDescription = tableDescriptionsQuery.data?.find((table) => table.name === tableName);
    const responses = sortedResponses(tableDescription?.result_names ?? []);
    return responsesToSelectOptions(responses);
}

export function Settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [ensembleIdent, setEnsembleIdent] = moduleContext.useStoreState("ensembleIdent");
    const [tableName, setTableName] = moduleContext.useStoreState("tableName");
    const [categoricalFilter, setCategoricalFilter] = moduleContext.useStoreState("categoricalFilter");
    const [responseName, setResponseName] = moduleContext.useStoreState("responseName");

    const tableDescriptionsQuery = useTableDescriptionsQuery(ensembleIdent, true);

    React.useEffect(
        function selectDefaultEnsemble() {
            const fixedEnsembleIdent = fixupEnsembleIdent(ensembleIdent, ensembleSet);
            if (fixedEnsembleIdent !== ensembleIdent) {
                setEnsembleIdent(fixedEnsembleIdent);
            }
        },
        [ensembleSet, ensembleIdent, setEnsembleIdent]
    );

    React.useEffect(
        function selectDefaultTable() {
            if (tableDescriptionsQuery.data) {
                setTableName(tableDescriptionsQuery.data[0].name);
                const responses = tableDescriptionsQuery.data[0].result_names;
                setResponseName(sortedResponses(responses)[0]);
            } else {
                setTableName(null);
                setResponseName(null);
            }
        },
        [tableDescriptionsQuery.data, setTableName, setResponseName]
    );

    function handleEnsembleSelectionChange(newEnsembleIdent: EnsembleIdent | null) {
        setEnsembleIdent(newEnsembleIdent);
    }
    function handleTableChange(tableName: string) {
        setTableName(tableName);
    }
    function handleResponseChange(responseName: string) {
        setResponseName(responseName);
    }

    const handleSelectionChange = React.useCallback(
        function handleSelectionChange(categoryName: string, categoryValues: string[]) {
            let currentCategoryFilter = categoricalFilter;
            if (currentCategoryFilter) {
                const categoryIndex = currentCategoryFilter.findIndex(
                    (category) => category.category_name === categoryName
                );
                if (categoryIndex > -1) {
                    currentCategoryFilter[categoryIndex].unique_values = categoryValues;
                } else {
                    currentCategoryFilter.push({ category_name: categoryName, unique_values: categoryValues });
                }
            } else {
                currentCategoryFilter = [];
                currentCategoryFilter.push({ category_name: categoryName, unique_values: categoryValues });
            }

            setCategoricalFilter(currentCategoryFilter);
        },
        [categoricalFilter, setCategoricalFilter]
    );

    const tableNameOptions = getTableNameOptions(tableDescriptionsQuery);
    const tableCategoricalOptions = getTableCategoricalOptions(tableDescriptionsQuery, tableName);
    if (!categoricalFilter && tableCategoricalOptions) {
        setCategoricalFilter(tableCategoricalOptions);
    } else if (categoricalFilter && tableCategoricalOptions) {
        let newCategories = categoricalFilter;

        // Check if there are new categories
        if (newCategories.length !== tableCategoricalOptions.length) {
            setCategoricalFilter(tableCategoricalOptions);
        }

        // Check if there are changes in category values
    }
    const responseOptions = getTableResponseOptions(tableDescriptionsQuery, tableName);

    return (
        <>
            <Label text="Ensemble">
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={ensembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <QueryStateWrapper
                queryResult={tableDescriptionsQuery}
                loadingComponent={<CircularProgress />}
                errorComponent={"Could not load table descriptions"}
                className="flex flex-col gap-4"
            >
                <Label text="Volumetric table">
                    <Dropdown
                        options={tableNameOptions}
                        value={tableName ?? ""}
                        onChange={(tableName) => handleTableChange(tableName as string)}
                    />
                </Label>
                <Label text="Volume response">
                    <Dropdown
                        options={responseOptions}
                        value={responseName ?? ""}
                        onChange={(responseName) => handleResponseChange(responseName as string)}
                    />
                </Label>
                <h6>Filters</h6>
                {tableCategoricalOptions?.map((category) => {
                    return (
                        <Label key={category.category_name} text={category.category_name}>
                            <Select
                                key={category.category_name}
                                options={category.unique_values.map((value) => ({
                                    value: value as string,
                                    label: value as string,
                                }))}
                                value={category.unique_values as string[]}
                                onChange={(unique_values) =>
                                    handleSelectionChange(category.category_name, unique_values as string[])
                                }
                                size={5}
                                multiple={true}
                            />
                        </Label>
                    );
                })}
            </QueryStateWrapper>
        </>
    );
}
