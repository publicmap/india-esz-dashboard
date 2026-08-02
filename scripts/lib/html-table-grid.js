// Flattens an HTML <table>'s rowspan/colspan layout into a plain grid, so
// callers can address cells by [row][col] without special-casing spans.
// Needed because these Wikipedia list tables use rowspan to share a single
// "Location" (or similar) cell across consecutive rows for the same place --
// naive positional cell reads misalign the moment a spanned row is hit.

export function expandTableGrid($, tableEl) {
  const trs = $(tableEl).find('> tbody > tr').toArray();
  const rows = trs.length > 0 ? trs : $(tableEl).find('> tr').toArray();

  const grid = [];
  const pending = []; // pending[col] = { html, text, isHeader, remaining }

  rows.forEach((tr, rowIndex) => {
    grid[rowIndex] = [];
    const cells = $(tr).find('> td, > th').toArray();
    let cellPtr = 0;
    let col = 0;

    while (cellPtr < cells.length || (pending[col] && pending[col].remaining > 0)) {
      if (pending[col] && pending[col].remaining > 0) {
        grid[rowIndex][col] = { html: pending[col].html, text: pending[col].text, isHeader: pending[col].isHeader };
        pending[col].remaining -= 1;
        col += 1;
        continue;
      }

      const cell = cells[cellPtr];
      cellPtr += 1;
      const isHeader = cell.tagName === 'th';
      // Wikipedia templates (coordinate/tooltip templates especially) embed
      // their CSS via <style data-mw-deduplicate="..."> tags inside the cell;
      // cheerio's .text() walks into those and leaks the raw CSS into the
      // extracted value, so strip them before reading text/html.
      const cellClone = $(cell).clone();
      cellClone.find('style, script').remove();
      const html = cellClone.html() ?? '';
      const text = cellClone.text().trim();
      const colspan = Math.max(1, parseInt($(cell).attr('colspan') || '1', 10) || 1);
      const rowspan = Math.max(1, parseInt($(cell).attr('rowspan') || '1', 10) || 1);

      for (let c = 0; c < colspan; c += 1) {
        grid[rowIndex][col] = { html, text, isHeader };
        if (rowspan > 1) {
          pending[col] = { html, text, isHeader, remaining: rowspan - 1 };
        }
        col += 1;
      }
    }
  });

  return grid;
}

// A grid row is still part of the header block only if every cell newly
// introduced in that row (i.e. not carried over from a rowspan above) is a
// <th> -- this correctly stops at the first data row even when that row's
// leading cell is itself a <th> (Wikipedia's sortable tables often mark the
// row-label column as <th> all the way down).
export function countHeaderRows($, tableEl) {
  const trs = $(tableEl).find('> tbody > tr').toArray();
  const rows = trs.length > 0 ? trs : $(tableEl).find('> tr').toArray();

  let headerRows = 0;
  for (const tr of rows) {
    const cells = $(tr).find('> td, > th').toArray();
    if (cells.length === 0 || !cells.every((c) => c.tagName === 'th')) break;
    headerRows += 1;
  }
  return headerRows;
}
