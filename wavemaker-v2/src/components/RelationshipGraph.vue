<script>
export default {
  name: 'RelationshipGraph',
  props: {
    project: Object,
  },
  emits: ['close'],
  data() {
    return {
      nodes: [],
      links: [],
      svgRef: null,
      dragNode: null,
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      if (!this.$root.db || !this.project) return
      
      // Load cards as nodes
      const cards = await this.$root.db.cards.where('projectUuid').equals(this.project.uuid).toArray()
      this.nodes = cards.map(card => ({
        id: card.uuid,
        title: card.title,
        type: card.type,
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
      }))
      
      // Load relationships as links
      const relationships = await this.$root.db.relationships.where('projectUuid').equals(this.project.uuid).toArray()
      this.links = relationships.map(rel => ({
        source: rel.fromUuid,
        target: rel.toUuid,
        type: rel.type,
      }))
    },
    
    close() {
      this.$emit('close')
    },
    
    startDrag(node, event) {
      this.dragNode = node
    },
    
    onDrag(event) {
      if (!this.dragNode) return
      
      const svg = this.$refs.svg
      const rect = svg.getBoundingClientRect()
      this.dragNode.x = event.clientX - rect.left
      this.dragNode.y = event.clientY - rect.top
    },
    
    endDrag() {
      this.dragNode = null
    }
  }
}
</script>

<template>
  <div class="relationship-graph-overlay frosted-overlay" @click.self="close">
    <div class="relationship-graph glass-panel">
      <div class="graph-header">
        <h2>Relationship Graph</h2>
        <button @click="close" class="close-btn glass-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
          </svg>
        </button>
      </div>
      
      <div class="graph-content">
        <svg 
          ref="svg"
          class="graph-svg"
          @mousemove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
        >
          <!-- Links -->
          <g class="links">
            <line
              v-for="(link, index) in links"
              :key="index"
              :x1="nodes.find(n => n.id === link.source)?.x || 0"
              :y1="nodes.find(n => n.id === link.source)?.y || 0"
              :x2="nodes.find(n => n.id === link.target)?.x || 0"
              :y2="nodes.find(n => n.id === link.target)?.y || 0"
              stroke="var(--accent-primary)"
              stroke-width="2"
              stroke-opacity="0.6"
              marker-end="url(#arrowhead)"
            />
          </g>
          
          <!-- Arrow marker -->
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="var(--accent-primary)"
                opacity="0.6"
              />
            </marker>
          </defs>
          
          <!-- Nodes -->
          <g class="nodes">
            <g
              v-for="node in nodes"
              :key="node.id"
              class="node-group"
              :style="{ transform: `translate(${node.x}px, ${node.y}px)` }"
              @mousedown="startDrag(node, $event)"
            >
              <circle
                r="40"
                fill="rgba(102, 126, 234, 0.2)"
                stroke="var(--accent-primary)"
                stroke-width="2"
                class="node-circle"
              />
              <text
                dy="5"
                text-anchor="middle"
                fill="var(--fg-primary)"
                font-size="12"
                font-weight="500"
                style="pointer-events: none;"
              >
                {{ node.title.length > 8 ? node.title.substring(0, 8) + '...' : node.title }}
              </text>
            </g>
          </g>
        </svg>
      </div>
      
      <div class="graph-info">
        <p>Drag nodes to rearrange. Cards can be linked through the card editor.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.relationship-graph-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
}

.relationship-graph {
  width: 100%;
  max-width: 900px;
  height: 600px;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
}

.graph-header h2 {
  font-size: 1.3rem;
  color: var(--fg-primary);
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
}

.graph-content {
  flex: 1;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.3);
}

.graph-svg {
  width: 100%;
  height: 100%;
}

.node-group {
  cursor: grab;
  transition: transform 0.1s ease;
}

.node-group:active {
  cursor: grabbing;
}

.node-circle {
  transition: all var(--transition-fast);
}

.node-group:hover .node-circle {
  fill: rgba(102, 126, 234, 0.3);
  stroke-width: 3;
}

.graph-info {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--glass-border);
  text-align: center;
}

.graph-info p {
  font-size: 0.9rem;
  color: var(--fg-secondary);
  margin: 0;
}
</style>
