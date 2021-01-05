"use strict";

let colorSelectionEntry = document.createElement("template");
colorSelectionEntry.innerHTML = `
<div class="coloroption">
    <div class="colordisplay"></div>
</div>
`;

class ColorSelector {
    constructor() {
        this.el = $("#colorSelector")[0];

        this.add(0, "rgb(255, 0, 0)");
        this.add(1, "rgb(0, 255, 0)");
        this.el.children[this.el.children.length - 1].classList.add("coloroption-selected");
    }

    clear() {
        this.el.innerHTML = "";
    }

    add(id, color) {
        let el = colorSelectionEntry.content.children[0].cloneNode(true);
        this.el.appendChild(el);
    }
}

