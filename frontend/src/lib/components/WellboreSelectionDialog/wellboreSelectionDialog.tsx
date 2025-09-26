import React from "react";

import type { EnhancedWellboreHeader_api } from "@api";
import { Clear, Search, SelectAll, Deselect, FilterAlt, ExpandMore, ExpandLess } from "@mui/icons-material";

import { resolveClassNames } from "../../utils/resolveClassNames";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { Input } from "../Input";
import type { SelectOption } from "../Select";
import { Select } from "../Select";

export type WellboreSelectionDialogProps = {
    open: boolean;
    wellbores: EnhancedWellboreHeader_api[];
    selectedWellbores: EnhancedWellboreHeader_api[];
    onSelectionChange: (wellbores: EnhancedWellboreHeader_api[]) => void;
    onClose: () => void;
};

type WellGroup = {
    wellUuid: string;
    uniqueWellIdentifier: string;
    wellbores: EnhancedWellboreHeader_api[];
    // Enhanced with completion info
    hasPerforations: boolean;
    hasScreens: boolean;
    completionTypes: string[];
};

type FilterState = {
    searchText: string;
    purposes: string[];
    statuses: string[];
    // Completion filters
    completionTypes: string[]; // ["perforated", "screened", "none"]
    perforationStatuses: string[];
    screenStatuses: string[];
};

export function WellboreSelectionDialog(props: WellboreSelectionDialogProps): React.ReactNode {
    const [filters, setFilters] = React.useState<FilterState>({
        searchText: "",
        purposes: [],
        statuses: [],
        completionTypes: [],
        perforationStatuses: [],
        screenStatuses: [],
    });
    const [expandedWells, setExpandedWells] = React.useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = React.useState(false);

    // Group wellbores by wells and add completion info
    const wellGroups = React.useMemo(() => {
        const groups = new Map<string, WellGroup>();

        props.wellbores.forEach((wellbore) => {
            const wellUuid = wellbore.wellUuid;
            if (!groups.has(wellUuid)) {
                groups.set(wellUuid, {
                    wellUuid,
                    uniqueWellIdentifier: wellbore.uniqueWellIdentifier,
                    wellbores: [],
                    hasPerforations: false,
                    hasScreens: false,
                    completionTypes: [],
                });
            }
            const group = groups.get(wellUuid)!;
            group.wellbores.push(wellbore);

            // Update group completion info based on wellbores
            const hasPerforations = (wellbore.perforations?.length ?? 0) > 0;
            const hasScreens = (wellbore.screens?.length ?? 0) > 0;
            if (hasPerforations) group.hasPerforations = true;
            if (hasScreens) group.hasScreens = true;
        });

        // Set completion types for each group
        groups.forEach((group) => {
            const completionTypes = [];
            if (group.hasPerforations) completionTypes.push("perforated");
            if (group.hasScreens) completionTypes.push("screened");
            if (!group.hasPerforations && !group.hasScreens) completionTypes.push("none");
            group.completionTypes = completionTypes;
        });

        return Array.from(groups.values()).sort((a, b) => a.uniqueWellIdentifier.localeCompare(b.uniqueWellIdentifier));
    }, [props.wellbores]);

    // Get unique purposes and statuses for filters
    const { uniquePurposes, uniqueStatuses, uniqueCompletionTypes, uniquePerforationStatuses, uniqueScreenStatuses } =
        React.useMemo(() => {
            const purposes = new Set<string>();
            const statuses = new Set<string>();
            const completionTypes = new Set<string>();
            const perforationStatuses = new Set<string>();
            const screenStatuses = new Set<string>();

            props.wellbores.forEach((wellbore) => {
                if (wellbore.wellborePurpose) purposes.add(wellbore.wellborePurpose);
                if (wellbore.wellboreStatus) statuses.add(wellbore.wellboreStatus);

                // Completion type analysis
                const hasPerforations = (wellbore.perforations?.length ?? 0) > 0;
                const hasScreens = (wellbore.screens?.length ?? 0) > 0;

                if (hasPerforations) completionTypes.add("perforated");
                if (hasScreens) completionTypes.add("screened");
                if (!hasPerforations && !hasScreens) completionTypes.add("none");

                // Perforation statuses
                wellbore.perforations?.forEach((perf) => {
                    if (perf.status) perforationStatuses.add(perf.status);
                });

                // Screen descriptions/types (using description as status equivalent)
                wellbore.screens?.forEach((screen) => {
                    if (screen.description) screenStatuses.add(screen.description);
                    if (screen.symbolName) screenStatuses.add(screen.symbolName);
                });
            });

            return {
                uniquePurposes: Array.from(purposes).sort(),
                uniqueStatuses: Array.from(statuses).sort(),
                uniqueCompletionTypes: Array.from(completionTypes).sort(),
                uniquePerforationStatuses: Array.from(perforationStatuses).sort(),
                uniqueScreenStatuses: Array.from(screenStatuses).sort(),
            };
        }, [props.wellbores]);

    // Filter wellbores based on current filters
    const filteredWellGroups = React.useMemo(() => {
        return wellGroups
            .map((group) => {
                // First check completion type filters at the well level
                if (filters.completionTypes.length > 0) {
                    const hasMatchingCompletion = filters.completionTypes.some((type) =>
                        group.completionTypes?.includes(type),
                    );
                    if (!hasMatchingCompletion) {
                        return { ...group, wellbores: [] }; // Filter out entire well
                    }
                }

                return {
                    ...group,
                    wellbores: group.wellbores.filter((wellbore) => {
                        // Search text filter
                        if (filters.searchText) {
                            const searchLower = filters.searchText.toLowerCase();
                            const matchesSearch =
                                wellbore.uniqueWellboreIdentifier.toLowerCase().includes(searchLower) ||
                                wellbore.uniqueWellIdentifier.toLowerCase().includes(searchLower) ||
                                wellbore.wellborePurpose?.toLowerCase().includes(searchLower) ||
                                wellbore.wellboreStatus?.toLowerCase().includes(searchLower);

                            if (!matchesSearch) return false;
                        }

                        // Purpose filter
                        if (filters.purposes.length > 0 && !filters.purposes.includes(wellbore.wellborePurpose)) {
                            return false;
                        }

                        // Status filter
                        if (filters.statuses.length > 0 && !filters.statuses.includes(wellbore.wellboreStatus)) {
                            return false;
                        }

                        // Perforation status filter
                        if (filters.perforationStatuses.length > 0) {
                            const perforationStatuses = wellbore.perforations?.map((p) => p.status) ?? [];
                            const hasMatchingPerfStatus = perforationStatuses.some((status: string) =>
                                filters.perforationStatuses.includes(status),
                            );
                            if (!hasMatchingPerfStatus) return false;
                        }

                        // Screen status filter
                        if (filters.screenStatuses.length > 0) {
                            const screenStatuses = wellbore.screens?.map((s) => s.description ?? "unknown") ?? [];
                            const hasMatchingScreenStatus = screenStatuses.some((status: string) =>
                                filters.screenStatuses.includes(status),
                            );
                            if (!hasMatchingScreenStatus) return false;
                        }

                        return true;
                    }),
                };
            })
            .filter((group) => group.wellbores.length > 0);
    }, [wellGroups, filters]);

    const selectedWellboreUuids = React.useMemo(
        () => new Set(props.selectedWellbores.map((w) => w.wellboreUuid)),
        [props.selectedWellbores],
    );

    const allFilteredWellbores = React.useMemo(
        () => filteredWellGroups.flatMap((group) => group.wellbores),
        [filteredWellGroups],
    );

    const handleWellboreToggle = React.useCallback(
        (wellbore: EnhancedWellboreHeader_api) => {
            const isSelected = selectedWellboreUuids.has(wellbore.wellboreUuid);
            let newSelection: EnhancedWellboreHeader_api[];

            if (isSelected) {
                newSelection = props.selectedWellbores.filter((w) => w.wellboreUuid !== wellbore.wellboreUuid);
            } else {
                newSelection = [...props.selectedWellbores, wellbore];
            }

            props.onSelectionChange(newSelection);
        },
        [selectedWellboreUuids, props],
    );

    const handleWellToggle = React.useCallback(
        (wellGroup: WellGroup) => {
            const wellWellbores = wellGroup.wellbores;
            const allSelected = wellWellbores.every((w) => selectedWellboreUuids.has(w.wellboreUuid));

            let newSelection: EnhancedWellboreHeader_api[];
            if (allSelected) {
                // Remove all wellbores from this well - use Set for O(1) lookup performance
                const wellboreUuidsToRemove = new Set(wellWellbores.map((w) => w.wellboreUuid));
                newSelection = props.selectedWellbores.filter((w) => !wellboreUuidsToRemove.has(w.wellboreUuid));
            } else {
                // Add all wellbores from this well that aren't already selected
                const toAdd = wellWellbores.filter((w) => !selectedWellboreUuids.has(w.wellboreUuid));
                newSelection = [...props.selectedWellbores, ...toAdd];
            }

            // Use setTimeout to ensure the UI updates immediately
            setTimeout(() => props.onSelectionChange(newSelection), 0);
        },
        [selectedWellboreUuids, props],
    );

    const handleSelectAll = () => {
        props.onSelectionChange(allFilteredWellbores);
    };

    const handleDeselectAll = () => {
        props.onSelectionChange([]);
    };

    const toggleWellExpansion = (wellUuid: string) => {
        const newExpanded = new Set(expandedWells);
        if (newExpanded.has(wellUuid)) {
            newExpanded.delete(wellUuid);
        } else {
            newExpanded.add(wellUuid);
        }
        setExpandedWells(newExpanded);
    };

    const purposeOptions: SelectOption[] = uniquePurposes.map((purpose) => {
        const count = props.wellbores.filter((w) => w.wellborePurpose === purpose).length;
        return {
            value: purpose,
            label: `${purpose} (${count})`,
        };
    });

    const statusOptions: SelectOption[] = uniqueStatuses.map((status) => {
        const count = props.wellbores.filter((w) => w.wellboreStatus === status).length;
        return {
            value: status,
            label: `${status} (${count})`,
        };
    });

    const completionTypeOptions: SelectOption[] = uniqueCompletionTypes.map((type) => {
        const count = props.wellbores.filter((w) => {
            const hasPerforations = (w.perforations?.length ?? 0) > 0;
            const hasScreens = (w.screens?.length ?? 0) > 0;
            if (type === "perforated") return hasPerforations;
            if (type === "screened") return hasScreens;
            if (type === "none") return !hasPerforations && !hasScreens;
            return false;
        }).length;
        return {
            value: type,
            label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${count})`,
        };
    });

    const perforationStatusOptions: SelectOption[] = uniquePerforationStatuses.map((status) => {
        const count = props.wellbores.filter((w) => w.perforations?.some((p) => p.status === status)).length;
        return {
            value: status,
            label: `${status} (${count})`,
        };
    });

    const screenStatusOptions: SelectOption[] = uniqueScreenStatuses.map((status) => {
        const count = props.wellbores.filter((w) =>
            w.screens?.some((s) => s.description === status || s.symbolName === status),
        ).length;
        return {
            value: status,
            label: `${status} (${count})`,
        };
    });

    const totalActiveFilters =
        filters.purposes.length +
        filters.statuses.length +
        filters.completionTypes.length +
        filters.perforationStatuses.length +
        filters.screenStatuses.length;

    const hasActiveFilters = totalActiveFilters > 0;

    const dialogActions = (
        <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={props.onClose}>
                Cancel
            </Button>
            <Button variant="contained" onClick={props.onClose}>
                Apply ({props.selectedWellbores.length} selected)
            </Button>
        </div>
    );

    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            title="Select Wellbores"
            width="1200px"
            height="900px"
            showCloseCross
            actions={dialogActions}
        >
            <div className="flex flex-col h-full" style={{ height: "calc(900px - 140px)" }}>
                {/* Search and Filter Controls */}
                <div className="flex-shrink-0 flex flex-col gap-2 mb-4">
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
                            {filters.perforationStatuses.map((status) => (
                                <div
                                    key={status}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                                >
                                    Perf Status: {status}
                                    <Clear
                                        fontSize="inherit"
                                        className="cursor-pointer hover:bg-orange-200 rounded-full"
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                perforationStatuses: prev.perforationStatuses.filter(
                                                    (s) => s !== status,
                                                ),
                                            }))
                                        }
                                    />
                                </div>
                            ))}
                            {filters.screenStatuses.map((status) => (
                                <div
                                    key={status}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full"
                                >
                                    Screen Type: {status}
                                    <Clear
                                        fontSize="inherit"
                                        className="cursor-pointer hover:bg-teal-200 rounded-full"
                                        onClick={() =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                screenStatuses: prev.screenStatuses.filter((s) => s !== status),
                                            }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    )}

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

                            {/* Completion Detail Filters */}
                            {uniquePerforationStatuses.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Perforation Status
                                        </label>
                                        {filters.perforationStatuses.length > 0 && (
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() =>
                                                    setFilters((prev) => ({ ...prev, perforationStatuses: [] }))
                                                }
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <Select
                                        options={perforationStatusOptions}
                                        value={filters.perforationStatuses}
                                        onChange={(values) =>
                                            setFilters((prev) => ({ ...prev, perforationStatuses: values }))
                                        }
                                        multiple
                                        placeholder="All statuses"
                                        size={Math.min(4, uniquePerforationStatuses.length)}
                                        filter
                                    />
                                </div>
                            )}
                            {uniqueScreenStatuses.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700">Screen Type</label>
                                        {filters.screenStatuses.length > 0 && (
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => setFilters((prev) => ({ ...prev, screenStatuses: [] }))}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <Select
                                        options={screenStatusOptions}
                                        value={filters.screenStatuses}
                                        onChange={(values) =>
                                            setFilters((prev) => ({ ...prev, screenStatuses: values }))
                                        }
                                        multiple
                                        placeholder="All types"
                                        size={Math.min(4, uniqueScreenStatuses.length)}
                                        filter
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="flex gap-2 items-center">
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<SelectAll fontSize="small" />}
                            onClick={handleSelectAll}
                        >
                            Select All ({allFilteredWellbores.length})
                        </Button>
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<Deselect fontSize="small" />}
                            onClick={handleDeselectAll}
                        >
                            Deselect All
                        </Button>
                        {(filters.searchText || hasActiveFilters) && (
                            <Button
                                size="small"
                                variant="text"
                                startIcon={<Clear fontSize="small" />}
                                onClick={() =>
                                    setFilters({
                                        searchText: "",
                                        purposes: [],
                                        statuses: [],
                                        completionTypes: [],
                                        perforationStatuses: [],
                                        screenStatuses: [],
                                    })
                                }
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Clear All Filters
                            </Button>
                        )}
                        <div className="ml-auto text-sm text-gray-600">
                            {props.selectedWellbores.length} of {props.wellbores.length} wellbores selected
                            {allFilteredWellbores.length !== props.wellbores.length &&
                                ` (${allFilteredWellbores.length} filtered)`}
                        </div>
                    </div>
                </div>

                {/* Wellbores List */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-gray-300 rounded">
                    {filteredWellGroups.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No wellbores match the current filters</div>
                    ) : (
                        <div>
                            {filteredWellGroups.map((wellGroup) => {
                                const isExpanded = expandedWells.has(wellGroup.wellUuid);
                                const wellWellbores = wellGroup.wellbores;
                                const selectedCount = wellWellbores.filter((w) =>
                                    selectedWellboreUuids.has(w.wellboreUuid),
                                ).length;
                                const allSelected = selectedCount === wellWellbores.length;
                                const someSelected = selectedCount > 0 && selectedCount < wellWellbores.length;

                                return (
                                    <div key={wellGroup.wellUuid} className="border-b border-gray-200 last:border-b-0">
                                        {/* Well Header */}
                                        <div
                                            className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
                                            onClick={() => handleWellToggle(wellGroup)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={() => handleWellToggle(wellGroup)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mr-3"
                                                ref={(input) => {
                                                    if (input) {
                                                        input.indeterminate = someSelected;
                                                    }
                                                }}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-medium text-base">
                                                        {wellGroup.uniqueWellIdentifier}
                                                    </div>
                                                    {/* Completion type badges */}
                                                    {wellGroup.hasPerforations && (
                                                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                                                            Perf
                                                        </span>
                                                    )}
                                                    {wellGroup.hasScreens && (
                                                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                                            Screen
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {wellWellbores.length} wellbore
                                                    {wellWellbores.length !== 1 ? "s" : ""}
                                                    {selectedCount > 0 && ` (${selectedCount} selected)`}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleWellExpansion(wellGroup.wellUuid);
                                                }}
                                                className="p-1 hover:bg-gray-200 rounded"
                                                title={isExpanded ? "Collapse wellbores" : "Expand wellbores"}
                                            >
                                                {isExpanded ? (
                                                    <ExpandLess fontSize="small" />
                                                ) : (
                                                    <ExpandMore fontSize="small" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Wellbores */}
                                        {isExpanded && (
                                            <div className="bg-white">
                                                {wellWellbores.map((wellbore) => {
                                                    const isSelected = selectedWellboreUuids.has(wellbore.wellboreUuid);

                                                    return (
                                                        <div
                                                            key={wellbore.wellboreUuid}
                                                            className={resolveClassNames(
                                                                "flex items-start p-4 border-l-4 cursor-pointer hover:bg-blue-50 transition-colors",
                                                                {
                                                                    "border-l-blue-500 bg-blue-50": isSelected,
                                                                    "border-l-transparent": !isSelected,
                                                                },
                                                            )}
                                                            onClick={() => handleWellboreToggle(wellbore)}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleWellboreToggle(wellbore)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="mr-4"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="font-medium text-base mb-1">
                                                                    {wellbore.uniqueWellboreIdentifier}
                                                                </div>
                                                                <div className="grid grid-cols-4 gap-6 mt-2 text-sm text-gray-600">
                                                                    <div>
                                                                        <span className="font-medium">Purpose:</span>{" "}
                                                                        {wellbore.wellborePurpose || "N/A"}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Status:</span>{" "}
                                                                        {wellbore.wellboreStatus || "N/A"}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Location:</span> (
                                                                        {wellbore.wellEasting.toFixed(1)},{" "}
                                                                        {wellbore.wellNorthing.toFixed(1)})
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium">Depth Ref:</span>{" "}
                                                                        {wellbore.depthReferencePoint} (
                                                                        {wellbore.depthReferenceElevation.toFixed(1)}m)
                                                                    </div>
                                                                </div>
                                                                {/* Completion Data */}
                                                                {((wellbore.perforations?.length ?? 0) > 0 ||
                                                                    (wellbore.screens?.length ?? 0) > 0) && (
                                                                    <div className="grid grid-cols-2 gap-6 mt-3 text-xs">
                                                                        {(wellbore.perforations?.length ?? 0) > 0 && (
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                <span className="font-medium text-orange-700">
                                                                                    Perforations:
                                                                                </span>
                                                                                {wellbore
                                                                                    .perforations!.slice(0, 4)
                                                                                    .map((perf, idx) => (
                                                                                        <span
                                                                                            key={idx}
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"
                                                                                        >
                                                                                            {perf.status}
                                                                                        </span>
                                                                                    ))}
                                                                                {wellbore.perforations!.length > 4 && (
                                                                                    <span className="text-orange-600 font-medium">
                                                                                        +
                                                                                        {wellbore.perforations!.length -
                                                                                            4}{" "}
                                                                                        more
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {(wellbore.screens?.length ?? 0) > 0 && (
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                <span className="font-medium text-teal-700">
                                                                                    Screens:
                                                                                </span>
                                                                                {wellbore
                                                                                    .screens!.slice(0, 3)
                                                                                    .map((screen, idx) => (
                                                                                        <span
                                                                                            key={idx}
                                                                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800"
                                                                                        >
                                                                                            {screen.description ||
                                                                                                screen.symbolName ||
                                                                                                "Screen"}
                                                                                        </span>
                                                                                    ))}
                                                                                {wellbore.screens!.length > 3 && (
                                                                                    <span className="text-teal-600 font-medium">
                                                                                        +{wellbore.screens!.length - 3}{" "}
                                                                                        more
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
