export interface RowData {
  _row_id: number;
  _created_at?: string;
  _updated_at?: string;
  [key: string]: unknown;
}

export interface GalleryTemplate {
  id: string;
  name: string;
  coverField: string;
  titleField: string;
  subtitleField: string;
  detailFields: string[];
}

export interface AttachmentInfo {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  type: 'pdf' | 'image' | 'audio' | 'video' | 'epub' | 'markdown' | 'html' | 'other';
}

export type ViewMode = 'table' | 'gallery';

export type PreviewType = 'native' | 'markdown' | 'mermaid' | 'epub';
