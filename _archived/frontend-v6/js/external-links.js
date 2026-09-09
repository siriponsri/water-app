/**
 * External resource navigation.
 * Browsers cannot connect to Wi-Fi. COA App therefore performs a short,
 * honest reachability check and explains the manual ANF3 Wi-Fi step on error.
 */
(function () {
  'use strict';

  const COA_URL = 'http://192.168.1.10:8000';
  const CHECK_TIMEOUT_MS = 3500;

  function showNetworkMessage(message) {
    if (window.UI && typeof window.UI.showToast === 'function') {
      window.UI.showToast(message, 'warning');
    }
    window.alert(message);
  }

  async function canReachCoa() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    try {
      await fetch(COA_URL, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      return true;
    } catch (error) {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function openCoaApp(button) {
    if (!button || button.disabled) return;
    const originalText = button.textContent;
    button.disabled = true;
    button.dataset.state = 'loading';
    button.textContent = 'กำลังตรวจ Network…';

    const reachable = await canReachCoa();
    if (!reachable) {
      button.dataset.state = 'error';
      showNetworkMessage(
        'ไม่สามารถเชื่อมต่อ COA App ได้\n\n' +
        '1) เชื่อมต่อ Wi-Fi ชื่อ ANF3\n' +
        '2) ตรวจว่าเครื่องอยู่ในเครือข่ายภายใน\n' +
        '3) ลองเปิดใหม่อีกครั้ง\n\n' +
        'หมายเหตุ: เว็บเบราว์เซอร์ไม่สามารถเปลี่ยน Wi-Fi ให้โดยอัตโนมัติ'
      );
      window.setTimeout(() => {
        button.dataset.state = 'default';
        button.textContent = originalText;
        button.disabled = false;
      }, 1200);
      return;
    }

    button.dataset.state = 'success';
    button.textContent = 'เชื่อมต่อแล้ว';
    window.open(COA_URL, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      button.dataset.state = 'default';
      button.textContent = originalText;
      button.disabled = false;
    }, 900);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-coa-link]').forEach((button) => {
      button.addEventListener('click', () => openCoaApp(button));
    });
  });
})();
