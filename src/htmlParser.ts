import { parseCss } from './cssParser'
import { DocHandler } from './documentHandler'
import { HtmlRowInput, RowInput } from './config'

export function parseHtml(
  doc: DocHandler,
  input: HTMLTableElement | string,
  window: Window,
  includeHiddenHtml = false,
  useCss = false
): { head: RowInput[]; body: RowInput[]; foot: RowInput[] } {
  let tableElement: HTMLTableElement
  if (typeof input === 'string') {
    tableElement = <HTMLTableElement>window.document.querySelector(input)
  } else {
    tableElement = input
  }

  let supportedFonts = Object.keys(doc.getFontList())
  let scaleFactor = doc.scaleFactor()

  const head: RowInput[] = [],
    body: RowInput[] = [],
    foot: RowInput[] = []

  if (!tableElement) {
    console.error('Html table could not be found with input: ', input)
    return { head, body, foot }
  }

  for (let i = 0; i < tableElement.rows.length; i++) {
    const element = tableElement.rows[i]
    const tagName = element?.parentElement?.tagName?.toLowerCase()
    let row = parseRowContent(
      supportedFonts,
      scaleFactor,
      window,
      element,
      includeHiddenHtml,
      useCss
    )
    if (!row) continue

    if (tagName === 'thead') {
      head.push(row)
    } else if (tagName === 'tfoot') {
      foot.push(row)
    } else {
      // Add to body both if parent is tbody or table
      body.push(row)
    }
  }
  return { head, body, foot }
}

function parseRowContent(
  supportedFonts: string[],
  scaleFactor: number,
  window: Window,
  row: HTMLTableRowElement,
  includeHidden: boolean,
  useCss: boolean
) {
  let resultRow = new HtmlRowInput(row)
  for (let i = 0; i < row.cells.length; i++) {
    let cell = row.cells[i]
    let style = window.getComputedStyle(cell)
    if (includeHidden || style.display !== 'none') {
      let cellStyles
      if (useCss) {
        cellStyles = parseCss(supportedFonts, cell, scaleFactor, style, window)
      }
      resultRow.push({
        rowSpan: cell.rowSpan,
        colSpan: cell.colSpan,
        styles: cellStyles,
        _element: cell,
        content: parseCellContent(cell),
      })
    }
  }
  let style = window.getComputedStyle(row)
  if (resultRow.length > 0 && (includeHidden || style.display !== 'none')) {
    return resultRow
  }
}

function parseCellContent(orgCell: HTMLTableCellElement) {
  // Work on cloned node to make sure no changes are applied to html table
  const cell = orgCell.cloneNode(true) as HTMLTableCellElement

  // Remove extra space and line breaks in markup to make it more similar to
  // what would be shown in html
  cell.innerHTML = cell.innerHTML.replace(/\n/g, '').replace(/ +/g, ' ')

  // Preserve <br> tags as line breaks in the pdf
  cell.innerHTML = cell.innerHTML
    .split('<br>')
    .map((part: string) => part.trim())
    .join('\n')

  // innerText for ie
  return cell.innerText || cell.textContent || ''
}
