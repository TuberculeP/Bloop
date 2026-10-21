import type { MigrationInterface, QueryRunner } from "typeorm";

// Drops the messaging and blog tables, join/child tables first
const TABLES = [
  "message_like",
  "direct_message",
  "user_liked_posts_post",
  "post_tags_tag",
  "post",
  "tag",
];

export class RemoveMessagingAndBlog1792585978995 implements MigrationInterface {
  name = "RemoveMessagingAndBlog1792585978995";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      // ifExist, dropForeignKeys, dropIndices
      await queryRunner.dropTable(table, true, true, true);
    }
  }

  public async down(): Promise<void> {
    // Irreversible: restore from a backup if needed
  }
}
