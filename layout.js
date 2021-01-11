"use strict"

$(function () {
    onDOMReady();
});

// const pixelart =
// "..........\n" +
// "..x....x..\n" +
// "..........\n" +
// "..........\n" +
// "..........\n" +
// "..x....x..\n" +
// "..xxxxxx..\n" +
// "..........\n";

let pixelartText =
    "........\n" +
    ".x....x.\n" +
    "........\n" +
    "........\n" +
    "........\n" +
    ".x....x.\n" +
    ".xxxxxx.\n" +
    "........\n";

let mapper = null;
let colorselector = null;

let pixelart = pixelartText.replace(/\n+$/, "").split("\n");

for (let i in pixelart) {
    let list = [];
    for (let c of pixelart[i])
        list.push(c);
    pixelart[i] = list;
}

let emojimapping = {
    ".": "⛄",
    "x": "🙃"
}

let colormap = { ".": "rgb(181,186,253)", "x": "rgb(63,72,204)" };

function onDOMReady() {
    mapper = new Mapper($("#mapper")[0]);
    //mapper.setToColorMapping(colormap);
    mapper.toColor = colormap;
    mapper.toEmoji = emojimapping;
    mapper.update();

    diagram = new Diagram();

    updateSVGDisplay();
    updateEmojiOutput();

    $("#copyOutputButton").on("click",
        () => {
            $("#outputArea")[0].select();
            document.execCommand("copy");
        }
    );

    setupOverlay();

    //printCoordOnDiagramClick();
    paintOnDiagramClick();

    colorselector = new ColorSelector();
    colorselector.update();

    setupSplitter();

    window.setTimeout(function () { diagram.updateViewSize(); }, 500);

    // let isResizable = false;
    // let onPanelsContainerResize = function (e) {
    //     //console.log(`Window innerWidth is ${window.innerWidth}`);
    //     if (window.innerWidth > 1100) {
    //         if (!isResizable) {
    //             console.log("Adding resizability");
    //             $("#configurationPanel").resizable({
    //                 handles: "w"// {e: $("#splitter")[0]}
    //             });
    //             $("#configurationPanel")[0].classList.add("resizable");
    //             isResizable = true;
    //         }
    //     } else {
    //         if (isResizable) {
    //             console.log("Removing resizability");
    //             $("#configurationPanel")[0].classList.remove("resizable");
    //             //$("#pixelartPanel")[0].style.width = "";
    //             $("#configurationPanel").resizable("destroy");
    //             isResizable = false;
    //         }
    //     }
    // }

    // //$("#panelsContainer").on("resize", onPanelsContainerResize);
    // window.addEventListener("resize", onPanelsContainerResize);
    // onPanelsContainerResize();


    // $("#drawingContainerSvg")[0].addEventListener("click", 
    //     (e) => {
    //         let rect = $("#drawingContainerSvg")[0].getBoundingClientRect();
    //         let offsetX = e.clientX - rect.left;
    //         let offsetY = e.clientY - rect.top;
    //         let scale = 80.0;
    //         let x = Math.floor(offsetX / scale);
    //         let y = Math.floor(offsetY / scale);
    //         console.log(`Hit tile (${x}, ${y})`);
    //     }
    // );

    $("#saveImage").on("click", e => {
        saveImage();
    });
}

// function resetSplitterWidth() {

// }

function setupSplitter() {
    let el = $("#splitter")[0];
    let resizePanel = $("#configurationPanel")[0];
    let capturedPointer = null;
    let prevPos = null;
    let prevPanelWidth = null;

    el.addEventListener("pointerdown", function (event) {
        el.setPointerCapture(event.pointerId);
        document.body.style.cursor = "col-resize";

        capturedPointer = event.pointerId;
        prevPanelWidth = resizePanel.clientWidth;
        prevPos = event.clientX;
        event.preventDefault();
    });

    el.addEventListener("pointermove", function (event) {
        if (event.pointerId !== capturedPointer)
            return;
        let newPos = event.clientX;
        let newWidth = prevPanelWidth + (prevPos - newPos);
        resizePanel.style.flex = `1 0 ${newWidth}px`;
        prevPos = newPos;
        prevPanelWidth = newWidth;
        event.preventDefault();
    });

    el.addEventListener("pointerup", function (event) {
        if (capturedPointer === event.pointerId) {
            document.body.style.cursor = "auto";
            event.target.releasePointerCapture(capturedPointer);
            capturedPointer = null;
        }
        event.preventDefault();
    });
}

function colorFromUINT(u) {
    let red = u >>> 24;
    let green = (u >>> 16) % 256;
    let blue = (u >>> 8) % 256;
    let alpha = u % 256;
    return `rgb(${red}, ${green}, ${blue})`;
}

function interpretImage(data, width, height) {
    //let uints = new Uint32Array(data[0]);
    let bytes = new Uint8Array(data[0]);
    //console.log(bytes);
    let colorsToIDs = {};
    let colors = [];
    let content = [];
    let currentLine = [];

    for (let i = 0; i < bytes.length; i += 4) {
        let u = (bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3];

        let id = colorsToIDs[u];
        if (id == null) {
            id = colors.length;
            colorsToIDs[u] = id;
            colors.push(u);
        }
        currentLine.push(id);
        if (currentLine.length == width) {
            content.push(currentLine);
            currentLine = [];
        }
    }

    // console.log(content);
    // console.log(colors);

    pixelart = content;
    mapper.toEmoji[0] = mapper.toEmoji["."];
    //colormap[0] = colormap["."];
    colormap = {};
    mapper.toColor = {};
    mapper.toColor[0] = colorFromUINT(colors[0]);

    for (let i = 1; i < colors.length; i++) {
        mapper.toEmoji[i] = mapper.toEmoji["x"];
        //colormap[i] = colormap["x"];
        mapper.toColor[i] = colorFromUINT(colors[i]);
    }

    updateSVGDisplay();
    updateEmojiOutput();

    //mapper.setColors(colors);
    //mapper.setToColorMapping(colormap);
    mapper.update();
    colorselector.update();


}


function importFromFile(file) {
    file.arrayBuffer().then(buffer => {
        //buffer.pipe()
        //let data = new BmpDecoder(buffer);
        let img = UPNG.decode(buffer);
        let width = img.width;
        let height = img.height;
        let rawPixels = UPNG.toRGBA8(img);

        console.log(img);
        interpretImage(rawPixels, width, height);
    });
}

// const parseRGBARegex = new RegExp(
//     "^.*?(?<red>\\d+(\\.\\d+)?)(?<redPercentage>[^\\d,]+.*?%)?.*?" + 
//     "(?<green>\\d+(\\.\\d+)?)(?<greenPercentage>[^\\d,]+.*?%)?.*?" + 
//     "(?<blue>\\d+(\\.\\d+)?)(?<bluePercentage>[^\\d,]+.*?%)?.*?" + 
//     "((?<alpha>\\d+(\\.\\d+)?)(?<alphaPercentage>[^\\d,]+.*?%)?.*)?$");

const parseRGBARegex = new RegExp(
    "^.*?\\(\\s*(?<red>\\d+(\\.\\d+)?)\\s*(?<redPercentage>%)?\\s*,\\s*" +
    "(?<green>\\d+(\\.\\d+)?)\\s*(?<greenPercentage>%)?\\s*,\\s*" +
    "(?<blue>\\d+(\\.\\d+)?)\\s*(?<bluePercentage>%)?\\s*" +
    "(,\\s*(?<alpha>\\d+(\\.\\d+)?)\\s*(?<alphaPercentage>%)?\\s*)?\\)\\s*$");


function parseRGBAValues(string) {
    let match = string.match(parseRGBARegex);
    let arr = [+match.groups["red"], +match.groups["green"], +match.groups["blue"],
    +(match.groups["alpha"] ?? 1)];

    if (match.groups["redPercentage"] != null)
        arr[0] = Math.round(arr[0] * 255.0 / 100.0);
    if (match.groups["greenPercentage"] != null)
        arr[1] = Math.round(arr[1] * 255.0 / 100.0);
    if (match.groups["bluePercentage"] != null)
        arr[2] = Math.round(arr[2] * 255.0 / 100.0);
    if (match.groups["alphaPercentage"] != null)
        arr[3] = Math.round(arr[3] * 255.0 / 100.0);
    else
        arr[3] = Math.round(arr[3] * 255.0);
    return arr;
}

function saveToBuffer() {
    let arrayBuffer = new ArrayBuffer(diagram.width * diagram.height * 4);
    //let array = new Uint8Array(diagram.width * diagram.height * 4);
    let array = new Uint8Array(arrayBuffer);
    let colorsToBytes = {};
    for (let id of mapper.orderedIds) {
        let color = mapper.toColor[id];
        // let match = color.match(regex);
        // colorsToBytes[id] = [+match.groups["red"], +match.groups["green"], +match.groups["blue"],
        // +(match.groups["alpha"] ?? 1) * 100];
        colorsToBytes[id] = parseRGBAValues(color);
    }
    //console.log(JSON.stringify(colorsToBytes));
    for (let y = 0; y < diagram.height; y++) {
        for (let x = 0; x < diagram.width; x++) {
            array.set(colorsToBytes[pixelart[y][x]], (y * diagram.width + x) * 4);
        }
    }
    let buffer = UPNG.encode([arrayBuffer], diagram.width, diagram.height, 0);
    //let buffer = result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    return buffer;
}

function saveImage(fileName = "pixelart.png") {
    let buffer = saveToBuffer();

    // Source: https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
    // Modified
    let a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);

    let blob = new Blob([buffer], { type: "image/png" });
    let url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}

function setupOverlay() {
    $("#fileImportForm").on("submit", (e) => {
        try {
            importFromFile($("#selectedImportFile")[0].files[0]);
        } catch (error) {
            alert(`Error on importing: ${error}`);
        }

        $("#importImageOverlay").hide();
        e.preventDefault();
    });

    $("#importImageOverlay").on("click", (e) => {
        $("#importImageOverlay").hide();
    });

    $("#importImage").on("click", (e) => {
        //console.log("Clicked");
        $("#importImageOverlay").show();
        $("#importImageOverlay")[0].style.display = "flex";
    });

    $(".overlay-container").hide();

    $(".overlay-card").on("click", (e) => {
        e.stopPropagation();
        //e.preventDefault();
    });
}

let emojiRows = null;
let emojiColumns = null;

function generateEmoji(mapping) {
    let lines = pixelart;
    emojiRows = lines.length;
    emojiColumns = lines[0].length;
    let output = "";
    for (let line of lines) {
        for (let char of line) {
            output += mapping[char];
        }
        output += "\n";
    }
    return output;
}

function updateEmojiOutput() {
    $("#outputArea")[0].value = generateEmoji(mapper.toEmoji);
    //$("#outputArea")[0].setAttribute("cols", emojiColumns);
    $("#outputArea")[0].setAttribute("rows", emojiRows);
}

function updateSVGDisplay() {
    diagram.redraw();
    // $("#svgPixels")[0].innerHTML = "";
    // let lines = pixelart;
    // let scale = 80;

    // $("#drawingContainerSvg")[0].setAttribute("viewBox", `0 0 ${scale * lines[0].length} ${scale * lines.length}`);

    // let y = -1;
    // let x;
    // for (let line of lines) {
    //     y += 1;
    //     x = -1;
    //     for (let char of line) {
    //         x += 1;
    //         let el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    //         el.setAttribute("width", scale);
    //         el.setAttribute("height", scale);
    //         el.setAttribute("x", x * scale);
    //         el.setAttribute("y", y * scale);
    //         el.style.fill = mapper.toColor[char];
    //         el.style.strokeWidth = "1px";
    //         el.style.stroke = mapper.toColor[char];
    //         $("#svgPixels")[0].appendChild(el);
    //     }
    // }
}
