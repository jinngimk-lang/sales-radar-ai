/**
 * CRM 状态管理（轻量级）
 *
 * 设计目标：
 * 在没有后端的情况下，提供收藏 / 跟进状态 / 自定义标签 / 备注 的本地持久化能力。
 * 数据存于 localStorage，跨会话保留。未来接入后端时，
 * 将下列方法替换为 API 调用即可，组件层（useSyncExternalStore）无需改动。
 *
 * 接入后端步骤：
 * 1. 将 loadFromStorage / saveToStorage 替换为 fetch GET/POST
 * 2. subscribe 方法改为 WebSocket / SSE 或轮询
 * 3. 保持 emit() 通知机制不变
 */

import type { CrmRecord, FollowUpStatus } from '@/types'

const STORAGE_KEY = 'sales_radar_crm_v1'

const DEFAULT_RECORD = (customerId: string): CrmRecord => ({
  customerId,
  followUpStatus: 'new',
  isFavorited: false,
  customTags: [],
  updatedAt: new Date().toISOString(),
})

/** 内存中的 CRM 记录表：customerId -> CrmRecord */
let store: Map<string, CrmRecord> = new Map()
const listeners = new Set<() => void>()
const defaultRecords = new Map<string, CrmRecord>()
let allRecordsSnapshot: CrmRecord[] = []

/** 从 localStorage 加载 */
function loadFromStorage(): Map<string, CrmRecord> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as Record<string, CrmRecord>
    return new Map(Object.entries(parsed))
  } catch {
    return new Map()
  }
}

/** 写入 localStorage */
function saveToStorage() {
  if (typeof window === 'undefined') return
  try {
    const obj = Object.fromEntries(store.entries())
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // 配额超限或隐私模式，静默失败
  }
}

/** 通知所有订阅者 */
function emit() {
  listeners.forEach((l) => l())
}

// 初始化加载
store = loadFromStorage()
allRecordsSnapshot = Array.from(store.values())

/** 订阅 store 变化（供 useSyncExternalStore 使用） */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 获取单条记录快照（无则返回默认） */
export function getCrmRecord(customerId: string): CrmRecord {
  const stored = store.get(customerId)
  if (stored) return stored

  const cached = defaultRecords.get(customerId)
  if (cached) return cached

  const record = DEFAULT_RECORD(customerId)
  defaultRecords.set(customerId, record)
  return record
}

/** 获取全量记录快照（用于列表 / 看板） */
export function getAllCrmRecords(): CrmRecord[] {
  return allRecordsSnapshot
}

/** 更新单条记录并持久化 */
function updateRecord(customerId: string, patch: Partial<CrmRecord>) {
  const prev = store.get(customerId) ?? DEFAULT_RECORD(customerId)
  const next: CrmRecord = { ...prev, ...patch, customerId, updatedAt: new Date().toISOString() }
  store.set(customerId, next)
  defaultRecords.delete(customerId)
  allRecordsSnapshot = Array.from(store.values())
  saveToStorage()
  emit()
}

/** 切换收藏 */
export function toggleFavorite(customerId: string) {
  const prev = getCrmRecord(customerId)
  updateRecord(customerId, { isFavorited: !prev.isFavorited })
}

/** 设置跟进状态 */
export function setFollowUpStatus(customerId: string, status: FollowUpStatus) {
  updateRecord(customerId, {
    followUpStatus: status,
    lastContactedAt: status === 'contacted' ? new Date().toISOString() : undefined,
  })
}

/** 添加自定义标签（去重） */
export function addCustomTag(customerId: string, tag: string) {
  const trimmed = tag.trim()
  if (!trimmed) return
  const prev = getCrmRecord(customerId)
  if (prev.customTags.includes(trimmed)) return
  updateRecord(customerId, { customTags: [...prev.customTags, trimmed] })
}

/** 移除自定义标签 */
export function removeCustomTag(customerId: string, tag: string) {
  const prev = getCrmRecord(customerId)
  updateRecord(customerId, { customTags: prev.customTags.filter((t) => t !== tag) })
}

/** 更新备注 */
export function setNote(customerId: string, note: string) {
  updateRecord(customerId, { note })
}

/** 批量导入（预置示例数据，便于演示） */
export function seedCrmData(records: CrmRecord[]) {
  records.forEach((r) => {
    store.set(r.customerId, r)
    defaultRecords.delete(r.customerId)
  })
  allRecordsSnapshot = Array.from(store.values())
  saveToStorage()
  emit()
}

/** 清空全部（调试用） */
export function clearCrm() {
  store = new Map()
  defaultRecords.clear()
  allRecordsSnapshot = []
  saveToStorage()
  emit()
}
