# Standard Results

## Overview

The Fast Model Update (FMU) framework includes an ongoing effort to mature and standardize how results and metadata are structured and exported. This standardization ensures consistency, reproducibility, and interoperability across different tools and workflows.

## Webviz Integration

Webviz aims to seamlessly integrate with FMU Standard Results:

- **Automatic compatibility**: Webviz stays synchronized with the latest standard results specification
- **Metadata parsing**: Automatically reads and interprets FMU metadata for proper data handling
- **Type detection**: Recognizes data types (surfaces, grids, time series) from standard metadata

::: tip
Always use the latest version of `fmu-dataio` when exporting data to ensure compatibility with Webviz.
:::

## Documentation and Resources

For detailed information about creating and exporting standard results:

[FMU DataIO Documentation - Standard Results](https://fmu-dataio.readthedocs.io/en/latest/simple_exports/index.html)


## Best Practices

When preparing data for Webviz:

1. **Use `fmu-dataio`**: Export all FMU results using the `fmu-dataio` library to ensure compliance
2. **Include complete metadata**: Ensure all required metadata fields are populated
3. **Follow naming conventions**: Adhere to standard naming patterns for data objects

::: warning
Data exported without following FMU standards may not be fully supported in Webviz.
:::