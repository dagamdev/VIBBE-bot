import { config } from 'dotenv'
config()

export const SECRET_KEY = process.env.SECRET_KEY ?? 'token'
export const DB_URL = process.env.DB_URL ?? 'connection'
export const IS_DEVELOPMENT = process.env.IS_DEVELOPMENT
