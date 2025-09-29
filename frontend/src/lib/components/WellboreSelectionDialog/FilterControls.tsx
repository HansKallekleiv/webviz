import type React from "react";

import { Clear, Search, FilterAlt } from "@mui/icons-material";

import { Button } from "../Button";
import { Input } from "../Input";
import type { SelectOption } from "../Select";
import { Select } from "../Select";

import type { FilterState } from "./types";

interface FilterControlsProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    showFilters: boolean;
    setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
    purposeOptions: SelectOption[];
    statusOptions: SelectOption[];
    completionTypeOptions: SelectOption[];
    completionDetailOptions: SelectOption[];
    uniquePurposes: string[];
    uniqueStatuses: string[];
    uniqueCompletionTypes: string[];
    uniqueCompletionDetails: string[];
}

export function FilterControls({
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    purposeOptions,
    statusOptions,
    completionTypeOptions,
    completionDetailOptions,
    uniquePurposes,
    uniqueStatuses,
    uniqueCompletionTypes,
    uniqueCompletionDetails,
}: FilterControlsProps) {
    const totalActiveFilters =
        filters.purposes.length +
        filters.statuses.length +
        filters.completionTypes.length +
        filters.completionDetails.length;

    const hasActiveFilters = totalActiveFilters > 0;

    return (
        <>
            {/* Search and Filter Controls */}
            <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                    <Input
                        placeholder="Search wellbores, wells, purpose, or status..."
                        value={filters.searchText}
                        onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
                        startAdornment={<Search fontSize="small" />}
                        endAdornment={
                            filters.searchText && (
                                <Clear
                                    fontSize="small"
                                    className="cursor-pointer"
                                    onClick={() => setFilters((prev) => ({ ...prev, searchText: "" }))}
                                />
                            )
                        }
                    />
                </div>
                <Button
                    variant="outlined"
                    startIcon={<FilterAlt fontSize="small" />}
                    onClick={() => setShowFilters(!showFilters)}
                    color={hasActiveFilters ? "primary" : undefined}
                >
                    Filters {hasActiveFilters && `(${totalActiveFilters})`}
                </Button>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-1">
                    {filters.purposes.map((purpose) => (
                        <div
                            key={purpose}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                            Purpose: {purpose}
                            <Clear
                                fontSize="inherit"
                                className="cursor-pointer hover:bg-blue-200 rounded-full"
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        purposes: prev.purposes.filter((p) => p !== purpose),
                                    }))
                                }
                            />
                        </div>
                    ))}
                    {filters.statuses.map((status) => (
                        <div
                            key={status}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                            Status: {status}
                            <Clear
                                fontSize="inherit"
                                className="cursor-pointer hover:bg-green-200 rounded-full"
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        statuses: prev.statuses.filter((s) => s !== status),
                                    }))
                                }
                            />
                        </div>
                    ))}
                    {filters.completionTypes.map((type) => (
                        <div
                            key={type}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                        >
                            Completion: {type}
                            <Clear
                                fontSize="inherit"
                                className="cursor-pointer hover:bg-purple-200 rounded-full"
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        completionTypes: prev.completionTypes.filter((c) => c !== type),
                                    }))
                                }
                            />
                        </div>
                    ))}
                    {filters.completionDetails.map((detail) => (
                        <div
                            key={detail}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                            {detail === "Screen" ? "Screen" : `Perf: ${detail}`}
                            <Clear
                                fontSize="inherit"
                                className="cursor-pointer hover:bg-blue-200 rounded-full"
                                onClick={() =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        completionDetails: prev.completionDetails.filter((d) => d !== detail),
                                    }))
                                }
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg border">
                    {/* Basic Filters */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Purpose</label>
                            {filters.purposes.length > 0 && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setFilters((prev) => ({ ...prev, purposes: [] }))}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <Select
                            options={purposeOptions}
                            value={filters.purposes}
                            onChange={(values) => setFilters((prev) => ({ ...prev, purposes: values }))}
                            multiple
                            placeholder="All purposes"
                            size={Math.min(4, uniquePurposes.length)}
                            filter
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            {filters.statuses.length > 0 && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setFilters((prev) => ({ ...prev, statuses: [] }))}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <Select
                            options={statusOptions}
                            value={filters.statuses}
                            onChange={(values) => setFilters((prev) => ({ ...prev, statuses: values }))}
                            multiple
                            placeholder="All statuses"
                            size={Math.min(4, uniqueStatuses.length)}
                            filter
                        />
                    </div>
                    {/* Completion Filters */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Completion Type</label>
                            {filters.completionTypes.length > 0 && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setFilters((prev) => ({ ...prev, completionTypes: [] }))}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <Select
                            options={completionTypeOptions}
                            value={filters.completionTypes}
                            onChange={(values) => setFilters((prev) => ({ ...prev, completionTypes: values }))}
                            multiple
                            placeholder="All types"
                            size={Math.min(4, uniqueCompletionTypes.length)}
                            filter
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Completion Details</label>
                            {filters.completionDetails.length > 0 && (
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setFilters((prev) => ({ ...prev, completionDetails: [] }))}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        <Select
                            options={completionDetailOptions}
                            value={filters.completionDetails}
                            onChange={(values) => setFilters((prev) => ({ ...prev, completionDetails: values }))}
                            multiple
                            placeholder="All details"
                            size={Math.min(4, uniqueCompletionDetails.length)}
                            filter
                        />
                    </div>
                    {/* Clear All */}
                    <div className="flex flex-col justify-end">
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                                setFilters({
                                    searchText: "",
                                    purposes: [],
                                    statuses: [],
                                    completionTypes: [],
                                    completionDetails: [],
                                })
                            }
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Clear All Filters
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
