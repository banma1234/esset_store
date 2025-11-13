export function buildTree(rows = []) {
  const byId = new Map();
  const roots = [];

  // 1) 노드 사전 생성 (v-treeview 필수 필드 포함)
  rows.forEach((r) => {
    byId.set(r.code, {
      id: r._id,
      code: r.code,
      name: r.name,
      depth: r.depth,
      isActive: !!r.isActive,
      updatedAt: r.updatedAt || null,
      parentCode: r.parentCode || null,
      children: [],
    });
  });

  // 2) 부모-자식 연결
  rows.forEach((r) => {
    const node = byId.get(r.code);

    if (!node) {
      return;
    }
    if (node.parentCode && byId.has(node.parentCode)) {
      byId.get(node.parentCode).children.push(node);
    } else {
      roots.push(node);
    }
  });

  // 3) (선택) 정렬: 같은 레벨에서 이름 → 코드 순
  const sortRec = (arr) => {
    arr.sort(
      (a, b) =>
        (a.name || "").localeCompare(b.name || "") ||
        (a.code || "").localeCompare(b.code || "")
    );
    arr.forEach((n) => n.children && n.children.length && sortRec(n.children));
  };

  sortRec(roots);

  return roots;
}
