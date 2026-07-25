import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // ============================================================
  // Add thumbnail_id column, FK constraint, and index
  // for both naming conventions (snake_case from migrations,
  // and camelCase/__ from push).
  //
  // Each DO block safely skips if table doesn't exist
  // or if constraint already exists.
  // ============================================================

  // --- tours_blocks_data_tour (snake_case) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tours_blocks_data_tour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tours_blocks_data_tour" ADD CONSTRAINT "tours_blocks_data_tour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tours_blocks_data_tour_thumbnail_idx"
      ON "tours_blocks_data_tour" USING btree ("thumbnail_id");
  `)

  // --- _tours_v_blocks_data_tour (snake_case version) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_tours_v_blocks_data_tour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_tours_v_blocks_data_tour" ADD CONSTRAINT "_tours_v_blocks_data_tour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "_tours_v_blocks_data_tour_thumbnail_idx"
      ON "_tours_v_blocks_data_tour" USING btree ("thumbnail_id");
  `)

  // --- paquetes_blocks_data_tour (snake_case) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "paquetes_blocks_data_tour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "paquetes_blocks_data_tour" ADD CONSTRAINT "paquetes_blocks_data_tour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "paquetes_blocks_data_tour_thumbnail_idx"
      ON "paquetes_blocks_data_tour" USING btree ("thumbnail_id");
  `)

  // --- _paquetes_v_blocks_data_tour (snake_case version) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_paquetes_v_blocks_data_tour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_paquetes_v_blocks_data_tour" ADD CONSTRAINT "_paquetes_v_blocks_data_tour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "_paquetes_v_blocks_data_tour_thumbnail_idx"
      ON "_paquetes_v_blocks_data_tour" USING btree ("thumbnail_id");
  `)

  // --- tours__blocks_dataTour (double underscore / camelCase) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tours__blocks_dataTour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tours__blocks_dataTour" ADD CONSTRAINT "tours__blocks_dataTour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE INDEX IF NOT EXISTS "tours__blocks_dataTour_thumbnail_idx"
        ON "tours__blocks_dataTour" USING btree ("thumbnail_id");
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)

  // --- _tours__v__blocks_dataTour (double underscore / camelCase version) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_tours__v__blocks_dataTour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_tours__v__blocks_dataTour" ADD CONSTRAINT "_tours__v__blocks_dataTour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE INDEX IF NOT EXISTS "_tours__v__blocks_dataTour_thumbnail_idx"
        ON "_tours__v__blocks_dataTour" USING btree ("thumbnail_id");
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)

  // --- paquetes__blocks_dataTour (double underscore / camelCase) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "paquetes__blocks_dataTour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "paquetes__blocks_dataTour" ADD CONSTRAINT "paquetes__blocks_dataTour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE INDEX IF NOT EXISTS "paquetes__blocks_dataTour_thumbnail_idx"
        ON "paquetes__blocks_dataTour" USING btree ("thumbnail_id");
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)

  // --- _paquetes__v__blocks_dataTour (double underscore / camelCase version) ---
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_paquetes__v__blocks_dataTour" ADD COLUMN IF NOT EXISTS "thumbnail_id" integer;
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_paquetes__v__blocks_dataTour" ADD CONSTRAINT "_paquetes__v__blocks_dataTour_thumbnail_id_media_id_fk"
        FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object OR undefined_table THEN null; END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      CREATE INDEX IF NOT EXISTS "_paquetes__v__blocks_dataTour_thumbnail_idx"
        ON "_paquetes__v__blocks_dataTour" USING btree ("thumbnail_id");
    EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Drop indexes
  await db.execute(sql`
    DROP INDEX IF EXISTS "tours_blocks_data_tour_thumbnail_idx";
    DROP INDEX IF EXISTS "_tours_v_blocks_data_tour_thumbnail_idx";
    DROP INDEX IF EXISTS "paquetes_blocks_data_tour_thumbnail_idx";
    DROP INDEX IF EXISTS "_paquetes_v_blocks_data_tour_thumbnail_idx";
    DROP INDEX IF EXISTS "tours__blocks_dataTour_thumbnail_idx";
    DROP INDEX IF EXISTS "_tours__v__blocks_dataTour_thumbnail_idx";
    DROP INDEX IF EXISTS "paquetes__blocks_dataTour_thumbnail_idx";
    DROP INDEX IF EXISTS "_paquetes__v__blocks_dataTour_thumbnail_idx";
  `)

  // Drop FK constraints
  await db.execute(sql`
    ALTER TABLE "tours_blocks_data_tour"       DROP CONSTRAINT IF EXISTS "tours_blocks_data_tour_thumbnail_id_media_id_fk";
    ALTER TABLE "_tours_v_blocks_data_tour"     DROP CONSTRAINT IF EXISTS "_tours_v_blocks_data_tour_thumbnail_id_media_id_fk";
    ALTER TABLE "paquetes_blocks_data_tour"     DROP CONSTRAINT IF EXISTS "paquetes_blocks_data_tour_thumbnail_id_media_id_fk";
    ALTER TABLE "_paquetes_v_blocks_data_tour"  DROP CONSTRAINT IF EXISTS "_paquetes_v_blocks_data_tour_thumbnail_id_media_id_fk";
    ALTER TABLE "tours__blocks_dataTour"        DROP CONSTRAINT IF EXISTS "tours__blocks_dataTour_thumbnail_id_media_id_fk";
    ALTER TABLE "_tours__v__blocks_dataTour"    DROP CONSTRAINT IF EXISTS "_tours__v__blocks_dataTour_thumbnail_id_media_id_fk";
    ALTER TABLE "paquetes__blocks_dataTour"     DROP CONSTRAINT IF EXISTS "paquetes__blocks_dataTour_thumbnail_id_media_id_fk";
    ALTER TABLE "_paquetes__v__blocks_dataTour" DROP CONSTRAINT IF EXISTS "_paquetes__v__blocks_dataTour_thumbnail_id_media_id_fk";
  `)

  // Drop columns
  await db.execute(sql`
    DO $$ BEGIN ALTER TABLE "tours_blocks_data_tour"       DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_tours_v_blocks_data_tour"     DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "paquetes_blocks_data_tour"     DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_paquetes_v_blocks_data_tour"  DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "tours__blocks_dataTour"        DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_tours__v__blocks_dataTour"    DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "paquetes__blocks_dataTour"     DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_paquetes__v__blocks_dataTour" DROP COLUMN IF EXISTS "thumbnail_id"; EXCEPTION WHEN undefined_table THEN null; END $$;
  `)
}
