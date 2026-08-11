export default {
  data() {
    return {
      fileHandle: null,
      autoSaveTimer: null,
      autoSaveInterval: 2000, // Save every 2 seconds
    }
  },
  methods: {
    // Browser File System API - Auto Save
    async requestFileAccess() {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        })
        this.fileHandle = fileHandle
        const file = await fileHandle.getFile()
        const text = await file.text()
        return JSON.parse(text)
      } catch (error) {
        console.error('File access error:', error)
        throw error
      }
    },
    
    async saveToFile(data) {
      if (!this.fileHandle) {
        await this.requestFileAccess()
      }
      
      try {
        const writable = await this.fileHandle.createWritable()
        await writable.write(JSON.stringify(data, null, 2))
        await writable.close()
        this.$swal({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Saved to file',
          showConfirmButton: false,
          timer: 1500
        })
      } catch (error) {
        console.error('Save error:', error)
        throw error
      }
    },
    
    // Auto-save with debounce
    scheduleAutoSave(saveFn) {
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
      }
      
      this.autoSaveTimer = setTimeout(async () => {
        try {
          await saveFn()
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }, this.autoSaveInterval)
    },
    
    // Export data as JSON file
    async exportData(data, filename) {
      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Export error:', error)
        throw error
      }
    },
    
    // Import data from JSON file
    async importData() {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        
        input.onchange = async (e) => {
          try {
            const file = e.target.files[0]
            const text = await file.text()
            const data = JSON.parse(text)
            resolve(data)
          } catch (error) {
            reject(error)
          }
        }
        
        input.click()
      })
    }
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  }
}
