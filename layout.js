"use strict"

$(document).ready(function () {
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

let pixelart = pixelartText.replace(/\n+$/, "").split("\n");

let emojimapping = {
    ".": "⛄",
    "x": "🙃"
}

let colormap = { ".": "rgb(181,186,253)", "x": "rgb(63,72,204)" };

function onDOMReady() {
    updateSVGDisplay();
    updateEmojiOutput();

    $("#copyOutputButton").click(
        () => {
            $("#outputArea")[0].select();
            document.execCommand("copy");
        }
    );

    setupOverlay();
}

function interpretImage(data, width, height) {
    let uints = new Uint32Array(data[0]);
    //console.log(bytes);
    let colorsToIDs = {};
    let colors = [];
    let content = [];
    let currentLine = [];

    for (let u of uints) {
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
    emojimapping[0] = emojimapping["."];
    colormap[0] = colormap["."];
    for(let i = 1; i < colors.length; i++) {
        emojimapping[i] = emojimapping["x"];
        colormap[i] = colormap["x"];
    }

    updateSVGDisplay();
    updateEmojiOutput();
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

    $("#importImageOverlay").click((e) => {
        $("#importImageOverlay").hide();
    });

    $("#importImage").click((e) => {
        //console.log("Clicked");
        $("#importImageOverlay").show();
        $("#importImageOverlay")[0].style.display = "flex";
    });

    $(".overlay-container").hide();

    $(".overlay-card").click((e) => {
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
    $("#outputArea")[0].value = generateEmoji(emojimapping);
    $("#outputArea")[0].setAttribute("cols", emojiColumns);
    $("#outputArea")[0].setAttribute("rows", emojiRows);
}

function updateSVGDisplay() {
    $("#svgPixels")[0].innerHTML = "";
    let lines = pixelart;
    let scale = 80;

    $("#drawingContainerSvg")[0].setAttribute("viewBox", `0 0 ${scale * lines[0].length} ${scale * lines.length}`);

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
            el.style.fill = colormap[char];
            el.style.strokeWidth = "1px";
            el.style.stroke = colormap[char];
            $("#svgPixels")[0].appendChild(el);
        }
    }
}