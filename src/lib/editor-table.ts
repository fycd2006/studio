export function createEditorTableHtml(rows: number, columns: number) {
  const row = "<tr>" + "<td><br></td>".repeat(columns) + "</tr>";
  return "<table><tbody>" + row.repeat(rows) + "</tbody></table><div><br></div>";
}

type CellPosition = {
  cell: HTMLTableCellElement;
  row: number;
  column: number;
  rows: number;
  columns: number;
};

export function tableGrid(table: HTMLTableElement) {
  const cells: CellPosition[] = [];
  const grid: CellPosition[][] = [];
  let width = 0;
  for (const row of Array.from(table.rows)) {
    let column = 0;
    const line = grid[row.rowIndex] ??= [];
    for (const cell of Array.from(row.cells)) {
      while (line[column]) column++;
      const lastRow = (row.parentElement as HTMLTableSectionElement | null)?.rows;
      const remaining = lastRow ? lastRow.length - row.sectionRowIndex : table.rows.length - row.rowIndex;
      const position = { cell, row: row.rowIndex, column, columns: cell.colSpan, rows: Math.min(remaining, cell.rowSpan || remaining) };
      cells.push(position);
      for (let r = position.row; r < position.row + position.rows; r++) {
        const occupied = grid[r] ??= [];
        for (let c = column; c < column + position.columns; c++) occupied[c] = position;
      }
      column += position.columns;
      width = Math.max(width, column);
    }
  }
  return { cells, grid, width };
}

function appendEmptyCell(row: HTMLTableRowElement, before?: HTMLTableCellElement) {
  const cell = row.ownerDocument.createElement(row.parentElement?.tagName === "THEAD" ? "th" : "td");
  cell.append(row.ownerDocument.createElement("br"));
  row.insertBefore(cell, before ?? null);
  return cell;
}

export function insertEditorRow(table: HTMLTableElement, cell: HTMLTableCellElement, below: boolean) {
  const { cells, grid, width } = tableGrid(table);
  const anchor = cell.parentElement as HTMLTableRowElement;
  const section = anchor.parentElement as HTMLTableSectionElement;
  const boundary = anchor.rowIndex + Number(below);
  const row = section.insertRow(anchor.sectionRowIndex + Number(below));
  const crossing = cells.filter((position) => position.row < boundary && position.row + position.rows > boundary);
  for (const position of crossing) position.cell.rowSpan = position.rows + 1;
  const blocked = new Set(crossing.map((position) => position.cell));
  for (let column = 0; column < width; column++) {
    if (!blocked.has(grid[boundary]?.[column]?.cell)) appendEmptyCell(row);
  }
  return row.cells[0] ?? null;
}

export function deleteEditorRow(table: HTMLTableElement, cell: HTMLTableCellElement) {
  const { cells } = tableGrid(table);
  const row = cell.parentElement as HTMLTableRowElement;
  const index = row.rowIndex;
  const next = table.rows[index + 1];
  for (const position of cells) {
    if (position.row < index && position.row + position.rows > index) position.cell.rowSpan = position.rows - 1;
    if (position.row === index && position.rows > 1 && next) {
      const before = cells.find((item) => item.row === index + 1 && item.column > position.column);
      position.cell.rowSpan = position.rows - 1;
      next.insertBefore(position.cell, before?.cell ?? null);
    }
  }
  row.remove();
}

function existingColumns(table: HTMLTableElement) {
  const group = Array.from(table.children).find((element) => element.tagName === "COLGROUP");
  return group && Array.from(group.children).filter((element): element is HTMLTableColElement => element.tagName === "COL");
}

export function insertEditorColumn(table: HTMLTableElement, cell: HTMLTableCellElement, after: boolean) {
  const { cells, grid } = tableGrid(table);
  const anchor = cells.find((position) => position.cell === cell);
  if (!anchor) return;
  const boundary = anchor.column + (after ? anchor.columns : 0);
  const crossing = new Set<CellPosition>();
  for (const row of Array.from(table.rows)) {
    const position = grid[row.rowIndex]?.[boundary];
    if (position && position.column < boundary) {
      crossing.add(position);
    } else {
      const before = cells.find((item) => item.row === row.rowIndex && item.column >= boundary);
      appendEmptyCell(row, before?.cell);
    }
  }
  for (const position of crossing) position.cell.colSpan = position.columns + 1;
  const columns = existingColumns(table);
  if (columns?.length) columns[0].parentElement?.insertBefore(table.ownerDocument.createElement("col"), columns[boundary] ?? null);
}

export function deleteEditorColumn(table: HTMLTableElement, cell: HTMLTableCellElement) {
  const { cells } = tableGrid(table);
  const anchor = cells.find((position) => position.cell === cell);
  if (!anchor) return;
  const column = anchor.column;
  for (const position of cells) {
    if (position.column > column || position.column + position.columns <= column) continue;
    if (position.columns > 1) position.cell.colSpan = position.columns - 1;
    else position.cell.remove();
  }
  existingColumns(table)?.[column]?.remove();
}

export function mergeEditorCellRight(table: HTMLTableElement, cell: HTMLTableCellElement) {
  const { cells, grid } = tableGrid(table);
  const current = cells.find((position) => position.cell === cell);
  if (!current) return;
  const next = grid[current.row]?.[current.column + current.columns];
  if (!next || next.row !== current.row || next.rows !== current.rows) return;
  if (next.cell.textContent?.trim() || next.cell.querySelector("img,table")) {
    if (cell.textContent?.trim() || cell.querySelector("img,table")) cell.append(table.ownerDocument.createElement("br"));
    else cell.replaceChildren();
    cell.append(...Array.from(next.cell.childNodes));
  }
  cell.colSpan = current.columns + next.columns;
  next.cell.remove();
}

export function splitEditorCell(table: HTMLTableElement, cell: HTMLTableCellElement) {
  const { cells } = tableGrid(table);
  const current = cells.find((position) => position.cell === cell);
  if (!current) return;
  for (let row = current.row; row < current.row + current.rows; row++) {
    const before = cells.find((item) => item.row === row && item.column > current.column);
    for (let index = row === current.row ? 1 : 0; index < current.columns; index++) {
      appendEmptyCell(table.rows[row], before?.cell);
    }
  }
  cell.colSpan = 1;
  cell.rowSpan = 1;
}

export function tableColumnSizes(table: HTMLTableElement) {
  const { cells, width } = tableGrid(table);
  const measured = Array<number>(width).fill(table.offsetWidth / width);
  for (const { cell, column, columns } of cells) {
    if (columns === 1) measured[column] = cell.offsetWidth;
  }
  return measured;
}

export function setTableColumnSizes(table: HTMLTableElement, sizes: number[]) {
  const document = table.ownerDocument;
  const oldColumns = existingColumns(table);
  const group = oldColumns?.[0]?.parentElement ?? document.createElement("colgroup");
  if (!group.isConnected) table.insertBefore(group, table.tHead || table.tBodies[0] || table.tFoot);
  const total = sizes.reduce((sum, width) => sum + width, 0);
  if (!total) return;
  const columns = sizes.map((size, index) => {
    const column = oldColumns?.[index] ?? document.createElement("col");
    column.style.width = (size / total * 100) + "%";
    return column;
  });
  group.replaceChildren(...columns);
}
