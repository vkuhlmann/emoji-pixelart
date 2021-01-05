"use strict";

let isPanModus;
let handleDiagram = {
    pointerover: null,
    pointerleave: null,
    click: null,
    pointerdown: null,
    pointerup: null,
    pointermove: null,
    dismiss: null
}
let handleDiagramAvailable = false;

let markingID = 0;

let addPointButton;
let diagram;

function takeNextLabel() {
    let value = nextLabel;
    if (nextLabel.length === 1) {
        let charcodeDiff = nextLabel.charCodeAt(0) - "A".charCodeAt(0);

        if (charcodeDiff >= 0 && charcodeDiff < 26)
            setNextLabel(String.fromCharCode("A".charCodeAt(0) + ((charcodeDiff + 1) % 26)));
    }
    return value;
}

function setNextLabel(val) {
    nextLabel = val.trim();
    if (nextLabel.length > 0) {
        $("#nextlabel-clear").removeClass("toggled");
        // $("#nextlabel-clear").addClass("btn-outline-info");
        // $("#nextlabel-clear").removeClass("btn-primary");
        isClearNextLabel = false;
    }
    if (isClearNextLabel) {
        $("#nextlabel").css("color", "gray");
    } else {
        $("#nextlabel").css("color", "");
        let el = $("#nextlabel")[0];
        if (el != null)
            el.value = val;
    }
}

class Diagram {
    constructor() {
        this.el = $("#drawingContainerSvg")[0];
        this.svgPixels = { el: $("[id=\"svgPixels\"]", this.el)[0] };
        this.pannableContent = { el: $("[id=\"pannableContent\"]", this.el)[0] };

        this.pannableContent.setTranslation = function (x, y) {
            this.el.setAttribute("transform", `translate(${x} ${y})`);
        };

        this.naturalTileSize = 80;
        this.zoom = 1.0;
        this.tileSize = this.naturalTileSize * this.zoom;

        this.panOffset = { x: 0, y: 0 };
        this.theGrid = null;
        this.markings = [];
        this.grids = [];

        this.addGlobalDiagramMouseEvent("click");
        this.addGlobalDiagramMouseEvent("pointerover");
        this.addGlobalDiagramMouseEvent("pointerleave");
        this.addGlobalDiagramMouseEvent("pointerdown");
        this.addGlobalDiagramMouseEvent("pointerup");
        this.addGlobalDiagramMouseEvent("pointermove");
        this.addGlobalDiagramMouseEvent("wheel");

        this.setZoom(1.0);
    }

    toSVGSpace(p, calcToSVGTransform = new DOMMatrix()) {
        let domMat = calcToSVGTransform.preMultiplySelf(this.el.getScreenCTM())
        domMat.invertSelf();
        return DOMPoint.fromPoint(p).matrixTransform(domMat);
    }
    toClientSpace(p, calcToSVGTransform = new DOMMatrix()) {
        let domMat = calcToSVGTransform.preMultiplySelf(this.el.getScreenCTM())
        return DOMPoint.fromPoint(p).matrixTransform(domMat);
    }

    getCurrentViewBounds() {
        let rect = this.el.getBoundingClientRect();//.getBBox();
        let a = new DOMPoint(rect.x, rect.y);
        let b = new DOMPoint(rect.x + rect.width, rect.y + rect.height);
        let transf = new DOMMatrix();//diagramView.svgElem.el.getCTM().invertSelf();
        //transf = transf.preMultiplySelf(new DOMMatrix().scaleSelf(diagramView.zoom, diagramView.zoom));
        transf = transf.preMultiplySelf(this.el.getScreenCTM()).invertSelf();
        a = a.matrixTransform(transf);
        b = b.matrixTransform(transf);

        return new DOMRect(Math.min(a.x, b.x), Math.min(a.y, b.y),
            Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    };

    addMouseEventListener(name, func) {
        const that = this;
        this.el.addEventListener(name, function (ev) {
            return func(ev, that.toSVGSpace({ x: ev.clientX, y: ev.clientY }));//that.toSVGSpace(DOMToVec({ x: ev.clientX, y: ev.clientY })));
        }, true);
    }

    addGlobalDiagramMouseEvent(eventName) {
        let f = function (ev, pos) {
            if (!handleDiagramAvailable)
                return;
            ev.preventDefault();
            ev.stopPropagation();

            if (handleDiagram[eventName] == null)
                return;
            return handleDiagram[eventName](ev, pos);
        };
        this["handleGlobal" + eventName] = f;

        this.addMouseEventListener(eventName, f);
    };

    setZoom(value = 1.0, origin = null) {
        if (origin == null)
            origin = { x: 0, y: 0 };
        let newZoom = Math.max(value, 1e-4);

        let xMargin = origin.x * this.zoom - this.panOffset.x;
        let yMargin = origin.y * this.zoom - this.panOffset.y;
        this.panOffset.x = origin.x * newZoom - xMargin;
        this.panOffset.y = origin.y * newZoom - yMargin;

        this.zoom = newZoom;
        this.tileSize = this.naturalTileSize * this.zoom;
        this.updatePositioning();

        if (this.theGrid != null) {
            let spacingLevel = Math.ceil(-Math.log(this.zoom * 5 / 2) / Math.log(this.theGrid.majorInterval));

            let canonicalZoom = Math.pow(this.theGrid.majorInterval, -spacingLevel);
            let isMinorVisible = newZoom / canonicalZoom >= 1.0;

            this.theGrid.setViewSpacing(Math.pow(this.theGrid.majorInterval, spacingLevel), canonicalZoom, isMinorVisible, this);
        }
    }

    zoomIncrease(fraction = 0.1, origin = null) {
        this.setZoom(this.zoom * (1 + fraction), origin);
    }

    zoomDecrease(fraction = 0.1, origin = null) {
        this.setZoom(this.zoom * (1 - fraction), origin);
    }

    setPanOffset(x, y) {
        this.diagramView.panOffset = { x: x, y: y };
        this.updatePositioning();
    }

    updatePositioning() {
        this.pannableContent.setTranslation(
            -this.panOffset.x,// * card.diagramView.zoom,
            -this.panOffset.y);// * card.diagramView.zoom);
    }

    redraw() {
        this.svgPixels.el.innerHTML = "";
        let lines = pixelart;
        let scale = 80;

        this.el.setAttribute("viewBox", `0 0 ${scale * lines[0].length} ${scale * lines.length}`);

        let y = -1;
        let x;
        for (let line of lines) {
            y += 1;
            x = -1;
            for (let char of line) {
                x += 1;
                let el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                el.setAttribute("width", scale);
                el.setAttribute("height", scale);
                el.setAttribute("x", x * scale);
                el.setAttribute("y", y * scale);
                el.style.fill = mapper.toColor[char];
                el.style.strokeWidth = "1px";
                el.style.stroke = mapper.toColor[char];
                this.svgPixels.el.appendChild(el);
            }
        }
    }
}

function setDiagramHandle(handlers) {
    if (handleDiagramAvailable && handleDiagram["dismiss"] != null)
        handleDiagram["dismiss"]();

    handleDiagram = handlers;
    handleDiagramAvailable = handlers != null && Object.keys(handlers).length > 0;
}

function printCoordOnDiagramClick() {
    //const that = this;
    setDiagramHandle({
        click: function (event, pos) {
            let x = pos.x / diagram.tileSize;
            let y = pos.y / diagram.tileSize;

            console.log(`Clicked at tile (${x}, ${y})`);
            // if (addPointButton.getState() == 1)
            //     setDiagramHandle({});
        },
        dismiss: function () {
            //that.untoggle();
        }
    });
}

class TwoStageToggleButton {
    constructor(el) {
        this.el = el;
        this.state = 0;

        const that = this;
        this.el.addEventListener("click", e => that.cycleToggle());
    }

    getState() {
        return this.state;
    }

    untoggle() {
        if (this.state == 0)
            return;
        this.state = 0;
        this.el.classList.remove("toggled");
        this.el.classList.remove("second-stage");

        this.onUntoggle();
    }

    onUntoggle() {
        // Override this
    }

    toggleFirst() {
        if (this.state == 1)
            return;
        if (this.state == 2) {
            this.untoggle();
        }
        this.el.classList.add("toggled");
        this.state = 1;

        this.onToggleFirst();
    }

    onToggleFirst() {
        // Override this
    }

    toggleSecond() {
        if (this.state == 2)
            return;
        if (this.state == 0)
            this.toggleFirst();

        this.state = 2;
        this.el.classList.add("toggled");
        this.el.classList.add("second-stage");

        this.onToggleSecond();
    }

    onToggleSecond() {
        // Override this
    }

    cycleToggle() {
        if (this.state == 2) {
            this.untoggle();

        } else if (this.state == 1) {
            this.toggleSecond();

        } else {
            this.toggleFirst();
        }
    }
}

class AddPointButton extends TwoStageToggleButton {
    constructor() {
        super($("#addPoint")[0]);
    }

    onUntoggle() {
        setDiagramHandle({});
    }

    onToggleFirst() {
        const that = this;
        setDiagramHandle({
            click: function (event, pos) {
                PointMarking.create({ type: "point", x: pos.x, y: pos.y, label: takeNextLabel() }, diagram);
                //diagram.addPointMarking(pos);

                if (addPointButton.getState() == 1)
                    setDiagramHandle({});
            },
            dismiss: function () {
                that.untoggle();
            }
        });
    }

    onToggleSecond() {

    }
}
