import { v4 as uuidv4 } from 'uuid'

export default {
  data() {
    return {
      db: null,
      dbRef: null,
    }
  },
  async created() {
    await this.initDB()
  },
  methods: {
    async initDB() {
      const { Dexie } = await import('dexie')
      const { dexieObservable } = await import('dexie-observable')
      
      this.db = new Dexie('WaveMakerV2', {
        addons: [dexieObservable]
      })
      
      this.db.version(1).stores({
        projects: 'uuid, title, lastupdated',
        books: 'uuid, projectUuid, title, lastupdated',
        files: 'uuid, bookUuid, title, lastupdated',
        cards: 'uuid, projectUuid, title, tags, lastupdated',
        mindmaps: 'uuid, projectUuid, title, lastupdated',
        timelines: 'uuid, projectUuid, title, lastupdated',
        relationships: '++id, fromUuid, toUuid, type, projectUuid'
      })
      
      this.dbRef = this.db
      this.$root.db = this.db
      this.$root.dbRef = this.db
    },
    
    uuid() {
      return uuidv4()
    },
    
    async AddRecord(table, data) {
      try {
        const uuid = await this.db[table].add(data)
        return uuid
      } catch (error) {
        console.error('Error adding record:', error)
        throw error
      }
    },
    
    async UpdateRecord(table, uuid, data) {
      try {
        data.lastupdated = new Date().toISOString()
        await this.db[table].update(uuid, data)
      } catch (error) {
        console.error('Error updating record:', error)
        throw error
      }
    },
    
    async DeleteRecord(table, uuid) {
      try {
        await this.db[table].delete(uuid)
      } catch (error) {
        console.error('Error deleting record:', error)
        throw error
      }
    },
    
    async useObservable(observable) {
      const { ref } = await import('vue')
      
      const result = ref(null)
      
      // 直接订阅 observable，不再依赖 @vueuse/rxjs
      if (observable && typeof observable.subscribe === 'function') {
        observable.subscribe({
          next: (value) => {
            result.value = value
          },
          error: (err) => {
            console.error('Observable error:', err)
          }
        })
      }
      
      return result
    },
    
    liveQuery(fn) {
      return this.db.liveQuery(fn)
    }
  }
}
