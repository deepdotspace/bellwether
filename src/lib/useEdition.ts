/** Read the latest published Edition (the editorial morning read). */

import { useMemo } from 'react'
import { useQuery } from 'deepspace'
import type { Edition } from '../types'

export function useLatestEdition(): { edition: Edition | null; loading: boolean } {
  const { records, status } = useQuery<Edition>('editions')
  const edition = useMemo(() => {
    if (!records || records.length === 0) return null
    return [...records].sort((a, b) => (a.data.date < b.data.date ? 1 : -1))[0].data
  }, [records])
  return { edition, loading: status === 'loading' }
}
