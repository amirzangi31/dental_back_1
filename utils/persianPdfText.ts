import bidiFactory from "bidi-js";

const bidi = bidiFactory();

const ARABIC_SCRIPT = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const SHAPE_FEATURES = { liga: true };

type GlyphSlot = { glyph: any; position: any } | null;

const utf16Length = (codePoints: number[]) => {
  let length = 0;
  for (const codePoint of codePoints) length += codePoint > 0xffff ? 2 : 1;
  return length;
};

const reorderShapedRun = (text: string, run: any) => {
  const embedding = bidi.getEmbeddingLevels(text, "rtl");
  const mirrored = bidi.getMirroredCharactersMap(text, embedding.levels);
  let source = text;
  if (mirrored.size) {
    const chars = text.split("");
    for (const [index, character] of mirrored) chars[index] = character;
    source = chars.join("");
  }

  const shaped = run(source);
  const slots: GlyphSlot[] = new Array(text.length).fill(null);
  let cursor = 0;
  for (let index = 0; index < shaped.glyphs.length; index++) {
    if (cursor >= text.length) return shaped;
    slots[cursor] = {
      glyph: shaped.glyphs[index],
      position: shaped.positions[index],
    };
    const codePoints: number[] = shaped.glyphs[index].codePoints ?? [];
    cursor += utf16Length(codePoints) || 1;
  }
  if (cursor !== text.length) {
    shaped.glyphs.reverse();
    shaped.positions.reverse();
    return shaped;
  }

  const order = slots.slice();
  for (const [start, end] of bidi.getReorderSegments(text, embedding)) {
    const slice = order.slice(start, end + 1);
    for (let index = slice.length; index--; ) {
      order[end - index] = slice[index];
    }
  }

  const glyphs = [];
  const positions = [];
  for (const slot of order) {
    if (!slot) continue;
    glyphs.push(slot.glyph);
    positions.push(slot.position);
  }
  shaped.glyphs = glyphs;
  shaped.positions = positions;
  return shaped;
};

export const enablePersianPdfText = (doc: any) => {
  const font = doc._font?.font;
  if (font?.layout && !font.__persianBidi) {
    const layout = font.layout.bind(font);
    font.layout = (
      text: unknown,
      userFeatures?: unknown,
      script?: unknown,
      language?: unknown,
      direction?: unknown,
    ) => {
      if (typeof text !== "string" || !ARABIC_SCRIPT.test(text)) {
        return layout(text, userFeatures, script, language, direction);
      }
      return reorderShapedRun(text, (source: string) =>
        layout(source, [], "arab", null, "ltr"),
      );
    };
    font.__persianBidi = true;
  }

  if (!doc.__persianText) {
    const initOptions = doc._initOptions.bind(doc);
    doc._initOptions = (...args: unknown[]) => {
      const options = initOptions(...args);
      if (doc._font?.font?.__persianBidi && !options.features) {
        options.features = SHAPE_FEATURES;
      }
      return options;
    };
    doc.__persianText = true;
  }
};
