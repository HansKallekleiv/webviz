# 3D Viewer

The 3D Viewer provides an interactive 3D visualization of spatial geological and reservoir data. It uses the [Layer Manager](/framework/LayerManager/) system for flexible composition of multiple data sources.

## Overview

This module enables visualization of surfaces, well data, polygons, seismic cubes and reservoir grids in a 3D perspective. Multiple views can be displayed side-by-side for comparison.

## Supported Data Types

### Surfaces
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

