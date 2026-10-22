// Tests for FormattedText (and parseParagraph through it): every row of the rendering examples
// table in docs/client-website.md, Paragraph formatting, rendered and compared with its Output.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FormattedText from "./FormattedText";

// [input as stored, output as HTML]. The renderer escapes <, > and &, so text shown as typed
// appears escaped here.
const EXAMPLES = [
  ["Hello **world**", "Hello <b>world</b>"],
  ["An *easy* walk", "An <i>easy</i> walk"],
  [
    "See [our menu](https://example.com/menu).",
    'See <a href="https://example.com/menu">our menu</a>.',
  ],
  [
    "**Bold** and *italic* and [a link](https://example.com)",
    '<b>Bold</b> and <i>italic</i> and <a href="https://example.com">a link</a>',
  ],
  ["5 * 3 * 2", "5 * 3 * 2"],
  ["** not bold **", "** not bold **"],
  ["*open", "*open"],
  ["[no url]", "[no url]"],
  ["[menu] (https://example.com)", "[menu] (https://example.com)"],
  ["**across\nlines**", "**across\nlines**"],
  ["_not italic_", "_not italic_"],
  ["**a *b* c**", "<b>a *b* c</b>"],
  [
    "[**Menu**](https://example.com)",
    '<a href="https://example.com">**Menu**</a>',
  ],
  ["<b>hi</b> & more", "&lt;b&gt;hi&lt;/b&gt; &amp; more"],
  ["***both***", "<b><i>both</i></b>"],
  ["*** spaced ***", "*** spaced ***"],
  ["**a*", "*<i>a</i>"],
  [
    "**[our menu](https://example.com/menu)**",
    '<b><a href="https://example.com/menu">our menu</a></b>',
  ],
  [
    "*see [the map](https://example.com/map)*",
    '<i>see <a href="https://example.com/map">the map</a></i>',
  ],
  [
    "***[both](https://example.com)***",
    '<b><i><a href="https://example.com">both</a></i></b>',
  ],
  [
    "**[a](https://example.com/**x)**",
    '<b><a href="https://example.com/**x">a</a></b>',
  ],
  ["[menu](http://example.com)", "[menu](http://example.com)"],
];

// This site opens post links in a new tab (the guide leaves it to each site), so every link in
// the guide's Output column also carries target and rel.
function withNewTab(html) {
  return html.replace(
    /<a href="([^"]*)">/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">',
  );
}

describe("FormattedText", () => {
  it.each(EXAMPLES)("renders %j as %j", (input, output) => {
    const html = renderToStaticMarkup(
      createElement(FormattedText, { text: input }),
    );

    expect(html).toBe(withNewTab(output));
  });
});
