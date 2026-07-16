import { clamp, throttle, createSVGElement, categoryColor } from './graph-utils.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Мінімальний та максимальний масштаб */
const SCALE_MIN = 0.5
const SCALE_MAX = 3.0

/** Поріг видимості label — показуємо тільки вузлам з degree >= порогу */
const LABEL_DEGREE_THRESHOLD = 3

/**
 * SVG renderer for the knowledge graph.
 *
 * Відповідає за:
 * - створення SVG DOM
 * - рендеринг вузлів та ребер
 * - кешування DOM-елементів
 * - pan / zoom (mouse + touch)
 * - hover / select highlight
 * - синхронізацію з GraphState
 *
 * Не зберігає стан — всі дані з GraphState.
 */
export class GraphRenderer {
  /** @type {SVGElement} */
  #svg
  /** @type {SVGGElement} viewport group — всі трансформи йдуть сюди */
  #viewport
  /** @type {SVGGElement} група ребер */
  #edgesGroup
  /** @type {SVGGElement} група вузлів */
  #nodesGroup

  /** @type {import('./graph-state.js').GraphState} */
  #state
  /** @type {Map<string, Set<string>>} */
  #adjMap

  /** Кеш DOM-елементів вузлів: id → <g> */
  /** @type {Map<string, SVGGElement>} */
  #nodeEls = new Map()
  /** Кеш circle елементів: id → <circle> */
  /** @type {Map<string, SVGCircleElement>} */
  #circleEls = new Map()
  /** Кеш label елементів: id → <text> */
  /** @type {Map<string, SVGTextElement>} */
  #labelEls = new Map()
  /** Кеш edge елементів: "source→target" → <line> */
  /** @type {Map<string, SVGLineElement>} */
  #edgeEls = new Map()

  /** Дані вузлів: id → {x, y, degree, ...} */
  /** @type {Map<string, { id: string, label: string, category: string, degree: number, x: number, y: number }>} */
  #nodeData = new Map()

  /** Позиції вузлів (layout дає ці координати) */
  /** @type {Map<string, { x: number, y: number }>} */
  #positions = new Map()

  /** Стан pan — чи перетягуємо */
  #isPanning = false
  /** Точка початку pan (в координатах SVG) */
  #panStart = { x: 0, y: 0 }
  /** Збережені tx/ty на початок pan */
  #panOrigin = { x: 0, y: 0 }

  /** Для pinch zoom — відстань між пальцями */
  #lastPinchDist = 0

  /** Прив'язані обробники подій (для коректного removeEventListener) */
  #onMouseDown = null
  #onMouseMove = null
  #onMouseUp = null
  #onWheel = null
  #onTouchStart = null
  #onTouchMove = null
  #onTouchEnd = null
  #onNodeMouseEnter = null
  #onNodeMouseLeave = null
  #onNodeClick = null

  /** Unsubscribe від GraphState */
  #unsubscribeState = null

  /** Знімок стану для порівняння (унікаємо зайвих re-render) */
  #prevHighlight = ''

  /** Множина ID збігів пошуку (порожня = пошук неактивний) */
  #searchMatch = null
  /** Множина ID сусідів збігів пошуку */
  #searchNeighbor = null
  /** Лічильник змін пошуку (для пропуску зайвих re-render підсвітки) */
  #searchRev = 0
  /** Ключ попереднього стану підсвітки (transform не враховується) */
  #prevHlKey = ''

  /**
   * Ініціалізує renderer.
   *
   * @param {HTMLElement} container — DOM-контейнер для SVG
   * @param {import('./graph-state.js').GraphState} state
   * @param {Map<string, Set<string>>} adjMap — adjacency map
   * @param {Array<{ id: string, label: string, category: string, degree: number }>} nodes
   * @param {Array<{ source: string, target: string }>} edges
   * @param {Map<string, { x: number, y: number }>} positions — початкові позиції від layout
   */
  init(container, state, adjMap, nodes, edges, positions) {
    this.#state = state
    this.#adjMap = adjMap
    this.#positions = positions

    // Зберігаємо дані вузлів разом з позиціями
    for (const node of nodes) {
      const pos = positions.get(node.id) || { x: 0, y: 0 }
      this.#nodeData.set(node.id, { ...node, x: pos.x, y: pos.y })
    }

    // Створюємо SVG
    this.#svg = createSVGElement('svg', {
      class: 'knowledge-graph',
      'touch-action': 'none',
    })
    this.#svg.style.touchAction = 'none'

    this.#viewport = createSVGElement('g', { class: 'graph-viewport' })
    this.#edgesGroup = createSVGElement('g', { class: 'graph-edges' })
    this.#nodesGroup = createSVGElement('g', { class: 'graph-nodes' })

    this.#viewport.append(this.#edgesGroup, this.#nodesGroup)
    this.#svg.append(this.#viewport)
    container.append(this.#svg)

    // Малюємо ребра
    this.#renderEdges(edges)

    // Малюємо вузли
    this.#renderNodes(nodes)

    // Встановлюємо початковий viewport
    this.#autoFit(container)

    // Підключаємо обробники подій
    this.#bindEvents()

    // Підписуємось на зміни стану
    this.#unsubscribeState = state.subscribe((s) => this.#onStateChange(s))

    // Застосовуємо початковий стан
    this.#onStateChange(state.get())
  }

  /** Повністю очищає SVG та відписується від подій */
  destroy() {
    if (this.#unsubscribeState) {
      this.#unsubscribeState()
      this.#unsubscribeState = null
    }
    this.#unbindEvents()
    this.#svg?.remove()
    this.#nodeEls.clear()
    this.#circleEls.clear()
    this.#labelEls.clear()
    this.#edgeEls.clear()
    this.#nodeData.clear()
  }

  // ─── Рендеринг ───────────────────────────────────────────

  /** Малює всі ребра як <line> */
  #renderEdges(edges) {
    const fragment = document.createDocumentFragment()
    for (const edge of edges) {
      const key = edge.source + '→' + edge.target
      const p1 = this.#positions.get(edge.source)
      const p2 = this.#positions.get(edge.target)
      if (!p1 || !p2) continue

      const line = createSVGElement('line', {
        class: 'graph-edge',
        'data-source': edge.source,
        'data-target': edge.target,
        x1: p1.x, y1: p1.y,
        x2: p2.x, y2: p2.y,
      })
      this.#edgeEls.set(key, line)
      fragment.append(line)
    }
    this.#edgesGroup.append(fragment)
  }

  /** Малює всі вузли як <g> з <circle> + <text> */
  #renderNodes(nodes) {
    const fragment = document.createDocumentFragment()
    for (const node of nodes) {
      const data = this.#nodeData.get(node.id)
      if (!data) continue

      const g = createSVGElement('g', {
        class: 'graph-node',
        'data-id': node.id,
        transform: `translate(${data.x}, ${data.y})`,
      })

      const isContext = node.isContext
      const r = isContext ? 4 : this.#nodeRadius(node)

      const circle = createSVGElement('circle', {
        class: 'graph-node__circle' + (isContext ? ' graph-node__circle--context' : ''),
        r,
        'data-category': node.category,
      })
      // Колір за категорією (inline style має пріоритет над CSS fill)
      circle.style.fill = categoryColor(node.category)

      const text = createSVGElement('text', {
        class: 'graph-node__label',
        dy: r + 12,
        'text-anchor': 'middle',
      })
      text.textContent = node.label

      g.append(circle, text)
      this.#nodeEls.set(node.id, g)
      this.#circleEls.set(node.id, circle)
      this.#labelEls.set(node.id, text)
      fragment.append(g)
    }
    this.#nodesGroup.append(fragment)
  }

  /** Радіус вузла залежить від degree (площа ∝ degree — сприйнятливо) */
  #nodeRadius(node) {
    return Math.max(3, Math.min(18, 2.5 + Math.sqrt(node.degree) * 2.4))
  }

  /** Автоматично підганяє viewport під розмір контейнера */
  #autoFit(container) {
    const rect = container.getBoundingClientRect()
    const w = rect.width || 800
    const h = rect.height || 600

    // Знаходимо межі графа
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const pos of this.#positions.values()) {
      if (pos.x < minX) minX = pos.x
      if (pos.x > maxX) maxX = pos.x
      if (pos.y < minY) minY = pos.y
      if (pos.y > maxY) maxY = pos.y
    }

    const graphW = maxX - minX || 1
    const graphH = maxY - minY || 1
    const padding = 60

    const scaleX = (w - padding * 2) / graphW
    const scaleY = (h - padding * 2) / graphH
    const scale = clamp(Math.min(scaleX, scaleY), SCALE_MIN, SCALE_MAX)

    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const tx = w / 2 - cx * scale
    const ty = h / 2 - cy * scale

    this.#state.set({ scale, tx, ty })
  }

  // ─── Viewport Transform ──────────────────────────────────

  /** Застосовує transform до viewport group */
  #applyTransform() {
    const { scale, tx, ty } = this.#state.get()
    this.#viewport.setAttribute('transform', `translate(${tx}, ${ty}) scale(${scale})`)
  }

  // ─── Hover / Select Highlight ────────────────────────────

  /** Оновлює CSS-класи для підсвітки на основі стану */
  #updateHighlight(s) {
    // Пошук має пріоритет: підсвічуємо збіги + сусідів, ігноруємо hover/select.
    if (this.#searchMatch && this.#searchMatch.size) {
      this.#applySearchHighlight()
      return
    }

    const selectedId = s.selected
    const hoveredId = s.hovered

    // Визначаємо активний вузол: hovered має пріоритет над selected
    const activeId = hoveredId || selectedId

    // Генеруємо ключ для порівняння (унікаємо зайвих re-render)
    const key = (activeId || '') + '|' + (selectedId || '')
    if (key === this.#prevHighlight) return
    this.#prevHighlight = key

    if (!activeId) {
      // Нічого не вибрано — показуємо все нормально
      this.#clearAllHighlights()
      return
    }

    const neighbors = this.#adjMap.get(activeId) || new Set()

    // Оновлюємо ребра
    for (const [key, line] of this.#edgeEls) {
      const src = line.dataset.source
      const tgt = line.dataset.target
      const isConnected = (src === activeId && neighbors.has(tgt)) ||
                          (tgt === activeId && neighbors.has(src)) ||
                          (src === activeId || tgt === activeId)
      line.classList.toggle('graph-edge--highlighted', isConnected)
      line.classList.toggle('graph-edge--dimmed', !isConnected)
    }

    // Оновлюємо вузли
    for (const [id, circle] of this.#circleEls) {
      const isActive = id === activeId
      const isNeighbor = neighbors.has(id)
      circle.classList.toggle('graph-node__circle--selected', isActive)
      circle.classList.toggle('graph-node__dimmed', !isActive && !isNeighbor)
    }

    // Оновлюємо labels
    for (const [id, label] of this.#labelEls) {
      const isActive = id === activeId
      const isNeighbor = neighbors.has(id)
      // Показуємо label.active + labels сусідів, решту ховаємо
      label.classList.toggle('graph-node__label--hidden', !isActive && !isNeighbor)
    }
  }

  /** Прибирає всі класи підсвітки */
  #clearAllHighlights() {
    for (const line of this.#edgeEls.values()) {
      line.classList.remove('graph-edge--highlighted', 'graph-edge--dimmed')
    }
    for (const circle of this.#circleEls.values()) {
      circle.classList.remove('graph-node__circle--selected', 'graph-node__dimmed', 'graph-node__circle--search-match', 'graph-node__circle--search-related')
    }
    // Повертаємо labels — показуємо тільки ті, що мають бути видимі
    this.#updateLabelsVisibility(this.#state.get().scale)
  }

  /**
   * Встановлює/скидає підсвітку пошуку.
   * @param {Set<string>|null} matches — ID збігів (null/порожньо = вимкнути)
   * @param {Set<string>|null} neighbors — ID сусідів збігів
   */
  setSearchHighlight(matches, neighbors) {
    const wasActive = !!(this.#searchMatch && this.#searchMatch.size)
    this.#searchMatch = matches && matches.size ? matches : null
    this.#searchNeighbor = neighbors && neighbors.size ? neighbors : null
    this.#searchRev++
    if (this.#searchMatch) {
      this.#applySearchHighlight()
      // При першому ввімкненні пошуку — плавно наводимо вигляд на знайдені терміни
      if (!wasActive) this.#fitToNodes(this.#searchMatch)
    } else {
      // Повертаємо звичайну логіку (hover/select) на поточному стані
      this.#updateHighlight(this.#state.get())
    }
  }

  /** Застосовує підсвітку пошуку: збіги — яскраво, сусіди — середньо, решта — приглушено */
  #applySearchHighlight() {
    const matches = this.#searchMatch
    const neighbors = this.#searchNeighbor || new Set()

    for (const [key, line] of this.#edgeEls) {
      const src = line.dataset.source
      const tgt = line.dataset.target
      const connected = (matches.has(src) && (neighbors.has(tgt) || matches.has(tgt))) ||
                       (matches.has(tgt) && (neighbors.has(src) || matches.has(src)))
      line.classList.toggle('graph-edge--highlighted', connected)
      line.classList.toggle('graph-edge--dimmed', !connected)
    }

    for (const [id, circle] of this.#circleEls) {
      const isMatch = matches.has(id)
      const isNeighbor = neighbors.has(id)
      circle.classList.toggle('graph-node__circle--search-match', isMatch)
      circle.classList.toggle('graph-node__circle--search-related', isNeighbor && !isMatch)
      circle.classList.toggle('graph-node__dimmed', !isMatch && !isNeighbor)
      circle.classList.remove('graph-node__circle--selected')
    }

    for (const [id, label] of this.#labelEls) {
      const isMatch = matches.has(id)
      const isNeighbor = neighbors.has(id)
      // Показуємо label тільки збігам та їхнім сусідам
      label.classList.toggle('graph-node__label--hidden', !isMatch && !isNeighbor)
    }
  }

  /** Оновлює видимість labels залежно від масштабу та degree */
  #updateLabelsVisibility(scale) {
    for (const [id, label] of this.#labelEls) {
      const data = this.#nodeData.get(id)
      if (!data) continue
      const shouldShow = data.degree >= LABEL_DEGREE_THRESHOLD || scale > 1.5
      label.classList.toggle('graph-node__label--hidden', !shouldShow)
    }
  }

  /** Оновлює розмір label при hover/select */
  #updateLabelDy(id, isHovered) {
    const label = this.#labelEls.get(id)
    const data = this.#nodeData.get(id)
    if (!label || !data) return
    const r = data.isContext ? 4 : this.#nodeRadius(data)
    label.setAttribute('dy', isHovered ? r + 16 : r + 12)
  }

  // ─── Обробники подій ─────────────────────────────────────

  /** Прив'язуємо всі обробники подій */
  #bindEvents() {
    // Pan — mouse
    this.#onMouseDown = this.#handleMouseDown.bind(this)
    this.#onMouseMove = throttle(this.#handleMouseMove.bind(this), 16)
    this.#onMouseUp = this.#handleMouseUp.bind(this)

    // Zoom — wheel
    this.#onWheel = this.#handleWheel.bind(this)

    // Touch — pan + pinch
    this.#onTouchStart = this.#handleTouchStart.bind(this)
    this.#onTouchMove = throttle(this.#handleTouchMove.bind(this), 16)
    this.#onTouchEnd = this.#handleTouchEnd.bind(this)

    // Hover / Click
    this.#onNodeMouseEnter = this.#handleNodeMouseEnter.bind(this)
    this.#onNodeMouseLeave = this.#handleNodeMouseLeave.bind(this)
    this.#onNodeClick = this.#handleNodeClick.bind(this)

    // Pointer events на SVG
    this.#svg.addEventListener('mousedown', this.#onMouseDown)
    window.addEventListener('mousemove', this.#onMouseMove)
    window.addEventListener('mouseup', this.#onMouseUp)

    // Wheel zoom
    this.#svg.addEventListener('wheel', this.#onWheel, { passive: false })

    // Touch events
    this.#svg.addEventListener('touchstart', this.#onTouchStart, { passive: false })
    this.#svg.addEventListener('touchmove', this.#onTouchMove, { passive: false })
    this.#svg.addEventListener('touchend', this.#onTouchEnd)

    // Node events (делегування через groups)
    this.#nodesGroup.addEventListener('mouseenter', this.#onNodeMouseEnter, true)
    this.#nodesGroup.addEventListener('mouseleave', this.#onNodeMouseLeave, true)
    this.#nodesGroup.addEventListener('click', this.#onNodeClick)
  }

  /** Відписуємо всі обробники */
  #unbindEvents() {
    this.#svg?.removeEventListener('mousedown', this.#onMouseDown)
    window.removeEventListener('mousemove', this.#onMouseMove)
    window.removeEventListener('mouseup', this.#onMouseUp)
    this.#svg?.removeEventListener('wheel', this.#onWheel)
    this.#svg?.removeEventListener('touchstart', this.#onTouchStart)
    this.#svg?.removeEventListener('touchmove', this.#onTouchMove)
    this.#svg?.removeEventListener('touchend', this.#onTouchEnd)
    this.#nodesGroup?.removeEventListener('mouseenter', this.#onNodeMouseEnter, true)
    this.#nodesGroup?.removeEventListener('mouseleave', this.#onNodeMouseLeave, true)
    this.#nodesGroup?.removeEventListener('click', this.#onNodeClick)
  }

  // ─── Mouse Pan ───────────────────────────────────────────

  #handleMouseDown(e) {
    // Тільки ліва кнопка, без модифікаторів
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey) return

    // Перевіряємо, чи не клікнули по вузлу
    if (e.target.closest('.graph-node')) return

    this.#isPanning = true
    this.#panStart = { x: e.clientX, y: e.clientY }
    const s = this.#state.get()
    this.#panOrigin = { x: s.tx, y: s.ty }
    this.#svg.style.cursor = 'grabbing'
  }

  #handleMouseMove(e) {
    if (this.#isPanning) {
      const dx = e.clientX - this.#panStart.x
      const dy = e.clientY - this.#panStart.y
      this.#state.set({
        tx: this.#panOrigin.x + dx,
        ty: this.#panOrigin.y + dy,
      })
      this.#applyTransform()
    }
  }

  #handleMouseUp() {
    if (this.#isPanning) {
      this.#isPanning = false
      this.#svg.style.cursor = ''
    }
  }

  // ─── Wheel Zoom ──────────────────────────────────────────

  #handleWheel(e) {
    e.preventDefault()

    const rect = this.#svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const s = this.#state.get()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    const newScale = clamp(s.scale * factor, SCALE_MIN, SCALE_MAX)

    // Zoom до позиції курсора
    const ratio = newScale / s.scale
    this.#state.set({
      scale: newScale,
      tx: mx - ratio * (mx - s.tx),
      ty: my - ratio * (my - s.ty),
    })
    this.#applyTransform()
    this.#updateLabelsVisibility(newScale)
  }

  // ─── Touch Pan + Pinch Zoom ──────────────────────────────

  #handleTouchStart(e) {
    if (e.touches.length === 1) {
      // Одноразовий touch — pan
      this.#isPanning = true
      this.#panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      const s = this.#state.get()
      this.#panOrigin = { x: s.tx, y: s.ty }
    } else if (e.touches.length === 2) {
      // Два пальці — pinch zoom
      this.#isPanning = false
      this.#lastPinchDist = this.#touchDistance(e.touches)
    }
    e.preventDefault()
  }

  #handleTouchMove(e) {
    if (e.touches.length === 1 && this.#isPanning) {
      const dx = e.touches[0].clientX - this.#panStart.x
      const dy = e.touches[0].clientY - this.#panStart.y
      this.#state.set({
        tx: this.#panOrigin.x + dx,
        ty: this.#panOrigin.y + dy,
      })
      this.#applyTransform()
    } else if (e.touches.length === 2) {
      const dist = this.#touchDistance(e.touches)
      if (this.#lastPinchDist === 0) {
        this.#lastPinchDist = dist
        return
      }

      const rect = this.#svg.getBoundingClientRect()
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top

      const s = this.#state.get()
      const factor = dist / this.#lastPinchDist
      const newScale = clamp(s.scale * factor, SCALE_MIN, SCALE_MAX)

      const ratio = newScale / s.scale
      this.#state.set({
        scale: newScale,
        tx: cx - ratio * (cx - s.tx),
        ty: cy - ratio * (cy - s.ty),
      })
      this.#applyTransform()
      this.#updateLabelsVisibility(newScale)

      this.#lastPinchDist = dist
    }
    e.preventDefault()
  }

  #handleTouchEnd(e) {
    if (e.touches.length < 2) {
      this.#lastPinchDist = 0
    }
    if (e.touches.length === 0) {
      this.#isPanning = false
    }
  }

  /** Відстань між двома точками дотику */
  #touchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // ─── Node Hover / Click ──────────────────────────────────

  #handleNodeMouseEnter(e) {
    const nodeG = e.target.closest('.graph-node')
    if (!nodeG) return
    const id = nodeG.dataset.id
    this.#state.set({ hovered: id })
    this.#updateLabelDy(id, true)
  }

  #handleNodeMouseLeave(e) {
    const nodeG = e.target.closest('.graph-node')
    if (!nodeG) return
    const id = nodeG.dataset.id
    this.#state.set({ hovered: null })
    this.#updateLabelDy(id, false)
  }

  #handleNodeClick(e) {
    const nodeG = e.target.closest('.graph-node')
    if (!nodeG) return
    e.stopPropagation()
    const id = nodeG.dataset.id
    this.#state.selectNode(id)

    // Центруємо вузол в viewport
    if (this.#state.get().selected === id) {
      this.#centerOnNode(id)
    }
  }

  /** Плавно центрує viewport на вузлі */
  #centerOnNode(id) {
    const data = this.#nodeData.get(id)
    if (!data) return

    const rect = this.#svg.getBoundingClientRect()
    const w = rect.width || 800
    const h = rect.height || 600
    const s = this.#state.get()

    const targetTx = w / 2 - data.x * s.scale
    const targetTy = h / 2 - data.y * s.scale

    // Плавна анімація через CSS transition
    this.#viewport.style.transition = 'transform 0.3s ease-out'
    this.#state.set({ tx: targetTx, ty: targetTy })
    this.#applyTransform()

    // Прибираємо transition після завершення
    setTimeout(() => {
      this.#viewport.style.transition = ''
    }, 300)
  }

  /** Плавно підганяє viewport, щоб охопити вказані вузли (напр. результати пошуку) */
  #fitToNodes(ids) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    let count = 0
    for (const id of ids) {
      const p = this.#positions.get(id)
      if (!p) continue
      count++
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    }
    if (!count) return

    const rect = this.#svg.getBoundingClientRect()
    const w = rect.width || 800
    const h = rect.height || 600
    const padding = 80

    const spanX = maxX - minX || 1
    const spanY = maxY - minY || 1
    const scale = clamp(
      Math.min((w - padding * 2) / spanX, (h - padding * 2) / spanY),
      SCALE_MIN,
      SCALE_MAX,
    )
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const tx = w / 2 - cx * scale
    const ty = h / 2 - cy * scale

    this.#viewport.style.transition = 'transform 0.35s ease-out'
    this.#state.set({ scale, tx, ty })
    this.#applyTransform()
    setTimeout(() => {
      this.#viewport.style.transition = ''
    }, 350)
  }

  // ─── State Sync ──────────────────────────────────────────

  /** Реагує на зміни GraphState */
  #onStateChange(s) {
    this.#applyTransform()
    // Підсвітка залежить лише від selected/hovered/пошуку, а не від
    // transform (zoom/pan) — інакше кожен тик колеса/перетягування
    // перефарбовує всі вузли (відчутна дужа при активному пошуку).
    const searchRev = this.#searchMatch ? this.#searchRev : -1
    const key = searchRev + '|' + (s.selected || '') + '|' + (s.hovered || '')
    if (key === this.#prevHlKey) return
    this.#prevHlKey = key
    this.#updateHighlight(s)
  }
}
