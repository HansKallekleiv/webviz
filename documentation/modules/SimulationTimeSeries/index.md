# SimulationTimeSeries

The SimulationTimeSeries module provides interactive visualization of reservoir simulation time series data from FMU ensembles and delta ensembles.

## Features

### Realization Time Series
- Display individual realization curves as line charts
- Optional parameter-based coloring to identify relationships between input parameters and simulation outcomes

### Statistical Visualization
- **Line charts**: Show statistical measures (P10, P50, P90, mean) as distinct lines
- **Fan charts**: Display uncertainty ranges as shaded areas between percentiles

### Covisualize multiple timeseries
- Multiple vectors and/or multiple ensembles can be covisualized both overlayed in the same plot or in separate plots

## Use Cases

- **Uncertainty analysis**: Visualize the spread of simulation outcomes across ensemble members
- **Parameter correlation**: Use parameter coloring or [data channels](/framework/DataChannels/) to sub modules to correlate vectors against parameters. 
- **Ensemble comparison**: Compare statistical distributions between different ensembles or vectors
