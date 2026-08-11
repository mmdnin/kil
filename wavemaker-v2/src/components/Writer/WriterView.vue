<script>
import TipTapEditor from './TipTapEditor.vue'
import BookSidebar from './BookSidebar.vue'

export default {
  name: 'WriterView',
  props: {
    project: Object,
  },
  emits: ['back'],
  components: {
    TipTapEditor,
    BookSidebar
  },
  data() {
    return {
      books: [],
      selectedBook: null,
      selectedFile: null,
      sidebarOpen: true,
    }
  },
  async mounted() {
    await this.loadBooks()
  },
  methods: {
    async loadBooks() {
      if (this.$root.db && this.project) {
        this.books = await this.$root.db.books.where('projectUuid').equals(this.project.uuid).toArray()
      }
    },
    
    async createNewBook() {
      const { value: title } = await this.$swal({
        title: 'Create New Book',
        input: 'text',
        inputLabel: 'Book Title',
        inputPlaceholder: 'Enter book title...',
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
        const book = {
          uuid: this.$root.uuid(),
          projectUuid: this.project.uuid,
          title,
          description: '',
          cover: null,
          created: new Date().toISOString(),
          lastupdated: new Date().toISOString(),
        }
        
        await this.$root.AddRecord('books', book)
        this.books.push(book)
        this.selectedBook = book
      }
    },
    
    selectBook(book) {
      this.selectedBook = book
      this.selectedFile = null
    },
    
    selectFile(file) {
      this.selectedFile = file
    },
    
    goBack() {
      this.$emit('back')
    },
    
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    }
  }
}
</script>

<template>
  <div class="writer-view">
    <!-- Back button - Key improvement: Easy navigation back to home -->
    <div class="writer-header glass-strong">
      <button @click="goBack" class="back-btn glass-button" title="Back to Home">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
        </svg>
        <span>Back</span>
      </button>
      
      <h1 class="writer-title">{{ project?.title || 'Writer' }}</h1>
      
      <div class="writer-actions">
        <button @click="createNewBook" class="btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
          </svg>
          New Book
        </button>
        
        <button @click="toggleSidebar" class="icon-btn glass-button" :class="{ active: sidebarOpen }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="writer-content">
      <!-- Sidebar with book list -->
      <BookSidebar 
        v-if="sidebarOpen"
        :books="books"
        :selectedBook="selectedBook"
        @select-book="selectBook"
        @select-file="selectFile"
      />
      
      <!-- Main editor area -->
      <div class="editor-area" :class="{ 'full-width': !sidebarOpen }">
        <div v-if="!selectedBook" class="empty-state glass-panel">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="80" height="80">
            <path fill="currentColor" d="M19,2L14,6.5V17.5L19,13V2M6.5,5C4.55,5 2.45,5.4 1,6.5V21.16C1,21.41 1.25,21.66 1.5,21.66C1.6,21.66 1.65,21.59 1.75,21.59C3.1,20.94 5.05,20.5 6.5,20.5C8.45,20.5 10.55,20.9 12,22C13.35,21.15 15.8,20.5 17.5,20.5C19.15,20.5 20.85,20.81 22.25,21.56C22.35,21.61 22.4,21.59 22.5,21.59C22.75,21.59 23,21.34 23,21.09V6.5C22.4,6.05 21.75,5.75 21,5.5V19C19.9,18.65 18.7,18.5 17.5,18.5C15.8,18.5 13.35,19.15 12,20V6.5C10.55,5.4 8.45,5 6.5,5Z"/>
          </svg>
          <h2>Select or Create a Book</h2>
          <p>Choose a book from the sidebar or create a new one to start writing</p>
          <button @click="createNewBook" class="btn">Create Your First Book</button>
        </div>
        
        <div v-else-if="!selectedFile" class="book-detail glass-panel">
          <h2>{{ selectedBook.title }}</h2>
          <p>{{ selectedBook.description || 'No description yet' }}</p>
          
          <div class="book-actions">
            <button @click="$emit('select-file', { type: 'new', book: selectedBook })" class="btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
              </svg>
              New Chapter
            </button>
          </div>
        </div>
        
        <TipTapEditor 
          v-else
          :file="selectedFile"
          :book="selectedBook"
          @save="scheduleAutoSave"
          @back="selectedFile = null"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.writer-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.writer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  border-radius: var(--radius-lg);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
}

.writer-title {
  font-size: 1.5rem;
  color: var(--fg-primary);
  flex: 1;
  text-align: center;
}

.writer-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.icon-btn.active {
  background: var(--accent-gradient);
  color: white;
}

.writer-content {
  display: flex;
  flex: 1;
  gap: var(--spacing-lg);
  overflow: hidden;
}

.editor-area {
  flex: 1;
  overflow-y: auto;
  transition: all var(--transition-normal);
}

.editor-area.full-width {
  max-width: 100%;
}

.empty-state,
.book-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--spacing-xl);
  text-align: center;
}

.empty-state svg,
.book-detail svg {
  color: var(--accent-primary);
  margin-bottom: var(--spacing-lg);
}

.empty-state h2,
.book-detail h2 {
  font-size: 1.5rem;
  color: var(--fg-primary);
  margin-bottom: var(--spacing-sm);
}

.empty-state p,
.book-detail p {
  color: var(--fg-secondary);
  margin-bottom: var(--spacing-lg);
}

.book-actions {
  display: flex;
  gap: var(--spacing-md);
}
</style>
