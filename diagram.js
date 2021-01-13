"use strict";

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
        this.el = $("#pixelartSvg")[0];
        this.svgContent = { el: $("[id=\"svgContent\"]", this.el)[0] };
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
        // this.addGlobalDiagramMouseEvent("pointerenter");
        // this.addGlobalDiagramMouseEvent("pointercancel");
        // this.addGlobalDiagramMouseEvent("pointerout");
        this.addGlobalDiagramMouseEvent("pointerleave");
        this.addGlobalDiagramMouseEvent("pointerdown");
        this.addGlobalDiagramMouseEvent("pointerup");
        this.addGlobalDiagramMouseEvent("pointermove");
        this.addGlobalDiagramMouseEvent("wheel");

        this.addGlobalDiagramMouseEvent("gotpointercapture");
        this.addGlobalDiagramMouseEvent("lostpointercapture");

        this.pixels = [];
        this.width = 0;
        this.height = 0;

        this.minWidthInView = this.tileSize;
        this.minHeightInView = this.tileSize;

        this.setZoom(1.0);

        const that = this;
        window.addEventListener("resize", e => {
            that.onResize();
        });
    }

    onResize() {
        this.updateViewSize();
        //this.setPanOffset(this.panOffset.x, this.panOffset.y);
    }

    toSVGSpace(p, calcToSVGTransform = new DOMMatrix()) {
        let domMat = calcToSVGTransform.preMultiplySelf(this.svgContent.el.getScreenCTM())
        domMat.invertSelf();
        return DOMPoint.fromPoint(p).matrixTransform(domMat);
    }
    toClientSpace(p, calcToSVGTransform = new DOMMatrix()) {
        let domMat = calcToSVGTransform.preMultiplySelf(this.svgContent.el.getScreenCTM())
        return DOMPoint.fromPoint(p).matrixTransform(domMat);
    }

    getCurrentViewBounds() {
        let rect = this.el.getBoundingClientRect();//.getBBox();
        let a = new DOMPoint(rect.x, rect.y);
        let b = new DOMPoint(rect.x + rect.width, rect.y + rect.height);
        let transf = new DOMMatrix();//diagramView.svgElem.el.getCTM().invertSelf();
        //transf = transf.preMultiplySelf(new DOMMatrix().scaleSelf(diagramView.zoom, diagramView.zoom));
        transf = transf.preMultiplySelf(this.svgContent.el.getScreenCTM()).invertSelf();
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

    addGlobalDiagramEvent(eventName, stopProp = true, prevDefault = true) {
        let f = function (ev) {
            if (!handleDiagramAvailable)
                return;
            if (prevDefault)
                ev.preventDefault();
            if (stopProp)
                ev.stopPropagation();

            if (handleDiagram[eventName] == null)
                return;
            return handleDiagram[eventName](ev);
        };
        this["handleGlobal" + eventName] = f;
        this.el.addEventListener(eventName, f);
    }

    setZoom(value = 1.0, origin = null) {
        if (origin == null)
            origin = { x: 0, y: 0 };
        let newZoom = Math.max(value, 1e-1);
        newZoom = Math.min(newZoom, 50);

        // let xMargin = origin.x * this.zoom - this.panOffset.x;
        // let yMargin = origin.y * this.zoom - this.panOffset.y;
        // this.panOffset.x = origin.x * newZoom - xMargin;
        // this.panOffset.y = origin.y * newZoom - yMargin;

        let oldZoom = this.zoom;
        this.zoom = newZoom;
        this.tileSize = this.naturalTileSize * this.zoom;
        //this.updatePositioning();
        this.redraw();
        this.setPanOffset((this.panOffset.x + origin.x) * newZoom / oldZoom - origin.x,
            (this.panOffset.y + origin.y) * newZoom / oldZoom - origin.y);

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
        let viewBounds = this.getCurrentViewBounds();
        if (this.minWidthInView > -0.5) {
            //x = Math.min(x, (this.width - 1) * this.tileSize);
            x = Math.min(x, -(viewBounds.left + this.minWidthInView - this.width * this.tileSize));
            x = Math.max(x, -(viewBounds.right - this.minWidthInView));

            if (this.minWidthInView > this.width * this.tileSize)
                x = 0;
        }

        if (this.minHeightInView > -0.5) {
            //y = Math.min(y, (this.height - 1) * this.tileSize);
            y = Math.min(y, -(viewBounds.top + this.minHeightInView - this.height * this.tileSize));
            y = Math.max(y, -(viewBounds.bottom - this.minHeightInView));

            if (this.minHeightInView > this.height * this.tileSize)
                y = 0;
        }

        this.panOffset = { x: x, y: y };
        this.updatePositioning();
    }

    updatePositioning() {
        this.pannableContent.setTranslation(
            -this.panOffset.x,// * card.diagramView.zoom,
            -this.panOffset.y);// * card.diagramView.zoom);
    }

    setPixel(x, y, id) {
        // if (x < 0 || y < 0 || y >= pixelart.length || x >= pixelart[y].length)
        //     return false;
        if (!(x >= 0 && y >= 0 && y < pixelart.length && x < pixelart[y].length))
            return false;
        if (pixelart[y][x] === id)
            return true;
        pixelart[y][x] = id;
        this.redraw();
        updateEmojiOutput();
        return true;
    }

    fullRedraw() {
        this.svgPixels.el.innerHTML = "";
        let lines = pixelart;
        let scale = this.tileSize;

        this.pixels = [];
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

        this.updateViewSize();
    }

    redraw() {
        let scale = this.tileSize;
        this.height = pixelart.length;
        this.width = pixelart[0].length;

        for (let y = 0; y < this.height; y++) {
            if (this.pixels.length <= y)
                this.pixels.push([]);

            for (let x = 0; x < this.width; x++) {
                if (this.pixels[y].length === x) {
                    let el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    this.svgPixels.el.appendChild(el);
                    this.pixels[y].push(el);
                }
                let el = this.pixels[y][x];

                let colorId = pixelart[y][x];

                el.setAttribute("width", scale);
                el.setAttribute("height", scale);
                el.setAttribute("x", x * scale);
                el.setAttribute("y", y * scale);
                el.style.fill = mapper.toColor[colorId];
                el.style.strokeWidth = "1px";
                el.style.stroke = mapper.toColor[colorId];
            }

            while (this.pixels[y].length > this.width) {
                this.pixels[y][this.width].remove();
                this.pixels[y].splice(this.width, 1);
            }
        }

        while (this.pixels.length > this.height) {
            while (this.pixels[this.height].length > this.width) {
                this.pixels[this.height][this.width].remove();
                this.pixels[this.height].splice(this.width, 1);
            }
            this.pixels.splice(this.height, 1);
        }

        this.updateViewSize();
        // root.style.setProperty("--pixelsviewheight", this.height);
        // --pixelsviewheightforwidth: 80vh;
        // --pixelsviewwidthforheight: 100vw;
    }

    updateViewSize() {
        if (this.isUpdatingViewSize)
            return;
        this.isUpdatingViewSize = true;
        this.el.setAttribute("viewBox", `0 0 ${this.naturalTileSize * this.width} ${this.naturalTileSize * this.height}`);

        // Source: https://css-tricks.com/updating-a-css-variable-with-javascript/
        let root = document.documentElement;
        root.style.setProperty("--pixelswidth", this.width);
        root.style.setProperty("--pixelsheight", this.height);

        let aspectRatio = this.width / this.height;
        let rectPanel = $("#pixelartPanel")[0].getBoundingClientRect();
        let rectSvg = $("#pixelartSvg")[0].getBoundingClientRect();
        root.style.setProperty("--pixelsview-atwidth-height", `${rectSvg.width / aspectRatio + rectPanel.width - rectSvg.width}px`);
        root.style.setProperty("--pixelsview-atheight-width", `${rectSvg.height * aspectRatio + rectPanel.height - rectSvg.height}px`);

        // $("#pixelartSvg")[0].setAttribute("viewBox", `0 0 ${$("#pixelartSvg")[0].clientWidth} ${$("#pixelartSvg")[0].clientWidth / aspectRatio}`);
        // $("#pixelartSvg")[0].setAttribute("viewBox", `0 0 ${$("#pixelartSvg")[0].clientHeight * aspectRatio} ${$("#pixelartSvg")[0].clientHeight}`);
        // $("#pixelartSvg")[0].setAttribute("viewBox", `0 0 ${$("#pixelartSvg")[0].clientWidth} ${$("#pixelartSvg")[0].clientHeight}`);

        let curViewBounds = this.getCurrentViewBounds();
        this.minWidthInView = Math.max(this.tileSize, curViewBounds.width / 5);
        this.minHeightInView = Math.max(this.tileSize, curViewBounds.height / 5);
        this.setPanOffset(this.panOffset.x, this.panOffset.y);

        this.isUpdatingViewSize = false;
        delete this.isUpdatingViewSize;
    }
}

function setDiagramHandle(handlers) {
    if (handleDiagramAvailable && handleDiagram["dismiss"] != null) {
        let dismissHandler = handleDiagram["dismiss"];
        handleDiagram = {};
        handleDiagramAvailable = false;
        dismissHandler();
    }

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

class ToggleButton {
    constructor(el) {
        this.el = el;
        this.state = 0;

        const that = this;
        this.el.addEventListener("click", e => that.cycleToggle());
    }

    getState() {
        return this.state;
    }

    isToggled() {
        return this.state > 0;
    }

    toggle() {
        if (this.isToggled())
            return;
        this.el.classList.add("toggled");
        this.state = 1;

        this.onToggle();
    }

    onToggle() {
        // Override this
    }

    untoggle() {
        if (this.state == 0)
            return;
        this.state = 0;
        this.el.classList.remove("toggled");

        this.onUntoggle();
    }

    onUntoggle() {
        // Override this
    }

    cycleToggle() {
        if (this.state == 1) {
            this.untoggle();
        } else {
            this.toggle();
        }
    }
}

class TwoStageToggleButton extends ToggleButton {
    constructor(el) {
        super(el);
    }

    isSecondToggled() {
        return this.state >= 2;
    }

    untoggle() {
        if (this.state == 0)
            return;
        this.state = 0;
        this.el.classList.remove("toggled");
        this.el.classList.remove("second-stage");

        this.onUntoggle();
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

    onToggle() {
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

class PanButton extends ToggleButton {
    constructor() {
        super($("#panButton")[0]);
    }

    onToggle() {
        let panEl = $("#pixelartSvg")[0];
        let panContext = diagram;

        panEl.style.cursor = "all-scroll";

        $(".coloroption-pan")[0].classList.add("coloroption-selected");

        //$("#pixelartSvg").css("cursor", "all-scroll");

        let transfMatrix = null;
        let prevDist = null;
        let prevZoom = 1.0;

        // let originalOffset;
        // let grapPoint;
        const that = this;
        let capturedPointer = null;

        let pointers = [];

        let isPointerCaptured = (ev) => {
            return capturedPointer === true || capturedPointer === ev.pointerId;
        }
        let releasePointerCapture = (ev) => {
            if (ev == null || capturedPointer === ev.pointerId) {
                if (diagram.el.hasPointerCapture(capturedPointer)) {
                    //console.log(`Releasing ${capturedPointer}`);
                    try {
                        diagram.el.releasePointerCapture(capturedPointer);
                    } catch (e) {
                        //console.log(`Error releasing capture: ${e.message}`);
                    }
                } else {
                    //console.log(`Vacuously releasing ${capturedPointer}`);
                }
                capturedPointer = null;
            } else if (capturedPointer === true) {
                capturedPointer = null;
            }
        }

        let getGripPoint = () => {
            if (pointers.length == 0) {
                //transfMatrix = null;
                return null;
            }
            let totX = 0.0;
            let totY = 0.0;
            for (let p of pointers) {
                totX += p.pos.x;
                totY += p.pos.y;
            }
            return new DOMPoint(totX / pointers.length, totY / pointers.length);
        }

        let getGripDist = () => {
            if (pointers.length < 2)
                return null;
            //console.log(JSON.stringify(pointers, null, 4));
            let deltaX = pointers[1].pos.x - pointers[0].pos.x;
            let deltaY = pointers[1].pos.y - pointers[0].pos.y;
            let dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            return dist;
        }

        let resetGrip = () => {
            let grip = getGripPoint();
            if (grip != null)
                transfMatrix = new DOMMatrix().translateSelf(-grip.x, -grip.y).preMultiplySelf(new DOMMatrix().scaleSelf(-1, -1));
            else
                transfMatrix = null;
            prevDist = getGripDist();
            prevZoom = diagram.zoom;
        }

        let setPointer = (event, pos) => {
            for (let i in pointers) {
                if (pointers[i].ev.pointerId === event.pointerId) {
                    if (pos != null) {
                        pointers[i] = { ev: event, pos: pos };
                    } else {
                        pointers.splice(i, 1);
                    }
                    return;
                }
            }
            if (pos == null)
                return;
            pointers.push({ ev: event, pos: pos });
            resetGrip();
        }

        let hasPointer = (event) => {
            for (let i in pointers) {
                if (pointers[i].ev.pointerId === event.pointerId)
                    return true;
            }
            return false;
        }

        let panOffset = { x: 0, y: 0 };

        setDiagramHandle({
            pointerdown: function (event, pos) {
                capturedPointer = true;
                panEl.setPointerCapture(event.pointerId);
                setPointer(event, pos);
                console.log(`Pointer ${event.pointerId} down`);

                panOffset = { x: panContext.panOffset.x, y: panContext.panOffset.y };

                // originalOffset = { x: panContext.panOffset.x, y: panContext.panOffset.y };
                // grapPoint = DOMPoint.fromPoint(pos);
                // transfMatrix = new DOMMatrix().translateSelf(-grapPoint.x, -grapPoint.y).preMultiplySelf(new DOMMatrix().scaleSelf(-1, -1));
            },
            pointercancel: function (event, pos) {
                setPointer(event, null);

                if (!isPointerCaptured(event))
                    return;
                capturedPointer = null;
            },
            pointerup: function (event, pos) {
                setPointer(event, null);

                if (!isPointerCaptured(event))
                    return;
                transfMatrix = null;
            },
            pointerout: function (event, pos) {
                if (event.target !== panEl)
                    return;
                setPointer(event, null);

                if (!isPointerCaptured(event))
                    return;
                transfMatrix = null;
            },
            pointerleave: function (event, pos) {
                if (event.target !== panEl)
                    return;
                setPointer(event, null);
                console.log(`Pointer ${event.pointerId} leave. Target: ${event.target}`);

                if (!isPointerCaptured(event))
                    return;
                transfMatrix = null;
            },
            pointermove: function (event, pos) {
                // if (!isPointerCaptured(event))
                //     return;
                if (pointers.length > 0)
                    event = event;
                if (!hasPointer(event))
                    return;
                setPointer(event, pos);

                if (transfMatrix !== null) {
                    let grip = getGripPoint();

                    let point = DOMPoint.fromPoint(grip);
                    point = point.matrixTransform(transfMatrix)
                        //.matrixTransform(new DOMMatrix().scaleSelf(panContext.zoom, panContext.zoom))
                        .matrixTransform(new DOMMatrix().translateSelf(
                            panOffset.x, panOffset.y));
                            //panContext.panOffset.x, panContext.panOffset.y));
                    //transfMatrix = new DOMMatrix().translateSelf(-grip.x, -grip.y).preMultiplySelf(new DOMMatrix().scaleSelf(-1, -1));

                    panOffset.x = point.x;
                    panOffset.y = point.y;
                    panContext.setPanOffset(panOffset.x, panOffset.y);//point.x, point.y);
                }

                let dist;
                if (prevDist != null && (dist = getGripDist()) != null) {
                    let newZoom = (dist / prevDist) * prevZoom;
                    panContext.setZoom(newZoom);
                }
                resetGrip();
            },
            gotpointercapture: function (event, pos) {
                capturedPointer = event.pointerId;
                //console.log(`Acquired ${event.pointerId}`);
            },
            lostpointercapture: function (event, pos) {
                if (capturedPointer === event.pointerId)
                    capturedPointer = null;
                //console.log(`Lost ${event.pointerId}`);
            },
            wheel: function (event, pos) {
                let scrollAmount = event.deltaY;
                if (event.deltaMode == 1) {
                    scrollAmount = -0.1 * scrollAmount / 10;
                } else {
                    scrollAmount = scrollAmount / 1000;
                }
                panContext.zoomIncrease(scrollAmount, pos);
                panOffset = { x: panContext.panOffset.x, y: panContext.panOffset.y };
            },
            dismiss: function () {
                releasePointerCapture();

                for (let p of pointers) {
                    if (panEl.hasPointerCapture(p.ev.pointerId))
                        panEl.releasePointerCapture(p.ev.pointerId);
                }

                //$(".pannable-diagram").css("cursor", "");
                panEl.style.cursor = "";
                that.untoggle();
            }
        });
    }

    onUntoggle() {
        setDiagramHandle({});
        $(".coloroption-pan")[0].classList.remove("coloroption-selected");
    }
}
