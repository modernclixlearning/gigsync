import { z } from 'zod'

export const createSongSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  artist: z.string().min(1, 'Artist is required').max(200),
  bpm: z.number().min(20).max(300).optional().default(120),
  key: z.string().optional().default('C'),
  timeSignature: z.string().optional().default('4/4'),
  duration: z.number().min(0).optional().default(0),
  lyrics: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
})

export const createSetlistSchema = z.object({
  name: z.string().min(1, 'Setlist name is required').max(200),
  venue: z.string().max(200).optional(),
  date: z.date().optional(),
  songIds: z.array(z.string()).optional(),
})

export const profileSchema = z.object({
  name: z.string().max(100),
  instrument: z.string(),
  band: z.string().max(100).optional(),
})

export type CreateSongSchema = z.infer<typeof createSongSchema>
export type CreateSetlistSchema = z.infer<typeof createSetlistSchema>
export type ProfileSchema = z.infer<typeof profileSchema>
