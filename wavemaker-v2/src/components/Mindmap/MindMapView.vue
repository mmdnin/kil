<script>
export default {
  name: 'MindMapView',
  props: {
    project: Object,
  },
  emits: ['back'],
  data() {
    return {
      mindmaps: [],
      selectedMindmap: null,
    }
  },
  async mounted() {
    await this.loadMindmaps()
  },
  methods: {
    async loadMindmaps() {
      if (this.$root.db && this.project) {
        this.mindmaps = await this.$root.db.mindmaps.where('projectUuid').equals(this.project.uuid).toArray()
      }
    },
    
    goBack() {
      this.$emit('back')
    }
  }
}
</script>

<template>
  <div class="mindmap-view">
    <div class="mindmap-header glass-strong">
      <button @click="goBack" class="back-btn glass-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
        </svg>
        <span>Back</span>
      </button>
      
      <h1>Mind Map</h1>
      
      <button class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
        </svg>
        New Mind Map
      </button>
    </div>
    
    <div class="mindmap-content glass-panel">
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80">
          <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
        </svg>
        <h2>Create Your First Mind Map</h2>
        <p>Visualize your ideas and connections with our interactive mind mapping tool</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mindmap-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.mindmap-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-lg);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.mindmap-header h1 {
  flex: 1;
  font-size: 1.5rem;
  color: var(--fg-primary);
}

.mindmap-content {
  flex: 1;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-state svg {
  color: var(--accent-primary);
  margin-bottom: var(--spacing-lg);
}

.empty-state h2 {
  font-size: 1.5rem;
  color: var(--fg-primary);
  margin-bottom: var(--spacing-sm);
}

.empty-state p {
  color: var(--fg-secondary);
  max-width: 500px;
}
</style>
