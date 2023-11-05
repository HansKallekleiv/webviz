import { SurfaceMeta_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SurfaceDirectory } from "@modules/_shared/Surface";

export type EnsembleSetSurfaceDirectoryOptions = {
    ensembleSurfaceDirectories: Map<EnsembleIdent, SurfaceDirectory>;
};

// Class responsible for managing a directory of surfaces.
export class EnsembleSetSurfaceDirectory {
    private _surfaceList: SurfaceMeta_api[] = [];
    private _ensembleIdents: EnsembleIdent[] = [];
    constructor(options: EnsembleSetSurfaceDirectoryOptions | null) {
        if (!options) return;
        const surfaceMetasIntersection: SurfaceMeta_api[] = [];
        for (const ensembleSurfaceDirectory of options.ensembleSurfaceDirectories.values()) {
            const surfaceMetas = ensembleSurfaceDirectory.getSurfaceMetas();
            if (surfaceMetasIntersection.length === 0) {
                surfaceMetasIntersection.push(...surfaceMetas);
            } else {
                surfaceMetasIntersection.filter((surfaceMeta) => surfaceMetas.includes(surfaceMeta));
            }
        }
        this._surfaceList = surfaceMetasIntersection;
        this._ensembleIdents = [...options.ensembleSurfaceDirectories.keys()];
    }

    public getEnsembleIdents(): EnsembleIdent[] {
        return this._ensembleIdents;
    }

    // Retrieves unique attribute names with optional filtering on surface name.
    public getAttributeNames(requireSurfaceName: string | null): string[] {
        let filteredList = this._surfaceList;
        if (requireSurfaceName) {
            filteredList = filterOnName(filteredList, requireSurfaceName);
        }
        return [...new Set(filteredList.map((surface) => surface.attribute_name))].sort();
    }

    // Retrieves unique surface names with optional filtering on surface attribute.
    public getSurfaceNames(requireAttributeName: string | null): string[] {
        let filteredList = this._surfaceList;
        if (requireAttributeName) {
            filteredList = filterOnAttribute(filteredList, requireAttributeName);
        }
        return [...new Set(filteredList.map((surface) => surface.name))];
    }

    // Retrieves unique time points or intervals with optional filtering on surface name and/or attribute.
    public getTimeOrIntervalStrings(requireSurfaceName: string | null, requireAttributeName: string | null): string[] {
        let filteredList = this._surfaceList;

        if (requireSurfaceName || requireAttributeName) {
            filteredList = filteredList.filter((surface) => {
                const matchedOnSurfName = !requireSurfaceName || surface.name === requireSurfaceName;
                const matchedOnAttrName = !requireAttributeName || surface.attribute_name === requireAttributeName;
                return matchedOnSurfName && matchedOnAttrName;
            });
        }
        if (filteredList.length === 0) {
            return [];
        }

        const timeOrIntervalsSet: Set<string> = new Set();
        filteredList.forEach((surface) => {
            if (surface.iso_date_or_interval) {
                timeOrIntervalsSet.add(surface.iso_date_or_interval);
            }
        });
        return [...timeOrIntervalsSet].sort();
    }

    // Checks if a given name and attribute pair exists.
    public nameAttributePairExists(surfaceName: string | null, attributeName: string | null): boolean {
        if (!attributeName || !surfaceName) return false;
        return this._surfaceList.some(
            (surface) => surface.name === surfaceName && surface.attribute_name === attributeName
        );
    }
}

// Filters directory based on a specific surface attribute.
function filterOnAttribute(surfaceList: SurfaceMeta_api[], surfaceAttribute: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.attribute_name === surfaceAttribute);
}

// Filters directory based on a specific surface name.
function filterOnName(surfaceList: SurfaceMeta_api[], surfaceName: string): SurfaceMeta_api[] {
    return surfaceList.filter((surface) => surface.name === surfaceName);
}
