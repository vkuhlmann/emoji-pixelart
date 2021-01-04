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

const pixelart =
"........\n" +
".x....x.\n" +
"........\n" +
"........\n" +
"........\n" +
".x....x.\n" +
".xxxxxx.\n" +
"........";

function onDOMReady() {
    updateSVGDisplay();
}

function updateSVGDisplay() {
    $("#svgPixels")[0].innerHTML = "";
    let lines = pixelart.split("\n");
    let colormap = {".": "rgb(181,186,253)", "x": "rgb(63,72,204)"};
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
