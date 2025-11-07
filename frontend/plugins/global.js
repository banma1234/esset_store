// plugins/global.js
import Vue from "vue";
import { normalizeError, createError, reportError } from "@/utils/errorHandler";

export default function (_ctx, inject) {
  // ---------- 공통 에러 핸들러 ----------
  // Vue 런타임 에러
  Vue.config.errorHandler = function (err, vm, info) {
    const normalized = normalizeError(err, { vmInfo: info });

    reportError(normalized);
  };

  // 동기 에러(브라우저)
  if (process.client) {
    window.addEventListener("error", (event) => {
      const normalized = normalizeError(event?.error || event, {
        phase: "window.error",
      });

      reportError(normalized);
    });
    // 비동기 미처리 Promise
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason || new Error("Unhandled rejection");
      const normalized = normalizeError(reason, {
        phase: "unhandledrejection",
      });

      reportError(normalized);
    });
  }

  // 주입: $err
  inject("err", {
    normalize: normalizeError,
    create: createError,
    report: reportError,
    // 편의 메서드: try/catch 감싸기
    guard(fn, { context } = {}) {
      try {
        return fn();
      } catch (e) {
        const normalized = normalizeError(e, context);
        reportError(normalized);

        // 필요시 rethrow 또는 사용자 메시지 반환
        return null;
      }
    },
  });
}
