"use strict";

class ResizeButton extends ToggleButton {
    constructor() {
        super($("#resizeButton")[0]);

        const that = this;
    }

    onToggle() {
        $(".coloroption-resize")[0].classList.add("coloroption-selected");
        this.panAndZoom.engage();
    }

    onUntoggle() {
        setDiagramHandle({});
        $(".coloroption-resize")[0].classList.remove("coloroption-selected");
    }
}


