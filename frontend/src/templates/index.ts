import book from './book.json';
import movie from './movie.json';
import music from './music.json';
import diary from './diary.json';
import dictionary from './dictionary.json';
import idea from './idea.json';
import notes from './notes.json';
import type { GalleryTemplate } from '../types';

export const TEMPLATES: Record<string, GalleryTemplate> = {
  book,
  movie,
  music,
  diary,
  dictionary,
  idea,
  notes,
};

export { TEMPLATES as templates };
export default TEMPLATES;
