// from typing import { BlockedWellLog_api } from "@api"
// import Any, Dict, Optional
import { BlockedWellLog_api } from "@api";
import { TemplatesList } from "@framework/internal/components/LeftSettingsPanel/private-components/templatesList";

// import xtgeo

// def xtgeo_well_logs_to_json_format(well: xtgeo.Well) -> Dict:
//     header = generate_header(well_name=well.name)
//     curves = []

//     # Calculate well geometrics if MD log is not provided
//     if well.mdlogname is None:
//         well.geometrics()

//     # Add MD and TVD curves
//     curves.append(generate_curve(log_name="MD", description="Measured depth"))
//     curves.append(
//         generate_curve(log_name="TVD", description="True vertical depth (SS)")
//     )
//     # Add additonal logs, skipping geometrical logs if calculated
//     lognames = [
//         logname
//         for logname in well.lognames
//         if logname not in ["Q_MDEPTH", "Q_AZI", "Q_INCL", "R_HLEN"]
//     ]
//     for logname in lognames:
//         curves.append(generate_curve(log_name=logname.upper()))

//     # Filter dataframe to only include relevant logs
//     curve_names = [well.mdlogname, "Z_TVDSS"] + lognames
//     dframe = well.dataframe[curve_names]
//     dframe = dframe.reindex(curve_names, axis=1)

//     return {"header": header, "curves": curves, "data": dframe.values.tolist()}

export function wellLogsToJson(wellName: string, wellLogs: BlockedWellLog_api[]): any {
    const header = generateHeader(wellName);
    const curves: Curve[] = [];

    // Separate TVD log if present and ensure it's processed first
    const tvdIndex = wellLogs.findIndex((log) => log.well_log_name === "Z_TVDSS");
    if (tvdIndex !== -1) {
        const tvdLog = wellLogs.splice(tvdIndex, 1)[0];
        curves.push(generateCurve("TVD", "True vertical depth (SS)"));
        wellLogs.unshift(tvdLog); // Add TVD log back at the start of the array
    }

    // Add remaining logs
    wellLogs.forEach((log) => {
        if (log.well_log_name !== "Z_TVDSS") {
            // This check is redundant now but left for clarity
            curves.push(generateCurve(log.well_log_name));
        }
    });

    // Transpose the data
    const maxLength = wellLogs.reduce((max, log) => Math.max(max, log.values.length), 0);
    const data: Array<Array<string | number>> = [];

    for (let i = 0; i < maxLength; i++) {
        const row: Array<string | number> = [];
        wellLogs.forEach((log) => {
            // Use a default value if the log does not have a value at index i
            const value = log.values[i] !== undefined ? log.values[i] : 1; // Assuming null as a default for missing values
            row.push(value);
        });
        data.push(row);
    }

    return { header, curves, data, metadata_discrete };
}

type Header = {
    name: string;
    well: string;
};
function generateHeader(wellName: string): Header {
    return {
        name: "log",
        well: wellName,
    };
}

type Curve = {
    name: string;
    description: string | null;
    valueType: string;
    dimensions: number;
    unit: string;
    quantity: null;
    axis: null;
};
function generateCurve(logName: string, description: string | null = null): Curve {
    return {
        name: logName,
        description: description,
        valueType: logName == "PemGeo_FACIES" || logName == "PemGeo_Zone" ? "integer" : "float",
        dimensions: 1,
        unit: "",
        quantity: null,
        axis: null,
    };
}
export function createTemplate(logNames: string[]): any {
    const tracks: any[] = [];
    const template = {
        name: "all logs",
        scale: { primary: "TVD", allowSecondary: true },
        styles: [
            {
                name: "HKL",
                type: "gradientfill",
                colorTable: "Physics",
                color: "green",
            },
            {
                colorTable: "Stratigraphy",
                name: "discrete",
                type: "stacked",
            },
        ],
        tracks: tracks,
    };
    template.tracks.push({ width: 1, title: "PemGeo_FACIES", plots: [{ name: "PemGeo_FACIES", style: "discrete" }] });
    template.tracks.push({ width: 1, title: "PemGeo_Zone", plots: [{ name: "PemGeo_Zone", style: "discrete" }] });
    logNames.forEach((logName) => {
        let plot = {};
        if (logName !== "PemGeo_FACIES" && logName !== "PemGeo_Zone") {
        }
        plot = { name: logName, style: "HKL", type: "gradientfill" };
        const track = { width: 2, title: logName, plots: [plot] };
        template.tracks.push(track);
    });

    return template;
}

// 'PemGeo_Zone': ['DISC', {1: 'Valysar', 2: 'Therys', 3: 'Volon'}], 'PemGeo_FACIES': ['DISC', {0: 'Floodplain', 1: 'Channel', 2: 'Crevasse', 5: 'Coal', 6: 'Calcite', 10: 'Offshore', 11: 'Lowershoreface', 12: 'Uppershoreface'}]
const metadata_discrete = {
    PemGeo_Zone: {
        attributes: ["color", "code"],
        objects: {
            Valysar: [[255, 13, 186, 255], 1],
            Therys: [[255, 64, 53, 255], 2],
            Volon: [[247, 255, 164, 255], 3],
        },
    },
    PemGeo_FACIES: {
        attributes: ["color", "code"],
        objects: {
            Floodplain: [[255, 13, 186, 255], 0],
            Channel: [[255, 64, 53, 255], 1],
            Crevasse: [[247, 255, 164, 255], 2],
            Coal: [[112, 255, 97, 255], 5],
            Calcite: [[9, 254, 133, 255], 6],
            Offshore: [[254, 4, 135, 255], 10],
            Lowershoreface: [[255, 5, 94, 255], 11],
            Uppershoreface: [[32, 50, 255, 255], 12],
        },
    },
};

export const colorTables = [
    {
        name: "Physics",
        discrete: false,
        description: "Full options color table",
        colorNaN: [255, 255, 255],
        colorBelow: [255, 0.0, 0.0],
        colorAbove: [0.0, 0.0, 255],
        colors: [
            [0.0, 255, 0, 0],
            [0.25, 255, 255, 0],
            [0.5, 0, 255, 0],
            [0.75, 0, 255, 255],
            [1.0, 0, 0, 255],
        ],
    },
    {
        name: "Physics reverse",
        discrete: false,
        colors: [
            [0.0, 0.0, 0.0, 255],
            [0.25, 0.0, 182, 182],
            [0.5, 0.0, 255, 0.0],
            [0.75, 182, 182, 0.0],
            [1.0, 255, 0.0, 0.0],
        ],
    },
    {
        name: "Rainbow",
        discrete: false,
        colors: [
            [0.0, 255, 0, 0],
            [0.2, 255, 255, 0],
            [0.4, 0, 255, 0],
            [0.6, 0, 255, 255],
            [0.8, 0, 0, 255],
            [1.0, 255, 0, 255],
        ],
    },
    {
        name: "Rainbow reverse",
        discrete: false,
        colors: [
            [0.0, 182, 0.0, 182],
            [0.2, 0.0, 0.0, 255],
            [0.4, 0.0, 182, 182],
            [0.6, 0.0, 255, 0.0],
            [0.8, 182, 182, 0.0],
            [1.0, 255, 0.0, 0.0],
        ],
    },
    {
        name: "Porosity",
        discrete: false,
        colors: [
            [0.0, 255, 246, 117],
            [0.11, 255, 243, 53],
            [0.18, 255, 241, 0],
            [0.25, 155, 193, 0],
            [0.32, 255, 155, 23],
            [0.39, 255, 162, 61],
            [0.46, 255, 126, 45],
            [0.53, 227, 112, 24],
            [0.6, 246, 96, 31],
            [0.67, 229, 39, 48],
            [0.74, 252, 177, 170],
            [0.81, 236, 103, 146],
            [0.88, 226, 44, 118],
            [1.0, 126, 40, 111],
        ],
    },
    {
        name: "Permeability",
        discrete: false,
        colors: [
            [0.0, 119, 63, 49],
            [0.148, 135, 49, 45],
            [0.246, 154, 89, 24],
            [0.344, 191, 88, 22],
            [0.441, 190, 142, 97],
            [0.539, 255, 126, 45],
            [0.637, 255, 162, 61],
            [0.734, 255, 155, 23],
            [0.832, 255, 241, 0],
            [1.0, 255, 246, 117],
        ],
    },
    {
        name: "Seismic",
        discrete: false,
        colors: [
            [0.0, 0, 0, 255],
            [0.5, 255, 255, 255],
            [1.0, 255, 2, 2],
        ],
    },
    {
        name: "Time/Depth",
        discrete: false,
        colors: [
            [0.0, 252, 174, 169],
            [0.1, 226, 44, 118],
            [0.168, 229, 39, 48],
            [0.234, 150, 40, 34],
            [0.301, 255, 126, 45],
            [0.367, 255, 162, 61],
            [0.434, 255, 241, 0],
            [0.5, 219, 228, 163],
            [0.566, 0, 143, 74],
            [0.633, 0, 110, 78],
            [0.699, 0, 124, 140],
            [0.766, 116, 190, 230],
            [0.832, 0, 143, 212],
            [0.898, 0, 51, 116],
            [1.0, 74, 19, 86],
        ],
    },
    {
        name: "Stratigraphy",
        discrete: true,
        colorNaN: [255, 64, 64],
        colors: [
            [0, 255, 120, 61],
            [1, 255, 193, 0],
            [2, 255, 155, 76],
            [3, 255, 223, 161],
            [4, 226, 44, 118],
            [5, 255, 243, 53],
            [6, 255, 212, 179],
            [7, 255, 155, 23],
            [8, 255, 246, 117],
            [9, 255, 241, 0],
            [10, 255, 211, 178],
            [11, 255, 173, 128],
            [12, 248, 152, 0],
            [13, 154, 89, 24],
            [14, 0, 138, 185],
            [15, 82, 161, 40],
            [16, 219, 228, 163],
            [17, 0, 119, 64],
            [18, 0, 110, 172],
            [19, 116, 190, 230],
            [20, 0, 155, 212],
            [21, 0, 117, 190],
            [22, 143, 40, 112],
            [23, 220, 153, 190],
            [24, 226, 44, 118],
            [25, 126, 40, 111],
            [26, 73, 69, 43],
            [27, 203, 63, 42],
            [28, 255, 198, 190],
            [29, 135, 49, 45],
            [30, 150, 136, 120],
            [31, 198, 182, 175],
            [32, 166, 154, 145],
            [33, 191, 88, 22],
            [34, 255, 212, 179],
            [35, 251, 139, 105],
            [36, 154, 89, 24],
            [37, 186, 222, 200],
            [38, 0, 124, 140],
            [39, 87, 84, 83],
        ],
    },
    {
        name: "Facies",
        discrete: true,
        colors: [
            [0, 255, 193, 0],
            [1, 255, 246, 117],
            [2, 166, 194, 42],
            [3, 149, 160, 24],
            [4, 9, 143, 74],
            [5, 125, 98, 15],
            [6, 0, 108, 154],
            [7, 0, 117, 190],
            [8, 28, 22, 59],
            [9, 39, 142, 199],
            [10, 0, 138, 185],
            [11, 52, 178, 188],
            [12, 235, 63, 34],
            [13, 74, 19, 86],
            [14, 248, 152, 0],
            [15, 1, 1, 1],
            [16, 128, 128, 128],
        ],
    },
    {
        name: "GasOilWater",
        discrete: true,
        colors: [
            [0, 255, 46, 0],
            [1, 0, 184, 0],
            [2, 0, 25, 255],
            [3, 179, 179, 179],
        ],
    },
    {
        name: "GasWater",
        discrete: true,
        colors: [
            [0, 255, 46, 0],
            [1, 0, 25, 255],
            [2, 179, 179, 179],
        ],
    },
    {
        name: "OilWater",
        discrete: true,
        colors: [
            [0, 0, 184, 0],
            [1, 0, 25, 255],
            [2, 179, 179, 179],
        ],
    },
    {
        name: "Accent",
        discrete: true,
        colors: [
            [0, 127, 201, 127],
            [1, 190, 174, 212],
            [2, 253, 192, 134],
            [4, 255, 255, 153],
            [5, 56, 108, 176],
            [6, 240, 2, 127],
            [7, 191, 91, 23],
            [8, 102, 102, 102],
        ],
    },
    {
        name: "Colors_set_1",
        discrete: "true",
        colors: [
            [0, 255, 13, 186],
            [1, 255, 64, 53],
            [2, 247, 255, 164],
            [3, 112, 255, 97],
            [4, 9, 254, 133],
            [5, 254, 4, 135],
            [6, 255, 5, 94],
            [7, 32, 50, 255],
            [8, 109, 255, 32],
            [9, 254, 146, 92],
            [10, 185, 116, 255],
            [11, 255, 144, 1],
            [12, 157, 32, 255],
            [13, 255, 26, 202],
            [14, 73, 255, 35],
        ],
    },
    {
        name: "Colors_set_3",
        discrete: "true",
        colors: [
            [0, 120, 181, 255],
            [1, 255, 29, 102],
            [2, 247, 255, 173],
            [3, 239, 157, 255],
            [4, 186, 255, 236],
            [5, 46, 255, 121],
            [6, 212, 255, 144],
            [7, 165, 255, 143],
            [8, 122, 255, 89],
            [9, 255, 212, 213],
        ],
    },
];
// {
//     "name": "Template 1",
//     "scale": {
//       "primary": "md",
//       "allowSecondary": true
//     },
//     "tracks": [
//       {
//         "title": "Multiple",
//         "width": 6,
//         "plots": [
//           {
//             "name": "MDIA"
//           },
//           {
//             "name": "HKLA",
//             "style": "HKL"
//           }
//         ]
//       },
//       {
//         "title": "Area",
//         "scale": "log",
//         "plots": [
//           {
//             "name": "HKLA",
//             "style": "HKL",
//             "type": "area",
//             "color": "blue",
//             "fill": "rgb(12,24,233)",
//             "inverseColor": "#00ff00"
//           }
//         ]
//       },
//       {
//         "title": "Differential",
//         "plots": [
//           {
//             "name": "HKLX",
//             "name2": "HKLA",
//             "type": "differential",
//             "scale": "linear",
//             "color": "blue",
//             "color2": "orange",
//             "fill": "green",
//             "fill2": "red"
//           }
//         ]
//       },
//       {
//         "title": "Gradient Fill & inverse",
//         "plots": [
//           {
//             "name": "HKLA",
//             "type": "gradientfill",
//             "color": "blue",
//             "colorTable": "Physics",
//             "inverseColorTable": "Physics"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MFOA"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "DD_VOLUME"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "TEMP"
//           }
//         ]
//       },
//       {
//         "required": true,
//         "plots": [
//           {
//             "name": "TQA",
//             "type": "dot"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "BITSIZE"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "GRSIM"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "RACESHM"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "SW",
//             "type": "line"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MFIA",
//             "type": "dot"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MDOA",
//             "style": "MD"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MDIA",
//             "style": "MD"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MTOA"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "MTIA"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "ECDT"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "BDTI"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "BDDI"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "BRVC"
//           }
//         ]
//       },
//       {
//         "plots": [
//           {
//             "name": "TCTI"
//           }
//         ]
//       }
//     ],
//     "styles": [
//       {
//         "name": "HKL",
//         "type": "gradientfill",
//         "colorTable": "Physics",
//         "color": "green"
//       },
//       {
//         "name": "MD",
//         "scale": "linear",
//         "type": "area",
//         "color": "blue",
//         "fill": "green"
//       }
//     ]
//   }
