import { InplaceVolumetricResponseNames_api } from "@api";

export const VolumetricResponseNamesMapping = {
    [InplaceVolumetricResponseNames_api.STOIIP_OIL]: "Stock tank oil initially in place (oil zone)",
    [InplaceVolumetricResponseNames_api.GIIP_GAS]: "Gas initially in place (gas zone)",
    [InplaceVolumetricResponseNames_api.BULK_OIL]: "Bulk volume (oil zone)",
    [InplaceVolumetricResponseNames_api.BULK_GAS]: "Bulk volume (gas zone)",
    [InplaceVolumetricResponseNames_api.NET_OIL]: "Net volume (oil zone)",
    [InplaceVolumetricResponseNames_api.NET_GAS]: "Net volume (gas zone)",
    [InplaceVolumetricResponseNames_api.PORV_OIL]: "Pore volume (oil zone)",
    [InplaceVolumetricResponseNames_api.PORV_GAS]: "Pore volume (gas zone)",
    [InplaceVolumetricResponseNames_api.HCPV_OIL]: "Hydro carbon pore volume (oil zone)",
    [InplaceVolumetricResponseNames_api.HCPV_GAS]: "Hydro carbon pore volume (gas zone)",
};

// [InplaceVolumetricResponseNames_api.PORO] = "Porosity",
// [InplaceVolumetricResponseNames_api.SW] = "Water saturation",
// [InplaceVolumetricResponseNames_api.NTG] = "Net to gross",
// [InplaceVolumetricResponseNames_api.BO] = "Oil formation volume factor",
// [InplaceVolumetricResponseNames_api.BG] = "Gas formation volume factor",
