# Layer Manager

The Layer Manager is a powerful visualization framework that enables flexible composition and co-visualization of multiple data sources within one or more synchronized views.

## Overview

The Layer Manager provides a hierarchical system for organizing and displaying geological and reservoir data. It's implemented in several visualization modules including 2D View, 3D View, Intersection View, and Well Log Viewer, where flexible data composition is essential.

## Key Concepts

### Layer

A layer represents a single data source with its own visualization settings. Each layer is self-contained and independent, allowing you to control its appearance and behavior individually.

**Examples of layers:**
- Surface maps (structural or property maps)
- Well trajectories
- Seismic data
- Grid property slices
- Fault polygons

**Layer-specific settings:**
- Color mapping and scales
- Opacity and blending
- Data filtering and thresholds
- Display options (wireframe, solid, contours)

### View

A view is a visualization viewport that displays one or more layers. Multiple views within a module are synchronized, maintaining consistent camera positions, zoom levels, and vertical scales.

**Key characteristics:**
- Layers render in the order they appear in the settings panel (top-to-bottom)
- Multiple views enable side-by-side comparisons
- All views share synchronized navigation controls
- Each view can display a different combination of layers

**Common use cases:**
- Compare different time steps or scenarios
- Show multiple property distributions simultaneously
- Display cross-sections alongside map views

### Shared Settings

Shared settings allow you to synchronize specific parameters across multiple layers, eliminating the need to update each layer individually. When a shared setting is applied, it overrides the corresponding setting in all layers positioned below it in the hierarchy.

**Common shared settings:**
- Time step selection (for dynamic data)
- Color scales and ranges
- Realization selection
- Property selection

**Benefits:**
- Maintain consistency across multiple layers
- Quickly flip through time steps or scenarios
- Reduce repetitive configuration

### Context Boundary

Context boundaries create isolated groups of layers, allowing you to apply shared settings to specific subsets rather than all layers globally. This enables more sophisticated visualization setups.

**Use cases:**
- Apply different time steps to separate groups of dynamic maps
- Maintain different color scales for distinct geological zones
- Create independent synchronized groups within the same view

**How it works:**
1. Insert a context boundary in the layer hierarchy
2. Add shared settings within that boundary
3. Shared settings only affect layers within the same boundary

## Workflow
1. **Add views**
2. **Add layers** to your view by selecting data sources
3. **Organize layers** by dragging them in the settings panel (order matters for rendering)
4. **Configure individual layers** with their specific display settings
5. **Add shared settings** above groups of layers to synchronize common parameters
6. **Create context boundaries** when you need independent control over different layer groups
7. **Toggle layer visibility** to focus on specific data without removing layers
