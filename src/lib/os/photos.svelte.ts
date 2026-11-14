import list from './photos.json';

export interface Photo {
  /** Also the file name: public/photos/<id>.webp and public/photos/thumb/<id>.webp. */
  id: string;
  title: string;
  album: string;
  /** YYYY-MM-DD, or empty when unknown. */
  date: string;
  caption: string;
  /** Who took it and under which licence. */
  credit: string;
  /** Where the picture came from. */
  source: string;
  w: number;
  h: number;
  /** A CSS object-position that keeps HaYeon in view when the picture is cropped. */
  focus?: string;
  /** The picture used for the user tile on the welcome screen and the start menu. */
  avatar?: boolean;
}

export const photos: Photo[] = list;

const base = import.meta.env.BASE_URL + 'photos/';

// The hash changes with the file, so a saved copy is never mistaken for a replaced picture.
function rev(photo: Photo) {
  return '.webp?v=' + (__PHOTO_REVS__[photo.id] ?? '0');
}

export function photoUrl(photo: Photo) {
  return base + photo.id + rev(photo);
}

export function thumbUrl(photo: Photo) {
  return base + 'thumb/' + photo.id + rev(photo);
}

export function photoById(id: string | null) {
  return photos.find((photo) => photo.id === id);
}

export const avatar = photos.find((photo) => photo.avatar);

/** The desktop asks the viewer for a picture by leaving its id here. */
export const viewer = $state<{ want: string | null }>({ want: null });
