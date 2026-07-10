// Minimal Markdown -> React renderer covering what Spotter answers actually
// use (tables, headings, bullet lists, bold/code) — avoids pulling in a full
// markdown library for a demo app.

function renderInline(text, keyPrefix) {
  const parts = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0, match, i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      match[1] !== undefined
        ? <strong key={`${keyPrefix}-${i++}`}>{match[1]}</strong>
        : <code key={`${keyPrefix}-${i++}`}>{match[2]}</code>
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

const splitTableRow = (line) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

const isTableSeparator = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line ?? "");

export function renderMarkdown(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0, key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (line.includes("|") && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div className="table-wrap" key={key++}>
          <table>
            <thead>
              <tr>{headers.map((h, c) => <th key={c}>{renderInline(h, `h${c}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>{row.map((cell, c) => <td key={c}>{renderInline(cell, `${r}-${c}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)/.exec(line);
    if (heading) {
      const Tag = `h${Math.min(heading[1].length + 3, 6)}`;
      blocks.push(<Tag key={key++}>{renderInline(heading[2], `hd${key}`)}</Tag>);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++}>
          {items.map((item, idx) => <li key={idx}>{renderInline(item, `li${key}-${idx}`)}</li>)}
        </ul>
      );
      continue;
    }

    const paraLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].includes("|") && !/^\s*[-*#]/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(paraLines.join(" "), `p${key}`)}</p>);
  }

  return blocks;
}
