// /utils/commonCodes/commonCodeTree.js
import { buildTree } from "./buildTree";

/**
 * @typedef {Object} CommonCodeRow
 * @property {string} _id         - MongoDB ObjectId 문자열
 * @property {string} code        - 공통코드
 * @property {string} name        - 공통코드 이름
 * @property {number} depth       - 트리 depth
 * @property {boolean} [isActive] - 사용 여부
 * @property {string|null} [parentId] - 부모 코드
 * @property {string|null} [updatedAt]   - 수정일
 */

/**
 * @typedef {Object} TreeNode
 * @property {string} _id
 * @property {string} code
 * @property {string} name
 * @property {number} depth
 * @property {boolean} isActive
 * @property {string|null} parentId
 * @property {Array<TreeNode>} children
 */

/**
 * @typedef {Object} FilterRoot
 * @property {string} _id
 * @property {string} code                - 필터 루트 코드
 * @property {string} name                - 필터 루트 이름
 * @property {Array<TreeNode>} options    - 루트 기준 모든 하위 노드 목록
 */

/**
 * @function buildCategoryTree
 * @description 카테고리 공통코드 평면 배열을 v-treeview용 트리 구조로 변환한다.
 * @param {Array<CommonCodeRow>} rows - 공통코드 행 배열
 * @returns {Array<TreeNode>} v-treeview용 루트 노드 배열
 */
export function buildCategoryTree(rows = []) {
  return buildTree(rows);
}

/**
 * @function findTreeNodeById
 * @description v-treeview용 트리에서 _id로 노드를 찾는다(BFS).
 * @param {Array<TreeNode>} items - 트리 루트 노드 배열
 * @param {string} id - 찾을 노드 _id
 * @returns {TreeNode|null} 찾은 노드 또는 null
 */
export function findTreeNodeById(items = [], id) {
  const queue = [...items];

  while (queue.length) {
    const cur = queue.shift();
    if (cur._id === id) return cur;
    if (cur.children && cur.children.length) {
      queue.push(...cur.children);
    }
  }

  return null;
}

/**
 * @function buildFilterRoots
 * @description
 *  필터 공통코드 평면 배열을 v-select 그룹 정보로 변환한다.
 *  - "필터 옵션" 노드 개수만큼 셀렉트 박스를 만든다.
 *  - 각 셀렉트 박스의 옵션은 해당 노드의 모든 하위 노드(자식/손자 포함)이다.
 * @param {Array<CommonCodeRow>} rows - 공통코드 행 배열
 * @returns {Array<FilterRoot>} 필터 루트(= 필터 옵션 노드) 목록
 */
export function buildFilterRoots(rows = []) {
  const roots = buildTree(rows);

  /** @type {Array<FilterRoot>} */
  const filterRoots = [];

  // 최상위 루트들의 "직계 자식"을 필터 옵션 노드로 간주
  roots.forEach((root) => {
    if (Array.isArray(root.children) && root.children.length > 0) {
      root.children.forEach((child) => {
        filterRoots.push({
          _id: child._id,
          code: child.code,
          name: child.name,
          // 이 필터 옵션 노드의 모든 하위 노드를 선택 옵션으로 사용
          options: flattenChildren(child),
        });
      });
    }
  });

  return filterRoots;
}

/**
 * @function flattenChildren
 * @description 주어진 루트 기준으로 모든 하위 노드를 평탄화한다(루트 자신은 제외).
 * @param {TreeNode} root - 루트 노드
 * @returns {Array<TreeNode>} 하위 노드 평탄화 리스트
 */
export function flattenChildren(root) {
  if (!root || !Array.isArray(root.children)) return [];

  const out = [];
  const queue = [...root.children];

  while (queue.length) {
    const cur = queue.shift();
    out.push(cur);
    if (cur.children && cur.children.length) {
      queue.push(...cur.children);
    }
  }

  return out;
}

/**
 * @typedef {Object} FilterSelectItem
 * @property {string} text   - 셀렉트에 표시할 텍스트
 * @property {string|null} value - 선택 값(코드) 또는 null
 */

/**
 * @function buildFilterSelectItems
 * @description
 *  v-select에서 사용할 아이템 배열을 생성한다.
 *  - 첫 번째 아이템은 항상 '선택'(값: null) 이다.
 *  - 나머지는 해당 필터 루트의 options를 기반으로 생성한다.
 * @param {FilterRoot} root - 필터 루트 정보
 * @returns {Array<FilterSelectItem>} v-select용 아이템 리스트
 */
export function buildFilterSelectItems(root) {
  const options = Array.isArray(root.options) ? root.options : [];

  const items = options.map((opt) => ({
    text: opt.name ? `${opt.name}` : opt.code,
    value: opt.code,
  }));

  return [{ text: "선택", value: null }, ...items];
}

/**
 * @function findFilterNodeInRoot
 * @description
 *  주어진 필터 루트의 options에서 code로 노드를 찾는다.
 * @param {FilterRoot} root - 필터 루트 정보
 * @param {string} code - 찾을 노드 code
 * @returns {TreeNode|null} 찾은 노드 또는 null
 */
export function findFilterNodeInRoot(root, code) {
  if (!root || !Array.isArray(root.options)) return null;
  return root.options.find((opt) => opt.code === code) || null;
}
