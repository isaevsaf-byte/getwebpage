import { gsap } from "@/lib/motion/gsap";

/**
 * Types log lines into elements, one after another, on GSAP's ticker.
 *
 * Built so nothing ever shifts layout (CLS stays at zero):
 * - The untyped rest of each line is already in place as transparent
 *   "ghost" text, so wraps and heights are final from the first frame.
 * - The two glyphs ahead of the typed text flicker through noise of the
 *   same monospace width, inside the line's own text.
 * - The block caret lives once, absolutely positioned in a host element,
 *   and follows the text by transform only. An empty zero-size marker in
 *   the line tells it where to go.
 *
 * It never falls far behind the scroll: with a long queue it speeds up,
 * and flush() completes everything at once. Text is only written into
 * aria-hidden elements; the full sentence always exists for assistive tech
 * elsewhere in the DOM.
 */
export interface TypeJob {
  el: HTMLElement;
  text: string;
}

interface Live extends TypeJob {
  typed: Text;
  rest: HTMLSpanElement;
}

const NOISE = "abcdefghijklmnopqrstuvwxyz0123456789";
const SWAPPABLE = /[a-zA-Z0-9]/;

export class Typewriter {
  private jobs: Live[] = [];
  private cur: Live | null = null;
  private shown = 0;
  private acc = 0;
  private running = false;
  private readonly mark: HTMLSpanElement;
  private readonly caret: HTMLSpanElement;
  private readonly cps: number;
  private readonly ghostClass: string;
  private readonly host: HTMLElement;

  constructor(opts: {
    /** Positioned ancestor of every line; the caret lives here. */
    host: HTMLElement;
    caretClass: string;
    ghostClass: string;
    cps?: number;
  }) {
    this.cps = opts.cps ?? 90;
    this.ghostClass = opts.ghostClass;
    this.host = opts.host;
    this.mark = document.createElement("span");
    this.mark.setAttribute("aria-hidden", "true");
    this.caret = document.createElement("span");
    this.caret.className = opts.caretClass;
    this.caret.setAttribute("aria-hidden", "true");
    this.caret.style.visibility = "hidden";
    this.host.append(this.caret);
    window.addEventListener("resize", this.follow);
  }

  /** Show lines as ghost text (laid out, invisible) until they are typed. */
  prime(jobs: TypeJob[]) {
    for (const j of jobs) {
      const rest = document.createElement("span");
      rest.className = this.ghostClass;
      rest.textContent = j.text;
      j.el.replaceChildren(rest);
    }
  }

  /** Queue lines. Each turns into ghost text now and types in turn. */
  add(jobs: TypeJob[]) {
    for (const j of jobs) {
      const typed = document.createTextNode("");
      const rest = document.createElement("span");
      rest.className = this.ghostClass;
      rest.textContent = j.text;
      j.el.replaceChildren(typed, rest);
      this.jobs.push({ ...j, typed, rest });
    }
    if (!this.running && (this.cur || this.jobs.length)) {
      this.running = true;
      gsap.ticker.add(this.tick);
    }
  }

  /** Finish every queued line instantly; the caret rests on the last one. */
  flush() {
    const all = this.cur ? [this.cur, ...this.jobs] : this.jobs;
    for (const j of all) j.el.textContent = j.text;
    const last = all[all.length - 1];
    this.cur = null;
    this.jobs = [];
    this.stop();
    if (last) this.park(last.el);
  }

  /** Rest the caret at the end of an element. */
  park(el: HTMLElement) {
    if (el.lastChild !== this.mark) el.append(this.mark);
    this.follow();
  }

  /** Hide the caret (when the lines it follows are hidden). */
  detach() {
    this.mark.remove();
    this.caret.style.visibility = "hidden";
    // Blink only while shown: no infinite animation on a hidden element.
    delete this.caret.dataset.on;
  }

  get busy(): boolean {
    return this.cur !== null || this.jobs.length > 0;
  }

  destroy() {
    this.flush();
    this.mark.remove();
    this.caret.remove();
    window.removeEventListener("resize", this.follow);
  }

  /** Move the caret to the marker — transform only. */
  private follow = () => {
    if (!this.mark.isConnected) return;
    const m = this.mark.getBoundingClientRect();
    const h = this.host.getBoundingClientRect();
    if (!m.height) return;
    const st = this.caret.style;
    st.visibility = "visible";
    this.caret.dataset.on = "";
    st.height = `${m.height}px`;
    st.width = `${Math.round(m.height * 0.5)}px`;
    st.transform = `translate(${Math.round(m.left - h.left + 2)}px, ${Math.round(m.top - h.top)}px)`;
  };

  private stop() {
    if (this.running) {
      gsap.ticker.remove(this.tick);
      this.running = false;
    }
  }

  private backlog(): number {
    let n = this.cur ? this.cur.text.length - this.shown : 0;
    for (const j of this.jobs) n += j.text.length;
    return n;
  }

  private render(j: Live) {
    const left = j.text.length - this.shown;
    const n = Math.min(2, left);
    let noise = "";
    for (let i = 0; i < n; i++) {
      const c = j.text[this.shown + i];
      noise += SWAPPABLE.test(c) ? NOISE[(Math.random() * NOISE.length) | 0] : c;
    }
    j.typed.data = j.text.slice(0, this.shown) + noise;
    j.rest.textContent = j.text.slice(this.shown + n);
    if (this.mark.parentNode !== j.el || this.mark.nextSibling !== j.rest) j.el.insertBefore(this.mark, j.rest);
    this.follow();
  }

  private tick = (_time: number, deltaMs: number) => {
    if (!this.cur) {
      const next = this.jobs.shift();
      if (!next) {
        this.stop();
        return;
      }
      this.cur = next;
      this.shown = 0;
    }

    // Catch up when the reader scrolls faster than we type.
    const backlog = this.backlog();
    const speed = backlog > 160 ? this.cps * 4 : backlog > 80 ? this.cps * 2 : this.cps;
    this.acc += (Math.min(deltaMs, 64) / 1000) * speed;
    const step = Math.floor(this.acc);
    const cur = this.cur;
    if (step > 0) {
      this.acc -= step;
      this.shown = Math.min(cur.text.length, this.shown + step);
    }
    if (this.shown >= cur.text.length) {
      cur.el.textContent = cur.text;
      this.cur = null;
      this.park(cur.el);
      return;
    }
    this.render(cur);
  };
}
