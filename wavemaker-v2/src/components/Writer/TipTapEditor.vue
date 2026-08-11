<script>
import { useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'

export default {
  name: 'TipTapEditor',
  props: {
    file: Object,
    book: Object,
  },
  emits: ['save', 'back'],
  data() {
    return {
      editor: null,
      isDirty: false,
      saveTimer: null,
    }
  },
  watch: {
    file: {
      immediate: true,
      handler(newFile) {
        if (newFile && this.editor) {
          this.editor.commands.setContent(newFile.content || '')
          this.isDirty = false
        }
      }
    }
  },
  async mounted() {
    this.initEditor()
  },
  beforeUnmount() {
    if (this.editor) {
      this.editor.destroy()
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }
  },
  methods: {
    initEditor() {
      this.editor = useEditor({
        content: this.file?.content || '',
        extensions: [
          StarterKit,
          Highlight,
          Typography,
        ],
        editorProps: {
          attributes: {
            class: 'prose prose-lg max-w-none focus:outline-none',
          },
        },
        onUpdate: () => {
          this.isDirty = true
          this.scheduleAutoSave()
        },
      })
    },
    
    scheduleAutoSave() {
      if (this.saveTimer) {
        clearTimeout(this.saveTimer)
      }
      
      this.saveTimer = setTimeout(async () => {
        await this.saveContent()
      }, 2000)
    },
    
    async saveContent() {
      if (!this.isDirty || !this.editor) return
      
      const content = this.editor.getHTML()
      
      try {
        await this.$root.UpdateRecord('files', this.file.uuid, {
          ...this.file,
          content,
        })
        
        this.isDirty = false
        this.$emit('save')
        
        // Show subtle save notification
        this.$swal({
          toast: true,
          position: 'bottom-end',
          icon: 'success',
          title: 'Auto-saved',
          showConfirmButton: false,
          timer: 1500,
          customClass: {
            popup: 'glass-panel'
          }
        })
      } catch (error) {
        console.error('Save error:', error)
        this.$swal({
          toast: true,
          position: 'bottom-end',
          icon: 'error',
          title: 'Save failed',
          showConfirmButton: false,
          timer: 2000,
        })
      }
    },
    
    goBack() {
      if (this.isDirty) {
        this.saveContent()
      }
      this.$emit('back')
    }
  }
}
</script>

<template>
  <div class="editor-container glass-panel">
    <div class="editor-toolbar">
      <button @click="goBack" class="back-link glass-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
        </svg>
        Back to Book
      </button>
      
      <div class="toolbar-controls">
        <span v-if="isDirty" class="save-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"/>
          </svg>
          Saving...
        </span>
        <span v-else class="saved-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
          </svg>
          Saved
        </span>
        
        <button @click="saveContent" class="btn" :disabled="!isDirty">
          Save Now
        </button>
      </div>
    </div>
    
    <div class="editor-content">
      <h1 class="chapter-title">{{ file?.title }}</h1>
      <div v-if="editor" class="tiptap">
        <editor-content :editor="editor" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--glass-border);
}

.back-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.9rem;
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.save-indicator,
.saved-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: 0.85rem;
}

.save-indicator {
  color: var(--warning);
}

.saved-indicator {
  color: var(--success);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
}

.chapter-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--fg-primary);
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.tiptap {
  max-width: var(--editor-max-width);
  margin: 0 auto;
  line-height: var(--editor-line-height);
  font-size: var(--editor-font-size);
}

.tiptap :deep(p) {
  margin-bottom: var(--spacing-md);
}

.tiptap :deep(h1),
.tiptap :deep(h2),
.tiptap :deep(h3),
.tiptap :deep(h4) {
  margin-top: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.tiptap :deep(a) {
  color: var(--accent-primary);
  text-decoration: underline;
}

.tiptap :deep(mark) {
  background: rgba(102, 126, 234, 0.2);
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
