import { Module, Global } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schemas/salon.schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

const databaseProvider = {
  provide: DATABASE_CONNECTION,
  useFactory: async () => {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString);
    return drizzle(client, { schema });
  },
};

@Global()
@Module({
  providers: [databaseProvider],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}

