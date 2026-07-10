export interface MonitorOption {
  id: string
  name: string
  url: string
}

export interface ComponentItem {
  id: string
  groupId: string
  monitorId: string
  displayName: string
  displayOrder: number
  manualStatus: string | null
  monitor: MonitorOption
}

export interface GroupItem {
  id: string
  name: string
  displayOrder: number
  components: ComponentItem[]
}

export interface StatusPageConfig {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  brandColor: string | null
  isPublished: boolean
  project: {
    id: string
    name: string
    monitors: MonitorOption[]
  }
  groups: GroupItem[]
}
