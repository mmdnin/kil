<script>
export default {
  name: 'BookSidebar',
  props: {
    books: Array,
    selectedBook: Object,
  },
  emits: ['select-book', 'select-file'],
  data() {
    return {
      files: [],
    }
  },
  watch: {
    selectedBook: {
      immediate: true,
      async handler(book) {
        if (book && this.$root.db) {
          this.files = await this.$root.db.files.where('bookUuid').equals(book.uuid).toArray()
        } else {
          this.files = []
        }
      }
    }
  },
  methods: {
    handleSelectBook(book) {
      this.$emit('select-book', book)
    },
    handleSelectFile(file) {
      this.$emit('select-file', file)
    },
    async createNewFile() {
      if (!this.selectedBook) return
      
      const { value: title } = await this.$swal({
        title: 'Create New Chapter',
        input: 'text',
        inputLabel: 'Chapter Title',
        inputPlaceholder: 'Enter chapter title...',
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
        const file = {
          uuid: this.$root.uuid(),
          bookUuid: this.selectedBook.uuid,
          title,
          content: '',
          order: this.files.length,
          created: new Date().toISOString(),
          lastupdated: new Date().toISOString(),
        }
        
        await this.$root.AddRecord('files', file)
        this.files.push(file)
        this.handleSelectFile(file)
      }
    }
  }
}
</script>

<template>
  <div class="book-sidebar glass-panel">
    <div class="sidebar-header">
      <h3>Books</h3>
    </div>
    
    <div class="books-list">
      <div 
        v-for="book in books" 
        :key="book.uuid"
        class="book-item glass-button"
        :class="{ active: selectedBook?.uuid === book.uuid }"
        @click="handleSelectBook(book)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z"/>
        </svg>
        <span>{{ book.title }}</span>
      </div>
    </div>
    
    <div v-if="selectedBook" class="files-section">
      <div class="files-header">
        <h4>Chapters</h4>
        <button @click="createNewFile" class="icon-btn-small" title="New Chapter">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
          </svg>
        </button>
      </div>
      
      <div class="files-list">
        <div 
          v-for="file in files" 
          :key="file.uuid"
          class="file-item"
          @click="handleSelectFile(file)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
          <span>{{ file.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.sidebar-header {
  margin-bottom: var(--spacing-md);
}

.sidebar-header h3 {
  font-size: 1.1rem;
  color: var(--fg-primary);
  margin: 0;
}

.books-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-lg);
}

.book-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  justify-content: flex-start;
}

.book-item:hover {
  background: rgba(255, 255, 255, 0.7);
}

.book-item.active {
  background: var(--accent-gradient);
  color: white;
}

.files-section {
  flex: 1;
  overflow-y: auto;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.files-header h4 {
  font-size: 0.95rem;
  color: var(--fg-secondary);
  margin: 0;
}

.icon-btn-small {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  border: none;
  background: transparent;
  color: var(--accent-primary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.icon-btn-small:hover {
  background: rgba(102, 126, 234, 0.1);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 0.9rem;
  color: var(--fg-secondary);
}

.file-item:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--accent-primary);
}
</style>
