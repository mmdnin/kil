<script>
export default {
  name: 'CardsView',
  props: {
    project: Object,
  },
  emits: ['back'],
  data() {
    return {
      cards: [],
      searchQuery: '',
      selectedCard: null,
    }
  },
  async mounted() {
    await this.loadCards()
  },
  methods: {
    async loadCards() {
      if (this.$root.db && this.project) {
        this.cards = await this.$root.db.cards.where('projectUuid').equals(this.project.uuid).toArray()
      }
    },
    
    async createNewCard() {
      const { value: title } = await this.$swal({
        title: 'Create New Card',
        input: 'text',
        inputLabel: 'Card Title',
        inputPlaceholder: 'Enter card title...',
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
        const card = {
          uuid: this.$root.uuid(),
          projectUuid: this.project.uuid,
          title,
          type: 'character',
          content: '',
          tags: [],
          created: new Date().toISOString(),
          lastupdated: new Date().toISOString(),
        }
        
        await this.$root.AddRecord('cards', card)
        this.cards.push(card)
      }
    },
    
    goBack() {
      this.$emit('back')
    }
  }
}
</script>

<template>
  <div class="cards-view">
    <div class="cards-header glass-strong">
      <button @click="goBack" class="back-btn glass-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
        </svg>
        <span>Back</span>
      </button>
      
      <h1>Cards Database</h1>
      
      <button @click="createNewCard" class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
        </svg>
        New Card
      </button>
    </div>
    
    <div class="cards-content">
      <div class="search-bar glass-input">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search cards..." 
          class="glass-input"
        />
      </div>
      
      <div class="cards-grid">
        <div 
          v-for="card in cards" 
          :key="card.uuid"
          class="card-item glass-card glow-edge"
        >
          <div class="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
              <path fill="currentColor" d="M4,6H20V16H4M20,18A2,2 0 0,0 22,16V6C22,4.89 21.1,4 20,4H4C2.89,4 2,4.89 2,6V16A2,2 0 0,0 4,18H0V20H24V18H20Z"/>
            </svg>
          </div>
          <h3>{{ card.title }}</h3>
          <p class="card-type">{{ card.type }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cards-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.cards-header {
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

.cards-header h1 {
  flex: 1;
  font-size: 1.5rem;
  color: var(--fg-primary);
}

.cards-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-lg);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  border-radius: var(--radius-md);
}

.search-bar svg {
  color: var(--fg-tertiary);
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1rem;
}

.search-bar input:focus {
  outline: none;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  padding-bottom: var(--spacing-xl);
}

.card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  cursor: pointer;
  text-align: center;
}

.card-item:hover {
  transform: translateY(-8px) scale(1.02);
}

.card-icon {
  color: var(--accent-secondary);
  margin-bottom: var(--spacing-md);
}

.card-item h3 {
  font-size: 1.1rem;
  color: var(--fg-primary);
  margin: var(--spacing-sm) 0;
}

.card-type {
  font-size: 0.85rem;
  color: var(--fg-tertiary);
  text-transform: capitalize;
}
</style>
