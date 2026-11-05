export type XmlNodeData = {
  id: string;
  type: "element" | "text" | "comment" | "cdata" | "processing" | "doctype";
  name: string;
  value: string;
  attributes: Array<{ name: string; value: string }>;
  children: XmlNodeData[];
};

function nodeType(node: Node): XmlNodeData["type"] | null {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: return "element";
    case Node.TEXT_NODE: return "text";
    case Node.COMMENT_NODE: return "comment";
    case Node.CDATA_SECTION_NODE: return "cdata";
    case Node.PROCESSING_INSTRUCTION_NODE: return "processing";
    case Node.DOCUMENT_TYPE_NODE: return "doctype";
    default: return null;
  }
}

function toNodeData(node: Node, path: string): XmlNodeData | null {
  const type = nodeType(node);
  if (!type) return null;
  const element = node as Element;
  const attributes = type === "element"
    ? Array.from(element.attributes, (attribute) => ({ name: attribute.name, value: attribute.value }))
    : [];
  const children = Array.from(node.childNodes)
    .map((child, index) => toNodeData(child, `${path}.${index}`))
    .filter((child): child is XmlNodeData => child !== null);
  return {
    id: path,
    type,
    name: type === "element" ? element.tagName : node.nodeName,
    value: node.nodeValue ?? "",
    attributes,
    children,
  };
}

export function parseXml(source: string): Document {
  const document = new DOMParser().parseFromString(source, "application/xml");
  const parserError = document.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const message = parserError.textContent?.trim() || "Invalid XML document.";
    throw new SyntaxError(message.replace(/\s+/g, " "));
  }
  if (!document.documentElement) throw new SyntaxError("The XML document has no root element.");
  return document;
}

export function getXmlTree(document: Document): XmlNodeData[] {
  return Array.from(document.childNodes)
    .map((node, index) => toNodeData(node, `root.${index}`))
    .filter((node): node is XmlNodeData => node !== null);
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function serializeNode(node: Node, depth: number, indent: string): string {
  const pad = indent.repeat(depth);
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      const element = node as Element;
      const attrs = Array.from(element.attributes)
        .map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join("");
      const children = Array.from(element.childNodes);
      if (!children.length) return `${pad}<${element.tagName}${attrs}/>`;
      const hasSignificantText = children.some(
        (child) => child.nodeType === Node.TEXT_NODE && Boolean(child.nodeValue?.trim()),
      );
      if (hasSignificantText) {
        const content = children.map((child) => serializeInline(child)).join("");
        return `${pad}<${element.tagName}${attrs}>${content}</${element.tagName}>`;
      }
      const formattedChildren = children
        .filter((child) => !(child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()))
        .map((child) => serializeNode(child, depth + 1, indent));
      return `${pad}<${element.tagName}${attrs}>\n${formattedChildren.join("\n")}\n${pad}</${element.tagName}>`;
    }
    case Node.TEXT_NODE:
      return `${pad}${escapeText(node.nodeValue ?? "")}`;
    case Node.CDATA_SECTION_NODE:
      return `${pad}<![CDATA[${node.nodeValue ?? ""}]]>`;
    case Node.COMMENT_NODE:
      return `${pad}<!--${node.nodeValue ?? ""}-->`;
    case Node.PROCESSING_INSTRUCTION_NODE: {
      const instruction = node as ProcessingInstruction;
      return `${pad}<?${instruction.target}${instruction.data ? ` ${instruction.data}` : ""}?>`;
    }
    case Node.DOCUMENT_TYPE_NODE: {
      const doctype = node as DocumentType;
      let result = `${pad}<!DOCTYPE ${doctype.name}`;
      if (doctype.publicId) result += ` PUBLIC "${doctype.publicId}"${doctype.systemId ? ` "${doctype.systemId}"` : ""}`;
      else if (doctype.systemId) result += ` SYSTEM "${doctype.systemId}"`;
      return `${result}>`;
    }
    default:
      return `${pad}${new XMLSerializer().serializeToString(node)}`;
  }
}

function serializeInline(node: Node): string {
  switch (node.nodeType) {
    case Node.TEXT_NODE: return escapeText(node.nodeValue ?? "");
    case Node.CDATA_SECTION_NODE: return `<![CDATA[${node.nodeValue ?? ""}]]>`;
    case Node.COMMENT_NODE: return `<!--${node.nodeValue ?? ""}-->`;
    case Node.ELEMENT_NODE: {
      const element = node as Element;
      const attrs = Array.from(element.attributes).map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`).join("");
      const children = Array.from(element.childNodes).map(serializeInline).join("");
      return children ? `<${element.tagName}${attrs}>${children}</${element.tagName}>` : `<${element.tagName}${attrs}/>`;
    }
    default: return new XMLSerializer().serializeToString(node);
  }
}

export function formatXml(document: Document, spaces = 2): string {
  const indent = " ".repeat(spaces);
  return Array.from(document.childNodes)
    .filter((node) => !(node.nodeType === Node.TEXT_NODE && !node.nodeValue?.trim()))
    .map((node) => serializeNode(node, 0, indent))
    .join("\n");
}

export function collectExpandablePaths(nodes: XmlNodeData[]): string[] {
  return nodes.flatMap((node) => {
    if (!node.children.length) return [];
    return [node.id, ...collectExpandablePaths(node.children)];
  });
}
