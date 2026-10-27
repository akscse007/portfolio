-- AlterTable: Add optional preview video to projects
ALTER TABLE "Project" ADD COLUMN "previewVideoId" TEXT;

-- CreateTable: PostAttachment (PDF notes on blog posts)
CREATE TABLE "PostAttachment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LibraryNote (standalone PDF reference library)
CREATE TABLE "LibraryNote" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT 'General',
    "category" TEXT NOT NULL DEFAULT 'Notes',
    "academicLevel" TEXT NOT NULL DEFAULT 'Undergraduate',
    "mediaId" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LibraryNoteTag
CREATE TABLE "LibraryNoteTag" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "LibraryNoteTag_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateIndex
CREATE INDEX "PostAttachment_postId_order_idx" ON "PostAttachment"("postId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PostAttachment_postId_mediaId_key" ON "PostAttachment"("postId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryNote_slug_key" ON "LibraryNote"("slug");

-- CreateIndex
CREATE INDEX "LibraryNote_status_order_idx" ON "LibraryNote"("status", "order");

-- CreateIndex
CREATE INDEX "LibraryNote_subject_idx" ON "LibraryNote"("subject");

-- CreateIndex
CREATE INDEX "LibraryNote_category_idx" ON "LibraryNote"("category");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_previewVideoId_fkey" FOREIGN KEY ("previewVideoId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryNote" ADD CONSTRAINT "LibraryNote_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryNoteTag" ADD CONSTRAINT "LibraryNoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LibraryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryNoteTag" ADD CONSTRAINT "LibraryNoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
