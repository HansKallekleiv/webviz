# Data Channels

Data channels enable communication between modules in Webviz, allowing you to connect data producers with data consumers for advanced analysis workflows.

## Overview

The data channel system provides a flexible mechanism for modules to share data. Main modules can publish data to channels, while sub-modules can subscribe to these channels to create cross-module visualizations and analyses.

## Key Concepts

### Main Modules
Main modules are data producers that:
- Generate or load visualization data
- Publish data to one or more output channels
- Typically represent primary data sources (e.g., production profiles or inplace volumes)

### Sub-Modules
Sub-modules are data consumers that:
- Subscribe to data channels from main modules
- Create derived visualizations and analyses
- Enable cross-module correlation and comparison
- Example use cases:
  - Cross-plotting data from different sources
  - Correlating simulation results with input parameters
  - Creating custom dashboards combining multiple data sources

::: info
Both the main module (data producer) and the sub-module (data consumer) must be added to the dashboard before they can be connected via data channels.
:::

## Channel Types

### Single Channel
Connect one data source to one or more consumers. Ideal for simple data flow scenarios where a single module's output drives downstream analysis.

<video controls autoplay loop preload="metadata" auto style="max-width: 100%; border-radius: 12px;">
  <source src="/assets/videos/single_channel.webm" type="video/mp4" />
</video>

### Multi Channel
Connect multiple data sources simultaneously. Useful for:
- Comparing data across different modules
- Creating ensemble views
- Building complex analytical workflows

<video controls autoplay loop preload="metadata" auto style="max-width: 100%; border-radius: 12px;">
  <source src="/assets/videos/multi_channel.webm" type="video/mp4" />
</video>

## Setting Up Channels

Watch the videos above to see step-by-step examples of establishing data channels between modules. The process involves:

1. Identifying the main module that produces the data you need
2. Adding a sub-module that can consume that data type
3. Connecting the modules via the data channel interface
4. Configuring channel parameters as needed