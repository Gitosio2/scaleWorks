// Root matches exactly; every other route also matches its sub-routes.
export function isPathActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

// A group is active (and starts open) when any of its children is the current route.
export function isGroupActive(pathname: string, children: ReadonlyArray<{ href: string }>) {
  return children.some((c) => isPathActive(pathname, c.href));
}
