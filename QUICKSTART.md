# Quick Start Guide 🚀

## Prerequisites Check

Before starting, ensure you have:
- ✅ Bun v1.0+ installed (`bun --version`)
- ✅ PostgreSQL v14+ installed and running
- ✅ Git (optional, for version control)

## Setup in 5 Minutes

### Step 1: Install Dependencies
```bash
bun install
```

### Step 2: Configure Database

Create a PostgreSQL database:
```bash
# Using psql
psql -U postgres
CREATE DATABASE salonone_db;
\q
```

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` and update the database URL:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/salonone_db"
```

### Step 3: Setup Database Schema
```bash
# Push schema to database (no migration files needed for now)
bun run db:push
```

### Step 4: Seed Sample Data (Optional)
```bash
bun run db:seed
```

### Step 5: Start the Server
```bash
bun run dev
```

You should see:
```
🚀 Application is running on: http://localhost:3000
```

## Test the API

### Using curl:
```bash
# Get all salons
curl http://localhost:3000/salons

# Create a new salon
curl -X POST http://localhost:3000/salons \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Barbershop",
    "slug": "my-barbershop",
    "email": "contact@mybarbershop.com",
    "phone": "+5511999999999",
    "address": "Rua Example, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  }'
```

### Using the HTTP file:
Open `api-examples.http` in VSCode with the REST Client extension and click "Send Request" above any endpoint.

### Using Drizzle Studio (Database GUI):
```bash
bun run db:studio
```
Opens at https://local.drizzle.studio

## What's Next?

1. ✅ **Explore the API** - Use the examples in `api-examples.http`
2. 📖 **Read the architecture** - Check `ARCHITECTURE.md` for the full roadmap
3. 🔨 **Start building** - Follow the phases in the architecture document

## Common Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run start:prod` | Run production build |
| `bun run db:push` | Push schema changes to database |
| `bun run db:studio` | Open Drizzle Studio GUI |
| `bun run db:seed` | Seed sample data |
| `bun run lint` | Run linter |
| `bun run format` | Format code |

## Troubleshooting

### Database connection error
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Ensure database exists

### Port already in use
- Change port in `.env`: `PORT=3001`
- Or kill the process: `lsof -ti:3000 | xargs kill`

### Module not found errors
- Run `bun install` again
- Clear cache: `rm -rf node_modules && bun install`

## Project Structure Overview

```
src/
├── database/          # Database configuration
│   ├── schemas/      # Drizzle schemas
│   └── database.module.ts
├── salons/           # Salon feature module
│   ├── dto/         # Data Transfer Objects
│   ├── salons.controller.ts
│   ├── salons.service.ts
│   └── salons.module.ts
├── app.module.ts    # Root module
└── main.ts          # Entry point
```

## Need Help?

- 📚 Check `README.md` for detailed documentation
- 🏗️ Review `ARCHITECTURE.md` for system design
- 🔍 Look at `api-examples.http` for API examples
- 🐛 Check the troubleshooting section above

Happy coding! 💻✨

