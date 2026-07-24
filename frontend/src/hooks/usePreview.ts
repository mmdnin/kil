import { useState, useCallback } from 'react';
import type { RowData } from '../types';

interface PreviewState {
  isOpen: boolean;
  item: RowData | null;
}

export function usePreview() {
  const [state, setState] = useState<PreviewState>({
    isOpen: false,
    item: null,
  });

  const openPreview = useCallback((item: RowData) => {
    setState({ isOpen: true, item });
  }, []);

  const closePreview = useCallback(() => {
    setState({ isOpen: false, item: null });
  }, []);

  return {
    ...state,
    openPreview,
    closePreview,
  };
}
