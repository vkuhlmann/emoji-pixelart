"use strict";

let colorMapEntry = document.createElement("template");
colorMapEntry.innerHTML = `
<div class="colormapper-entry">
    <div class="mapping-color"></div>
    <div class="mapping-details">
        <span data-binding="lightName">Light name</span>
    </div>
</div>
`;

function setBinding(el, bindName, bindValue) {
    for (let element of $(`[data-binding=\"${bindName}\"]`, el)) {
        element.innerText = bindValue;
    }
}

class ColorMapperGUI {
    constructor(el) {
        this.el = el;
        this.el.classList.add("colormapper");

        this.clear();
        this.add(1, { name: "Hey" });
        this.add(2, { name: "daar" });
    }

    clear() {
        this.el.innerHTML = "";
    }

    add(lightID, desc) {
        let el = colorMapEntry.content.children[0].cloneNode(true);
        let lightName = desc["name"] ?? "Unknown";

        // $("[data-binding=\"lightID\"]", el).each(index => {$(this).innerText = lightID;});
        // $("[data-binding=\"lightName\"]", el).each(index => {$(this).innerText = lightName;});
        //setBinding(el, "lightID", `${lightID}`);
        setBinding(el, "lightName", `${lightName}`);

        this.el.appendChild(el);
    }
}
