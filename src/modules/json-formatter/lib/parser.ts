/**
 * Parse strict JSON while also accepting single-quoted JSON strings.
 *
 * This intentionally only relaxes quote style. Other JSON syntax rules
 * (quoted keys, commas, literals, numbers, and arrays/objects) remain strict.
 */
export function parseJsonLike(source: string): unknown {
  return JSON.parse(normalizeSingleQuotedStrings(source)) as unknown;
}

function normalizeSingleQuotedStrings(source: string): string {
  let output = "";
  let insideDoubleQuotedString = false;
  let escapedInDoubleString = false;

  for (let index = 0; index < source.length; index++) {
    const character = source[index];

    if (insideDoubleQuotedString) {
      output += character;

      if (escapedInDoubleString) {
        escapedInDoubleString = false;
      } else if (character === "\\") {
        escapedInDoubleString = true;
      } else if (character === '"') {
        insideDoubleQuotedString = false;
      }

      continue;
    }

    if (character === '"') {
      insideDoubleQuotedString = true;
      output += character;
      continue;
    }

    if (character !== "'") {
      output += character;
      continue;
    }

    // Convert one single-quoted string into a JSON double-quoted string.
    output += '"';
    let closed = false;

    for (index++; index < source.length; index++) {
      const current = source[index];

      if (current === "'") {
        output += '"';
        closed = true;
        break;
      }

      if (current === '"') {
        output += '\\"';
        continue;
      }

      if (current === "\\") {
        const next = source[index + 1];

        if (next === undefined) {
          output += "\\\\";
          continue;
        }

        if (next === "'") {
          output += "'";
          index++;
          continue;
        }

        // Preserve JSON escape sequences and escaped backslashes.
        output += `\\${next}`;
        index++;
        continue;
      }

      output += current;
    }

    if (!closed) {
      throw new SyntaxError("Unterminated single-quoted string.");
    }
  }

  return output;
}
