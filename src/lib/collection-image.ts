// Collection photos are private to their owner. They live under their own storage
// prefix and are served only by /img/collection/[id]/[size], never by the public
// gallery routes.

// True only when a session exists and belongs to the photo's owner.
export function canViewCollectionImage(ownerId: string, sessionUserId: string | null | undefined) {
  return ownerId !== "" && sessionUserId != null && sessionUserId === ownerId;
}

// Storage keys of one uploaded photo: the full-size object and its thumbnail.
export function collectionImageKeys(
  userId: string,
  itemId: string,
  imageId: string,
  fullExt: string,
  thumbExt: string,
) {
  const base = `collection/${userId}/${itemId}/${imageId}`;
  return { key: `${base}.${fullExt}`, thumbKey: `${base}-thumb.${thumbExt}` };
}
