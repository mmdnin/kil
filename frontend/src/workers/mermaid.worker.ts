import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
});

self.onmessage = async (e: MessageEvent<{ id: string; code: string }>) => {
  const { id, code } = e.data;
  try {
    const { svg } = await mermaid.render(`mermaid-${id}`, code);
    self.postMessage({ id, svg, error: null });
  } catch (err) {
    self.postMessage({ 
      id, 
      svg: null, 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
};

export {};
