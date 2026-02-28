import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env file relative to this file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
export default {
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'revision_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
        },
        searchPath: [process.env.DB_SCHEMA || 'revision', 'public'],
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: './seeds'
        },
        pool: {
            min: 2,
            max: 10
        }
    },
    production: {
        client: 'pg',
        connection: process.env.DATABASE_URL, // Use connection string in prod
        migrations: {
            directory: './migrations',
            tableName: 'knex_migrations',
        },
        pool: {
            min: 2,
            max: 20
        }
    }
};
