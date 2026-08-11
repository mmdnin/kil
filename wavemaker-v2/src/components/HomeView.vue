<script>
import { ref, computed } from 'vue'

export default {
  name: 'HomeView',
  props: {
    projects: Array,
  },
  emits: ['create-project', 'select-project', 'navigate'],
  setup(props, { emit }) {
    const searchQuery = ref('')
    
    const filteredProjects = computed(() => {
      if (!searchQuery.value) return props.projects || []
      return (props.projects || []).filter(p => 
        p.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
    })
    
    const createProject = () => {
      emit('create-project')
    }
    
    const selectProject = (project) => {
      emit('select-project', project)
    }
    
    const navigateTo = (tool) => {
      emit('navigate', tool)
    }
    
    return {
      searchQuery,
      filteredProjects,
      createProject,
      selectProject,
      navigateTo
    }
  },
  data() {
    return {
      recentProjects: [],
      quickActions: [
        { name: 'New Book', icon: 'book', tool: 'writer' },
        { name: 'Character Card', icon: 'card', tool: 'cards' },
        { name: 'Mind Map', icon: 'mindmap', tool: 'mindmap' },
      ]
    }
  },
  async mounted() {
    // Load recent projects
    if (this.$root.db) {
      this.recentProjects = await this.$root.db.projects.orderBy('lastupdated').reverse().limit(6).toArray()
    }
  },
  methods: {
    handleCreateProject() {
      this.$emit('create-project')
    },
    handleSelectProject(project) {
      this.$emit('select-project', project)
    },
    handleNavigate(tool) {
      this.$emit('navigate', tool)
    }
  }
}
</script>

<template>
  <div class="home-view slide-up">
    <div class="welcome-section glass-panel">
      <h1 class="welcome-title">Welcome to WaveMaker V2</h1>
      <p class="welcome-subtitle">Your modern writing companion with visual relationship mapping</p>
      
      <div class="quick-actions">
        <button 
          v-for="action in quickActions" 
          :key="action.name"
          @click="handleNavigate(action.tool)"
          class="action-card liquid-glass glow-edge"
        >
          <div class="action-icon">
            <svg v-if="action.icon === 'book'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="currentColor" d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z"/>
            </svg>
            <svg v-if="action.icon === 'card'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="currentColor" d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
            </svg>
            <svg v-if="action.icon === 'mindmap'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
            </svg>
          </div>
          <span>{{ action.name }}</span>
        </button>
      </div>
    </div>
    
    <div class="projects-section">
      <h2 class="section-title">Recent Projects</h2>
      <div class="projects-grid">
        <div 
          class="project-card glass-card glow-edge"
          @click="handleCreateProject"
        >
          <div class="project-add-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>
          </div>
          <h3>Create New Project</h3>
        </div>
        
        <div 
          v-for="project in recentProjects" 
          :key="project.uuid"
          class="project-card glass-card glow-edge"
          @click="handleSelectProject(project)"
        >
          <div class="project-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
              <path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
            </svg>
          </div>
          <h3>{{ project.title }}</h3>
          <p class="project-date">{{ new Date(project.lastupdated).toLocaleDateString() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  padding: var(--spacing-xl) var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: 700;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-sm);
}

.welcome-subtitle {
  color: var(--fg-secondary);
  font-size: 1.1rem;
  margin-bottom: var(--spacing-xl);
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  min-width: 140px;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.action-card:hover {
  transform: translateY(-8px);
}

.action-icon {
  color: var(--accent-primary);
}

.projects-section {
  margin-top: var(--spacing-xl);
}

.section-title {
  font-size: 1.5rem;
  color: var(--fg-primary);
  margin-bottom: var(--spacing-lg);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.project-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  cursor: pointer;
  text-align: center;
}

.project-card:hover {
  transform: translateY(-8px) scale(1.02);
}

.project-add-icon {
  color: var(--accent-primary);
  margin-bottom: var(--spacing-md);
}

.project-icon {
  color: var(--accent-secondary);
  margin-bottom: var(--spacing-md);
}

.project-card h3 {
  font-size: 1.1rem;
  color: var(--fg-primary);
  margin: var(--spacing-sm) 0;
}

.project-date {
  font-size: 0.85rem;
  color: var(--fg-tertiary);
}
</style>
