<script>
import DexieDB from '@/mixins/DexieDB.js'
import fileManager from '@/mixins/fileManager.js'

// Components
import TopToolbar from '@/components/TopToolbar.vue'
import HomeView from '@/components/HomeView.vue'
import WriterView from '@/components/Writer/WriterView.vue'
import CardsView from '@/components/Cards/CardsView.vue'
import MindMapView from '@/components/Mindmap/MindMapView.vue'
import RelationshipGraph from '@/components/RelationshipGraph.vue'

export default {
  name: 'App',
  mixins: [DexieDB, fileManager],
  components: {
    TopToolbar,
    HomeView,
    WriterView,
    CardsView,
    MindMapView,
    RelationshipGraph
  },
  data() {
    return {
      currentTool: null,
      currentProject: null,
      
      // Tool state
      tools: {
        writer: {
          selectedBook: null,
          selectedFile: null,
        },
        cards: {
          selectedCard: null,
          searchQuery: '',
        },
        mindmap: {
          selectedMindmap: null,
        },
        relationships: {
          showGraph: false,
        }
      },
      
      // UI state
      sidebarOpen: true,
      rightPanelOpen: false,
    }
  },
  computed: {
    dbReady() {
      return this.dbRef !== null
    }
  },
  methods: {
    navigateTo(tool) {
      this.currentTool = tool
    },
    
    goHome() {
      this.currentTool = null
      this.currentProject = null
    },
    
    async createNewProject() {
      const { value: title } = await this.$swal({
        title: 'Create New Project',
        input: 'text',
        inputLabel: 'Project Title',
        inputPlaceholder: 'Enter project title...',
        showCancelButton: true,
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        customClass: {
          popup: 'glass-panel',
          confirmButton: 'btn',
          cancelButton: 'btn btn-secondary'
        }
      })
      
      if (title) {
        const project = {
          uuid: this.uuid(),
          title,
          created: new Date().toISOString(),
          lastupdated: new Date().toISOString(),
        }
        
        await this.AddRecord('projects', project)
        this.currentProject = project
      }
    },
    
    // Navigate back to home from any view
    navigateBack() {
      this.currentTool = null
    }
  }
}
</script>

<template>
  <div id="app">
    <TopToolbar 
      v-if="dbReady"
      @home="goHome"
      @navigate="navigateTo"
      :currentTool="currentTool"
    />
    
    <main class="main-content">
      <HomeView 
        v-if="!currentTool && dbReady"
        @create-project="createNewProject"
        @select-project="(p) => currentProject = p"
        @navigate="navigateTo"
      />
      
      <WriterView 
        v-if="currentTool === 'writer'"
        :project="currentProject"
        @back="navigateBack"
      />
      
      <CardsView 
        v-if="currentTool === 'cards'"
        :project="currentProject"
        @back="navigateBack"
      />
      
      <MindMapView 
        v-if="currentTool === 'mindmap'"
        :project="currentProject"
        @back="navigateBack"
      />
      
      <RelationshipGraph 
        v-if="tools.relationships.showGraph"
        :project="currentProject"
        @close="tools.relationships.showGraph = false"
      />
    </main>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: var(--spacing-xl);
  overflow-y: auto;
}
</style>
