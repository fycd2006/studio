const allowedElements = new Set([
  "a", "b", "blockquote", "br", "caption", "code", "col", "colgroup", "div", "em", "font",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "mark", "ol", "p", "pre",
  "s", "span", "strike", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "u", "ul",
]);

const allowedStyles = new Set([
  "aspect-ratio", "background", "background-color", "border", "border-bottom", "border-collapse", "border-color", "border-left",
  "border-radius", "border-right", "border-style", "border-top", "border-width", "box-shadow",
  "color", "display", "font-family", "font-size", "font-style", "font-weight", "height",
  "letter-spacing", "line-height", "list-style-type", "margin", "margin-bottom", "margin-left",
  "margin-right", "margin-top", "max-height", "max-width", "min-height", "min-width", "object-fit", "opacity", "padding", "padding-bottom",
  "padding-left", "padding-right", "padding-top", "table-layout", "text-align", "text-decoration", "text-decoration-line",
  "text-indent", "vertical-align", "white-space", "width",
]);

const numericAttributes = new Set(["colspan", "rowspan", "width", "height", "size", "start", "span"]);
const discardedElements = new Set(["iframe", "math", "noscript", "object", "script", "style", "svg", "template"]);

export function parseEditorHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const clean = (parent: ParentNode) => {
    for (const node of Array.from(parent.children)) {
      const tag = node.localName;
      if (node.namespaceURI !== "http://www.w3.org/1999/xhtml" || discardedElements.has(tag)) {
        node.remove();
        continue;
      }
      clean(node);
      if (!allowedElements.has(tag)) {
        node.replaceWith(...Array.from(node.childNodes));
        continue;
      }
      const element = node as HTMLElement;
      for (const attribute of Array.from(element.attributes)) {
        const { name, value } = attribute;
        if (name === "style") {
          for (const property of Array.from(element.style)) {
            if (!allowedStyles.has(property) || /(?:url|image-set)\s*\(/i.test(element.style.getPropertyValue(property))) {
              element.style.removeProperty(property);
            }
          }
        } else if (tag === "a" && name === "href" && /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(value.trim())) {
          continue;
        } else if (tag === "img" && name === "src" && /^(?:https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(value.trim())) {
          continue;
        } else if ((numericAttributes.has(name) && /^\d{1,4}$/.test(value)) ||
          name === "title" || (tag === "img" && name === "alt") ||
          (tag === "font" && (name === "face" || name === "color")) ||
          (name === "align" && /^(left|center|right|justify)$/i.test(value))) {
          continue;
        } else {
          element.removeAttribute(name);
        }
      }
    }
  };
  clean(template.content);
  return template;
}
