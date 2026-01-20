# 2D Viewer

The 2D Viewer provides an interactive top-down (map view) visualization of spatial geological and reservoir data. It uses the [Layer Manager](/framework/LayerManager/) system for flexible composition of multiple data sources.

## Overview

This module enables you to explore spatial relationships between different geological elements, well locations, structural features, and property distributions in a map view perspective. Multiple views can be displayed side-by-side for comparison.

## Supported Data Types

### Attribute Maps
- Structural surfaces (depth, thickness)
- Reservoir property maps (porosity, permeability, saturation)
- Time-dependent dynamic properties (pressure, water cut)
- Statistical surfaces (mean, P10, P50, P90)

### Wells
- **Well trajectories**: Full 3D well paths projected to map view
- **Well picks**: Formation tops and markers
- **Well annotations**: Labels and metadata display

### Polygons
- Fault traces and lineaments
- Field boundaries and license areas
- Geological features (channels, compartments)
- Custom regions of interest

### Fluid Contacts
- Oil-water contacts (OWC)
- Gas-oil contacts (GOC)
- Free water levels (FWL)
- Contact uncertainty ranges

### Grid Models
- 3D grid cell outlines
- Property distribution on grid cells
- Selected grid layers or zones
- Active cell boundaries

## Key Features

### Layer Management
Leverages the [Layer Manager](/framework/LayerManager/) framework to:
- Stack multiple data sources in customizable order
- Control individual layer visibility and styling
- Apply shared settings across layer groups
- Synchronize views for comparison

### Interactive Controls
- **Pan and zoom**: Navigate the map view
- **Layer reordering**: Control rendering order via drag-and-drop
- **Selection tools**: Click wells or features for detailed information
- **Measurement tools**: Distance and area measurements
- **Color customization**: Adjust color scales and opacity per layer

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
- Identify sweet spots and areas of concern

### Well Planning
- Visualize existing well trajectories in context with geological features
- Evaluate well placement relative to structural elements and property distributions
- Plan new well locations based on integrated data

### Reservoir Monitoring
- Track dynamic property changes over time (pressure depletion, water movement)
- Compare production forecasts with historical data
- Monitor fluid contact movement through time steps

### Quality Control
- Verify spatial consistency between different data sources
- Identify data gaps or anomalies
- Ensure proper alignment of surfaces, grids, and well data

### Field Development
- Integrate structural maps, property distributions, and well locations
- Evaluate drainage patterns and compartmentalization
- Support reservoir management decisions with visual analysis