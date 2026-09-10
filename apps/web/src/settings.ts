/* =========================================================================
   What this machine is allowed to spend on looking good
   -------------------------------------------------------------------------
   The fleet was measured and every PC in the building is the same model — a
   Core Ultra 5 235U with hardware acceleration on, which pinned the vsync
   ceiling at both light and heavy load. So the workspace can afford to look
   like something. But "every machine is the same" is true on the day it is
   measured, not forever: a replacement arrives, somebody works from an older
   laptop, a policy change turns acceleration off, or a 15 W part in a thin
   chassis quietly throttles after twenty minutes.

   Three settings rather than the two asked for, because AUTO is the one that
   should be on almost every machine and neither of the other two can do its
   job:

     auto  the scene measures its own frame times and steps down if it must.
           Correct for a machine nobody has profiled, which is every machine
           after the first replacement. This is the default.
     full  never step down. For a machine known to be fast, where an
           occasional slow moment is not worth losing the picture over.
     fast  start reduced and stay there. For a machine that struggles, and
           equally for somebody who simply does not want movement on screen
           while they work.

   Kept per browser, like the binder colours and the binder shape, because it
   is a property of the machine in front of you and not of the laboratory.
   ========================================================================= */

export type QualityChoice = 'auto' | 'full' | 'fast';

const STORAGE_KEY = 'anf3.quality.v1';
export const QUALITY_EVENT = 'anf3:quality';
const DEFAULT_QUALITY: QualityChoice = 'auto';

const VALID: QualityChoice[] = ['auto', 'full', 'fast'];

export const QUALITY_OPTIONS: Array<{ id: QualityChoice; label: string; detail: string }> = [
  { id: 'auto', label: 'อัตโนมัติ', detail: 'วัดความเร็วเครื่องนี้เอง แล้วลดให้เมื่อจำเป็น — แนะนำ' },
  { id: 'full', label: 'เต็มที่', detail: 'ไม่ลดคุณภาพเอง สำหรับเครื่องที่รู้ว่าแรงพอ' },
  { id: 'fast', label: 'เร็ว', detail: 'ลดเงาและการเคลื่อนไหวตั้งแต่แรก สำหรับเครื่องที่ไม่ไหว หรือคนที่ไม่อยากให้มีอะไรขยับ' }
];

/**
 * Subscribes to the choice changing, in this tab or another one.
 *
 * The CustomEvent alone was not enough: navigating to the settings page
 * unmounts the 3D shelf, so the only way its listener could ever fire is from
 * a second tab — and a CustomEvent does not cross tabs. On a shared bench PC
 * with the shelf open in one tab and settings in another, the shelf kept its
 * old settings until somebody reloaded it. `storage` is what crosses.
 */
export function onQualityChange(handler: () => void) {
  const fromStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) { applyQuality(); handler(); }
  };
  window.addEventListener(QUALITY_EVENT, handler);
  window.addEventListener('storage', fromStorage);
  return () => {
    window.removeEventListener(QUALITY_EVENT, handler);
    window.removeEventListener('storage', fromStorage);
  };
}

export function readQuality(): QualityChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) as QualityChoice | null;
    return raw && VALID.includes(raw) ? raw : DEFAULT_QUALITY;
  } catch {
    return DEFAULT_QUALITY;
  }
}

export function setQuality(choice: QualityChoice) {
  try {
    if (choice === DEFAULT_QUALITY) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch { /* a disabled store must never block the workspace */ }
  applyQuality(choice);
  window.dispatchEvent(new CustomEvent(QUALITY_EVENT));
}

/**
 * Publishes the choice to CSS as `data-motion` on the root element.
 *
 * The 2D motion has to answer to this too, not only the 3D shelf. Somebody
 * who picks "fast" because panels sliding in bother them would be poorly
 * served by a setting that only changed the shadow map on a page they may
 * never open.
 */
export function applyQuality(choice: QualityChoice = readQuality()) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.motion = choice === 'fast' ? 'reduced' : 'full';
}
