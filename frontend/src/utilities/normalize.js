// lib/normalize.js
export const normalizeId = (record) => {
  if (record == null) return record
  const { _id, id, ...rest } = record
  const canonical = id ?? _id
  return {
    ...rest,
    id: typeof canonical === 'object' ? String(canonical) : canonical, // Mongo ObjectId → string
  }
}

export const normalizeList = (records = []) => records.map(normalizeId)