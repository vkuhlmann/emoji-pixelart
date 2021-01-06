"use strict";

let colorSelectionEntry = document.createElement("template");
colorSelectionEntry.innerHTML = `
<div class="coloroption">
    <button type="button" role="button" class="colordisplay" data-id="colorDisplay"></button>
</div>
`;

class ColorOption {
    constructor(id, color, parent) {
        this.el = colorSelectionEntry.content.children[0].cloneNode(true);
        this.colorDisplay = {el: $("[data-id=\"colorDisplay\"]", this.el)[0]};

        this.id = id;
        this.setColor(color);
        this.parent = parent;
        const that = this;
        this.el.addEventListener("click", e => {that.onClick(e);});
    }

    setColor(color) {
        this.color = color;
        this.colorDisplay.el.style.backgroundColor = this.color;
    }

    setSelected(val) {
        if (val) {
            this.el.classList.add("coloroption-selected");
        } else {
            this.el.classList.remove("coloroption-selected");
        }
    }

    onClick(e) {
        this.parent.selectSingle(this.id);
    }
}

class ColorSelector {
    constructor() {
        this.el = $("#colorSelector")[0];
        this.selected = [];

        this.options = [];

        this.add(0, "rgb(255, 0, 0)");
        this.add(1, "rgb(0, 255, 0)");
        //this.el.children[this.el.children.length - 1].classList.add("coloroption-selected");
        this.selectSingle(this.options.length - 1);
    }

    clear() {
        this.selected = [];
        this.options = [];
        this.el.innerHTML = "";
    }

    add(id, color) {
        let newVal = new ColorOption(id, color, this);
        this.options.push(newVal);
        this.el.appendChild(newVal.el);
        //let el = colorSelectionEntry.content.children[0].cloneNode(true);
        //this.el.appendChild(el);
    }

    getSingleSelected() {
        return this.selected[0];
    }

    selectSingle(id) {
        this.selectMulti([id]);
    }

    selectMulti(ids) {
        this.selected = ids;
        for (let opt of this.options) {
            opt.setSelected(ids.includes(opt.id));
        }
    }

    update() {
        let prevSelected = [...this.selected];
        this.clear();
        for (let id in mapper.toColor) {
            this.add(id, mapper.toColor[id]);
        }

        let select = [];
        for (let opt of this.options) {
            if (prevSelected.includes(opt.id))
                select.push(opt.id);
        }
        this.selectMulti(select);
    }
}

