from typing import Any, Dict, List, Sequence
import asyncio

import numpy as np
import pyarrow as pa
import pyarrow.compute as pc

from primary.services.sumo_access.inplace_volumetrics_acces_NEW import InplaceVolumetricsAccess
from primary.services.sumo_access.inplace_volumetrics_types import (
    AccumulateByEach,
    AggregateByEach,
    FluidZone,
    InplaceVolumetricsIndex,
    InplaceVolumetricsIndexNames,
    InplaceVolumetricsTableDefinition,
    InplaceVolumetricTableDataPerFluidSelection
)

from ._conversion._conversion import (
    get_available_properties_from_volume_names,
    get_fluid_zones,
    get_properties_in_response_names,
    get_required_volume_names_from_properties,
    get_volume_names_and_equation_from_properties,
    get_volume_names_from_raw_volumetric_column_names,
    calculate_property_from_volume_arrays,
    create_raw_volumetric_columns_from_volume_name_and_fluid_zones,
    create_raw_volumetric_columns_from_volume_names_and_fluid_zones,
)

# Index column values to ignore, i.e. remove from the volumetric tables
IGNORED_INDEX_COLUMN_VALUES = ["Totals"]

# - InplaceVolumetricsConstructor
# - InplaceVolumetricsFabricator
# - InplaceVolumetricsDataManufacturer


class InplaceVolumetricsProvider:
    """
    This class provides an interface for interacting with definitions used in front-end for assembling and providing
    metadata and inplace volumetrics table data

    The class interacts with the InplaceVolumetricsAccess class to retrieve data from Sumo and assemble it into a format
    that can be used in the front-end. It also performs validation of the data and aggregation methods where needed.

    The provider contains conversion from response names, properties and fluid zones into volumetric column names that can
    be used to fetch data from Sumo.

    Front-end: responses = volume_columns + properties

    Sumo: volumetric_column_names = responses + fluid_zones


    """

    def __init__(self, inplace_volumetrics_access: InplaceVolumetricsAccess):
        self._inplace_volumetrics_access = inplace_volumetrics_access

    # TODO: When having metadata, provide all column names, and the get the possible properties from the response names
    # Provide the available properties from metadata, without suffix and provide possible FluidZones
    async def get_volumetric_table_metadata(self) -> Any:
        vol_table_names = await self._inplace_volumetrics_access.get_inplace_volumetrics_table_names_async()

        async def get_named_inplace_volumetrics_table_async(table_name: str) -> Dict[str, pa.Table]:
            return {table_name: await self._inplace_volumetrics_access.get_inplace_volumetrics_table_async(table_name)}

        tasks = [
            asyncio.create_task(get_named_inplace_volumetrics_table_async(vol_table_name))
            for vol_table_name in vol_table_names
        ]
        tables = await asyncio.gather(*tasks)
        print(tables, len(tables))

        tables_info: List[InplaceVolumetricsTableDefinition] = []
        for table_result in tables:
            table_name, table = list(table_result.items())[0]

            non_volume_columns = self._inplace_volumetrics_access.possible_selector_columns()

            # Get raw volume names
            raw_volumetric_column_names = [name for name in table.column_names if name not in non_volume_columns]

            fluid_zones = get_fluid_zones(raw_volumetric_column_names)
            volume_names = get_volume_names_from_raw_volumetric_column_names(raw_volumetric_column_names)
            available_property_names = get_available_properties_from_volume_names(volume_names)
            result_names = volume_names + available_property_names
            indexes = []
            for index_name in self._inplace_volumetrics_access._expected_index_columns:
                if index_name in table.column_names:
                    index_values = table[index_name].unique().to_pylist()
                    filtered_index_values = [
                        value for value in index_values if value not in IGNORED_INDEX_COLUMN_VALUES
                    ]
                    indexes.append(InplaceVolumetricsIndex(index_name=index_name, values=filtered_index_values))
            tables_info.append(
                InplaceVolumetricsTableDefinition(
                    table_name=table_name, fluid_zones=fluid_zones, result_names=result_names, indexes=indexes
                )
            )
        return tables_info

        # TODO: Consider
        # responses_info: Dict[str, List[FluidZone]] = {}
        # I.e.: responses_info["STOIIP"] = [FluidZone.OIL], etc.

        return [
            {
                "name": "Geogrid",
                "fluid_zones": ["OIL", "GAS", "WATER"],
                "responses": ["BULK", "NET", "STOIIP", "SW", "BO"],
                "index": [
                    {
                        "ZONE": ["A", "B"],
                        "REGION": ["NORTH", "SOUTH"],
                        "FACIES": ["SAND", "SHALE"],
                        "LICENSE": ["LIC1", "LIC2"],
                    }
                ],
            }
        ]

    async def get_accumulated_by_selection_volumetric_table_data_async(
        self,
        table_name: str,
        response_names: set[str],
        fluid_zones: List[FluidZone],
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = [],
        accumulate_by_each: Sequence[AccumulateByEach] = [AccumulateByEach.REGION],
        calculate_mean_across_realizations: bool = True,
        accumulate_fluid_zones: bool = False,
    ) -> Dict[str, List[str | int | float]]: #InplaceVolumetricTableDataPerFluidSelection:
        
        # NOTE: "_TOTAL" columns are not handled

        # Detect properties and find volume names needed to calculate properties
        properties = get_properties_in_response_names(response_names)
        required_volume_names_for_properties = get_required_volume_names_from_properties(properties)

        # Extract volume names among response names
        volume_names = list(set(response_names) - set(properties))

        # Find all volume names needed from Sumo
        all_volume_names = set(volume_names + required_volume_names_for_properties)

        # Create the raw volumetric columns from all volume names and fluid zones
        raw_volumetric_column_names = create_raw_volumetric_columns_from_volume_names_and_fluid_zones(
            all_volume_names, fluid_zones
        )

        # Get the raw volumetric table
        row_filtered_raw_table = await self._create_row_filtered_volumetric_table_data_async(
            table_name=table_name,
            volumetric_columns=raw_volumetric_column_names,
            realizations=realizations,
            index_filter=index_filter,
        )

        # ***********************************************************************************
        # ***********************************************************************************
        #
        # Convert filtered table to table with index columns and realizations, volume names, properties and fluid zones as columns
        #
        # ***********************************************************************************
        # ***********************************************************************************

        # Build a new table with one merged column per result/response and additional fluid zone column is created.
        # I.e. where result/response column has values per fluid zone appended after each other. Num rows is then original num rows * num fluid zones
        # E.g.:
        #
        # filtered_table.column_names = ["REAL", "ZONE", "REGION", "FACIES", "LICENSE", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]
        # fluid_zones = [FluidZone.OIL, FluidZone.GAS, FluidZone.WATER]
        # ["REAL", "ZONE", "REGION", "FACIES", "LICENSE", "STOIIP", "BO", "HCPV"]

        volumetric_table_per_fluid_zone: Dict[FluidZone, pa.Table] = self._create_volumetric_table_per_fluid_zone(
            fluid_zones, row_filtered_raw_table
        )

        possible_selector_columns = self._inplace_volumetrics_access.possible_selector_columns()
        selector_columns = [col for col in possible_selector_columns if col in row_filtered_raw_table.column_names]

        # TODO: SHOULD PROPERTIES BE CALCULATED AFTER ACCUMULATION OF FLUID ZONES if accumulate_fluid_zones is True?
        # i.e. sw = 1 - hcpv/porv. Must be calculated after summing hcpv and porv per fluid zone?
        # YES: Should have: sw = 1 - (hcpv_oil + hcpv_gas + hcpv_water) / (porv_oil + porv_gas + porv_water) etc

        # Build response table - per fluid zone
        # - Requested volumes
        # - Calculated properties
        response_table_per_fluid_zone: Dict[FluidZone, pa.Table] = {}
        for fluid_zone, volumetric_table in volumetric_table_per_fluid_zone.items():
            property_columns = self._calculate_property_column_arrays(volumetric_table, fluid_zone, properties)

            # Build response table (volumns and calculated properties)
            available_volume_names = [name for name in volume_names if name in volumetric_table.column_names]
            response_table = volumetric_table.select(selector_columns + available_volume_names)
            for property_name, property_column in property_columns.items():
                response_table = response_table.append_column(property_name, property_column)
            
            response_table_per_fluid_zone[fluid_zone] = response_table
        
        # Perform aggregation per response table
        aggregated_response_table_per_fluid_zone: Dict[FluidZone, pa.Table] = {}
        for fluid_zone, response_table in response_table_per_fluid_zone.items():
            # Group by each of the index columns (always accumulate by realization - i.e. max one value per realization)
            accumulate_by_each_set = set([elm.value for elm in accumulate_by_each])
            columns_to_group_by_for_sum = set(list(accumulate_by_each_set) + ["REAL"])

            valid_response_names = [elm for elm in response_table.column_names if elm not in selector_columns]

            # Aggregate sum for each response name after grouping
            accumulated_vol_table = response_table.group_by(columns_to_group_by_for_sum).aggregate(
                [(response_name, "sum") for response_name in valid_response_names]
            )
            suffix_to_remove = "_sum"

            # Calculate mean across realizations
            if calculate_mean_across_realizations:
                accumulated_vol_table = accumulated_vol_table.group_by(accumulate_by_each_set).aggregate(
                    [(f"{response_name}_sum", "mean") for response_name in valid_response_names]
                )
                suffix_to_remove = "_sum_mean"

            # Remove suffix from column names
            column_names_with_suffix = accumulated_vol_table.column_names
            new_column_names = [column_name.replace(suffix_to_remove, "") for column_name in column_names_with_suffix]
            accumulated_vol_table = accumulated_vol_table.rename_columns(new_column_names)

            aggregated_response_table_per_fluid_zone[fluid_zone] = accumulated_vol_table

        if False or accumulate_fluid_zones:
            # TODO: Accumulate/sum columns per fluid zone
            # - BO/BG are neglected
            # - If a column is not present for one fluid zone, it is set to zero

            # Find union of column names across all fluid zones
            all_column_names = set()
            for response_table in response_table_per_fluid_zone.values():
                all_column_names.update(response_table.column_names)

            pass


        return aggregated_vol_table_dict

    async def _create_row_filtered_volumetric_table_data_async(
        self,
        table_name: str,
        volumetric_columns: set[str],
        realizations: Sequence[int] = None,
        index_filter: List[InplaceVolumetricsIndex] = [],
    ) -> pa.Table:
        """
        Create table filtered on index values and realizations
        """
        if realizations is not None and len(realizations) == 0:
            return {}

        # Get the inplace volumetrics table from collection in Sumo
        #
        # NOTE:
        # Soft vs hard fail depends on detail level when building the volumetric columns from retrieved response names + fluid zones
        # - Soft fail: get_inplace_volumetrics_table_no_throw_async() does not require matching volumetric column names
        # - Hard fail: get_inplace_volumetrics_table_async() throws an exception if requested column names are not found
        inplace_volumetrics_table: pa.Table = (
            await self._inplace_volumetrics_access.get_inplace_volumetrics_table_no_throw_async(
                table_name=table_name, column_names=volumetric_columns
            )
        )

        table_column_names = inplace_volumetrics_table.column_names

        # Build mask for rows - default all rows
        mask = pa.array([True] * inplace_volumetrics_table.num_rows)

        # Mask/filter out rows with ignored index values
        for index_name in InplaceVolumetricsIndexNames:
            if index_name.value in table_column_names:
                ignored_indices_mask = pc.is_in(
                    inplace_volumetrics_table[index_name.value], value_set=pa.array(IGNORED_INDEX_COLUMN_VALUES)
                )
                mask = pc.and_(mask, pc.invert(ignored_indices_mask))

        # Add mask for realizations
        if realizations is not None:
            # Check if every element in pa.array(realizations) exists in vol_table["REAL"]
            real_values_set = set(inplace_volumetrics_table["REAL"].to_pylist())
            missing_realizations = [real for real in realizations if real not in real_values_set]

            if missing_realizations:
                raise ValueError(
                    f"Missing data error: The following realization values do not exist in 'REAL' column: {missing_realizations}"
                )

            realization_mask = pc.is_in(inplace_volumetrics_table["REAL"], value_set=pa.array(realizations))
            mask = pc.and_(mask, realization_mask)

        # Add mask for each index filter
        for index in index_filter:
            index_column_name = index.index_name.value
            if index_column_name not in table_column_names:
                raise ValueError(f"Index column name {index_column_name} not found in table {table_name}")

            index_mask = pc.is_in(inplace_volumetrics_table[index_column_name], value_set=pa.array(index.values))
            mask = pc.and_(mask, index_mask)

        filtered_table = inplace_volumetrics_table.filter(mask)
        return filtered_table

    def _create_volumetric_table_per_fluid_zone(
        self,
        fluid_zones: List[FluidZone],
        volumetric_table: pa.Table,
    ) -> Dict[FluidZone, pa.Table]:
        """
        Create a volumetric table per fluid zone

        Extracts the columns for each fluid zone and creates a new table for each fluid zone, with
        the same index columns and REAL column as the original table.

        The fluid columns are stripped of the fluid zone suffix.

        Returns:
        Dict[FluidZone, pa.Table]: A dictionary with fluid zone as key and volumetric table as value


        Example:
        - Input:
            - fluid_zone: [FluidZone.OIL, FluidZone.GAS]
            - volumetric_table: pa.Table
                - volumetric_table.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP_OIL", "GIIP_GAS", "HCPV_OIL", "HCPV_GAS", "HCPV_WATER"]

        - Output:
            - table_dict: Dict[FluidZone, pa.Table]:
                - table_dict[FluidZone.OIL]: volumetric_table_oil
                    - volumetric_table_oil.column_names = ["REAL", "ZONE", "REGION", "FACIES", "STOIIP", "HCPV"]
                - table_dict[FluidZone.GAS]: volumetric_table_gas
                    - volumetric_table_gas.column_names = ["REAL", "ZONE", "REGION", "FACIES", "GIIP", "HCPV"]

        """
        column_names: List[str] = volumetric_table.column_names

        possible_selector_columns = self._inplace_volumetrics_access.possible_selector_columns()
        selector_columns = [col for col in possible_selector_columns if col in column_names]

        fluid_zone_to_table_map: Dict[FluidZone, pa.Table] = {}
        for fluid_zone in fluid_zones:
            fluid_zone_name = fluid_zone.value.upper()
            fluid_columns = [name for name in column_names if name.endswith(f"_{fluid_zone_name}")]

            if not fluid_columns:
                continue

            fluid_zone_table = volumetric_table.select(selector_columns + fluid_columns)

            # Remove fluid_zone suffix from columns of fluid_zone_table
            new_column_names = [elm.replace(f"_{fluid_zone_name}", "") for elm in fluid_zone_table.column_names]
            fluid_zone_table = fluid_zone_table.rename_columns(new_column_names)

            fluid_zone_to_table_map[fluid_zone] = fluid_zone_table
        return fluid_zone_to_table_map


    def _calculate_property_ndarrays(
        self, volumetric_table: pa.Table, fluid_zone: FluidZone, properties: List[str]
    ) -> Dict[str, np.ndarray]:
        """
        Calculate property arrays as np.ndarray based on the volume columns in table.

        Args:
        - volumetric_table (pa.Table): Table with volumetric data
        - properties (List[str]): Name of the properties to calculate

        Returns:
        - Dict[str, np.ndarray]: Property as key, and array with calculated property values as value

        """
        existing_volume_columns: List[str] = volumetric_table.column_names
        num_rows: int = volumetric_table.num_rows

        zero_ndarray = np.zeros(num_rows)
        nan_ndarray = np.full(num_rows, np.nan)

        property_ndarrays: Dict[str, np.ndarray] = {}

        # Calculate properties
        for property in properties:
            property_ndarray = zero_ndarray
            if (property == "BO" and fluid_zone != FluidZone.OIL) or (property == "BG" and fluid_zone != FluidZone.GAS):
                property_ndarray = nan_ndarray
            else:
                (volume_names, property_equation) = get_volume_names_and_equation_from_properties(property)
                if volume_names[0] in existing_volume_columns or volume_names[1] in existing_volume_columns:
                    first_volume_ndarray = volumetric_table[volume_names[0]].to_numpy()
                    second_volume_ndarray = volumetric_table[volume_names[1]].to_numpy()
                    property_ndarray = property_equation(first_volume_ndarray, second_volume_ndarray)
                    property_ndarray[property_ndarray == np.inf] = np.nan
                else:
                    # TODO: Return nan or zero column?
                    property_ndarray = nan_ndarray

            property_ndarrays[property] = property_ndarray

        return property_ndarrays
    
    def _calculate_property_column_arrays(
        self, volumetric_table: pa.Table, fluid_zone: FluidZone, properties: List[str]
    ) -> Dict[str, pa.array]:
        """
        Calculate property arrays as pa.array based on the volume columns in table.

        Args:
        - volumetric_table (pa.Table): Table with volumetric data
        - properties (List[str]): Name of the properties to calculate

        Returns:
        - Dict[str, pa.array]: Property as key, and array with calculated property values as value

        """

        existing_volume_columns: List[str] = volumetric_table.column_names
        num_rows: int = volumetric_table.num_rows

        zero_array = pa.array(np.zeros(num_rows), type=pa.float64())
        nan_array = pa.array(np.full(num_rows, np.nan), type=pa.float64())

        property_arrays: Dict[str, pa.array] = {}        
        
        # NOTE: If one of the volume names needed for a property is not found, the property array is not calculated
        
        if fluid_zone == FluidZone.OIL and "BO" in properties  and set(["HCPV", "STOIIP"]).issubset(existing_volume_columns):
            bo_array = calculate_property_from_volume_arrays("BO", volumetric_table["HCPV"], volumetric_table["STOIIP"])
            property_arrays["BO"] = bo_array
        if fluid_zone == FluidZone.GAS and "BG" in properties  and set(["HCPV", "GIIP"]).issubset(existing_volume_columns):
            bg_array = calculate_property_from_volume_arrays("BG", volumetric_table["HCPV"], volumetric_table["GIIP"])
            property_arrays["BG"] = bg_array
        
        if "NTG" in properties and set(["BULK", "NET"]).issubset(existing_volume_columns):
            ntg_array = calculate_property_from_volume_arrays("NTG", volumetric_table["NET"], volumetric_table["BULK"])
            property_arrays["NTG"] = ntg_array
        if "PORO" in properties and set(["BULK", "PORV"]).issubset(existing_volume_columns):
            poro_array = calculate_property_from_volume_arrays("PORO", volumetric_table["PORV"], volumetric_table["BULK"])
            property_arrays["PORO"] = poro_array
        if "PORO_NET" in properties and set(["PORV", "NET"]).issubset(existing_volume_columns):
            poro_net_array = calculate_property_from_volume_arrays("PORO_NET", volumetric_table["PORV"], volumetric_table["NET"])
            property_arrays["PORO_NET"] =  poro_net_array
        if "SW" in properties and set(["HCPV", "PORV"]).issubset(existing_volume_columns):
            sw_array = calculate_property_from_volume_arrays("SW", volumetric_table["HCPV"], volumetric_table["PORV"])
            property_arrays["SW"] = sw_array
        
        return property_arrays