# Custom Results

## Overview

Custom results encompass data that doesn't yet conform to the FMU standard results framework. These fall into two categories:

1. **Emerging data types**: Data formats currently being standardized but not yet part of the official standard
2. **Specialized results**: Field-specific or workflow-specific data that may not be practical to standardize due to unique characteristics or limited use cases

Webviz provides support for selected custom results on a case-by-case basis, enabling visualization of important data while standardization efforts continue.

## Supported Custom Results

### ECLIPSE Summary Data

Summary data represents time series results from reservoir simulation and is among the most critical data for reservoir analysis. Despite its importance, it has not yet been fully integrated into the FMU standard results framework.

**Current Status:**
- Required by multiple Webviz modules for time series analysis
- Supported through dedicated import pathways
- Upload process documented separately

**How to Upload:**

See the [SIM2SUMO documentation](https://fmu-sumo-sim2sumo.readthedocs.io/en/latest/) for detailed instructions on uploading summary data to Sumo.

::: info
Summary data standardization is actively being developed. Check the FMU DataIO documentation for updates on standard summary exports.
:::

### Attribute Maps

Attribute maps include various property surfaces that fall outside the current standard results scope:

**Common Types:**
- **Average property maps**: Extracted from 3D grid models (mean porosity, average permeability across layers)
- **Seismic attributes**: Post-stack attributes, AVO attributes, acoustic impedance
- **Structural maps**: Depth surfaces, isochore maps, trend surfaces from intermediate workflow steps
- **Field-specific maps**: Custom properties unique to specific reservoir characterization workflows

**Why Not Standardized:**

These maps often present standardization challenges:
- Naming inconsistencies across different FMU workflows
- Field-specific naming conventions
- Varied metadata requirements
- Workflow-dependent generation processes

**Visualization in Webviz:**

Most attribute maps can be visualized in Webviz by following the `fmu-dataio` custom export guidelines:

[Export Grid Property Averages to Sumo](https://fmu-dataio.readthedocs.io/en/latest/custom_exports/examples/avg_maps_grid_props.html)



::: tip
When exporting custom attribute maps, include descriptive metadata to help users understand the data source and generation method.
:::

### Grid Properties

3D grid models with associated properties can be exported as custom results for visualization in Webviz's 3D viewer and grid analysis modules.

**Export Guide:**

[Export 3D Grids with Properties to Sumo](https://fmu-dataio.readthedocs.io/en/latest/custom_exports/examples/grids_with_properties.html)


## Best Practices for Custom Results

1. **Follow `fmu-dataio` guidelines**: Even for custom results, use `fmu-dataio` export functions to ensure compatibility
2. **Document thoroughly**: Include comprehensive metadata explaining data generation, units, and context
3. **Use consistent naming**: Maintain naming conventions within your project for easier data discovery
4. **Consider future standardization**: Structure custom exports with potential standardization in mind
5. **Test in Webviz**: Verify that exported custom results load correctly in relevant Webviz modules

::: warning
Custom results may require updates if they become standardized in future FMU releases. Monitor FMU DataIO release notes for changes affecting your custom exports.
:::