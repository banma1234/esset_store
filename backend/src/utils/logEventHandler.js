/**
 * @file 공통 로그 핸들러(골조)
 * @description
 * - 단일 진입점에서 이벤트 타입에 따라 분기하여 각 로그 라이터를 호출한다.
 * - 현재 단계에서는 콘솔 출력만 수행한다.
 */

const { writeDownloadLog, writeAssetEvent, writeAssetSnapshot } = require('../services/logWriters.service');

/**
 * @typedef {'DOWNLOAD'|'ASSET_EVENT'|'ASSET_SNAPSHOT'} LogEventType
 */

/**
 * @typedef {Object} LogEventEnvelope
 * @property {LogEventType} type 이벤트 타입
 * @property {Object} payload 이벤트 페이로드(타입별 스키마 상이)
 */

/**
 * @function handleLogEvent
 * @description 공통 로그 핸들러(분기 스위치). 타입에 따라 개별 라이터를 호출한다.
 * @param {LogEventEnvelope} event 이벤트 봉투 객체
 * @returns {Promise<void>}
 */
async function handleLogEvent(event) {
  const { type, payload } = event || {};

  // eslint-disable-next-line no-console
  console.log('[LOG][dispatch] type =', type);

  switch (type) {
    case 'DOWNLOAD':
      await writeDownloadLog(payload);
      break;
    case 'ASSET_EVENT':
      await writeAssetEvent(payload);
      break;
    case 'ASSET_SNAPSHOT':
      await writeAssetSnapshot(payload);
      break;
    default:
      // eslint-disable-next-line no-console
      console.warn('[LOG][unknown-type] 이벤트 타입을 인식할 수 없습니다:', type);
  }
}

module.exports = { handleLogEvent };
