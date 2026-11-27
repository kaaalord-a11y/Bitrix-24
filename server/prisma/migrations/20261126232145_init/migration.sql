-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT,
    "display_name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "owner_id" UUID NOT NULL,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "board_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("board_id","user_id")
);

-- CreateTable
CREATE TABLE "board_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "created_by" UUID,
    "object_type" VARCHAR(30) NOT NULL,
    "x" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "y" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "width" DECIMAL(12,3) NOT NULL DEFAULT 100,
    "height" DECIMAL(12,3) NOT NULL DEFAULT 100,
    "rotation" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "layer_index" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "content" JSONB NOT NULL DEFAULT '{}',
    "style" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_object_id" UUID NOT NULL,
    "target_object_id" UUID NOT NULL,
    "source_anchor" VARCHAR(50),
    "target_anchor" VARCHAR(50),
    "connection_data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "object_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "object_id" UUID,
    "author_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "uploaded_by" UUID,
    "file_name" VARCHAR(255) NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "file_size" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_attachments" (
    "object_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,

    CONSTRAINT "object_attachments_pkey" PRIMARY KEY ("object_id","attachment_id")
);

-- CreateTable
CREATE TABLE "board_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "board_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_by" UUID,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_board_members_user" ON "board_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_board_objects_board" ON "board_objects"("board_id");

-- CreateIndex
CREATE INDEX "idx_comments_board" ON "comments"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_path_key" ON "attachments"("storage_path");

-- CreateIndex
CREATE INDEX "idx_board_versions_board" ON "board_versions"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_versions_board_id_version_number_key" ON "board_versions"("board_id", "version_number");

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_members" ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_objects" ADD CONSTRAINT "board_objects_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_objects" ADD CONSTRAINT "board_objects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_connections" ADD CONSTRAINT "object_connections_source_object_id_fkey" FOREIGN KEY ("source_object_id") REFERENCES "board_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_connections" ADD CONSTRAINT "object_connections_target_object_id_fkey" FOREIGN KEY ("target_object_id") REFERENCES "board_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "board_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_attachments" ADD CONSTRAINT "object_attachments_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "board_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_attachments" ADD CONSTRAINT "object_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_versions" ADD CONSTRAINT "board_versions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_versions" ADD CONSTRAINT "board_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
