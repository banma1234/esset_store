const express = require('express');
const {
  getAssetsBySearchOptions,
  getAssetByFileName,
  downloadAssetFromDB,
  deactivateAssetById,
  activateAssetById,
} = require('../services/assets/assets.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../errors/appError');

const router = express.Router();

// /**
//  * @function assetsSearchAPI
//  * @description 에셋 검색 (카테고리 + 필터 + 페이지네이션).
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  * @query category 카테고리 코드
//  * @query filters 필터 코드 배열
//  * @query page 페이지 번호
//  */
// async function assetsSearchAPI(req, res) {
//   const result = await getAssetsBySearchOptions(req.query);

//   if (!result) {
//     throw new AppError('검색에 실패했습니다.', 500, 'FAILED_SEARCH_ASSETS');
//   }

//   return res.status(200).json({ ok: true, data: result });
// }

// /**
//  * @function assetViewerAPI
//  * @description 에셋 이름으로 안전하게 에셋 가져오기.
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  * @query filename 에셋 이름
//  */
// async function assetViewerAPI(req, res) {
//   const result = await getAssetByFileName(req.query);

//   if (!result) {
//     throw new AppError('해당 에셋을 찾을 수 없습니다.', 404, 'ASSET_NOT_FOUND');
//   }

//   res.status(200).json({ ok: true, data: result });
// }

// /**
//  * @function assetDownloadAPI
//  * @description 외부 다운로드 API.
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  * @query filename 에셋 이름
//  * @query assetid 에셋 _id
//  */
// async function assetDownloadAPI(req, res) {
//   let url = undefined;

//   url = await downloadAssetFromDB(req.query, 'DEFAULT');
//   if (url) {
//     //return res.redirect(302, url);
//     return res.status(200).json({ ok: true, url: url });
//   }

//   url = await downloadAssetFromDB(req.query, 'LATEST');
//   if (url) {
//     return res.status(200).json({ ok: true, url: url });
//   }

//   throw new AppError('다운로드 요청에 실패했습니다.', 422, 'FAILED_GET_DOWNLOAD_URL');
// }

// /**
//  * @function assetDeactivateAPI
//  * @description 에셋 비활성화 API.
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// async function assetDeactivateAPI(req, res) {
//   await deactivateAssetById(req.body);

//   return res.status(200).json({ ok: true });
// }

// /**
//  * @function assetActivateAPI
//  * @description 에셋 활성화 API.
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// async function assetActivateAPI(req, res) {
//   await activateAssetById(req.body);

//   return res.status(200).json({ ok: true });
// }

/**
 * @function assetsSearchAPI
 * @description 에셋 검색 (카테고리 + 필터 + 페이지네이션).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @query category 카테고리 코드
 * @query filters 필터 코드 배열
 * @query page 페이지 번호
 */
async function assetsSearchAPI(req, res) {
  const result = await getAssetsBySearchOptions(req.query);

  if (!result) {
    throw new AppError('검색에 실패했습니다.', 500, 'FAILED_SEARCH_ASSETS');
  }

  return res.status(200).json({ ok: true, data: result });
}

/**
 * @function assetViewerAPI
 * @description 에셋 이름으로 안전하게 에셋 가져오기.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @query filename 에셋 이름
 */
async function assetViewerAPI(req, res) {
  const result = await getAssetByFileName(req.query);

  if (!result) {
    throw new AppError('해당 에셋을 찾을 수 없습니다.', 404, 'ASSET_NOT_FOUND');
  }

  res.status(200).json({ ok: true, data: result });
}

/**
 * @function assetDownloadAPI
 * @description 외부 다운로드 API.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @query filename 에셋 이름
 * @query assetid 에셋 _id
 */
async function assetDownloadAPI(req, res) {
  let url = undefined;

  url = await downloadAssetFromDB(req.query, 'DEFAULT');
  if (url) {
    //return res.redirect(302, url);
    return res.status(200).json({ ok: true, url: url });
  }

  url = await downloadAssetFromDB(req.query, 'LATEST');
  if (url) {
    return res.status(200).json({ ok: true, url: url });
  }

  throw new AppError('다운로드 요청에 실패했습니다.', 422, 'FAILED_GET_DOWNLOAD_URL');
}

/**
 * @function assetDeactivateAPI
 * @description 에셋 비활성화 API.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function assetDeactivateAPI(req, res) {
  await deactivateAssetById(req.body);

  return res.status(200).json({ ok: true });
}

/**
 * @function assetActivateAPI
 * @description 에셋 활성화 API.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function assetActivateAPI(req, res) {
  await activateAssetById(req.body);

  return res.status(200).json({ ok: true });
}

router.get('/api/v1/assets/search', asyncHandler(assetsSearchAPI));
router.get('/api/v1/assets', asyncHandler(assetViewerAPI));
router.get('/api/v1/assets/download', asyncHandler(assetDownloadAPI));
router.put('/api/v1/assets/delete', asyncHandler(assetDeactivateAPI));
router.put('/api/v1/assets/activate', asyncHandler(assetActivateAPI));

module.exports = router;
