// /utils/commonCodeTree.js
import { buildTree } from './buildTree'

/**
 * @typedef {Object} CommonCodeRow
 * @property {string} _id         - MongoDB ObjectId 문자열
 * @property {string} code        - 공통코드
 * @property {string} name        - 공통코드 이름
 * @property {number} depth       - 트리 depth
 * @property {boolean} [isActive] - 사용 여부
 * @property {string|null} [parentCode] - 부모 코드
 * @property {string|null} [updatedAt]   - 수정일
 */

/**
 * @typedef {Object} TreeNode
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {number} depth
 * @property {boolean} isActive
 * @property {string|null} parentCode
 * @property {Array<TreeNode>} children
 */

/**
 * @typedef {Object} FilterRoot
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
  return buildTree(rows)
}

/**
 * @function findTreeNodeById
 * @description v-treeview용 트리에서 id로 노드를 찾는다(BFS).
 * @param {Array<TreeNode>} items - 트리 루트 노드 배열
 * @param {string} id - 찾을 노드 id
 * @returns {TreeNode|null} 찾은 노드 또는 null
 */
export function findTreeNodeById(items = [], id) {
  const queue = [...items]

  while (queue.length) {
    const cur = queue.shift()
    if (cur.id === id) return cur
    if (cur.children && cur.children.length) {
      queue.push(...cur.children)
    }
  }

  return null
}

/**
 * @function buildFilterRoots
 * @description 필터 공통코드 평면 배열을 v-select 그룹 정보로 변환한다.
 *              - 루트 개수만큼 셀렉트 박스를 만들기 위한 구조
 *              - 각 루트의 모든 하위 노드는 options로 평탄화한다.
 * @param {Array<CommonCodeRow>} rows - 공통코드 행 배열
 * @returns {Array<FilterRoot>} 필터 루트 목록
 */
export function buildFilterRoots(rows = []) {
  const roots = buildTree(rows)

  return roots.map((root) => ({
    code: root.code,
    name: root.name,
    options: flattenChildren(root)
  }))
}

/**
 * @function flattenChildren
 * @description 주어진 루트 기준으로 모든 하위 노드를 평탄화한다(루트 자신은 제외).
 * @param {TreeNode} root - 루트 노드
 * @returns {Array<TreeNode>} 하위 노드 평탄화 리스트
 */
export function flattenChildren(root) {
  if (!root || !Array.isArray(root.children)) return []

  const out = []
  const queue = [...root.children]

  while (queue.length) {
    const cur = queue.shift()
    out.push(cur)
    if (cur.children && cur.children.length) {
      queue.push(...cur.children)
    }
  }

  return out
}
