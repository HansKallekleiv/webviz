# 3D Viewer

The 3D Viewer provides an interactive 3D visualization of spatial geological and reservoir data. It uses the [Layer Manager](/framework/LayerManager/) system for flexible composition of multiple data sources.

## Overview

This module enables visualization of surfaces, well data, polygons, seismic cubes and reservoir grids in a 3D perspective. Multiple views can be displayed side-by-side for comparison.

## Supported Data Types

### Attribute Maps
- Structural surfaces (depth)
- Fluid contacts

### Wells
- **Well trajectories**: Full well paths projected to map view
- **Well picks**: Formation tops and markers

### Polygons
- Fault polylines

### Grid Models
- Property distribution on grid cells
- Selected grid layers or zones
- Intersection along polylines/well paths

### Seismic slices
- IJK seismic slices
- Intersection along polylines/well paths

## Key Features

### Layer Management
Leverages the [Layer Manager](/framework/LayerManager/) framework to:
- Stack multiple data sources in customizable order
- Control individual layer visibility and styling
- Apply shared settings across layer groups
- Synchronize views for comparison

### Multi-View Comparison
- Display multiple synchronized views side-by-side
- Compare different time steps, realizations, or scenarios
- Maintain consistent camera position and zoom across views


## Use Cases

### Structural Interpretation
- Overlay depth maps with fault polygons to understand structural framework
- Visualize formation thickness variations across the field
- Identify structural highs and lows for prospect evaluation

### Property Analysis
- Display porosity or permeability distributions across the reservoir
- Compare property maps from different realizations or ensembles

### Seismic 4D analysis
- Compare observed and seismic attribute maps
- Display perforated well sections with associated production/injection data

### Well Planning
- Visualize existing well trajectories in context with geological features
- Evaluate well placement relative to structural elements and property distributions
- Plan new well locations based on integrated data

### Reservoir Monitoring
- Track dynamic property changes over time (pressure depletion, water movement)
- Monitor fluid contact movement through time steps

### Quality Control
- Verify spatial consistency between different data sources
- Identify data gaps or anomalies
- Ensure proper alignment of surfaces, grids, and well data

### Field Development
- Integrate structural maps, property distributions, and well locations
- Evaluate drainage patterns and compartmentalization
- Support reservoir management decisions with visual analysis

