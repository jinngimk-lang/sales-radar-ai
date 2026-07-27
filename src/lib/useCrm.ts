/**
 * CRM Store 的 React 绑定
 * 使用 useSyncExternalStore 保证并发安全渲染。
 */
import { useSyncExternalStore, useCallback } from 'react'
import type { CrmRecord, FollowUpStatus } from '@/types'
import {
  subscribe,
  getCrmRecord,
  getAllCrmRecords,
  toggleFavorite,
  setFollowUpStatus,
  addCustomTag,
  removeCustomTag,
  setNote,
} from '@/lib/crmStore'

/** 订阅单个客户的 CRM 状态 */
export function useCrmRecord(customerId: string): CrmRecord {
  return useSyncExternalStore(
    subscribe,
    () => getCrmRecord(customerId),
    () => getCrmRecord(customerId),
  )
}

/** 订阅全量 CRM 记录（列表 / 看板用） */
export function useAllCrmRecords(): CrmRecord[] {
  return useSyncExternalStore(subscribe, getAllCrmRecords, getAllCrmRecords)
}

/** 收藏动作集合（便于卡片直接调用） */
export function useCrmActions(customerId: string) {
  const toggleFav = useCallback(() => toggleFavorite(customerId), [customerId])
  const setStatus = useCallback((status: FollowUpStatus) => setFollowUpStatus(customerId, status), [customerId])
  const addTag = useCallback((tag: string) => addCustomTag(customerId, tag), [customerId])
  const removeTag = useCallback((tag: string) => removeCustomTag(customerId, tag), [customerId])
  const updateNote = useCallback((note: string) => setNote(customerId, note), [customerId])
  return { toggleFav, setStatus, addTag, removeTag, updateNote }
}
