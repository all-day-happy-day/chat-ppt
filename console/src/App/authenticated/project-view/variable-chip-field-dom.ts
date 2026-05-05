/** Attribute on chip spans; serialized as `{name}` in the stored string. */
export const PROJECT_VAR_DATA_ATTR: string = 'data-project-var'

/**
 * Normalizes the inside of a `{...}` token. Doubled opens from `{{name}}` yield inner `{name`
 * from the regex; strip leading `{` and trailing `}` so the chip stores/display `name` only.
 */
export function normalizeVariableTokenInner(rawInner: string): string {
  let s: string = rawInner.trim()
  while (s.startsWith('{')) {
    s = s.slice(1).trim()
  }
  while (s.endsWith('}')) {
    s = s.slice(0, -1).trim()
  }
  return s.trim()
}

/**
 * Collapses `{{name}}` → `{name}` and fixes token inners in a full serialized value.
 */
export function normalizeVariableTokensInSerialized(serialized: string): string {
  if (!serialized.includes('{')) {
    return serialized
  }
  return serialized.replace(/\{([^}]*)\}/g, (_full: string, inner: string): string => {
    const n: string = normalizeVariableTokenInner(inner)
    if (n.length === 0) {
      return ''
    }
    return `{${n}}`
  })
}

function canonicalChipAttrName(attr: string): string {
  return normalizeVariableTokenInner(attr)
}

/** Counts `{name}` segments that `rebuildVariableChipFieldDom` would turn into chips. */
function countRenderableVariableTokensInSerialized(serialized: string): number {
  let n: number = 0
  const re: RegExp = /\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(serialized)) !== null) {
    if (normalizeVariableTokenInner(m[1] ?? '').length > 0) {
      n += 1
    }
  }
  return n
}

function countVariableChipsInDom(root: HTMLElement | null): number {
  if (root === null) {
    return 0
  }
  return root.querySelectorAll(`[${PROJECT_VAR_DATA_ATTR}]`).length
}

/**
 * True when the stored string contains chip-worthy `{var}` tokens but the DOM still shows
 * them as plain text (so `{` / `}` stay visible).
 */
export function needsVariableChipDomRepair(root: HTMLElement | null, serialized: string): boolean {
  if (root === null) {
    return false
  }
  return countRenderableVariableTokensInSerialized(serialized) !== countVariableChipsInDom(root)
}

function serializedLengthOfDirectChild(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const t: string = node.textContent ?? ''
    if (t === '\u200B') {
      return 0
    }
    return t.length
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el: HTMLElement = node as HTMLElement
    const varName: string | null = el.getAttribute(PROJECT_VAR_DATA_ATTR)
    if (varName !== null && varName.length > 0) {
      const clean: string = canonicalChipAttrName(varName)
      if (clean.length > 0) {
        return `{${clean}}`.length
      }
    }
  }
  return 0
}

function prefixLengthBeforeChildIndex(root: HTMLElement, idx: number): number {
  let pos: number = 0
  for (let i: number = 0; i < idx; i += 1) {
    const n: ChildNode | undefined = root.childNodes.item(i)
    if (n !== undefined) {
      pos += serializedLengthOfDirectChild(n)
    }
  }
  return pos
}

function directChildPointLength(child: Node, offset: number): number {
  if (child.nodeType === Node.TEXT_NODE) {
    const t: string = child.textContent ?? ''
    if (t === '\u200B') {
      return 0
    }
    return Math.min(Math.max(0, offset), t.length)
  }
  if (child.nodeType === Node.ELEMENT_NODE) {
    const el: HTMLElement = child as HTMLElement
    const varName: string | null = el.getAttribute(PROJECT_VAR_DATA_ATTR)
    if (varName !== null && varName.length > 0) {
      const clean: string = canonicalChipAttrName(varName)
      if (clean.length === 0) {
        return 0
      }
      const len: number = `{${clean}}`.length
      return offset <= 0 ? 0 : len
    }
  }
  return 0
}

function serializedOffsetForPoint(root: HTMLElement, node: Node, offset: number): number {
  if (node === root) {
    let pos: number = 0
    const children: HTMLCollection = root.childNodes
    const limit: number = Math.min(offset, children.length)
    for (let i: number = 0; i < limit; i += 1) {
      const ch: ChildNode | undefined = children.item(i)
      if (ch !== undefined) {
        pos += serializedLengthOfDirectChild(ch)
      }
    }
    return pos
  }
  for (let i: number = 0; i < root.childNodes.length; i += 1) {
    const child: ChildNode = root.childNodes.item(i)!
    if (child === node) {
      return prefixLengthBeforeChildIndex(root, i) + directChildPointLength(child, offset)
    }
    if (child.contains(node)) {
      const base: number = prefixLengthBeforeChildIndex(root, i)
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el: HTMLElement = child as HTMLElement
        const vn: string | null = el.getAttribute(PROJECT_VAR_DATA_ATTR)
        if (vn !== null && vn.length > 0) {
          const c: string = canonicalChipAttrName(vn)
          if (c.length > 0) {
            return base + `{${c}}`.length
          }
        }
      }
      return base + serializedOffsetForPoint(child as HTMLElement, node, offset)
    }
  }
  return serializeVariableChipField(root).length
}

/** Plain string as stored in part value (`{var}` tokens). */
export function serializeVariableChipField(root: HTMLElement | null): string {
  if (root === null) {
    return ''
  }
  let out: string = ''
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      let t: string = child.textContent ?? ''
      if (t === '\u200B') {
        t = ''
      }
      out += t
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el: HTMLElement = child as HTMLElement
      const varName: string | null = el.getAttribute(PROJECT_VAR_DATA_ATTR)
      if (varName !== null && varName.length > 0) {
        const clean: string = canonicalChipAttrName(varName)
        if (clean.length > 0) {
          out += `{${clean}}`
        } else {
          out += el.textContent ?? ''
        }
      } else {
        out += el.textContent ?? ''
      }
    }
  }
  return out
}

export function getSerializedCaretIndex(root: HTMLElement | null): number {
  if (root === null) {
    return 0
  }
  const sel: Selection | null = window.getSelection()
  if (sel === null || sel.rangeCount === 0 || sel.anchorNode === null) {
    return serializeVariableChipField(root).length
  }
  if (!root.contains(sel.anchorNode)) {
    return serializeVariableChipField(root).length
  }
  return serializedOffsetForPoint(root, sel.anchorNode, sel.anchorOffset)
}

/**
 * Best-effort: place collapsed caret at serialized string index (0 = start).
 */
export function setSerializedCaretIndex(root: HTMLElement | null, index: number): void {
  if (root === null) {
    return
  }
  if (index < 0) {
    index = 0
  }
  const sel: Selection | null = window.getSelection()
  if (sel === null) {
    return
  }
  let remaining: number = index
  const ensureTrailingTextCursor = (): void => {
    if (root.childNodes.length === 0) {
      root.appendChild(document.createTextNode('\u200B'))
    }
    const last: ChildNode | null = root.lastChild
    if (last !== null && last.nodeType === Node.TEXT_NODE) {
      const r: Range = document.createRange()
      const len: number = (last.textContent ?? '').length
      r.setStart(last, len)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
      return
    }
    const tn: Text = document.createTextNode('')
    root.appendChild(tn)
    const r2: Range = document.createRange()
    r2.setStart(tn, 0)
    r2.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r2)
  }

  for (let i: number = 0; i < root.childNodes.length; i += 1) {
    const child: ChildNode = root.childNodes.item(i)!
    const len: number = serializedLengthOfDirectChild(child)
    if (remaining <= len) {
      if (child.nodeType === Node.TEXT_NODE) {
        const r: Range = document.createRange()
        const t: string = child.textContent ?? ''
        const isZwsp: boolean = t === '\u200B'
        const off: number = isZwsp ? 0 : Math.min(remaining, t.length)
        r.setStart(child, off)
        r.collapse(true)
        sel.removeAllRanges()
        sel.addRange(r)
        return
      }
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el: HTMLElement = child as HTMLElement
        const varName: string | null = el.getAttribute(PROJECT_VAR_DATA_ATTR)
        if (varName !== null && varName.length > 0) {
          const cleanName: string = canonicalChipAttrName(varName)
          if (cleanName.length === 0) {
            ensureTrailingTextCursor()
            return
          }
          if (remaining === 0) {
            const r: Range = document.createRange()
            r.setStart(root, i)
            r.collapse(true)
            sel.removeAllRanges()
            sel.addRange(r)
            return
          }
          const after: ChildNode | null = el.nextSibling
          const r2: Range = document.createRange()
          if (after !== null && after.nodeType === Node.TEXT_NODE) {
            r2.setStart(after, 0)
          } else {
            const tn: Text = document.createTextNode('')
            root.insertBefore(tn, el.nextSibling)
            r2.setStart(tn, 0)
          }
          r2.collapse(true)
          sel.removeAllRanges()
          sel.addRange(r2)
          return
        }
      }
      ensureTrailingTextCursor()
      return
    }
    remaining -= len
  }
  ensureTrailingTextCursor()
}

export interface VariableChipStyleFn {
  (name: string): { readonly background: string; readonly foreground: string }
}

export interface VariableChipLookupFn {
  (name: string): { readonly name: string; readonly value: string } | undefined
}

/**
 * Replaces `root` children with text nodes and variable chips for `serialized`.
 */
export function rebuildVariableChipFieldDom(
  root: HTMLElement | null,
  serialized: string,
  colorForName: VariableChipStyleFn,
  lookupVariable: VariableChipLookupFn
): void {
  if (root === null) {
    return
  }
  while (root.firstChild !== null) {
    root.removeChild(root.firstChild)
  }
  if (serialized.length === 0) {
    root.appendChild(document.createTextNode('\u200B'))
    return
  }
  const re: RegExp = /\{([^}]+)\}/g
  let last: number = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(serialized)) !== null) {
    if (m.index > last) {
      root.appendChild(document.createTextNode(serialized.slice(last, m.index)))
    }
    const rawName: string = normalizeVariableTokenInner(m[1] ?? '')
    if (rawName.length > 0) {
      const chip: HTMLSpanElement = document.createElement('span')
      chip.setAttribute(PROJECT_VAR_DATA_ATTR, rawName)
      chip.setAttribute('contenteditable', 'false')
      chip.className =
        'inline max-w-[12rem] cursor-pointer align-baseline text-[13px] font-bold leading-normal'
      const colors: { readonly background: string; readonly foreground: string } = colorForName(rawName)
      chip.style.backgroundColor = 'transparent'
      chip.style.color = colors.foreground
      const v: { readonly name: string; readonly value: string } | undefined = lookupVariable(rawName)
      chip.textContent = rawName
      const forTitle: string = v !== undefined ? `${v.name}: ${v.value}` : rawName
      chip.setAttribute('title', forTitle)
      root.appendChild(chip)
    }
    last = re.lastIndex
  }
  if (last < serialized.length) {
    root.appendChild(document.createTextNode(serialized.slice(last)))
  }
}

/** Syncs only chip labels/title/values from lookup (no full rebuild). */
export function refreshVariableChipDomValues(root: HTMLElement | null, lookupVariable: VariableChipLookupFn): void {
  if (root === null) {
    return
  }
  root.querySelectorAll<HTMLElement>(`[${PROJECT_VAR_DATA_ATTR}]`).forEach((chip: HTMLElement): void => {
    const raw: string | null = chip.getAttribute(PROJECT_VAR_DATA_ATTR)
    if (raw === null || raw.length === 0) {
      return
    }
    const display: string = canonicalChipAttrName(raw)
    if (display.length === 0) {
      return
    }
    const v: { readonly name: string; readonly value: string } | undefined = lookupVariable(display)
    chip.setAttribute(PROJECT_VAR_DATA_ATTR, display)
    chip.setAttribute('title', v !== undefined ? `${v.name}: ${v.value}` : display)
    chip.textContent = display
  })
}
