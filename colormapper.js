"use strict";

let colorMapEntry = document.createElement("template");
colorMapEntry.innerHTML = `
<div class="colormapper-entry">
    <div class="mapping-color-holder">
        <input type="color" data-binding="color" id="mappingColor" name="mappingColor" value="#ff0000">
    </div>
    <div class="mapping-details">
        <input type="text" class="form-control" data-binding="emoji" />
    </div>
</div>
`;

function setBinding(el, bindName, bindValue) {
    for (let element of $(`[data-binding=\"${bindName}\"]`, el)) {
        element.innerText = bindValue;
    }
}

class ColorMapperEntry {
    constructor(el, parent, desc) {
        this.el = el;
        this.parent = parent;
        this.color = { value: desc.color || "red" };
        this.emoji = desc["emoji"] ?? "x";
        this.paletteColorID = desc["id"];

        //setBinding(el, "label", `${label}`);
        bindElements(el, [this]);
    }

    static Create(parent, desc) {
        let el = colorMapEntry.content.children[0].cloneNode(true);
        return new ColorMapperEntry(el, parent, desc);
    }

    setColor(color) {
        if (this.color.suppressSet)
            return;
        this.color.suppressSet = true;
        this.color.value = color;
        //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
        updateBinding(this, "color");
        this.parent.toColor[this.paletteColorID] = this.color.value;
        updateSVGDisplay();

        delete this.color.suppressSet;
    };

    setEmoji(emoji) {
        this.emoji = emoji;
        //$("[data-binding=centerpoint]", obj.el)[0].style.fill = obj.color;
        updateBinding(this, "emoji");
        this.parent.toEmoji[this.paletteColorID] = this.emoji;
        updateEmojiOutput();
    }
}

class Mapper {
    constructor(el, onUpdate) {
        this.el = el;
        this.el.classList.add("colormapper");
        this.onUpdate = onUpdate;
        this.toColor = {};
        this.toEmoji = {};

        this.items = [];

        this.clear();
        this.add({ value: "AA" });
        this.add({ color: "green", value: "BB" });
    }

    clear() {
        this.items = [];
        this.el.innerHTML = "";
    }

    update() {
        //this.toColors = colormap;
        this.clear();
        let i = 0;
        for (let id in this.toColor) {
            this.add({ color: this.toColor[id], value: `${id}`, "id": id, "emoji": this.toEmoji[id] });
            i += 1;
        }
    }

    setColors(colors) {
        this.colors = colors;
        this.clear();
        let i = 0;
        for (let u of this.colors) {
            this.add({ color: u, value: `${i}` });
            i += 1;
        }
    }

    add(desc) {
        let entry = ColorMapperEntry.Create(this, desc);
        this.items.push(entry);
        this.el.appendChild(entry.el);
    }
}
