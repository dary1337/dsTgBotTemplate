import { adminsCollection } from './admins.js';

// Every collection the app uses. Add new ones here and as an accessor in
// buildCollections (../db.ts); syncSchema picks them up on startup.
export const COLLECTION_DEFINITIONS = [adminsCollection];

export { adminsCollection } from './admins.js';
export type { Admin, AdminPlatform, AdminSource } from './admins.js';
