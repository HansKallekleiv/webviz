import { HTMLLayer, OnMountEvent, OnRescaleEvent } from "@equinor/esv-intersection";

const POINTHEIGHT = 2;
const POINTWIDTH = 2;
const POINTPADDING = 2;
const POINTOFFSETX = (POINTWIDTH + POINTPADDING) / 2;
const POINTOFFSETY = (POINTHEIGHT + POINTPADDING) / 2;

export class HighlightLayer<T> extends HTMLLayer<T> {
    // elements: Selection<HTMLDivElement, unknown, null, undefined>[] = [];
    elements: any = [];

    onMount(event: OnMountEvent): void {
        super.onMount(event);
        this.addHighlightElement("wellborepath");
    }

    onRescaleMD(event: OnRescaleEvent, md: number | null): void {
        super.onRescale(event);
        const elm = this.elements[0];
        // console.log(this.referenceSystem);
        if (this.referenceSystem) {
            if (!md || md < 0) {
                elm.style("visibility", "hidden");
            } else {
                elm.style("visibility", "visible");
            }

            // screen coords inside the container
            const width = Math.min(Math.max(POINTWIDTH * event.xRatio, 20), 16);
            const height = Math.min(Math.max(POINTHEIGHT * event.yRatio, 20), 16);
            const radius = Math.min(Math.max(8 * event.yRatio, 16), 12);
            elm.style("height", `${height}px`).style("width", `${width}px`).style("border-radius", `${radius}px`);
            const coords = this.referenceSystem.project(md || 0);

            // screen coords inside the container
            const newX = event.xScale(coords[0]);
            const newY = event.yScale(coords[1]);

            elm.style("left", `${newX - POINTOFFSETX}px`);
            elm.style("top", `${newY - POINTOFFSETY}px`);
        }
    }

    addHighlightElement(id: string): HighlightLayer<T> {
        const elm = this.elm.append("div").attr("id", `${id}-highlight`);
        elm.style("visibility", "visible");
        elm.style("height", `${POINTHEIGHT}px`);
        elm.style("width", `${POINTWIDTH}px`);
        elm.style("display", "inline-block");
        elm.style("padding", `${POINTPADDING}px`);
        elm.style("border-radius", "2px");
        elm.style("position", "absolute");
        elm.style("background-color", "orange");
        this.elements = [elm];
        return this;
    }

    getElement(id: string) {
        return this.elm.select(id);
    }
}
