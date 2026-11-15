// Root matches exactly; every other route also matches its sub-routes.
export function isPathActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

// A node is either a link or a group holding more nodes (any depth).
export type NavTreeNode = { href: string } | { children: ReadonlyArray<NavTreeNode> };

// A group is active (and starts open) when any descendant link is the current route.
export function isGroupActive(pathname: string, children: ReadonlyArray<NavTreeNode>): boolean {
  return children.some((c) =>
    "children" in c ? isGroupActive(pathname, c.children) : isPathActive(pathname, c.href),
  );
}
